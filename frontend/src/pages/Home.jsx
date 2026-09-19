import React from 'react';
import { ArrowRight, BookOpen, BrainCircuit, CheckCircle2, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';

const MODES = [
  { id: 'learn', eyebrow: 'Build understanding', title: 'Learn', description: 'Explore new concepts with an AI tutor grounded in your course material and your learning history.', action: 'Start a lesson', icon: BookOpen, tone: 'cyan' },
  { id: 'revise', eyebrow: 'Strengthen recall', title: 'Revise', description: 'Return to weak areas with focused explanations shaped by your previous attempts and misconceptions.', action: 'Review weak areas', icon: RefreshCw, tone: 'indigo' },
  { id: 'test', eyebrow: 'Prove mastery', title: 'Test', description: 'Run a focused diagnostic and receive clear, actionable feedback on exactly what to improve next.', action: 'Take a diagnostic', icon: CheckCircle2, tone: 'violet' },
];

export default function Home({ setMode }) {
  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><Sparkles size={14} /> Personalized mastery, powered by AI</div>
          <h1>Turn every study session into <span className="gradient-text">measurable progress.</span></h1>
          <p className="hero-lead">EduNexus adapts to how you learn—helping you understand concepts, repair knowledge gaps, and build lasting mastery.</p>
          <div className="hero-actions">
            <button className="btn-primary" onClick={() => setMode('learn')}>Start learning <ArrowRight size={17} /></button>
            <button className="btn-secondary" onClick={() => setMode('test')}>Check my knowledge</button>
          </div>
          <div className="trust-row">
            <span><ShieldCheck size={16} /> Grounded in your material</span>
            <span><BrainCircuit size={16} /> Adapts to your progress</span>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="orbit orbit--outer" /><div className="orbit orbit--inner" />
          <div className="progress-card progress-card--main">
            <div className="progress-card__header">
              <span className="mini-icon"><BrainCircuit size={19} /></span>
              <div><small>Current pathway</small><strong>Python foundations</strong></div><span className="live-dot" />
            </div>
            <div className="mastery-line"><span>Mastery progress</span><strong>72%</strong></div>
            <div className="progress-track"><span /></div>
            <div className="topic-list">
              <span className="is-complete"><CheckCircle2 size={16} /> Lists &amp; indexing <b>Complete</b></span>
              <span className="is-current"><RefreshCw size={16} /> Slicing patterns <b>In progress</b></span>
              <span><span className="topic-dot" /> Comprehensions <b>Up next</b></span>
            </div>
          </div>
          <div className="floating-stat floating-stat--top"><Sparkles size={16} /><span><strong>Adaptive plan</strong><small>Updated just now</small></span></div>
          <div className="floating-stat floating-stat--bottom"><CheckCircle2 size={18} /><span><strong>12 concepts</strong><small>Mastered this week</small></span></div>
        </div>
      </section>

      <section className="mode-section" aria-labelledby="mode-heading">
        <div className="section-heading">
          <div><span>One workspace, three focused modes</span><h2 id="mode-heading">Choose what you need today</h2></div>
          <p>Each mode shares the same learner profile, so every interaction makes the next one more useful.</p>
        </div>
        <div className="mode-grid">
          {MODES.map(({ id, eyebrow, title, description, action, icon: Icon, tone }, index) => (
            <button key={id} className={`mode-card mode-card--${tone}`} onClick={() => setMode(id)} style={{ '--delay': `${index * 90}ms` }}>
              <span className="mode-icon"><Icon size={22} /></span><span className="mode-eyebrow">{eyebrow}</span><strong>{title}</strong>
              <span className="mode-description">{description}</span><span className="mode-link">{action} <ArrowRight size={16} /></span>
            </button>
          ))}
        </div>
      </section>

      <section className="architecture-strip">
        <span className="architecture-icon"><BrainCircuit size={22} /></span>
        <div><strong>Built around your learning journey</strong><p>Five specialized agents coordinate retrieval, diagnosis, remediation, and verification through one persistent learner profile.</p></div>
        <span className="architecture-badge">Safe by design</span>
      </section>
    </div>
  );
}
