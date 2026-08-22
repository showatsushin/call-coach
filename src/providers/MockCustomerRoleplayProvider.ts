import type { CommunicationStyle, ConversationMessage, CustomerPersona, Difficulty, TrainingScenario } from "../domain/models";

type RoleplayContext = {
  scenario: TrainingScenario;
  customerPersona: CustomerPersona;
  communicationStyle: CommunicationStyle;
  difficulty: Difficulty;
  messages: ConversationMessage[];
};

const personaPrefix: Record<CustomerPersona, string> = {
  normal: "", hurried: "急いでいるので、", angry: "正直かなり困っています。", elderly: "すみません、ゆっくりお願いできますか。", unclear: "ええと、うまく説明できないのですが、",
};
const styleSuffix: Record<CommunicationStyle, string> = {
  direct: "結論から教えてください。", expressive: "きちんと話を聞いてもらえると助かります。",
  supportive: "どう対応してもらえるか少し不安です。", analytical: "確認した根拠や条件も教えてください。",
};

export class MockCustomerRoleplayProvider {
  getNextReply({ scenario, customerPersona, communicationStyle, difficulty, messages }: RoleplayContext): string {
    const traineeText = messages.filter((m) => m.speaker === "trainee").map((m) => m.text).join(" ");
    const turn = messages.filter((m) => m.speaker === "trainee").length;
    const asksIdentity = /名前|注文番号|電話番号|注文/.test(traineeText);
    const asksSituation = /いつ|何時|状況|商品|内容|課題|現状|予算|時期/.test(traineeText);
    const prefix = personaPrefix[customerPersona];

    if (turn === 1 && asksIdentity) return `${prefix}名前は山田、注文番号は1234です。${styleSuffix[communicationStyle]}`;
    if (turn <= 2 && asksSituation) {
      if (scenario.trainingMode === "sales") return `${prefix}今は教育担当が毎回対応していて、時間の負担が課題です。${styleSuffix[communicationStyle]}`;
      return `${prefix}注文したのはマルゲリータ1枚で、予定は18時でした。${styleSuffix[communicationStyle]}`;
    }
    if (difficulty === "advanced" && turn < 3) return `${prefix}それだけではまだ納得できません。もう少し具体的に説明してください。`;
    if (turn >= 3) return "分かりました。その対応でお願いします。";
    return `${prefix}こちらはどうすればよいでしょうか。${styleSuffix[communicationStyle]}`;
  }
}
