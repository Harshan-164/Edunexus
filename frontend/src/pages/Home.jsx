import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Sun,
  Sunrise,
  Moon,
  GraduationCap,
  School,
  Edit3,
  Check,
  Quote,
  UserCheck,
  Flame,
  Award,
  Trophy,
  Zap
} from 'lucide-react';

const MODES = [
  {
    id: 'learn',
    eyebrow: 'Build understanding',
    title: 'Learn',
    description: 'Explore new concepts with an AI tutor grounded in your course material and your learning history.',
    action: 'Start a lesson',
    icon: BookOpen,
    tone: 'cyan'
  },
  {
    id: 'revise',
    eyebrow: 'Strengthen recall',
    title: 'Revise',
    description: 'Return to weak areas with focused explanations shaped by your previous attempts and misconceptions.',
    action: 'Review weak areas',
    icon: RefreshCw,
    tone: 'indigo'
  },
  {
    id: 'test',
    eyebrow: 'Prove mastery',
    title: 'Test',
    description: 'Run a focused diagnostic and receive clear, actionable feedback on exactly what to improve next.',
    action: 'Take a diagnostic',
    icon: CheckCircle2,
    tone: 'violet'
  },
];

const MOTIVATIONAL_QUOTES = [
  { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
  { text: "Every expert was once a beginner. Consistency turns small steps into lasting mastery.", author: "Growth Mindset" },
  { text: "Don’t let what you cannot do interfere with what you can do.", author: "John Wooden" },
  { text: "Mistakes are proof that you are trying and neurons are rewiring for growth.", author: "Cognitive Science" },
  { text: "Focus on progress, not perfection. Today’s effort is tomorrow’s intuition.", author: "Mastery Heuristic" },
  { text: "The mind is not a vessel to be filled, but a fire to be kindled.", author: "Plutarch" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "Learning is a marathon of curiosity. Take it one concept at a time.", author: "Nexora Philosophy" },
  { text: "Your potential expands every time you embrace a difficult challenge.", author: "Carol Dweck" },
  { text: "Believe in the process. The real breakthrough happens right after the struggle.", author: "Neuroscience of Learning" },
];

export default function Home({ setMode, studentProfile, learnerSummary, onOpenProfile, onSaveProfile }) {
  const streaks = learnerSummary?.streaks || {
    current_streak: 0,
    best_streak: 0,
    today_studied: false,
    streak_message: 'Start your daily study streak by completing a session today!'
  };

  const rewards = learnerSummary?.rewards || {
    xp: 0,
    level: 1,
    level_title: 'Novice Learner',
    xp_in_level: 0,
    next_level_xp: 300,
    badges: [],
    unlocked_count: 0,
    total_badges: 10,
  };
  // Determine time of day & greeting
  const timeDetails = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return {
        greeting: 'Good morning',
        period: 'morning',
        icon: Sunrise,
        label: 'Morning Focus Edition',
        gradientClass: 'hero--morning',
        accentColor: '#f59e0b',
        glowColor: 'rgba(245, 158, 11, 0.22)',
      };
    } else if (hour >= 12 && hour < 17) {
      return {
        greeting: 'Good afternoon',
        period: 'afternoon',
        icon: Sun,
        label: 'Peak Afternoon Focus',
        gradientClass: 'hero--afternoon',
        accentColor: '#0ea5e9',
        glowColor: 'rgba(14, 165, 233, 0.22)',
      };
    } else {
      return {
        greeting: 'Good night',
        period: 'night',
        icon: Moon,
        label: 'Night Study Session',
        gradientClass: 'hero--night',
        accentColor: '#c084fc',
        glowColor: 'rgba(192, 132, 252, 0.22)',
      };
    }
  }, []);

  // Pick a random motivational quote on every open
  const [quoteIndex, setQuoteIndex] = useState(() =>
    Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)
  );

  const currentQuote = MOTIVATIONAL_QUOTES[quoteIndex];

  const studentDisplayName = studentProfile?.name?.trim() || '';
  const TimeIcon = timeDetails.icon;

  return (
    <div className="home-page">
      {/* DYNAMIC HERO SECTION WITH TIME-BASED GREETING, MOTIVATION & GRADIENT BACKGROUND */}
      <section
        className={`hero hero--time-adaptive ${timeDetails.gradientClass}`}
        style={{
          position: 'relative',
          padding: '48px 36px',
          borderRadius: '24px',
          border: '1px solid rgba(148, 163, 184, 0.15)',
          overflow: 'hidden',
          marginBottom: '50px',
          boxShadow: `0 24px 70px ${timeDetails.glowColor}`
        }}
      >
        {/* Ambient atmospheric backdrop glow */}
        <div
          style={{
            position: 'absolute',
            top: '-30%',
            right: '-10%',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: timeDetails.glowColor,
            filter: 'blur(90px)',
            opacity: 0.65,
            pointerEvents: 'none',
            zIndex: 0
          }}
        />

        <div className="hero-copy" style={{ position: 'relative', zIndex: 1, maxWidth: '820px' }}>
          {/* Time Badge */}
          <div
            className="eyebrow"
            style={{
              borderColor: `${timeDetails.accentColor}40`,
              background: `${timeDetails.accentColor}18`,
              color: timeDetails.accentColor,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <TimeIcon size={15} /> {timeDetails.label}
          </div>

          {/* DYNAMIC GREETING: Good morning/afternoon/night <name of student> */}
          <h1 style={{ margin: '14px 0 16px', lineHeight: 1.15 }}>
            {timeDetails.greeting}
            {studentDisplayName ? (
              <span className="gradient-text">, {studentDisplayName}!</span>
            ) : (
              <span className="gradient-text">!</span>
            )}
          </h1>

          {/* MOTIVATIONAL QUOTE BANNER (Rotates / updates on open) */}
          <div
            style={{
              margin: '18px 0 28px',
              padding: '16px 20px',
              borderRadius: '12px',
              background: 'rgba(15, 27, 44, 0.72)',
              borderLeft: `4px solid ${timeDetails.accentColor}`,
              borderTop: '1px solid rgba(148, 163, 184, 0.12)',
              borderRight: '1px solid rgba(148, 163, 184, 0.12)',
              borderBottom: '1px solid rgba(148, 163, 184, 0.12)',
              backdropFilter: 'blur(12px)',
              maxWidth: '680px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <Quote size={18} style={{ color: timeDetails.accentColor, flexShrink: 0, marginTop: '2px' }} />
              <div>
                <p style={{ fontSize: '0.94rem', color: '#e2e8f0', fontStyle: 'italic', lineHeight: 1.5, margin: 0 }}>
                  "{currentQuote.text}"
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 650 }}>
                    — {currentQuote.author}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuoteIndex((prev) => (prev + 1) % MOTIVATIONAL_QUOTES.length)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: timeDetails.accentColor,
                      fontSize: '0.72rem',
                      fontWeight: 650,
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Inspire me with another quote"
                  >
                    <Sparkles size={12} /> New spark
                  </button>
                </div>
              </div>
            </div>
          </div>

          <p className="hero-lead" style={{ marginTop: '0', maxWidth: '640px' }}>
            Nexora adapts to how you learn—helping you understand concepts, repair knowledge gaps, and build lasting mastery.
          </p>

          {/* Start learning & Check my knowledge buttons */}
          <div className="hero-actions" style={{ marginTop: '26px' }}>
            <button className="btn-primary" onClick={() => setMode('learn')}>
              Start learning <ArrowRight size={17} />
            </button>
            <button className="btn-secondary" onClick={() => setMode('test')}>
              Check my knowledge
            </button>
          </div>

          <div className="trust-row" style={{ marginTop: '24px' }}>
            <span><ShieldCheck size={16} /> Grounded in your material</span>
            <span><BrainCircuit size={16} /> Adapts to your progress</span>
          </div>
        </div>
      </section>

      {/* 2. STUDENT STREAKS & REWARDS HUB */}
      <section className="student-rewards-hub" aria-label="Student streaks and rewards" style={{
        marginTop: '-24px',
        marginBottom: '50px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
        gap: '20px'
      }}>
        {/* Streak Card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(15, 27, 44, 0.95) 0%, rgba(30, 20, 35, 0.95) 100%)',
          border: '1px solid rgba(249, 115, 22, 0.32)',
          borderRadius: '16px',
          padding: '22px',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35), 0 0 20px rgba(249, 115, 22, 0.08)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: '#fb923c',
                fontSize: '0.74rem',
                fontWeight: 750,
                textTransform: 'uppercase',
                letterSpacing: '0.06em'
              }}>
                <Flame size={16} color="#f97316" fill={streaks.current_streak > 0 ? '#f97316' : 'none'} />
                Daily Study Streak
              </span>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 650,
                color: streaks.today_studied ? '#34d399' : '#fbbf24',
                background: streaks.today_studied ? 'rgba(52, 211, 153, 0.12)' : 'rgba(251, 191, 36, 0.12)',
                border: streaks.today_studied ? '1px solid rgba(52, 211, 153, 0.25)' : '1px solid rgba(251, 191, 36, 0.25)',
                padding: '2px 9px',
                borderRadius: '999px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {streaks.today_studied ? 'Completed today ✓' : 'Session pending ⏳'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 850, color: '#f8fafc', lineHeight: 1 }}>
                {streaks.current_streak}
              </span>
              <span style={{ fontSize: '1.1rem', fontWeight: 750, color: '#fb923c' }}>
                {streaks.current_streak === 1 ? 'Day Streak' : 'Days Streak'}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: '0.76rem', color: '#94a3b8' }}>
                Record: <strong style={{ color: '#f8fafc' }}>{streaks.best_streak}d</strong>
              </span>
            </div>

            <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.45 }}>
              {streaks.streak_message}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onOpenProfile && onOpenProfile('rewards')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fb923c',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: 0,
              marginTop: '16px',
              textAlign: 'left'
            }}
          >
            View streak history & badges <ArrowRight size={14} />
          </button>
        </div>

        {/* Level & XP Card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(15, 27, 44, 0.95) 0%, rgba(28, 20, 52, 0.95) 100%)',
          border: '1px solid rgba(168, 85, 247, 0.32)',
          borderRadius: '16px',
          padding: '22px',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35), 0 0 20px rgba(168, 85, 247, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: '#c084fc',
                fontSize: '0.74rem',
                fontWeight: 750,
                textTransform: 'uppercase',
                letterSpacing: '0.06em'
              }}>
                <Zap size={16} color="#c084fc" />
                XP & Mastery Level
              </span>
              <span style={{
                fontSize: '0.74rem',
                fontWeight: 750,
                color: '#f8fafc',
                background: 'rgba(168, 85, 247, 0.2)',
                border: '1px solid rgba(168, 85, 247, 0.35)',
                padding: '2px 8px',
                borderRadius: '6px'
              }}>
                {rewards.xp} Total XP
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{
                background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                color: '#ffffff',
                fontSize: '0.78rem',
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: '6px'
              }}>
                LVL {rewards.level}
              </span>
              <strong style={{ fontSize: '1.05rem', color: '#f8fafc' }}>
                {rewards.level_title}
              </strong>
            </div>

            <div style={{
              height: '7px',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.08)',
              overflow: 'hidden',
              margin: '12px 0 6px'
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, Math.round((rewards.xp_in_level / rewards.next_level_xp) * 100))}%`,
                background: 'linear-gradient(90deg, #a855f7, #ec4899)',
                borderRadius: 'inherit'
              }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8' }}>
              <span>{rewards.xp_in_level} / {rewards.next_level_xp} XP</span>
              <span>{rewards.next_level_xp - rewards.xp_in_level} XP to Level {rewards.level + 1}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', fontSize: '0.72rem', color: '#94a3b8' }}>
            <span>Tests: <strong style={{ color: '#e2e8f0' }}>+100 XP</strong></span>
            <span>Revisions: <strong style={{ color: '#e2e8f0' }}>+60 XP</strong></span>
            <span>Mastery: <strong style={{ color: '#e2e8f0' }}>+150 XP</strong></span>
          </div>
        </div>

        {/* Milestone Badges Showcase */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(15, 27, 44, 0.95) 0%, rgba(20, 38, 60, 0.95) 100%)',
          border: '1px solid rgba(45, 212, 191, 0.32)',
          borderRadius: '16px',
          padding: '22px',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35), 0 0 20px rgba(45, 212, 191, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: '#5eead4',
                fontSize: '0.74rem',
                fontWeight: 750,
                textTransform: 'uppercase',
                letterSpacing: '0.06em'
              }}>
                <Trophy size={16} color="#5eead4" />
                Badge Rewards
              </span>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#2dd4bf',
                background: 'rgba(45, 212, 191, 0.12)',
                border: '1px solid rgba(45, 212, 191, 0.25)',
                padding: '2px 8px',
                borderRadius: '999px'
              }}>
                {rewards.unlocked_count} / {rewards.total_badges} Unlocked
              </span>
            </div>

            <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.45 }}>
              Earn recognition across study consistency, concept mastery, accuracy, and multilingual learning.
            </p>

            {/* Badges preview row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {(rewards.badges || []).slice(0, 5).map((b) => (
                <div
                  key={b.id}
                  title={`${b.title} (${b.tier}): ${b.unlocked ? 'Unlocked!' : 'In Progress'}`}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: b.unlocked ? 'linear-gradient(135deg, rgba(13, 148, 136, 0.3), rgba(2, 132, 199, 0.3))' : 'rgba(255, 255, 255, 0.04)',
                    border: b.unlocked ? '1px solid rgba(45, 212, 191, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                    cursor: 'pointer'
                  }}
                  onClick={() => onOpenProfile && onOpenProfile('rewards')}
                >
                  {b.unlocked ? '🏅' : '🔒'}
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenProfile && onOpenProfile('rewards')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#5eead4',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: 0,
              marginTop: '16px',
              textAlign: 'left'
            }}
          >
            Explore all badges & rewards <ArrowRight size={14} />
          </button>
        </div>
      </section>

      {/* 3. THREE FOCUSED MODES (Kept unchanged) */}
      <section className="mode-section" aria-labelledby="mode-heading">
        <div className="section-heading">
          <div>
            <span>One workspace, three focused modes</span>
            <h2 id="mode-heading">Choose what you need today</h2>
          </div>
          <p>Each mode shares the same learner profile, so every interaction makes the next one more useful.</p>
        </div>
        <div className="mode-grid">
          {MODES.map(({ id, eyebrow, title, description, action, icon: Icon, tone }, index) => (
            <button
              key={id}
              className={`mode-card mode-card--${tone}`}
              onClick={() => setMode(id)}
              style={{ '--delay': `${index * 90}ms` }}
            >
              <span className="mode-icon"><Icon size={22} /></span>
              <span className="mode-eyebrow">{eyebrow}</span>
              <strong>{title}</strong>
              <span className="mode-description">{description}</span>
              <span className="mode-link">
                {action} <ArrowRight size={16} />
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 4. ARCHITECTURE STRIP (Kept unchanged) */}
      <section className="architecture-strip">
        <span className="architecture-icon"><BrainCircuit size={22} /></span>
        <div>
          <strong>Built around your learning journey</strong>
          <p>Five specialized agents coordinate retrieval, diagnosis, remediation, and verification through one persistent learner profile.</p>
        </div>
        <span className="architecture-badge">Safe by design</span>
      </section>
    </div>
  );
}

