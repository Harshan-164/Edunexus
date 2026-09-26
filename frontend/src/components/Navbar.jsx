import React from 'react';
import { Award, BookOpen, CheckCircle2, Flame, GraduationCap, Home, LogOut, Moon, RefreshCw, Sparkles, Sun, TrendingUp, User } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'home', label: 'Overview', icon: Home },
  { id: 'learn', label: 'Learn', icon: BookOpen },
  { id: 'revise', label: 'Revise', icon: RefreshCw },
  { id: 'test', label: 'Test', icon: CheckCircle2 },
  { id: 'progress', label: 'Progress', icon: TrendingUp },
];

export default function Navbar({
  currentMode,
  setMode,
  learnerSummary,
  studentProfile,
  username,
  onOpenProfile,
  onLogout,
  currentTheme = 'nexus',
  onToggleTheme,
}) {
  const isLight = currentTheme === 'light';

  return (
    <header className="site-header">
      <nav className="navbar" aria-label="Primary navigation">
        <button className="brand" onClick={() => setMode('home')} aria-label="Go to overview">
          <span className="brand-mark"><GraduationCap size={22} strokeWidth={1.8} /></span>
          <span className="brand-copy">
            <strong>Nexora</strong>
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
              <span
                className="stat-pill stat-pill--streak"
                title={learnerSummary.streaks?.streak_message || 'Study streak'}
                style={{
                  background: 'rgba(249, 115, 22, 0.14)',
                  color: '#fb923c',
                  border: '1px solid rgba(249, 115, 22, 0.28)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
                onClick={() => onOpenProfile('rewards')}
              >
                <Flame size={14} color="#f97316" fill={learnerSummary.streaks?.current_streak > 0 ? '#f97316' : 'none'} />
                {learnerSummary.streaks?.current_streak || 0}d
              </span>
              {learnerSummary.rewards?.level && (
                <span
                  className="stat-pill stat-pill--level"
                  title={`Level ${learnerSummary.rewards.level}: ${learnerSummary.rewards.level_title} (${learnerSummary.rewards.xp} XP)`}
                  style={{
                    background: 'rgba(168, 85, 247, 0.14)',
                    color: '#c084fc',
                    border: '1px solid rgba(168, 85, 247, 0.28)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                  onClick={() => onOpenProfile('rewards')}
                >
                  <Award size={13} color="#c084fc" />
                  Lvl {learnerSummary.rewards.level}
                </span>
              )}
              <span className="stat-pill stat-pill--success" title={`${learnerSummary.mastered_subconcepts_count || 0} subconcepts mastered`}>
                <CheckCircle2 size={14} /> {learnerSummary.mastered_subconcepts_count || 0}
              </span>
              {learnerSummary.active_misconceptions_count > 0 && (
                <span className="stat-pill stat-pill--attention" title={`${learnerSummary.active_misconceptions_count} active misconceptions to repair`}>
                  <Sparkles size={14} /> {learnerSummary.active_misconceptions_count}
                </span>
              )}
            </div>
          )}

          {/* Quick 1-click Dark/Light Theme Toggle */}
          {onToggleTheme && (
            <button
              type="button"
              className="theme-toggle-button"
              onClick={onToggleTheme}
              title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              aria-label={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {isLight ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          )}
          
          <button
            className="account-profile-button"
            onClick={() => onOpenProfile('profile')}
            title={studentProfile?.name ? `Student Profile: ${studentProfile.name}` : 'Setup Student Profile'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(15, 27, 44, 0.95), rgba(20, 38, 60, 0.9))',
              border: '1px solid rgba(45, 212, 191, 0.35)',
              color: '#5eead4',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: 650,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.2s ease'
            }}
          >
            <User size={15} color="#2dd4bf" />
            <span><strong>{studentProfile?.name || username}</strong><small>@{username}</small></span>
          </button>
          <button className="nav-logout-button" onClick={onLogout} title="Sign out" aria-label="Sign out"><LogOut size={16} /></button>
        </div>
      </nav>
    </header>
  );
}
