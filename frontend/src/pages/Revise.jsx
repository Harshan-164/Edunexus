import React, { useState, useEffect } from 'react';

export default function Revise({ studentId, onRefreshProfile }) {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState(null);
  
  // Revision session state
  const [revisionData, setRevisionData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [verifyResult, setVerifyResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTopics();
  }, [studentId]);

  const fetchTopics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/revise/topics/${studentId}`);
      const data = await res.json();
      setTopics(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartRevision = async (topicName) => {
    setSelectedTopic(topicName);
    setLoading(true);
    setVerifyResult(null);
    setAnswers({});

    try {
      const res = await fetch('/api/revise/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId, topic: topicName })
      });
      const data = await res.json();
      setRevisionData(data);
    } catch (err) {
      alert(`Error starting revision: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/revise/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          topic: selectedTopic,
          answers: answers,
          questions: revisionData.questions
        })
      });
      const data = await res.json();
      setVerifyResult(data);
      onRefreshProfile?.();
      fetchTopics();
    } catch (err) {
      alert(`Verification error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '30px 20px' }}>
      {/* Header */}
      <div className="glass-card" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '6px' }}>
          Revise mode — Memory-driven learning
        </h2>
        <p style={{ fontSize: '0.88rem', color: '#94a3b8' }}>
          Querying persistent SQLite memory for previous topics, misconceptions, and weak concepts to provide targeted revision.
        </p>
      </div>

      {!selectedTopic ? (
        /* TOPICS DASHBOARD */
        <div>
          <h3 style={{ fontSize: '1.1rem', color: '#818cf8', marginBottom: '16px' }}>
            Available Topics for Revision ({topics.length})
          </h3>

          {loading ? (
            <div style={{ color: '#94a3b8' }}>Loading learner memory...</div>
          ) : topics.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ fontSize: '1.1rem', color: '#94a3b8' }}>
                No studied topics found in memory for <strong>{studentId}</strong> yet.
              </p>
              <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '8px' }}>
                Go to <strong>LEARN</strong> or <strong>TEST</strong> mode to start studying a topic!
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {topics.map((t, idx) => (
                <div key={idx} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
                        {t.topic}
                      </h4>
                      <span className={`badge ${t.status === 'MASTERED' ? 'badge-mastered' : 'badge-revision'}`}>
                        {t.status}
                      </span>
                    </div>

                    {t.document_name && (
                      <div style={{ fontSize: '0.78rem', color: '#38bdf8', marginBottom: '8px' }}>
                        Source: {t.document_name}
                      </div>
                    )}

                    {t.misconceptions && t.misconceptions.length > 0 && (
                      <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '10px', borderRadius: '8px', marginBottom: '12px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        <div style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 700 }}>
                          ACTIVE MISCONCEPTION:
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#fca5a5', marginTop: '2px' }}>
                          {t.misconceptions[0].misconception}
                        </div>
                      </div>
                    )}

                    {t.weak_subconcepts && t.weak_subconcepts.length > 0 && (
                      <div style={{ fontSize: '0.82rem', color: '#f87171', marginBottom: '12px' }}>
                        Weak Areas: {t.weak_subconcepts.join(', ')}
                      </div>
                    )}
                  </div>

                  <button
                    className="btn-primary"
                    onClick={() => handleStartRevision(t.topic)}
                    style={{ width: '100%', justifyContent: 'center', marginTop: '16px', background: 'linear-gradient(90deg, #6366f1, #818cf8)' }}
                  >
                    Revise {t.topic} →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* TARGETED REVISION & MINI TEST VIEW */
        <div>
          <button className="btn-secondary" onClick={() => setSelectedTopic(null)} style={{ marginBottom: '20px' }}>
            ← Back to Revision Topics
          </button>

          {loading ? (
            <div style={{ color: '#818cf8' }}>Generating targeted revision lesson...</div>
          ) : revisionData && (
            <div className="glass-card">
              <h3 style={{ fontSize: '1.3rem', color: '#818cf8', marginBottom: '14px' }}>
                Targeted Revision: {selectedTopic}
              </h3>

              {/* Revision Lesson Text */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.8)',
                padding: '20px',
                borderRadius: '12px',
                borderLeft: '4px solid #818cf8',
                marginBottom: '24px',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap'
              }}>
                {revisionData.revision_lesson}
              </div>

              {/* 2-Question Revision Mini Test */}
              <h4 style={{ fontSize: '1.1rem', color: '#f8fafc', marginBottom: '14px' }}>
                Revision mini-test (2 questions)
              </h4>

              {revisionData.questions.map((q, qIdx) => (
                <div key={q.id || qIdx} style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '16px', borderRadius: '10px', marginBottom: '16px' }}>
                  <p style={{ fontWeight: 600, marginBottom: '10px' }}>
                    Q{qIdx + 1} ({q.sub_concept}): {q.question}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {q.options.map((opt, optIdx) => (
                      <label key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
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

              {!verifyResult ? (
                <button className="btn-primary" onClick={handleVerify} disabled={submitting}>
                  {submitting ? 'Verifying...' : 'Submit Verification Quiz'}
                </button>
              ) : (
                <div style={{ marginTop: '20px' }}>
                  <div className={`badge ${verifyResult.passed ? 'badge-mastered' : 'badge-revision'}`} style={{ fontSize: '1rem', padding: '8px 16px', marginBottom: '14px' }}>
                    {verifyResult.passed ? '✓ MASTERED' : '⚠ NEEDS REMEDIATION'}
                  </div>
                  <p style={{ fontSize: '1rem', marginBottom: '16px' }}>{verifyResult.message}</p>

                  {verifyResult.remediation && (
                    <div style={{ background: 'rgba(15, 23, 42, 0.9)', padding: '18px', borderRadius: '12px', borderLeft: '4px solid #f87171' }}>
                      <h5 style={{ color: '#f87171', marginBottom: '8px' }}>Remediation Strategy:</h5>
                      <p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>{verifyResult.remediation.explanation}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
