import { describe, expect, it } from "vitest";
import { scenarios } from "../data/mock-content";
import type { TrainingAttempt } from "./models";
import { scoreTraining } from "./scoring";
import { summarizeAttempts } from "./dashboard";

const attempt = (score: number, passed: boolean): TrainingAttempt => ({
  id: `${score}`, scenarioId: "delivery-delay", scenarioTitle: "配達遅延", trainingMode: "customer_service",
  customerPersona: "normal", communicationStyle: "supportive", difficulty: "beginner", salesFramework: "none",
  startedAt: "2026-01-01", completedAt: "2026-01-01", score, passed, messages: [],
  checkpointResults: scoreTraining(scenarios[2], [], "supportive").checkpointResults,
  portableSkillResults: [],
});

describe("dashboard aggregation", () => {
  it("修了・再挑戦・最新点・最高点を集計する", () => {
    const result = summarizeAttempts([attempt(62, false), attempt(88, true)]);
    expect(result).toMatchObject({ attempts: 2, completed: 1, retry: 1, latest: 88, best: 88 });
    expect(result.weakestCheckpoint).not.toBe("まだありません");
  });
});
