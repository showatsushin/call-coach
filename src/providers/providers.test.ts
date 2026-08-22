import { describe, expect, it } from "vitest";
import { MockCustomerRoleplayProvider } from "./MockCustomerRoleplayProvider";
import { MockTrainingContentProvider } from "./MockTrainingContentProvider";
import type { ConversationMessage } from "../domain/models";

const traineeMessage: ConversationMessage = { id: "1", speaker: "trainee", text: "お名前と注文番号を確認します", actionType: "check", createdAt: "2026-01-01" };

describe("mock providers", () => {
  it("接客8本・営業3本を提供する", () => {
    const scenarios = new MockTrainingContentProvider().getScenarios();
    expect(scenarios.filter((s) => s.trainingMode === "customer_service")).toHaveLength(8);
    expect(scenarios.filter((s) => s.trainingMode === "sales")).toHaveLength(3);
  });

  it("シナリオを複製せずCommunicationStyleで発話を変える", () => {
    const scenario = new MockTrainingContentProvider().getScenarios()[2];
    const provider = new MockCustomerRoleplayProvider();
    const base = { scenario, customerPersona: "normal" as const, difficulty: "beginner" as const, messages: [traineeMessage] };
    const direct = provider.getNextReply({ ...base, communicationStyle: "direct" });
    const analytical = provider.getNextReply({ ...base, communicationStyle: "analytical" });
    expect(direct).toContain("結論から");
    expect(analytical).toContain("根拠や条件");
    expect(direct).not.toBe(analytical);
  });
});
