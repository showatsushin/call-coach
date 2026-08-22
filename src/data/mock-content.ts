import type { GoodResponsePattern, SalesFramework, StandardCategory, TrainingCheckpoint, TrainingManualRule, TrainingScenario } from "../domain/models";

const cp = (
  id: string, title: string, terms: string[], score: number,
  standardCategory: StandardCategory, portableSkills: TrainingCheckpoint["portableSkills"],
  options: Partial<TrainingCheckpoint> = {},
): TrainingCheckpoint => ({
  id, title, matchTerms: terms, score, standardCategory, portableSkills,
  kind: "required", source: "standard", description: title, ...options,
});

const common = {
  greeting: cp("greeting", "適切な第一声", ["お電話ありがとうございます", "ありがとうございます", "お待たせ"], 10, "greeting", ["empathy"]),
  identify: cp("identification", "お名前・注文情報の確認", ["お名前", "注文番号", "ご注文", "電話番号"], 15, "identification", ["listening", "questioning"], { requiredForPass: true, source: "company" }),
  clarify: cp("clarification", "状況を質問して確認", ["いつ", "どちら", "何時", "状況", "商品"], 10, "clarification", ["questioning", "situational_judgment"]),
  empathy: cp("empathy", "気持ちへの適切な応答", ["申し訳", "ご不便", "ご心配", "お困り"], 10, "empathy", ["empathy", "listening"]),
  confirm: cp("confirmation", "内容を復唱して認識を合わせる", ["ですね", "でお間違い", "確認いたします", "承りました"], 10, "confirmation", ["summarization", "explanation"]),
  close: cp("closing", "次の対応を案内する", ["いたします", "ご案内", "お待ち", "お届け", "引き継ぎ"], 10, "closing", ["explanation"], { kind: "completion", requiredForPass: true }),
  accuracy: cp("accuracy", "未確認の内容を断定しない", ["必ず", "絶対", "間違いなく", "確実に"], -20, "accuracy", ["logical_communication", "situational_judgment"], { kind: "prohibited", source: "company", description: "確認前に到着時刻や対応結果を断定しない" }),
  escalation: cp("escalation", "判断範囲を超えた場合に引き継ぐ", ["責任者", "店長", "担当者", "確認して折り返し"], 15, "escalation", ["situational_judgment"], { kind: "escalation", source: "company" }),
};

const patterns = (prefix: string, extras: string[] = []): GoodResponsePattern[] => [
  {
    id: `${prefix}-pattern-a`, title: "確認を順に進める応対例",
    checkpointIds: ["greeting", "identification", "clarification"],
    exampleResponses: ["お電話ありがとうございます。確認しますので、お名前とご注文内容を教えていただけますか。", ...extras],
  },
  {
    id: `${prefix}-pattern-b`, title: "気持ちを受け止めて進める応対例",
    checkpointIds: ["empathy", "identification", "closing"],
    exampleResponses: ["ご不便をおかけし申し訳ございません。状況を確認し、次の対応をご案内いたします。"],
  },
];

type ScenarioSeed = { id: string; title: string; category: string; description: string; goal: string; initial: string; extra?: TrainingCheckpoint[]; escalation?: boolean };
const serviceSeeds: ScenarioSeed[] = [
  { id: "regular-order", title: "通常注文", category: "電話受付", description: "電話でピザの注文を受け付けます。", goal: "商品と届け先を正しく伝えたい", initial: "ピザを注文したいのですが。", extra: [cp("order-details", "商品・数量・届け先を確認", ["サイズ", "枚", "住所", "届け先"], 15, "clarification", ["questioning", "summarization"], { source: "company", requiredForPass: true })] },
  { id: "delivery-time", title: "配達時間確認", category: "注文確認", description: "注文前に配達の目安を尋ねられます。", goal: "配達目安を確認したい", initial: "今頼むと何時ごろ届きますか？" },
  { id: "delivery-delay", title: "配達遅延", category: "配達遅延問い合わせ", description: "予定時刻を過ぎた注文について対応します。", goal: "現在地と到着目安を知りたい", initial: "予定の時間を過ぎています。まだ届かないのですが。", escalation: true },
  { id: "change-order", title: "注文内容の変更", category: "注文確認", description: "受付済み注文の変更希望に対応します。", goal: "商品を変更できるか知りたい", initial: "さっきの注文を変更できますか？" },
  { id: "wrong-item", title: "商品間違い", category: "商品間違い", description: "届いた商品が注文と違う問い合わせです。", goal: "正しい商品を受け取りたい", initial: "頼んだものと違うピザが届きました。", escalation: true },
  { id: "cancel", title: "キャンセル", category: "キャンセル", description: "注文のキャンセル可否を確認します。", goal: "注文を取り消したい", initial: "注文をキャンセルしたいです。", escalation: true },
  { id: "minor-complaint", title: "軽度クレーム", category: "クレーム初動", description: "商品状態についての不満を受け止めます。", goal: "不満を伝え対応を知りたい", initial: "届いたピザが少し冷めていました。", escalation: true },
  { id: "strong-complaint", title: "強いクレーム", category: "責任者引継ぎ", description: "強い不満に初動対応し責任者へつなぎます。", goal: "責任者から説明を受けたい", initial: "何度も遅れている。責任者と話をさせてください。", escalation: true },
];

