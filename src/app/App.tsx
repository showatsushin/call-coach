import { useMemo, useState } from "react";
import { difficultyLabels, modeLabels, personaLabels, skillLabels, styleLabels } from "../domain/labels";
import type { CommunicationStyle, ConversationMessage, CustomerPersona, Difficulty, TrainingAttempt, TrainingScenario, TrainingScore } from "../domain/models";
import { scoreTraining } from "../domain/scoring";
import { initialCustomerState, updateCustomerState } from "../domain/customer-state";
import { summarizeAttempts } from "../domain/dashboard";
import { MockCustomerRoleplayProvider } from "../providers/MockCustomerRoleplayProvider";
import { MockTrainingContentProvider } from "../providers/MockTrainingContentProvider";
import type { AuthoringDraft, ConversationActionType, CustomerState } from "../domain/models";

const contentProvider = new MockTrainingContentProvider();
const roleplayProvider = new MockCustomerRoleplayProvider();
const personas: CustomerPersona[] = ["normal", "hurried", "angry", "elderly", "unclear"];
const difficulties: Difficulty[] = ["beginner", "intermediate", "advanced"];
const styles: CommunicationStyle[] = ["direct", "expressive", "supportive", "analytical"];
type View = "home" | "prepare" | "training" | "result" | "growth" | "authoring" | "admin";

