import type { CommunicationStyle, CustomerPersona, Difficulty, PortableSkill, TrainingMode } from "./models";

export const modeLabels: Record<TrainingMode, string> = {
  customer_service: "接客・電話対応", sales: "営業", communication: "コミュニケーション",
};
export const personaLabels: Record<CustomerPersona, string> = {
  normal: "通常", hurried: "急いでいる", angry: "怒っている", elderly: "高齢者", unclear: "聞き取りづらい",
};
export const difficultyLabels: Record<Difficulty, string> = {
  beginner: "初級", intermediate: "中級", advanced: "上級",
};
export const styleLabels: Record<CommunicationStyle, string> = {
  direct: "D傾向：結論・速度を重視する会話",
  expressive: "I傾向：反応・会話・関係性を重視する会話",
  supportive: "S傾向：安心・丁寧さを重視する会話",
  analytical: "C傾向：根拠・条件・正確さを重視する会話",
};
export const skillLabels: Record<PortableSkill, string> = {
  listening: "傾聴", questioning: "質問", explanation: "説明", summarization: "要約",
  empathy: "共感", logical_communication: "論理的コミュニケーション", proposal: "提案", situational_judgment: "状況判断",
};