const serviceScenarios: TrainingScenario[] = serviceSeeds.map((s) => ({
  id: s.id, trainingMode: "customer_service", title: s.title, category: s.category,
  description: s.description, customerGoal: s.goal, difficulty: "beginner", customerPersona: "normal",
  communicationStyle: "supportive", salesFramework: "none", initialMessage: s.initial,
  requiredCheckpoints: [common.greeting, common.identify, common.clarify, common.empathy, common.confirm, common.close, ...(s.extra ?? [])],
  prohibitedBehaviors: [common.accuracy], escalationRules: s.escalation ? [common.escalation] : [],
  goodResponsePatterns: patterns(s.id),
}));

const frameworkCheckpoints: Record<Exclude<SalesFramework, "none">, TrainingCheckpoint[]> = {
  spin: [
    cp("spin-s", "Situation：現状確認", ["現在", "現状", "どのように", "体制"], 15, "spin_situation", ["questioning"]),
    cp("spin-p", "Problem：課題確認", ["課題", "困って", "問題", "お悩み"], 15, "spin_problem", ["listening", "questioning"]),
    cp("spin-i", "Implication：課題による影響", ["影響", "どのくらい", "支障", "負担"], 15, "spin_implication", ["questioning", "logical_communication"]),
    cp("spin-n", "Need-payoff：改善後に得たい価値", ["改善", "理想", "実現", "価値"], 15, "spin_need_payoff", ["questioning", "proposal"]),
  ],
  bant: [
    cp("bant-b", "Budget：予算", ["予算", "費用", "ご予算"], 15, "bant_budget", ["questioning"]),
    cp("bant-a", "Authority：意思決定者", ["決定", "ご担当", "承認", "関係者"], 15, "bant_authority", ["questioning", "situational_judgment"]),
    cp("bant-n", "Need：必要性・課題", ["必要", "課題", "目的", "お困り"], 15, "bant_need", ["listening", "questioning"]),
    cp("bant-t", "Timeline：導入時期", ["時期", "いつ", "導入", "予定"], 15, "bant_timeline", ["questioning"]),
  ],
  fab: [
    cp("fab-f", "Feature：機能・特徴", ["機能", "特徴", "できる"], 20, "fab_feature", ["explanation"]),
    cp("fab-a", "Advantage：優位性", ["強み", "従来", "より", "違い"], 20, "fab_advantage", ["logical_communication", "explanation"]),
    cp("fab-b", "Benefit：顧客にとっての価値", ["お客様", "貴社", "効果", "価値", "負担を減ら"], 20, "fab_benefit", ["proposal", "explanation"]),
  ],
};

const salesScenario = (id: string, title: string, framework: Exclude<SalesFramework, "none">, description: string, initialMessage: string): TrainingScenario => ({
  id, title, trainingMode: "sales", category: "営業トレーニング", description,
  customerGoal: "自社に合う提案か判断したい", difficulty: "intermediate", customerPersona: "normal",
  communicationStyle: "analytical", salesFramework: framework, initialMessage,
  requiredCheckpoints: [...frameworkCheckpoints[framework], common.confirm, common.close],
  prohibitedBehaviors: [common.accuracy], escalationRules: [],
  goodResponsePatterns: [{
    id: `${id}-pattern`, title: `${framework.toUpperCase()}を活用する応対例`,
    checkpointIds: frameworkCheckpoints[framework].map((item) => item.id),
    exampleResponses: framework === "spin"
      ? ["現在の運用体制を伺えますか。その中で特に負担になっている点と、改善後に実現したい状態を教えてください。"]
      : framework === "bant"
        ? ["今回の目的と導入希望時期を伺えますか。ご予算やご判断に関わる方についても確認させてください。"]
        : ["会話練習を繰り返せる機能により、教育担当者の負担を減らしながら応対品質を整えられます。"],
  }],
});

export const scenarios: TrainingScenario[] = [
  ...serviceScenarios,
  salesScenario("sales-spin", "法人顧客への初回ヒアリング", "spin", "SPINの観点で現状と課題を確認します。", "新人教育の負担について相談したいです。"),
  salesScenario("sales-bant", "商談案件の見込み確認", "bant", "BANTの観点で案件条件を確認します。", "研修サービスを検討していますが、まだ条件は固まっていません。"),
  salesScenario("sales-fab", "サービス提案", "fab", "FABの観点で顧客価値を説明します。", "御社のサービスで何が改善できるのですか？"),
];

export const manualRules: TrainingManualRule[] = [{
  id: "fictional-pizza-manual", trainingMode: "customer_service", category: "電話応対",
  title: "架空店舗 ピッツァ・ルーチェ 電話応対マニュアル",
  instruction: "確認できた事実だけを案内し、お客様の情報と状況を確認します。判断範囲を超える場合は責任者へ引き継ぎます。",
  requiredActions: [common.greeting, common.identify, common.clarify, common.confirm, common.close],
  prohibitedActions: [common.accuracy], escalationConditions: [common.escalation],
}];