const uid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [scenario, setScenario] = useState<TrainingScenario>();
  const [persona, setPersona] = useState<CustomerPersona>("normal");
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [style, setStyle] = useState<CommunicationStyle>("supportive");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [score, setScore] = useState<TrainingScore>();
  const [attempts, setAttempts] = useState<TrainingAttempt[]>([]);
  const [customerState, setCustomerState] = useState<CustomerState>(initialCustomerState);
  const [hintsOn, setHintsOn] = useState(true);
  const [view, setView] = useState<View>("home");
  const scenarios = useMemo(() => loaded ? contentProvider.getScenarios() : [], [loaded]);

  const start = () => {
    if (!scenario) return;
    const now = new Date().toISOString();
    setStartedAt(now); setScore(undefined); setCustomerState(initialCustomerState); setView("training");
    setMessages([{ id: uid(), speaker: "customer", text: scenario.initialMessage, createdAt: now }]);
  };

  const act = (actionType: ConversationActionType, providedText = input) => {
    if (!scenario || (actionType === "speak" && !providedText.trim())) return;
    const actionText: Record<Exclude<ConversationActionType, "speak" | "end">, string> = {
      hold: "少々お待ちください。保留にして確認いたします。",
      check: "状況を確認いたします。お名前と注文番号を教えてください。",
      escalate: "私の判断範囲を超えるため、責任者へ引き継ぎます。",
    };
    const text = actionType === "speak" ? providedText.trim() : actionType === "end" ? "応対を終了します。" : actionText[actionType];
    if (!text) return;
    const trainee: ConversationMessage = { id: uid(), speaker: "trainee", text, actionType, createdAt: new Date().toISOString() };
    const withTrainee = [...messages, trainee];
    setCustomerState((current) => updateCustomerState(current, text, actionType));
    if (actionType === "end") { setMessages(withTrainee); setInput(""); return; }
    const reply = roleplayProvider.getNextReply({ scenario, customerPersona: persona, communicationStyle: style, difficulty, messages: withTrainee });
    setMessages([...withTrainee, { id: uid(), speaker: "customer", text: reply, createdAt: new Date().toISOString() }]);
    setInput("");
  };

  const finish = () => {
    if (!scenario) return;
    const result = scoreTraining(scenario, messages, style);
    const completedAt = new Date().toISOString();
    setScore(result);
    setAttempts((current) => [...current, {
      id: uid(), scenarioId: scenario.id, scenarioTitle: scenario.title, trainingMode: scenario.trainingMode,
      customerPersona: persona, communicationStyle: style, difficulty, salesFramework: scenario.salesFramework,
      startedAt, completedAt, score: result.total, passed: result.passed,
      checkpointResults: result.checkpointResults, portableSkillResults: result.portableSkillResults,
      messages,
    }]);
    setView("result");
  };

  const choose = (next: TrainingScenario) => {
    setScenario(next); setPersona(next.customerPersona); setDifficulty(next.difficulty); setStyle(next.communicationStyle);
    setMessages([]); setScore(undefined); setView("prepare");
  };

  if (!loaded) return <EmptyState onLoad={() => setLoaded(true)} />;

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" onClick={() => setView("home")}><span className="brand-mark">C</span>CallCoach</a>
        <div className="header-copy"><strong>何度でも、ひとりで練習。</strong><span>会社の仕事を覚える。自分のスキルも伸ばす。</span></div>
        <nav className="top-nav"><button className={view === "home" || view === "prepare" || view === "training" || view === "result" ? "active" : ""} onClick={() => setView("home")}>トレーニング</button><button className={view === "growth" ? "active" : ""} onClick={() => setView("growth")}>成長</button><button className={view === "authoring" ? "active" : ""} onClick={() => setView("authoring")}>研修を作る</button><button className={view === "admin" ? "active" : ""} onClick={() => setView("admin")}>教育状況</button></nav>
      </header>

      <nav className="mobile-nav" aria-label="画面切替">
        <button className={view === "home" || view === "prepare" ? "active" : ""} onClick={() => setView("home")}>研修</button>
        <button className={view === "training" ? "active" : ""} onClick={() => setView("training")} disabled={!messages.length}>トレーニング</button>
        <button className={view === "result" ? "active" : ""} onClick={() => setView("result")} disabled={!score}>結果</button>
      </nav>

      {view === "home" ? <TrainingHome scenarios={scenarios} attempts={attempts} onSelect={choose} /> :
       view === "growth" ? <Dashboard attempts={attempts} onBack={() => setView("home")} /> :
       view === "authoring" ? <Authoring /> :
       view === "admin" ? <AdminDashboard /> :
       view === "result" && score && scenario ? <Result score={score} scenario={scenario} messages={messages} onRetry={start} onGrowth={() => setView("growth")} /> :
       <main className="workspace" id="top">
         <aside className="panel scenario-panel">
           <ScenarioPicker scenarios={scenarios} selected={scenario} onSelect={choose} />
         </aside>
         <section className={`panel training-panel ${view === "training" || view === "prepare" ? "mobile-current" : ""}`}>
           {!scenario ? <Welcome /> : messages.length && view === "training"
             ? <Training scenario={scenario} messages={messages} input={input} setInput={setInput} onAction={act} onFinish={finish} customerState={customerState} hintsOn={hintsOn} setHintsOn={setHintsOn} persona={persona} difficulty={difficulty} style={style} />
             : <Setup scenario={scenario} persona={persona} difficulty={difficulty} style={style} setPersona={setPersona} setDifficulty={setDifficulty} setStyle={setStyle} onStart={start} />}
         </section>
         <aside className="panel guide-panel"><Guide scenario={scenario} messages={messages} /></aside>
       </main>}
    </div>
  );
}

function EmptyState({ onLoad }: { onLoad: () => void }) {
  return <main className="empty-state">
    <div className="empty-brand"><span className="brand-mark">C</span>CallCoach</div>
    <div className="empty-icon" aria-hidden="true">⌁</div>
    <p className="eyebrow">TRAINING WORKSPACE</p>
    <h1>トレーニング環境は<br />まだありません</h1>
    <p>会社の正しい応対をもとに、ひとりで何度でも<br className="desktop-only" />会話練習ができる環境をつくります。</p>
    <button className="primary large" onClick={onLoad}>サンプル環境で試す <span>→</span></button>
    <small>架空の店舗・顧客情報を使用したデモです</small>
  </main>;
}

