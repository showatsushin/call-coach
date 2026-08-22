import type { ConversationActionType, CustomerState } from "./models";

const emotionRank = ["calm", "concerned", "frustrated", "angry"] as const;
const trustRank = ["low", "neutral", "high"] as const;
const move = <T,>(values: readonly T[], value: T, amount: number) => values[Math.max(0, Math.min(values.length - 1, values.indexOf(value) + amount))];

export const initialCustomerState: CustomerState = {
  emotion: "concerned", trust: "neutral", resolved: false, explanation: "問い合わせ内容への対応を待っています",
};

export function updateCustomerState(current: CustomerState, text: string, action: ConversationActionType): CustomerState {
  if (action === "escalate") return { emotion: move(emotionRank, current.emotion, -1), trust: "high", resolved: true, explanation: "適切な責任者引継ぎが案内されました" };
  if (action === "check" || /確認|お名前|注文番号|状況/.test(text)) return { emotion: move(emotionRank, current.emotion, -1), trust: move(trustRank, current.trust, 1), resolved: current.resolved, explanation: "必要な確認によって信頼が改善しました" };
  if (/必ず|絶対|間違いなく|確実に/.test(text)) return { emotion: move(emotionRank, current.emotion, 1), trust: move(trustRank, current.trust, -1), resolved: false, explanation: "未確認の断定によって信頼が低下しました" };
  if (action === "speak" && !/ありがとう|申し訳|ご不便|ご心配/.test(text)) return { ...current, emotion: move(emotionRank, current.emotion, 1), explanation: "初動の謝意が確認できず、不満が強まりました" };
  if (/ありがとう|申し訳|ご不便|ご心配/.test(text)) return { ...current, emotion: move(emotionRank, current.emotion, -1), explanation: "謝意・共感を受け、感情が落ち着きました" };
  if (action === "end") return { ...current, resolved: current.trust === "high", explanation: current.trust === "high" ? "案内内容に納得して応対を終了しました" : "確認不足のまま応対が終了しました" };
  return current;
}
