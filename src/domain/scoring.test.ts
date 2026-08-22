import { describe, expect, it } from "vitest";
import { scenarios } from "../data/mock-content";
import type { ConversationMessage } from "./models";
import { scoreTraining } from "./scoring";

const messages = (text: string): ConversationMessage[] => [{ id: "1", speaker: "trainee", text, createdAt: "2026-01-01T00:00:00Z" }];

describe("scoreTraining", () => {
  it("同じ会話を決定論的に採点する", () => {
    const scenario = scenarios.find((s) => s.id === "delivery-delay")!;
    const transcript = messages("お電話ありがとうございます。ご不便をおかけし申し訳ございません。お名前と注文番号、予定時刻を確認いたします。責任者へ引き継ぎます。マルゲリータですね。次の対応をご案内いたします。");
    expect(scoreTraining(scenario, transcript, "supportive")).toEqual(scoreTraining(scenario, transcript, "supportive"));
    expect(scoreTraining(scenario, transcript, "supportive").passed).toBe(true);
  });

  it("未確認の断定を禁止事項として検出する", () => {
    const scenario = scenarios.find((s) => s.id === "delivery-time")!;
    const result = scoreTraining(scenario, messages("絶対に18時に届きます"), "direct");
    expect(result.prohibitedViolations).toContain("未確認の内容を断定しない");
    expect(result.passed).toBe(false);
  });

  it("SPINの観点を順序に依存せず評価する", () => {
    const scenario = scenarios.find((s) => s.id === "sales-spin")!;
    const result = scoreTraining(scenario, messages("理想の状態と実現したい価値は何ですか。現在の体制、課題とその影響も教えてください。内容を確認して次をご案内いたします。"), "analytical");
    expect(result.checkpointResults.filter((r) => r.id.startsWith("spin-")).every((r) => r.passed)).toBe(true);
    expect(result.portableSkillResults.find((r) => r.skill === "questioning")?.score).toBe(100);
  });

  it.each([
    ["sales-bant", "予算と導入時期、必要な課題、承認する意思決定者を確認します。内容を確認してご案内いたします。", "bant-"],
    ["sales-fab", "機能と特徴をご説明します。従来より強みがあり、貴社の負担を減らす価値があります。内容を確認してご案内いたします。", "fab-"],
  ])("%s の標準Checkpointを評価する", (id, text, prefix) => {
    const scenario = scenarios.find((s) => s.id === id)!;
    const result = scoreTraining(scenario, messages(text), "analytical");
    expect(result.checkpointResults.filter((r) => r.id.startsWith(prefix)).every((r) => r.passed)).toBe(true);
  });

  it("観察対象がないPortable Skillは0点ではなく対象外にする", () => {
    const scenario = scenarios.find((s) => s.id === "regular-order")!;
    const result = scoreTraining(scenario, messages("ありがとうございます"), "supportive");
    expect(result.portableSkillResults.find((r) => r.skill === "proposal")?.score).toBeNull();
  });

  it("失敗Checkpointから次のおすすめを決定する", () => {
    const scenario = scenarios.find((s) => s.id === "delivery-delay")!;
    const result = scoreTraining(scenario, messages("絶対に届きます"), "direct");
    expect(result.recommendation.theme).toBe("確認してから約束する");
    expect(result.recommendation.nextTraining).toContain("もう一度");
  });

  it("必須と引継ぎを満たさない場合は不合格にする", () => {
    const scenario = scenarios.find((s) => s.id === "strong-complaint")!;
    const result = scoreTraining(scenario, messages("ありがとうございます"), "supportive");
    expect(result.passed).toBe(false);
    expect(result.recommendedEscalations).toContain("判断範囲を超えた場合に引き継ぐ");
  });
});