function ScenarioPicker({ scenarios, selected, onSelect }: { scenarios: TrainingScenario[]; selected?: TrainingScenario; onSelect: (s: TrainingScenario) => void }) {
  return <><div className="panel-heading"><p className="eyebrow">STEP 01</p><h2>シナリオを選ぶ</h2></div>
    {(["customer_service", "sales"] as const).map((mode) => <section className="scenario-group" key={mode}>
      <h3>{modeLabels[mode]} <span>{scenarios.filter((s) => s.trainingMode === mode).length}</span></h3>
      {scenarios.filter((s) => s.trainingMode === mode).map((s) => <button key={s.id} className={`scenario-card ${selected?.id === s.id ? "selected" : ""}`} onClick={() => onSelect(s)}>
        <span className="scenario-symbol">{mode === "sales" ? "↗" : "☎"}</span><span><strong>{s.title}</strong><small>{s.category}</small></span><span>›</span>
      </button>)}
    </section>)}</>;
}

function Welcome() {
  return <div className="welcome"><span className="welcome-art">◌</span><p className="eyebrow">READY TO PRACTICE</p><h1>シナリオを選んで<br />練習を始めましょう</h1><p>左の一覧から、練習したい場面を選択してください。</p></div>;
}

function Setup({ scenario, persona, difficulty, style, setPersona, setDifficulty, setStyle, onStart }: {
  scenario: TrainingScenario; persona: CustomerPersona; difficulty: Difficulty; style: CommunicationStyle;
  setPersona: (v: CustomerPersona) => void; setDifficulty: (v: Difficulty) => void; setStyle: (v: CommunicationStyle) => void; onStart: () => void;
}) {
  return <div className="setup preparation">
    <p className="eyebrow">TRAINING PREPARATION</p><h1>{scenario.title}</h1><p>{scenario.description}</p>
    <div className="prep-facts"><div><span>TrainingMode</span><strong>{modeLabels[scenario.trainingMode]}</strong></div><div><span>顧客の目的</span><strong>{scenario.customerGoal}</strong></div><div><span>想定時間</span><strong>約 5分</strong></div><div><span>合格条件</span><strong>70点以上＋必須項目</strong></div></div>
    {scenario.salesFramework !== "none" && <div className="framework-badge">一般的な研修フレームワーク：{scenario.salesFramework.toUpperCase()}</div>}
    <label>顧客タイプ<select value={persona} onChange={(e) => setPersona(e.target.value as CustomerPersona)}>{personas.map((v) => <option key={v} value={v}>{personaLabels[v]}</option>)}</select></label>
    <label>難易度<select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>{difficulties.map((v) => <option key={v} value={v}>{difficultyLabels[v]}</option>)}</select></label>
    <label>会話スタイル<select value={style} onChange={(e) => setStyle(e.target.value as CommunicationStyle)}>{styles.map((v) => <option key={v} value={v}>{styleLabels[v]}</option>)}</select></label>
    <p className="notice">会話スタイルは練習用のペルソナです。人物の性格を診断・断定するものではありません。</p>
    <div className="prep-columns"><section><h3>今回の重点ポイント</h3><ul>{[...scenario.requiredCheckpoints.filter((c) => c.requiredForPass), ...scenario.prohibitedBehaviors, ...scenario.escalationRules].map((c) => <li key={c.id}>{c.title}</li>)}</ul></section><section><h3>参照マニュアル</h3><p>ピッツァ・ルーチェ 電話応対マニュアル</p><h3>標準研修Checkpoint</h3><p>{scenario.requiredCheckpoints.filter((c) => c.source === "standard").map((c) => c.standardCategory).join(" / ")}</p></section></div>
    <button className="primary" onClick={onStart}>トレーニングを開始する →</button>
  </div>;
}

