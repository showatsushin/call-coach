export type TrainingMode = "customer_service" | "sales" | "communication";
export type Difficulty = "beginner" | "intermediate" | "advanced";
export type CustomerPersona = "normal" | "hurried" | "angry" | "elderly" | "unclear";
export type CommunicationStyle = "direct" | "expressive" | "supportive" | "analytical";
export type SalesFramework = "none" | "spin" | "bant" | "fab";
export type PortableSkill =
  | "listening" | "questioning" | "explanation" | "summarization"
  | "empathy" | "logical_communication" | "proposal" | "situational_judgment";
export type StandardCategory =
  | "greeting" | "listening" | "identification" | "clarification" | "empathy"
  | "accuracy" | "explanation" | "escalation" | "confirmation" | "closing"
  | "spin_situation" | "spin_problem" | "spin_implication" | "spin_need_payoff"
  | "bant_budget" | "bant_authority" | "bant_need" | "bant_timeline"
  | "fab_feature" | "fab_advantage" | "fab_benefit" | "style_adaptation";
export type CheckpointKind = "required" | "prohibited" | "escalation" | "completion" | "framework";
export type ConversationActionType = "speak" | "hold" | "check" | "escalate" | "end";
export type CustomerEmotion = "calm" | "concerned" | "frustrated" | "angry";
export type CustomerTrust = "low" | "neutral" | "high";

export type CustomerState = {
  emotion: CustomerEmotion;
  trust: CustomerTrust;
  resolved: boolean;
  explanation: string;
};

export type TrainingCheckpoint = {
  id: string;
  kind: CheckpointKind;
  title: string;
  description: string;
  matchTerms: string[];
  score: number;
  requiredForPass?: boolean;
  portableSkills: PortableSkill[];
  standardCategory?: StandardCategory;
  source: "company" | "standard";
};

export type GoodResponsePattern = {
  id: string;
  title: string;
  checkpointIds: string[];
  exampleResponses: string[];
};

export type TrainingManualRule = {
  id: string;
  trainingMode: TrainingMode;
  category: string;
  title: string;
  instruction: string;
  requiredActions: TrainingCheckpoint[];
  prohibitedActions: TrainingCheckpoint[];
  escalationConditions: TrainingCheckpoint[];
};

export type TrainingScenario = {
  id: string;
  trainingMode: TrainingMode;
  title: string;
  category: string;
  description: string;
  customerGoal: string;
  difficulty: Difficulty;
  customerPersona: CustomerPersona;
  communicationStyle: CommunicationStyle;
  salesFramework: SalesFramework;
  initialMessage: string;
  requiredCheckpoints: TrainingCheckpoint[];
  prohibitedBehaviors: TrainingCheckpoint[];
  escalationRules: TrainingCheckpoint[];
  goodResponsePatterns: GoodResponsePattern[];
};

export type ConversationMessage = {
  id: string;
  speaker: "customer" | "trainee";
  text: string;
  createdAt: string;
  actionType?: ConversationActionType;
};

export type CheckpointResult = TrainingCheckpoint & {
  passed: boolean;
  earnedScore: number;
  evidenceMessageIds: string[];
  evidenceTexts: string[];
  explanation: string;
};

export type PortableSkillResult = {
  skill: PortableSkill;
  score: number | null;
  maxScore: number;
  observedCheckpointIds: string[];
  successfulCheckpointIds: string[];
  evidenceMessageIds: string[];
  feedback: string;
};

export type TrainingScore = {
  total: number;
  passed: boolean;
  checkpointResults: CheckpointResult[];
  portableSkillResults: PortableSkillResult[];
  strengths: string[];
  improvements: string[];
  missedRequiredItems: string[];
  prohibitedViolations: string[];
  recommendedEscalations: string[];
  recommendation: TrainingRecommendation;
};

export type TrainingRecommendation = {
  theme: string;
  nextTraining: string;
  focusCheckpointTitles: string[];
};

export type TrainingAttempt = {
  id: string;
  scenarioId: string;
  scenarioTitle: string;
  trainingMode: TrainingMode;
  customerPersona: CustomerPersona;
  communicationStyle: CommunicationStyle;
  difficulty: Difficulty;
  salesFramework: SalesFramework;
  startedAt: string;
  completedAt: string;
  score: number;
  passed: boolean;
  checkpointResults: CheckpointResult[];
  portableSkillResults: PortableSkillResult[];
  messages: ConversationMessage[];
};

export type ManualRuleCandidate = {
  id: string;
  kind: "required" | "prohibited" | "escalation" | "completion";
  title: string;
  instruction: string;
  approved: boolean;
};

export type AuthoringDraft = {
  manualName: string;
  sourceLabel: string;
  candidates: ManualRuleCandidate[];
  responsePatterns: GoodResponsePattern[];
  rulesApproved: boolean;
  patternsApproved: boolean;
};
