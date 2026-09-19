import React, { useState } from 'react';
import {
  ArrowLeft, Braces, CheckCircle2, ClipboardCheck, FileText,
  Loader2, Sparkles, Target, UploadCloud,
} from 'lucide-react';

const MODES = [
  { id: 'topic', icon: Target, label: 'Topic', description: 'Build a diagnostic around a subject' },
  { id: 'document', icon: FileText, label: 'Document', description: 'Test from your uploaded material' },
  { id: 'custom', icon: Braces, label: 'Custom', description: 'Bring your own question set' },
];

async function readApiResponse(response) {
  const body = await response.text();
  let data = null;
  try { data = body ? JSON.parse(body) : null; }
  catch { data = null; }
  if (!response.ok) {
    const detail = data?.detail || data?.message || body || `Request failed with status ${response.status}`;
    throw new Error(detail);
  }
  if (!data) throw new Error('The server returned an empty or invalid response.');
  return data;
}

export default function Test({ studentId, onRefreshProfile }) {
  const [testMode, setTestMode] = useState('topic');
  const [topic, setTopic] = useState('Python Lists');
  const [activeDoc, setActiveDoc] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [customText, setCustomText] = useState('');
  const [loading, setLoading] = useState(false);
  const [quizData, setQuizData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitResult, setSubmitResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch('/api/documents/upload', { method: 'POST', body: formData });
      const data = await readApiResponse(response);
      setActiveDoc(data.document_name);
      setTopic(file.name.replace(/\.[^/.]+$/, ''));
    } catch (error) {
      alert(`Upload error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleStartTest = async () => {
    setLoading(true);
    setSubmitResult(null);
    setAnswers({});
    setQuizData(null);
    let customQuestions = null;
    if (testMode === 'custom' && customText.trim()) {
      try { customQuestions = JSON.parse(customText); }
      catch {
        alert('Invalid JSON format for custom questions. Please format as JSON array of objects.');
        setLoading(false);
        return;
      }
    }
    try {
      const response = await fetch('/api/test/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId, topic,
          document_name: testMode === 'document' ? activeDoc : null,
          custom_questions: customQuestions,
        }),
      });
      setQuizData(await readApiResponse(response));
    } catch (error) {
      alert(`Test generation error: ${error.message}`);
    } finally { setLoading(false); }
  };

  const handleSubmitTest = async () => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/test/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId, topic: quizData.topic, attempt_id: quizData.attempt_id,
          answers, questions: quizData.questions,
          document_name: testMode === 'document' ? activeDoc : null,
        }),
      });
      setSubmitResult(await readApiResponse(response));
      onRefreshProfile?.();
    } catch (error) {
      alert(`Submission error: ${error.message}`);
    } finally { setSubmitting(false); }
  };

  const answeredCount = Object.keys(answers).length;
  const completion = quizData ? Math.round((answeredCount / quizData.questions.length) * 100) : 0;

  return (
    <div className="assessment-page">
      <header className="mode-hero">
        <span className="mode-hero__icon"><ClipboardCheck size={23} /></span>
        <div className="mode-hero__copy">
          <span>Assessment workspace</span>
          <h2>Test your understanding</h2>
          <p>A focused diagnostic with deterministic scoring and evidence-backed feedback.</p>
        </div>
        <div className="mode-hero__meta"><Sparkles size={14} /> 5-agent mastery loop</div>
      </header>

      {!quizData ? (
        <main className="mode-content setup-layout">
          <section className="surface-panel setup-panel">
            <div className="panel-heading">
              <div><span>Step 1</span><h3>Choose how to build your test</h3><p>Your choice changes the source, not the assessment workflow.</p></div>
            </div>
            <div className="mode-choice-grid">
              {MODES.map(({ id, icon: Icon, label, description }) => (
                <button key={id} className={`mode-choice ${testMode === id ? 'is-active' : ''}`} onClick={() => setTestMode(id)}>
                  <span><Icon size={19} /></span><strong>{label}</strong><small>{description}</small>
                </button>
              ))}
            </div>

            <div className="setup-editor">
              {testMode === 'topic' && <label className="field-group"><span>Topic name</span><input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Python Lists" /></label>}
              {testMode === 'document' && (
                <div className="upload-zone">
                  <UploadCloud size={25} /><div><strong>{activeDoc || 'Upload course material'}</strong><p>{activeDoc ? `Ready to create a test for ${topic}` : 'PDF or TXT · content stays scoped to this document'}</p></div>
                  <label className="btn-secondary">{uploading ? <><Loader2 className="spin" size={16} /> Uploading…</> : 'Choose file'}<input type="file" accept=".pdf,.txt" onChange={handleFileUpload} hidden /></label>
                </div>
              )}
              {testMode === 'custom' && <label className="field-group"><span>Question set (JSON)</span><textarea rows="8" value={customText} onChange={(e) => setCustomText(e.target.value)} placeholder={'[\n  {\n    "question": "What is Python slicing?",\n    "options": ["..."],\n    "correct_answer": "Option 1: ..."\n  }\n]'} /></label>}
            </div>
            <div className="panel-actions">
              <span><CheckCircle2 size={15} /> Five questions · immediate analysis</span>
              <button className="btn-primary" onClick={handleStartTest} disabled={loading || (testMode === 'document' && !activeDoc)}>
                {loading ? <><Loader2 className="spin" size={17} /> Generating diagnostic…</> : <><Sparkles size={17} /> Generate test</>}
              </button>
            </div>
          </section>
        </main>
      ) : (
        <main className="mode-content quiz-layout">
          <button className="quiet-back" onClick={() => setQuizData(null)}><ArrowLeft size={16} /> Back to test setup</button>
          <div className="quiz-workspace-grid">
          <aside className="assessment-rail">
            <div className="progress-orbit" style={{ '--progress': `${completion * 3.6}deg` }}><span><strong>{completion}%</strong><small>complete</small></span></div>
            <div className="rail-copy"><span>Assessment progress</span><strong>{answeredCount} of {quizData.questions.length} answered</strong><p>You can review any response before submitting.</p></div>
            <div className="question-map" aria-label="Question completion">
              {quizData.questions.map((question, index) => <span key={question.id || index} className={answers[question.id] ? 'is-complete' : ''}>{index + 1}</span>)}
            </div>
            <div className="rail-note"><Sparkles size={15} /><p><strong>Evidence-aware</strong>Your responses update learner memory after deterministic scoring.</p></div>
          </aside>
          <section className="surface-panel quiz-panel">
            <div className="panel-heading panel-heading--row">
              <div><span>Diagnostic assessment</span><h3>{quizData.topic}</h3><p>Choose one answer for each question.</p></div>
              <div className="progress-pill"><strong>{answeredCount}</strong> / {quizData.questions.length} answered</div>
            </div>
            <div className="question-stack">
              {quizData.questions.map((question, index) => (
                <article className="assessment-question" key={question.id || index}>
                  <div className="question-number">{String(index + 1).padStart(2, '0')}</div>
                  <div className="question-body"><span>{question.sub_concept}</span><h4>{question.question}</h4>
                    <div className="answer-grid">{question.options.map((option, optionIndex) => (
                      <label className={`answer-option ${answers[question.id] === option ? 'is-selected' : ''}`} key={optionIndex}>
                        <input type="radio" name={question.id} checked={answers[question.id] === option} onChange={() => setAnswers((previous) => ({ ...previous, [question.id]: option }))} />
                        <i>{String.fromCharCode(65 + optionIndex)}</i><span>{option}</span>
                      </label>
                    ))}</div>
                  </div>
                </article>
              ))}
            </div>

            {!submitResult ? <div className="panel-actions panel-actions--end"><button className="btn-primary" onClick={handleSubmitTest} disabled={submitting}>
              {submitting ? <><Loader2 className="spin" size={17} /> Evaluating…</> : <><ClipboardCheck size={17} /> Submit assessment</>}
            </button></div> : <ResultPanel result={submitResult} questionCount={quizData.questions.length} />}
          </section>
          </div>
        </main>
      )}
    </div>
  );
}

function ResultPanel({ result, questionCount }) {
  const mastered = result.status === 'MASTERED';
  const percent = Math.round(result.score * 100);
  return <section className={`result-panel ${mastered ? 'is-success' : 'is-warning'}`}>
    <div className="result-summary"><span>{mastered ? <CheckCircle2 size={24} /> : <Target size={24} />}</span><div><small>Assessment complete</small><h3>{mastered ? 'Concept mastered' : 'A learning gap was found'}</h3><p>{percent}% · {Math.round(result.score * questionCount)} of {questionCount} correct</p></div></div>
    {result.thinking_process?.length > 0 && <div className="evidence-list"><strong>How this result was reached</strong>{result.thinking_process.map((step, index) => <p key={index}><span>{index + 1}</span>{step}</p>)}</div>}
    {result.misconceptions?.length > 0 && <div className="insight-card insight-card--danger"><Target size={18} /><div><strong>Concept to revisit</strong><p>{result.misconceptions[0].misconception}</p></div></div>}
    {result.remediation && <div className="insight-card"><Sparkles size={18} /><div><strong>Personalized next step</strong><p>{result.remediation.explanation}</p></div></div>}
  </section>;
}
