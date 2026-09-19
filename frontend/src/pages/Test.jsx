import React, { useState } from 'react';

export default function Test({ studentId, onRefreshProfile }) {
  const [testMode, setTestMode] = useState('topic'); // 'topic', 'document', 'custom'
  const [topic, setTopic] = useState('Python Lists');
  const [activeDoc, setActiveDoc] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [customText, setCustomText] = useState('');
  
  // Quiz execution state
  const [loading, setLoading] = useState(false);
  const [quizData, setQuizData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitResult, setSubmitResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/documents/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        setActiveDoc(data.document_name);
        setTopic(file.name.replace(/\.[^/.]+$/, ""));
      } else {
        alert(`Upload error: ${data.detail || 'Failed'}`);
      }
    } catch (err) {
      alert(`Upload error: ${err.message}`);
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
      try {
        customQuestions = JSON.parse(customText);
      } catch (err) {
        alert('Invalid JSON format for custom questions. Please format as JSON array of objects.');
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch('/api/test/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          topic: topic,
          document_name: testMode === 'document' ? activeDoc : null,
          custom_questions: customQuestions
        })
      });
      const data = await res.json();
      setQuizData(data);
    } catch (err) {
      alert(`Test generation error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTest = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/test/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          topic: quizData.topic,
          attempt_id: quizData.attempt_id,
          answers: answers,
          questions: quizData.questions
        })
      });
      const data = await res.json();
      setSubmitResult(data);
      onRefreshProfile?.();
    } catch (err) {
      alert(`Submission error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '30px 20px' }}>
      {/* Header */}
      <div className="glass-card" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '6px' }}>
          Test mode — Adaptive mastery loop
        </h2>
        <p style={{ fontSize: '0.88rem', color: '#94a3b8' }}>
          5-question diagnostic assessment with deterministic scoring, analysis agent misconception detection, and remediation loop.
        </p>
      </div>

      {!quizData ? (
        /* TEST SETUP SELECTION */
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', color: '#c084fc', marginBottom: '16px' }}>
            Choose Test Creation Option
          </h3>

          {/* Mode Selector Tabs */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button
              className={`btn-secondary ${testMode === 'topic' ? 'gradient-text' : ''}`}
              onClick={() => setTestMode('topic')}
              style={{ borderColor: testMode === 'topic' ? '#c084fc' : 'rgba(255, 255, 255, 0.1)' }}
            >
              Option A: Enter Topic
            </button>

            <button
              className={`btn-secondary ${testMode === 'document' ? 'gradient-text' : ''}`}
              onClick={() => setTestMode('document')}
              style={{ borderColor: testMode === 'document' ? '#c084fc' : 'rgba(255, 255, 255, 0.1)' }}
            >
              Option B: Upload Document
            </button>

            <button
              className={`btn-secondary ${testMode === 'custom' ? 'gradient-text' : ''}`}
              onClick={() => setTestMode('custom')}
              style={{ borderColor: testMode === 'custom' ? '#c084fc' : 'rgba(255, 255, 255, 0.1)' }}
            >
              Option C: Custom Questions
            </button>
          </div>

          {/* Option A View */}
          {testMode === 'topic' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.88rem', color: '#94a3b8', marginBottom: '8px' }}>
                Topic Name:
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  color: '#ffffff',
                  outline: 'none'
                }}
              />
            </div>
          )}

          {/* Option B View */}
          {testMode === 'document' && (
            <div style={{ marginBottom: '20px' }}>
              <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span>{uploading ? 'Uploading...' : 'Select document (PDF/TXT)'}</span>
                <input type="file" accept=".pdf,.txt" onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>
              {activeDoc && (
                <div style={{ marginTop: '10px', color: '#34d399', fontSize: '0.9rem' }}>
                  ✓ Active Document: {activeDoc} (Topic: {topic})
                </div>
              )}
            </div>
          )}

          {/* Option C View */}
          {testMode === 'custom' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.88rem', color: '#94a3b8', marginBottom: '8px' }}>
                Paste Custom Questions JSON Array:
              </label>
              <textarea
                rows={6}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder={`[\n  {\n    "question": "What is Python slicing?",\n    "options": ["A way to split sequences", "A database query"],\n    "correct_answer": "Option 1: A way to split sequences"\n  }\n]`}
                style={{
                  width: '100%',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  padding: '12px',
                  color: '#ffffff',
                  fontFamily: 'var(--font-code)',
                  fontSize: '0.85rem'
                }}
              />
            </div>
          )}

          <button
            className="btn-primary"
            onClick={handleStartTest}
            disabled={loading}
            style={{ background: 'linear-gradient(135deg, #a855f7, #c084fc)' }}
          >
            {loading ? 'Generating 5 diagnostic questions...' : 'Generate 5-question test'}
          </button>
        </div>
      ) : (
        /* QUIZ EXECUTION & RESULTS */
        <div>
          <button className="btn-secondary" onClick={() => setQuizData(null)} style={{ marginBottom: '20px' }}>
            ← Back to Test Options
          </button>

          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.25rem', color: '#c084fc' }}>
                5-Question Diagnostic: {quizData.topic}
              </h3>
              <span className="badge badge-learning">
                {quizData.questions.length} Questions
              </span>
            </div>

            {/* Questions List */}
            {quizData.questions.map((q, qIdx) => (
              <div key={q.id || qIdx} style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '18px', borderRadius: '12px', marginBottom: '16px' }}>
                <p style={{ fontWeight: 600, marginBottom: '12px', fontSize: '0.98rem' }}>
                  Q{qIdx + 1} ({q.sub_concept}): {q.question}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {q.options.map((opt, optIdx) => (
                    <label key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.92rem' }}>
                      <input
                        type="radio"
                        name={q.id}
                        value={opt}
                        checked={answers[q.id] === opt}
                        onChange={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {!submitResult ? (
              <button className="btn-primary" onClick={handleSubmitTest} disabled={submitting} style={{ background: 'linear-gradient(135deg, #a855f7, #c084fc)' }}>
                {submitting ? 'Evaluating with 5-Agent Engine...' : 'Submit Answers'}
              </button>
            ) : (
              /* SUBMISSION RESULTS & THINKING TRACE */
              <div style={{ marginTop: '24px' }}>
                <div className={`badge ${submitResult.status === 'MASTERED' ? 'badge-mastered' : 'badge-revision'}`} style={{ fontSize: '1.1rem', padding: '10px 20px', marginBottom: '16px' }}>
                  {submitResult.status === 'MASTERED' ? '✓ MASTERED' : '⚠ WEAKNESS DETECTED'}
                </div>

                <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>
                  Score: {int(submitResult.score * 100)}% ({int(submitResult.score * quizData.questions.length)}/{quizData.questions.length} Correct)
                </p>

                {/* LLM Thinking Process */}
                {submitResult.thinking_process && (
                  <div className="thinking-box">
                    <div style={{ color: '#38bdf8', fontWeight: 600, marginBottom: '10px' }}>
                      Reasoning and diagnosis trace:
                    </div>
                    {submitResult.thinking_process.map((step, idx) => (
                      <div key={idx} className="thinking-step">
                        {step}
                      </div>
                    ))}
                  </div>
                )}

                {/* Misconceptions */}
                {submitResult.misconceptions && submitResult.misconceptions.length > 0 && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '18px', borderRadius: '12px', borderLeft: '4px solid #ef4444', marginBottom: '20px' }}>
                    <h4 style={{ color: '#f87171', marginBottom: '8px' }}>
                      Detected Misconception:
                    </h4>
                    <p style={{ color: '#fca5a5', fontSize: '0.95rem' }}>
                      {submitResult.misconceptions[0].misconception}
                    </p>
                  </div>
                )}

                {/* Remediation */}
                {submitResult.remediation && (
                  <div style={{ background: 'rgba(15, 23, 42, 0.9)', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #818cf8' }}>
                    <h4 style={{ color: '#818cf8', marginBottom: '10px' }}>
                      Agent remediation:
                    </h4>
                    <p style={{ color: '#cbd5e1', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {submitResult.remediation.explanation}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function int(val) {
  return Math.round(val);
}
