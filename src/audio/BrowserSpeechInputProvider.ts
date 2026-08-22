import { SpeechInputError, type SpeechInputErrorCode, type SpeechInputProvider } from "./speech";

type BrowserRecognitionResult = { 0: { transcript: string }; isFinal: boolean };
type BrowserRecognitionEvent = { results: ArrayLike<BrowserRecognitionResult> };
type BrowserRecognitionErrorEvent = { error: string };
type BrowserRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: (() => void) | null;
  onresult: ((event: BrowserRecognitionEvent) => void) | null;
  onerror: ((event: BrowserRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type BrowserRecognitionConstructor = new () => BrowserRecognition;
type SpeechWindow = Window & {
  SpeechRecognition?: BrowserRecognitionConstructor;
  webkitSpeechRecognition?: BrowserRecognitionConstructor;
};

const errorCode = (error: string): SpeechInputErrorCode => {
  if (error === "not-allowed" || error === "service-not-allowed") return "permission_denied";
  if (error === "no-speech") return "no_speech";
  if (error === "aborted") return "recognition_aborted";
  return "recognition_error";
};

export class BrowserSpeechInputProvider implements SpeechInputProvider {
  private recognition: BrowserRecognition | null = null;
  private transcript = "";
  private terminalError: SpeechInputErrorCode | null = null;
  private resultPromise: Promise<string> | null = null;
  private resolveResult: ((text: string) => void) | null = null;

  isSupported(): boolean {
    if (typeof window === "undefined") return false;
    const speechWindow = window as SpeechWindow;
    return Boolean(speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition);
  }

  async startListening(): Promise<void> {
    if (!this.isSupported()) throw new SpeechInputError("recognition_unavailable");
    this.cancel();
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) throw new SpeechInputError("recognition_unavailable");

    this.transcript = "";
    this.terminalError = null;
    this.resultPromise = new Promise((resolve) => { this.resolveResult = resolve; });
    const recognition = new Recognition();
    recognition.lang = "ja-JP";
    recognition.interimResults = true;
    recognition.continuous = false;
    let startSettled = false;
    let resolveStart: (() => void) | null = null;
    let rejectStart: ((error: SpeechInputError) => void) | null = null;
    const started = new Promise<void>((resolve, reject) => { resolveStart = resolve; rejectStart = reject; });
    recognition.onstart = () => { startSettled = true; resolveStart?.(); };
    recognition.onresult = (event) => {
      this.transcript = Array.from(event.results).map((result) => result[0]?.transcript ?? "").join("").trim();
    };
    recognition.onerror = (event) => {
      this.terminalError = errorCode(event.error);
      if (!startSettled) { startSettled = true; rejectStart?.(new SpeechInputError(this.terminalError)); }
    };
    recognition.onend = () => {
      this.resolveResult?.(this.transcript);
      this.resolveResult = null;
    };
    this.recognition = recognition;
    try {
      recognition.start();
    } catch {
      this.recognition = null;
      throw new SpeechInputError("recognition_error");
    }
    await started;
  }

  async stopListening(): Promise<string> {
    if (!this.recognition || !this.resultPromise) throw new SpeechInputError("recognition_aborted");
    try { this.recognition.stop(); } catch { /* recognition may already have ended */ }
    const text = await this.resultPromise;
    const error = this.terminalError;
    this.recognition = null;
    this.resultPromise = null;
    if (error) throw new SpeechInputError(error);
    if (!text) throw new SpeechInputError("no_speech");
    return text;
  }

  cancel(): void {
    if (this.recognition) {
      try { this.recognition.abort(); } catch { /* already stopped */ }
    }
    this.resolveResult?.("");
    this.recognition = null;
    this.resultPromise = null;
    this.resolveResult = null;
    this.transcript = "";
  }
}
