import type { CommunicationStyle, ConversationMessage, PortableSkill, PortableSkillResult, TrainingScenario, TrainingScore } from "./models";

const allSkills: PortableSkill[] = ["listening", "questioning", "explanation", "summarization", "empathy", "logical_communication", "proposal", "situational_judgment"];

export function scoreTraining(scenario: TrainingScenario, messages: ConversationMessage[], style: CommunicationStyle): TrainingScore {
  const trainee = messages.filter((m) => m.speaker === "trainee");
  const all = [...scenario.requiredCheckpoints, ...scenario.prohibitedBehaviors, ...scenario.escalationRules];
  const checkpointResults = all.map((checkpoint) => {
    const evidence = trainee.filter((m) => checkpoint.matchTerms.some((term) => m.text.includes(term)));
    const matched = evidence.length > 0;
    const passed = checkpoint.kind === "prohibited" ? !matched : matched;
    return {
      ...checkpoint, passed,
      earnedScore: checkpoint.kind === "prohibited" ? (matched ? checkpoint.score : 0) : (passed ? checkpoint.score : 0),
      evidenceMessageIds: evidence.map((m) => m.id),
      evidenceTexts: evidence.map((m) => m.text),
      explanation: checkpoint.kind === "prohibited"
        ? (passed ? "禁止表現は確認されませんでした" : `「${checkpoint.matchTerms.join("／")}」に該当する表現がありました`)
        : (passed ? "会話中の発話で確認できました" : "今回の会話では確認できませんでした"),
    };
  });

  const positiveMax = all.filter((c) => c.kind !== "prohibited").reduce((sum, c) => sum + c.score, 0);
  const earned = checkpointResults.reduce((sum, r) => sum + r.earnedScore, 0);
  const total = Math.max(0, Math.min(100, Math.round((earned / Math.max(positiveMax, 1)) * 100)));
  const portableSkillResults: PortableSkillResult[] = allSkills.map((skill) => {
    const observed = checkpointResults.filter((r) => r.portableSkills.includes(skill) && r.kind !== "prohibited");
    const successful = observed.filter((r) => r.passed);
    const score = observed.length ? Math.round((successful.length / observed.length) * 100) : null;
    return {
      skill, score, maxScore: 100, observedCheckpointIds: observed.map((r) => r.id),
      successfulCheckpointIds: successful.map((r) => r.id), evidenceMessageIds: successful.flatMap((r) => r.evidenceMessageIds),
      feedback: score === null ? "今回の会話では評価対象外です" : score >= 70 ? "今回の会話で良い行動が確認できました" : "次回、関連する確認や説明を意識しましょう",
    };
  });
  const requiredFailed = checkpointResults.filter((r) => r.requiredForPass && !r.passed);
  const prohibited = checkpointResults.filter((r) => r.kind === "prohibited" && !r.passed);
  const styleHint: Record<CommunicationStyle, string> = {
    direct: "結論を先に簡潔に伝える", expressive: "相手の反応を確認しながら会話する",
    supportive: "不安を確認し安心材料を伝える", analytical: "根拠や条件を正確に説明する",
  };
  const styleObserved = trainee.some((m) => {
    const terms: Record<CommunicationStyle, RegExp> = { direct: /結論|まず|対応/, expressive: /いかが|お気持ち|ご不便/, supportive: /安心|ご心配|丁寧/, analytical: /確認|理由|条件|正確/ };
    return terms[style].test(m.text);
  });
  const failed = checkpointResults.filter((r) => !r.passed && r.kind !== "prohibited");
  const focus = failed.slice(0, 2).map((r) => r.title);
  const recommendation = {
    theme: prohibited.length ? "確認してから約束する" : focus[0] ?? "良い応対を安定させる",
    nextTraining: total < 70 ? `${scenario.title}・${scenario.difficulty === "beginner" ? "初級" : scenario.difficulty === "intermediate" ? "中級" : "上級"}をもう一度` : `${scenario.category}の次の難易度へ`,
    focusCheckpointTitles: focus,
  };
  return {
    total, passed: total >= 70 && requiredFailed.length === 0 && prohibited.length === 0,
    checkpointResults, portableSkillResults,
    strengths: checkpointResults.filter((r) => r.passed && r.kind !== "prohibited").map((r) => r.title),
    improvements: [...checkpointResults.filter((r) => !r.passed && r.kind !== "prohibited").map((r) => r.title), ...(!styleObserved ? [`会話スタイルへの適応：${styleHint[style]}`] : [])],
    missedRequiredItems: requiredFailed.map((r) => r.title),
    prohibitedViolations: prohibited.map((r) => r.title),
    recommendedEscalations: checkpointResults.filter((r) => r.kind === "escalation" && !r.passed).map((r) => r.title),
    recommendation,
  };
}
