import { useCallback, useEffect, useRef, useState } from "react";
import type { ConversationMessage } from "../domain/models";
import { SpeechInputError, type SpeechInputProvider, type SpeechOutputProvider } from "../audio/speech";

export type SpeechInputStatus = "idle" | "listening" | "recognizing" | "confirm" | "error";

const errorMessage = (error: unknown): string => {
  const code = error instanceof SpeechInputError ? error.code : "recognition_error";
  if (code === "permission_denied") return "マイクの使用が許可されていません。ブラウザのサイト設定でマイクを許可するか、テキスト入力をご利用ください。";
  if (code === "no_speech") return "音声を認識できませんでした。もう一度話すか、テキスト入力をご利用ください。";
  if (code === "recognition_unavailable") return "このブラウザでは音声入力を利用できません。テキスト入力でトレーニングできます。";
  if (code === "recognition_aborted") return "音声認識を中止しました。必要であればもう一度お試しください。";
  return "音声認識で問題が発生しました。テキスト入力をご利用ください。";
};

export function useSpeechTraining(
  messages: ConversationMessage[],
  setInput: (text: string) => void,
  inputProvider: SpeechInputProvider,
  outputProvider: SpeechOutputProvider,
) {
  const [status, setStatus] = useState<SpeechInputStatus>("idle");
  const [message, setMessage] = useState("待機中");
  const [audioEnabled, setAudioEnabledState] = useState(true);
  const [showIntro, setShowIntro] = useState(false);
  const [introSeen, setIntroSeen] = useState(false);
  const lastSpokenId = useRef<string | undefined>(undefined);
  const inputSupported = inputProvider.isSupported();
  const outputSupported = outputProvider.isSupported();

  const speak = useCallback(async (text: string) => {
    if (!audioEnabled || !outputSupported) return;
    try { await outputProvider.speak(text); }
    catch { setMessage("顧客音声を再生できません。顧客テキストで会話を続けられます。"); }
  }, [audioEnabled, outputProvider, outputSupported]);

  useEffect(() => {
    const latest = messages.at(-1);
    if (!latest || latest.speaker !== "customer" || latest.id === lastSpokenId.current) return;
    const timer = window.setTimeout(() => {
      lastSpokenId.current = latest.id;
      void speak(latest.text);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [messages, speak]);

  useEffect(() => () => { inputProvider.cancel(); outputProvider.stop(); }, [inputProvider, outputProvider]);

  const beginListening = async () => {
    if (!inputSupported) { setStatus("error"); setMessage(errorMessage(new SpeechInputError("recognition_unavailable"))); return; }
    try {
      await inputProvider.startListening();
      setStatus("listening"); setMessage("聞いています…");
    } catch (error) { setStatus("error"); setMessage(errorMessage(error)); }
  };

  const requestListening = () => {
    if (!introSeen) { setShowIntro(true); return; }
    void beginListening();
  };

  const acceptIntroAndListen = () => {
    setIntroSeen(true); setShowIntro(false); void beginListening();
  };

  const stopListening = async () => {
    setStatus("recognizing"); setMessage("認識しています…");
    try {
      const text = await inputProvider.stopListening();
      setInput(text); setStatus("confirm"); setMessage("認識結果を確認し、必要なら修正して送信してください。");
    } catch (error) { setStatus("error"); setMessage(errorMessage(error)); }
  };

  const setAudioEnabled = (enabled: boolean) => {
    setAudioEnabledState(enabled);
    if (!enabled) outputProvider.stop();
  };

  return {
    status, message, audioEnabled, inputSupported, outputSupported, showIntro,
    requestListening, acceptIntroAndListen, dismissIntro: () => { setIntroSeen(true); setShowIntro(false); },
    stopListening, repeatCustomer: () => { const latest = [...messages].reverse().find((item) => item.speaker === "customer"); if (latest) void speak(latest.text); },
    stopSpeaking: () => outputProvider.stop(), setAudioEnabled,
    resetStatus: () => { setStatus("idle"); setMessage("待機中"); },
  };
}