function Training({ scenario, messages, input, setInput, onAction, onFinish, customerState, hintsOn, setHintsOn, persona, difficulty, style }: { scenario: TrainingScenario; messages: ConversationMessage[]; input: string; setInput: (v: string) => void; onAction: (type: ConversationActionType, text?: string) => void; onFinish: () => void; customerState: CustomerState; hintsOn: boolean; setHintsOn: (v: boolean) => void; persona: CustomerPersona; difficulty: Difficulty; style: CommunicationStyle }) {
  const turns = messages.filter((m) => m.speaker === "trainee").length;
  return <div className="training">
    <div className="training-head"><div><p className="eyebrow">LIVE PRACTICE · TURN {turns}</p><h2>{scenario.title}</h2><small>{difficultyLabels[difficulty]}・{personaLabels[persona]}・{styleLabels[style].slice(0, 3)}</small></div><div className="state-pills"><span>{customerState.emotion}</span><span>信頼 {customerState.trust}</span><button onClick={() => setHintsOn(!hintsOn)}>ヒント {hintsOn ? "ON" : "OFF"}</button></div></div>
    <div className="demo-label">デモ用ルールベース顧客シミュレーター</div>
    <div className="state-reason">顧客状態：{customerState.explanation}</div>
    <div className="messages" aria-live="polite">{messages.map((m) => <div key={m.id} className={`message ${m.speaker}`}><span>{m.speaker === "customer" ? "顧客" : "あなた"}</span><p>{m.text}</p></div>)}</div>
    {hintsOn && <div className="inline-hint">ヒント：確認できた内容だけを案内し、必要なら責任者へ引き継ぎましょう。</div>}
    <div className="action-bar"><button onClick={() => onAction("hold")}>Ⅱ 保留する</button><button onClick={() => onAction("check")}>✓ 確認する</button><button onClick={() => onAction("escalate")}>↗ 責任者へ引き継ぐ</button><button onClick={() => onAction("end")}>□ 応対を終了する</button></div>
    <div className="composer"><textarea aria-label="受講者の回答" value={input} onChange={(e) => setInput(e.target.value)} placeholder="応対を入力してください…" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onAction("speak"); } }} /><button className="send" onClick={() => onAction("speak")} aria-label="送信">↑</button></div>
    <div className="training-actions"><small>現在はテキスト練習です。会話入力は将来音声へ交換できます。</small><button className="quiet-button" onClick={onFinish} disabled={!messages.some((m) => m.speaker === "trainee")}>採点して終了</button></div>
  </div>;
}

function Guide({ scenario, messages }: { scenario?: TrainingScenario; messages: ConversationMessage[] }) {
  const text = messages.filter((m) => m.speaker === "trainee").map((m) => m.text).join(" ");
  if (!scenario) return <div className="guide-empty"><p className="eyebrow">YOUR GUIDE</p><h2>マニュアルと進捗</h2><p>シナリオを選ぶと、承認済みルールと練習の観点を確認できます。</p></div>;
  const checkpoints = [...scenario.requiredCheckpoints, ...scenario.escalationRules];
  return <><div className="panel-heading"><p className="eyebrow">YOUR GUIDE</p><h2>マニュアルと進捗</h2></div>
    <div className="manual-card"><span>架空マニュアル</span><strong>ピッツァ・ルーチェ</strong><p>確認できた事実だけを案内し、判断範囲を超える場合は責任者へ引き継ぎます。</p></div>
    <h3 className="mini-heading">今回のチェックポイント</h3>
    <ul className="check-list">{checkpoints.map((c) => { const met = c.matchTerms.some((term) => text.includes(term)); return <li key={c.id} className={met ? "met" : ""}><span>{met ? "✓" : "○"}</span>{c.title}</li>; })}</ul>
    <div className="standard-note"><strong>評価の土台</strong><p>会社固有ルールを正本とし、一般的な研修観点を組み合わせています。</p></div>
  </>;
}

