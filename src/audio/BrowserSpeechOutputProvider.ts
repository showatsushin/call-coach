import type { SpeechOutputProvider } from "./speech";

export class BrowserSpeechOutputProvider implements SpeechOutputProvider {
  isSupported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
  }

  speak(text: string): Promise<void> {
    if (!this.isSupported()) return Promise.reject(new Error("speech_output_unavailable"));
    this.stop();
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ja-JP";
      const japaneseVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith("ja"));
      if (japaneseVoice) utterance.voice = japaneseVoice;
      utterance.onend = () => resolve();
      utterance.onerror = () => reject(new Error("speech_output_unavailable"));
      window.speechSynthesis.speak(utterance);
    });
  }

  stop(): void {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }
}
