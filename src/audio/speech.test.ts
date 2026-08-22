import { afterEach, describe, expect, it, vi } from "vitest";
import { BrowserSpeechInputProvider } from "./BrowserSpeechInputProvider";
import { BrowserSpeechOutputProvider } from "./BrowserSpeechOutputProvider";
import { SpeechInputError } from "./speech";

type MockRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: (() => void) | null;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  abort: ReturnType<typeof vi.fn>;
};

let recognition: MockRecognition;
const captureRecognition = (value: MockRecognition) => { recognition = value; };
class RecognitionMock {
  lang = ""; interimResults = false; continuous = false;
  onstart: MockRecognition["onstart"] = null;
  onresult: MockRecognition["onresult"] = null;
  onerror: MockRecognition["onerror"] = null;
  onend: MockRecognition["onend"] = null;
  start = vi.fn(() => this.onstart?.());
  stop = vi.fn(() => this.onend?.());
  abort = vi.fn();
  constructor() { captureRecognition(this); }
}

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(window, "SpeechRecognition");
  Reflect.deleteProperty(window, "webkitSpeechRecognition");
  Reflect.deleteProperty(window, "speechSynthesis");
});

describe("BrowserSpeechInputProvider", () => {
  it("音声認識結果を文字列として返す", async () => {
    Object.defineProperty(window, "webkitSpeechRecognition", { configurable: true, value: RecognitionMock });
    const provider = new BrowserSpeechInputProvider();
    await provider.startListening();
    recognition.onresult?.({ results: [{ 0: { transcript: "注文番号を確認します" }, isFinal: true }] });
    await expect(provider.stopListening()).resolves.toBe("注文番号を確認します");
    expect(recognition.lang).toBe("ja-JP");
  });

  it("permission deniedを安全なcodeへ変換する", async () => {
    Object.defineProperty(window, "SpeechRecognition", { configurable: true, value: RecognitionMock });
    const provider = new BrowserSpeechInputProvider();
    await provider.startListening();
    recognition.onerror?.({ error: "not-allowed" });
    await expect(provider.stopListening()).rejects.toEqual(new SpeechInputError("permission_denied"));
  });

  it("no speechを安全なcodeへ変換する", async () => {
    Object.defineProperty(window, "SpeechRecognition", { configurable: true, value: RecognitionMock });
    const provider = new BrowserSpeechInputProvider();
    await provider.startListening();
    recognition.onerror?.({ error: "no-speech" });
    await expect(provider.stopListening()).rejects.toEqual(new SpeechInputError("no_speech"));
  });

  it("API非対応を判定する", () => {
    expect(new BrowserSpeechInputProvider().isSupported()).toBe(false);
  });
});

describe("BrowserSpeechOutputProvider", () => {
  it("ja-JPで顧客発話を読み上げ、停止できる", async () => {
    class UtteranceMock {
      lang = ""; voice: unknown = null; onend: (() => void) | null = null; onerror: (() => void) | null = null;
      constructor(public text: string) {}
    }
    const speak = vi.fn((utterance: UtteranceMock) => utterance.onend?.());
    const cancel = vi.fn();
    vi.stubGlobal("SpeechSynthesisUtterance", UtteranceMock);
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speak, cancel, getVoices: () => [{ lang: "ja-JP" }] } });
    const provider = new BrowserSpeechOutputProvider();
    await provider.speak("お電話ありがとうございます");
    expect(speak.mock.calls[0][0]).toMatchObject({ text: "お電話ありがとうございます", lang: "ja-JP" });
    provider.stop();
    expect(cancel).toHaveBeenCalled();
  });
});