function Result({ score, scenario, messages, onRetry, onGrowth }: { score: TrainingScore; scenario: TrainingScenario; messages: ConversationMessage[]; onRetry: () => void; onGrowth: () => void }) {
  const company = score.checkpointResults.filter((r) => r.source === "company");
  const standard = score.checkpointResults.filter((r) => r.source === "standard");
  return <main className="result-page">
    <div className="result-hero"><div><p className="eyebrow">TRAINING RESULT</p><h1>{scenario.title}</h1><span className={`status ${score.passed ? "pass" : "retry"}`}>{score.passed ? "修了" : "要再挑戦"}</span></div><div className="score-ring"><strong>{score.total}</strong><span>/ 100</span></div></div>
    <p className="result-disclaimer">標準トレーニングとPortable Skillsは、今回の会話で観察できた行動の振り返りです。人物診断・適性診断・人事評価ではありません。</p>
    <div className="result-grid">
      <ResultLayer number="01" title="会社・業務ルール" subtitle="承認済みの店舗マニュアル" results={company} />
      <ResultLayer number="02" title="標準トレーニング" subtitle={scenario.salesFramework === "none" ? "接客基本・会話スタイルへの適応" : `${scenario.salesFramework.toUpperCase()}・会話スタイルへの適応`} results={standard} showStandardCatalog={scenario.salesFramework === "none"} />
      <section className="result-card portable"><div className="layer-title"><span>03</span><div><h2>今回確認できたPortable Skills</h2><p>仕事を越えて活かせる会話行動</p></div></div>
        <div className="skill-grid">{score.portableSkillResults.map((r) => <div key={r.skill} className="skill-row"><div><strong>{skillLabels[r.skill]}</strong><small>{r.feedback}</small></div><span>{r.score === null ? "対象外" : `${r.score}`}</span></div>)}</div>
      </section>
    </div>
    <section className="recommendation"><p className="eyebrow">NEXT ACTION</p><h2>今回の改善テーマ</h2><strong>「{score.recommendation.theme}」</strong><div><span>次におすすめ</span><b>{score.recommendation.nextTraining}</b></div><div><span>重点練習</span><b>{score.recommendation.focusCheckpointTitles.join(" / ") || "現在の応対を安定させる"}</b></div></section>
    <section className="responses"><p className="eyebrow">GOOD RESPONSE PATTERNS</p><h2>応対例</h2><p>一つの正解文ではありません。満たすべき観点を別の言い方で表した例です。</p>{scenario.goodResponsePatterns.map((p) => <div key={p.id}><strong>{p.title}</strong>{p.exampleResponses.map((e) => <blockquote key={e}>{e}</blockquote>)}</div>)}</section>
    <details className="evidence"><summary>証拠となる受講者発話を見る</summary>{messages.filter((m) => m.speaker === "trainee").map((m) => <p key={m.id}>「{m.text}」</p>)}</details>
    <div className="result-actions"><button className="primary retry-primary" onClick={onRetry}>同じ条件で再挑戦 →</button><button className="quiet-button" onClick={onGrowth}>成長を見る</button></div>
  </main>;
}

function ResultLayer({ number, title, subtitle, results, showStandardCatalog = false }: { number: string; title: string; subtitle: string; results: TrainingScore["checkpointResults"]; showStandardCatalog?: boolean }) {
  const standardCatalog = [["greeting", "Greeting"], ["listening", "Listening"], ["identification", "Identification"], ["clarification", "Clarification"], ["empathy", "Empathy"], ["accuracy", "Accuracy"], ["explanation", "Explanation"], ["escalation", "Escalation"], ["confirmation", "Confirmation"], ["closing", "Closing"]];
  const shown = showStandardCatalog ? standardCatalog.map(([category, label]) => ({ label, result: results.find((r) => r.standardCategory === category) })) : [];
  return <section className="result-card"><div className="layer-title"><span>{number}</span><div><h2>{title}</h2><p>{subtitle}</p></div></div><ul className="result-list">{showStandardCatalog ? shown.map(({ label, result }) => <li key={label} className={result ? result.passed ? "ok" : "ng" : "na"}><span>{result ? result.passed ? "✓" : "×" : "—"}</span><div><strong>{label}</strong><small>{result?.explanation ?? "今回のシナリオでは評価対象外"}</small>{result?.evidenceTexts[0] && <q>{result.evidenceTexts[0]}</q>}</div></li>) : results.map((r) => <li key={r.id} className={r.passed ? "ok" : "ng"}><span>{r.passed ? "✓" : "×"}</span><div><strong>{r.title}</strong><small>{r.explanation}</small>{r.evidenceTexts[0] && <q>{r.evidenceTexts[0]}</q>}</div></li>)}</ul></section>;
}

