import React, { useEffect, useState } from 'react';
import {
  AlertTriangle, ArrowLeft, BookOpenCheck, BrainCircuit, CheckCircle2,
  Clock3, FileText, Loader2, RefreshCw, Sparkles, Target,
} from 'lucide-react';

export default function Revise({ studentId, onRefreshProfile }) {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [revisionData, setRevisionData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [verifyResult, setVerifyResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchTopics(); }, [studentId]);

  const fetchTopics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/revise/topics/${studentId}`);
      setTopics(await response.json());
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const handleStartRevision = async (topicName, subConcept = null) => {
    setSelectedTopic(topicName);
    setLoading(true);
    setVerifyResult(null);
    setAnswers({});
    try {
      const response = await fetch('/api/revise/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId, topic: topicName, sub_concept: subConcept }),
      });
      setRevisionData(await response.json());
    } catch (error) { alert(`Error starting revision: ${error.message}`); }
    finally { setLoading(false); }
  };

  const handleVerify = async () => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/revise/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId, topic: selectedTopic, answers,
          questions: revisionData.questions,
          sub_concept: revisionData.revision_item?.concept,
          strategy: revisionData.revision_item?.strategy,
          cycle_number: verifyResult?.cycle_number || 1,
          document_id: revisionData.revision_item?.document_id,
        }),
      });
      setVerifyResult(await response.json());
      onRefreshProfile?.();
      fetchTopics();
    } catch (error) { alert(`Verification error: ${error.message}`); }
    finally { setSubmitting(false); }
  };

  const returnToTopics = () => {
    setSelectedTopic(null); setRevisionData(null); setVerifyResult(null); setAnswers({});
  };

  const highPriorityCount = topics.filter((topic) => topic.revision_items?.[0]?.priority === 'high').length;
  const misconceptionCount = topics.reduce((total, topic) => total + (topic.misconceptions?.length || 0), 0);
  const masteredCount = topics.filter((topic) => topic.status === 'MASTERED').length;

  return (
    <div className="assessment-page revision-page">
      <header className="mode-hero">
        <span className="mode-hero__icon mode-hero__icon--violet"><BrainCircuit size={23} /></span>
        <div className="mode-hero__copy"><span>Memory-driven workspace</span><h2>Revise what matters</h2><p>Your learning signals and assessment history shape every recommendation.</p></div>
        <div className="mode-hero__meta"><RefreshCw size={14} /> Adaptive memory</div>
      </header>

      {!selectedTopic ? (
        <main className="mode-content revision-dashboard">
          <div className="section-title-row"><div><span>Your revision queue</span><h3>Recommended focus areas</h3><p>Prioritized from recent learning, tests, and verification history.</p></div><div className="memory-count"><strong>{topics.length}</strong><span>topics in memory</span></div></div>
          {!loading && topics.length > 0 && <div className="memory-overview">
            <div><span className="metric-icon metric-icon--violet"><BrainCircuit size={17} /></span><p><strong>{topics.length}</strong><small>Tracked topics</small></p></div>
            <div><span className="metric-icon metric-icon--amber"><Target size={17} /></span><p><strong>{highPriorityCount}</strong><small>High priority</small></p></div>
            <div><span className="metric-icon metric-icon--rose"><AlertTriangle size={17} /></span><p><strong>{misconceptionCount}</strong><small>Active signals</small></p></div>
            <div><span className="metric-icon metric-icon--green"><CheckCircle2 size={17} /></span><p><strong>{masteredCount}</strong><small>Mastered topics</small></p></div>
          </div>}
          {loading ? <LoadingState label="Reading learner memory…" /> : topics.length === 0 ? (
            <div className="surface-panel empty-memory"><span><BookOpenCheck size={28} /></span><h3>Your revision queue is clear</h3><p>Complete a Learn session or Test assessment and personalized recommendations will appear here.</p></div>
          ) : (
            <div className="revision-grid">{topics.map((topic, index) => <TopicCard key={`${topic.topic}-${index}`} topic={topic} onStart={handleStartRevision} />)}</div>
          )}
        </main>
      ) : (
        <main className="mode-content revision-session">
          <button className="quiet-back" onClick={returnToTopics}><ArrowLeft size={16} /> Back to revision queue</button>
          {loading ? <LoadingState label="Building your targeted revision…" /> : revisionData && (
            <div className="revision-workspace-grid">
            <aside className="revision-rail">
              <span className="revision-rail__eyebrow">Your revision path</span>
              <div className="journey-step is-active"><i>1</i><span><strong>Focused recap</strong><small>Review the evidence-backed gap</small></span></div>
              <div className={`journey-step ${Object.keys(answers).length ? 'is-active' : ''}`}><i>2</i><span><strong>Active practice</strong><small>Apply the corrected concept</small></span></div>
              <div className={`journey-step ${verifyResult ? 'is-active' : ''}`}><i>3</i><span><strong>Verify mastery</strong><small>Two correct answers required</small></span></div>
              {revisionData.revision_item && <div className="rail-focus"><Target size={16} /><span><small>Current focus</small><strong>{revisionData.revision_item.concept}</strong><em>{revisionData.revision_item.priority} priority</em></span></div>}
            </aside>
            <section className="surface-panel revision-panel">
              <div className="panel-heading panel-heading--row"><div><span>Targeted revision</span><h3>{selectedTopic}</h3><p>A focused explanation followed by a two-question mastery check.</p></div><span className="progress-pill"><Sparkles size={14} /> Personalized</span></div>

              {revisionData.revision_item && <div className="recommendation-banner"><span><Target size={20} /></span><div><small>{revisionData.revision_item.priority} priority · {revisionData.revision_item.concept}</small><strong>Why this is recommended</strong><p>{revisionData.revision_item.reason_summary}</p></div></div>}

              <div className="lesson-surface"><div className="lesson-surface__label"><BookOpenCheck size={16} /> Focused recap</div><div className="lesson-copy">{revisionData.revision_lesson}</div></div>

              <div className="verification-heading"><div><span>Mastery check</span><h3>Show what changed</h3></div><small>{Object.keys(answers).length} / {revisionData.questions.length} answered</small></div>
              <div className="question-stack question-stack--compact">{revisionData.questions.map((question, index) => (
                <article className="assessment-question" key={question.id || index}>
                  <div className="question-number">{String(index + 1).padStart(2, '0')}</div>
                  <div className="question-body"><span>{question.sub_concept}</span><h4>{question.question}</h4><div className="answer-grid">{question.options.map((option, optionIndex) => (
                    <label className={`answer-option ${answers[question.id] === option ? 'is-selected' : ''}`} key={optionIndex}><input type="radio" name={question.id} checked={answers[question.id] === option} onChange={() => setAnswers((previous) => ({ ...previous, [question.id]: option }))} /><i>{String.fromCharCode(65 + optionIndex)}</i><span>{option}</span></label>
                  ))}</div></div>
                </article>
              ))}</div>

              {!verifyResult ? <div className="panel-actions panel-actions--end"><button className="btn-primary" onClick={handleVerify} disabled={submitting}>{submitting ? <><Loader2 className="spin" size={17} /> Verifying…</> : <><CheckCircle2 size={17} /> Submit mastery check</>}</button></div> : <VerificationResult result={verifyResult} />}
            </section>
            </div>
          )}
        </main>
      )}
    </div>
  );
}

function TopicCard({ topic, onStart }) {
  const item = topic.revision_items?.[0];
  const mastered = topic.status === 'MASTERED';
  return <article className="surface-panel revision-card">
    <div className="revision-card__top"><span className={`topic-icon ${mastered ? 'is-mastered' : ''}`}><BookOpenCheck size={19} /></span><span className={`badge ${mastered ? 'badge-mastered' : 'badge-revision'}`}>{topic.status}</span></div>
    <h3>{topic.topic}</h3>
    {topic.document_name && <div className="source-chip"><FileText size={13} /> {topic.document_name}</div>}
    {item && <div className="priority-copy"><small>{item.priority} priority · {item.concept}</small><p>{item.reason_summary}</p></div>}
    {topic.misconceptions?.length > 0 && <div className="memory-signal memory-signal--warning"><AlertTriangle size={15} /><span><strong>Active misconception</strong>{topic.misconceptions[0].misconception}</span></div>}
    {topic.weak_subconcepts?.length > 0 && <div className="memory-signal"><Target size={15} /><span><strong>Focus areas</strong>{topic.weak_subconcepts.join(', ')}</span></div>}
    <div className="revision-card__footer"><span><Clock3 size={13} /> Ready when you are</span><button className="btn-primary" onClick={() => onStart(topic.topic, item?.concept)}>Revise now <ArrowLeft className="arrow-forward" size={15} /></button></div>
  </article>;
}

function LoadingState({ label }) {
  return <div className="surface-panel mode-loading"><Loader2 className="spin" size={23} /><span className="skeleton-shimmer-text">{label}</span></div>;
}

function VerificationResult({ result }) {
  return <section className={`result-panel ${result.passed ? 'is-success' : 'is-warning'}`}>
    <div className="result-summary"><span>{result.passed ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}</span><div><small>Revision check complete</small><h3>{result.passed ? 'Mastery confirmed' : 'One more pass will help'}</h3><p>{result.message}</p></div></div>
    {result.remediation && <div className="insight-card"><Sparkles size={18} /><div><strong>Updated remediation strategy</strong><p>{result.remediation.explanation}</p></div></div>}
  </section>;
}
