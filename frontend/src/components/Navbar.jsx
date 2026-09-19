import React from 'react';
import { BookOpen, CheckCircle2, GraduationCap, Home, RefreshCw, Sparkles } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'home', label: 'Overview', icon: Home },
  { id: 'learn', label: 'Learn', icon: BookOpen },
  { id: 'revise', label: 'Revise', icon: RefreshCw },
  { id: 'test', label: 'Test', icon: CheckCircle2 },
];

export default function Navbar({ currentMode, setMode, studentId, setStudentId, learnerSummary }) {
  return (
    <header className="site-header">
      <nav className="navbar" aria-label="Primary navigation">
        <button className="brand" onClick={() => setMode('home')} aria-label="Go to overview">
          <span className="brand-mark"><GraduationCap size={22} strokeWidth={1.8} /></span>
          <span className="brand-copy">
            <strong>EduNexus</strong>
            <small>Adaptive learning workspace</small>
          </span>
        </button>

        <div className="nav-tabs" role="tablist" aria-label="Learning modes">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-tab ${currentMode === id ? 'is-active' : ''}`} onClick={() => setMode(id)} role="tab" aria-selected={currentMode === id}>
              <Icon size={16} strokeWidth={2} /><span>{label}</span>
            </button>
          ))}
        </div>

        <div className="profile-cluster">
          {learnerSummary && (
            <div className="profile-stats" aria-label="Learning progress">
              <span className="stat-pill stat-pill--success"><CheckCircle2 size={14} /> {learnerSummary.mastered_subconcepts_count || 0}</span>
              {learnerSummary.active_misconceptions_count > 0 && (
                <span className="stat-pill stat-pill--attention"><Sparkles size={14} /> {learnerSummary.active_misconceptions_count}</span>
              )}
            </div>
          )}
          <label className="learner-field">
            <span>Learner</span>
            <input type="text" value={studentId} onChange={(e) => setStudentId(e.target.value)} aria-label="Learner ID" />
          </label>
        </div>
      </nav>
    </header>
  );
}