function TrainingHome({ scenarios, attempts, onSelect }: { scenarios: TrainingScenario[]; attempts: TrainingAttempt[]; onSelect: (s: TrainingScenario) => void }) {
  const summary = summarizeAttempts(attempts);
  const latestSkills = attempts.at(-1)?.portableSkillResults.filter((r) => r.score !== null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const recommended = attempts.length ? scenarios.find((s) => s.id === attempts.at(-1)?.scenarioId) ?? scenarios[0] : scenarios.find((s) => s.id === "delivery-delay") ?? scenarios[0];
  return <main className="home-page">
    <section className="home-hero"><div><p className="eyebrow">MY TRAINING</p><h1>仕事を覚える。<br /><em>自分のスキルも伸ばす。</em></h1><p>会社の正しい応対をもとに、ひとりで何度でも実務練習。</p></div><div className="home-stats"><div><span>練習回数</span><strong>{summary.attempts}</strong></div><div><span>最新点</span><strong>{summary.latest}<small>点</small></strong></div><div><span>最高点</span><strong>{summary.best}<small>点</small></strong></div></div></section>
    {recommended && <section className="recommend-card"><div><p className="eyebrow">TODAY'S PICK</p><h2>今日のおすすめ研修</h2><strong>{recommended.title}</strong><p>{recommended.description}</p><div className="tag-row"><span>{modeLabels[recommended.trainingMode]}</span><span>{difficultyLabels[recommended.difficulty]}</span><span>約5分</span></div></div><button className="primary" onClick={() => onSelect(recommended)}>研修準備へ →</button></section>}
    <div className="home-status-row"><div><span>未修了</span><strong>{Math.max(0, scenarios.length - new Set(attempts.map((a) => a.scenarioId)).size)}</strong></div><div><span>要再挑戦</span><strong>{summary.retry}</strong></div><div><span>修了済み</span><strong>{summary.completed}</strong></div><div><span>最近伸びたPortable Skill</span><strong className="small-value">{latestSkills?.[0] ? skillLabels[latestSkills[0].skill] : "練習後に表示"}</strong></div><div><span>苦手なCheckpoint</span><strong className="small-value">{summary.weakestCheckpoint}</strong></div></div>
    <section className="catalog"><div className="section-title"><p className="eyebrow">TRAINING CATALOG</p><h2>研修を選ぶ</h2></div>{(["customer_service", "sales"] as const).map((mode) => <div className="catalog-group" key={mode}><h3>{modeLabels[mode]}</h3><div className="catalog-grid">{scenarios.filter((s) => s.trainingMode === mode).map((s) => { const last = [...attempts].reverse().find((a) => a.scenarioId === s.id); return <button key={s.id} onClick={() => onSelect(s)}><span className="scenario-symbol">{mode === "sales" ? "↗" : "☎"}</span><strong>{s.title}</strong><small>{s.category}・{difficultyLabels[s.difficulty]}</small><em className={last?.passed ? "done" : ""}>{last ? `${last.score}点` : "未着手"}</em></button>; })}</div></div>)}</section>
    <section className="recent-home"><h2>最近の練習</h2>{attempts.length ? [...attempts].reverse().slice(0, 3).map((a) => <div key={a.id}><strong>{a.scenarioTitle}</strong><span>{a.score}点</span><small>{a.passed ? "修了" : "要再挑戦"}</small></div>) : <p>まだ練習履歴がありません。今日のおすすめから始めましょう。</p>}</section>
  </main>;
}

const mockDraft: AuthoringDraft = {
  manualName: "配達トラブル対応マニュアル", sourceLabel: "架空資料：delivery_support_manual.pdf",
  candidates: [
    { id: "a1", kind: "required", title: "注文者情報を確認", instruction: "氏名または注文番号を確認する", approved: false },
    { id: "a2", kind: "prohibited", title: "未確認の到着時刻を断定しない", instruction: "配送状況の確認前に約束しない", approved: false },
    { id: "a3", kind: "escalation", title: "強いクレームは責任者へ", instruction: "判断範囲を超える場合に引き継ぐ", approved: false },
    { id: "a4", kind: "completion", title: "次の対応を案内", instruction: "確認方法または折返しを伝える", approved: false },
  ],
  responsePatterns: [{ id: "author-pattern", title: "配達遅延対応の複数パターン", checkpointIds: ["empathy", "identification", "escalation"], exampleResponses: ["A：謝意 → 本人確認 → 配送状況確認 → 到着目安確認", "B：謝意 → 注文番号確認 → 店舗確認 → 次の案内", "C：状況確認 → 問題把握 → 責任者引継ぎ"] }],
  rulesApproved: false, patternsApproved: false,
};

function Authoring() {
  const [step, setStep] = useState<"empty" | "review" | "patterns" | "complete">("empty");
  const [draft, setDraft] = useState(mockDraft);
  const approveRules = () => { setDraft((d) => ({ ...d, rulesApproved: true, candidates: d.candidates.map((c) => ({ ...c, approved: true })) })); setStep("patterns"); };
  return <main className="authoring-page"><p className="eyebrow">TRAINING BUILDER</p><h1>研修を作る</h1><p className="lead">会社のルールを、人が確認して研修の正本にします。</p><div className="builder-steps"><span className={step !== "empty" ? "done" : "active"}>1 マニュアル</span><span className={step === "review" ? "active" : draft.rulesApproved ? "done" : ""}>2 ルール確認</span><span className={step === "patterns" ? "active" : draft.patternsApproved ? "done" : ""}>3 応対例</span><span className={step === "complete" ? "active" : ""}>4 登録</span></div>
    {step === "empty" && <section className="upload-mock"><div>PDF<br />DOCX<br />TXT</div><h2>マニュアルを追加</h2><p>第1弾では実ファイルを解析せず、架空資料の固定Mockを使用します。</p><button className="primary" onClick={() => setStep("review")}>サンプルマニュアルを読み込む</button></section>}
    {step === "review" && <section className="candidate-review"><div className="candidate-head"><div><small>選択した風のファイル</small><h2>{draft.sourceLabel}</h2></div><span>ルール候補 {draft.candidates.length}件</span></div><div className="human-gate"><strong>候補 → 人が確認・修正 → 承認</strong><p>候補は自動的に正本になりません。内容を確認した人が承認します。</p></div>{draft.candidates.map((c) => <label className="candidate" key={c.id}><input type="checkbox" checked={c.approved} onChange={() => setDraft((d) => ({ ...d, candidates: d.candidates.map((item) => item.id === c.id ? { ...item, approved: !item.approved } : item) }))} /><span className={`kind ${c.kind}`}>{c.kind}</span><div><strong>{c.title}</strong><input aria-label={`${c.title}の説明`} value={c.instruction} onChange={(e) => setDraft((d) => ({ ...d, candidates: d.candidates.map((item) => item.id === c.id ? { ...item, instruction: e.target.value } : item) }))} /></div></label>)}<button className="primary" onClick={approveRules}>人が確認してルールを承認 →</button></section>}
    {step === "patterns" && <section className="pattern-review"><p className="eyebrow">GOOD RESPONSE PATTERNS</p><h2>良い応対例を追加</h2><div className="transcript"><small>架空の文字起こし</small><p>「お待たせして申し訳ございません。注文番号を確認し、配送状況を店舗へ確認いたします。」</p></div><p>正解文を一つに固定せず、良い進め方を複数登録します。</p>{draft.responsePatterns[0].exampleResponses.map((e) => <label key={e}><input type="checkbox" defaultChecked />{e}</label>)}<button className="primary" onClick={() => { setDraft((d) => ({ ...d, patternsApproved: true })); setStep("complete"); }}>人が確認して応対例を承認 →</button></section>}
    {step === "complete" && <section className="builder-complete"><span>✓</span><h2>研修へ登録しました</h2><p>承認済みルールと複数のGoodResponsePatternが、TrainingManualRuleへ追加されました。</p><button className="quiet-button" onClick={() => { setDraft(mockDraft); setStep("empty"); }}>別の研修を作る</button></section>}
  </main>;
}

const mockStaff = [
  ["佐藤 美咲", "修了", "8", "82"], ["鈴木 健", "要再挑戦", "5", "64"], ["田中 葵", "修了", "11", "91"], ["高橋 翼", "未着手", "0", "—"], ["伊藤 結衣", "要再挑戦", "4", "68"], ["山本 蓮", "修了", "7", "79"],
];

function AdminDashboard() {
  return <main className="admin-page"><div className="admin-hero"><div><p className="eyebrow">TEAM OVERVIEW</p><h1>教育状況</h1><p>教える時間を減らし、必要なフォローに集中する。</p></div><div className="admin-value"><strong>ロープレは本人が何度でも。</strong><span>管理者は、誰がどこで困っているかだけ確認。</span></div></div><p className="result-disclaimer">表示はすべて架空スタッフのMockです。ユーザー管理・人事評価・適性評価ではありません。</p>
    <div className="metrics admin-metrics"><div><span>対象スタッフ</span><strong>6<small>名</small></strong></div><div><span>修了</span><strong>3<small>名</small></strong></div><div><span>要再挑戦</span><strong>2<small>名</small></strong></div><div><span>未着手</span><strong>1<small>名</small></strong></div><div><span>平均練習回数</span><strong>5.8<small>回</small></strong></div></div>
    <div className="admin-grid"><section className="weaknesses"><h2>共通の弱点</h2><ol><li><span>01</span><div><strong>配達遅延時の状況確認</strong><small>3名にフォロー推奨</small></div></li><li><span>02</span><div><strong>クレーム時の引継ぎ判断</strong><small>2名にフォロー推奨</small></div></li><li><span>03</span><div><strong>説明が長くなりやすい</strong><small>会話スタイル適応で確認</small></div></li></ol></section><section className="scenario-progress"><h2>シナリオ別修了状況</h2>{[["通常注文", 83], ["配達時間確認", 67], ["配達遅延", 42], ["強いクレーム", 33]].map(([name, value]) => <div key={name as string}><span>{name}</span><i><b style={{ width: `${value}%` }} /></i><strong>{value}%</strong></div>)}</section></div>
    <section className="staff-table"><h2>スタッフ状況</h2>{mockStaff.map((s) => <div key={s[0]}><strong>{s[0]}</strong><span className={`staff-status ${s[1]}`}>{s[1]}</span><span>練習 {s[2]}回</span><b>{s[3]}点</b><button>結果を見る</button></div>)}</section>
  </main>;
}

function Dashboard({ attempts, onBack }: { attempts: TrainingAttempt[]; onBack: () => void }) {
  const summary = summarizeAttempts(attempts);
  const recentSkills = attempts.at(-1)?.portableSkillResults.filter((r) => r.score !== null) ?? [];
  return <main className="dashboard"><button className="back" onClick={onBack}>← トレーニングへ</button><p className="eyebrow">TRAINING OVERVIEW</p><h1>教育状況</h1>
    <p className="lead">今回の会話で観察できた行動だけを振り返ります。人格・適性・人事評価ではありません。</p><div className="metrics"><div><span>練習回数</span><strong>{summary.attempts}<small>回</small></strong></div><div><span>修了数</span><strong>{summary.completed}<small>回</small></strong></div><div><span>最新点</span><strong>{summary.latest}<small>点</small></strong></div><div><span>最高点</span><strong>{summary.best}<small>点</small></strong></div></div>
    <section className="growth-skills"><h2>最近のPortable Skill結果</h2>{recentSkills.length ? recentSkills.map((r) => <div key={r.skill}><span>{skillLabels[r.skill]}</span><i><b style={{ width: `${r.score ?? 0}%` }} /></i><strong>{r.score}</strong></div>) : <p>練習を完了すると結果が表示されます。</p>}<div className="growth-note"><strong>最近改善した項目</strong><span>{recentSkills.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0] ? skillLabels[recentSkills[0].skill] : "練習後に表示"}</span><strong>要再挑戦</strong><span>{summary.retry}件</span></div></section>
    <section className="history"><h2>最近の履歴</h2>{!attempts.length ? <p className="empty-copy">まだ練習履歴がありません。</p> : <div className="history-table">{[...attempts].reverse().map((a) => <div key={a.id}><span>{new Date(a.completedAt).toLocaleString("ja-JP")}</span><strong>{a.scenarioTitle}</strong><span>{styleLabels[a.communicationStyle].slice(0, 3)}</span><b>{a.score}点</b><em>{a.passed ? "修了" : "再挑戦"}</em></div>)}</div>}</section>
  </main>;
}
