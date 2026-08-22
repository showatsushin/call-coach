import type { TrainingAttempt } from "./models";

export type AttemptSummary = { attempts: number; completed: number; retry: number; latest: number; best: number; weakestCheckpoint: string };

export function summarizeAttempts(attempts: TrainingAttempt[]): AttemptSummary {
  const failures = new Map<string, number>();
  attempts.forEach((attempt) => attempt.checkpointResults.filter((r) => !r.passed && r.kind !== "prohibited").forEach((r) => failures.set(r.title, (failures.get(r.title) ?? 0) + 1)));
  return {
    attempts: attempts.length,
    completed: attempts.filter((a) => a.passed).length,
    retry: attempts.filter((a) => !a.passed).length,
    latest: attempts.at(-1)?.score ?? 0,
    best: attempts.length ? Math.max(...attempts.map((a) => a.score)) : 0,
    weakestCheckpoint: [...failures.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "まだありません",
  };
}
