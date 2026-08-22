import { manualRules, scenarios } from "../data/mock-content";
import type { TrainingManualRule, TrainingScenario } from "../domain/models";

export interface TrainingContentProvider {
  getScenarios(): TrainingScenario[];
  getManualRules(): TrainingManualRule[];
}

export class MockTrainingContentProvider implements TrainingContentProvider {
  getScenarios() { return scenarios; }
  getManualRules() { return manualRules; }
}
