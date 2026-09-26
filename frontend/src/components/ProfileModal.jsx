import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  GraduationCap,
  Calendar,
  Clock,
  Droplets,
  Palette,
  X,
  Save,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Flame,
  Zap,
  Trophy,
  Award,
  BrainCircuit,
  RefreshCw,
  Target,
  BookOpen,
  Globe,
  Lock
} from 'lucide-react';

const THEMES = [
  { id: 'nexus', name: 'Nexus', description: 'Teal and blue', colors: ['#2dd4bf', '#60a5fa', '#07101d'] },
  { id: 'ocean', name: 'Ocean', description: 'Aqua and cobalt', colors: ['#22d3ee', '#3b82f6', '#061525'] },
  { id: 'violet', name: 'Violet', description: 'Purple and orchid', colors: ['#a78bfa', '#e879f9', '#110d22'] },
  { id: 'ember', name: 'Ember', description: 'Amber and coral', colors: ['#f59e0b', '#fb7185', '#1a0e12'] },
];

const renderBadgeIcon = (iconName, unlocked) => {
  const color = unlocked ? '#ffffff' : '#64748b';
  switch (iconName) {
    case 'Sparkles': return <Sparkles size={20} color={color} />;
    case 'Flame': return <Flame size={20} color={unlocked ? '#ffedd5' : color} />;
    case 'Zap': return <Zap size={20} color={unlocked ? '#fef08a' : color} />;
    case 'BrainCircuit': return <BrainCircuit size={20} color={unlocked ? '#99f6e4' : color} />;
    case 'Award': return <Award size={20} color={unlocked ? '#fef08a' : color} />;
    case 'RefreshCw': return <RefreshCw size={20} color={unlocked ? '#bfdbfe' : color} />;
    case 'Target': return <Target size={20} color={unlocked ? '#fecaca' : color} />;
    case 'BookOpen': return <BookOpen size={20} color={unlocked ? '#bae6fd' : color} />;
    case 'Globe': return <Globe size={20} color={unlocked ? '#bbf7d0' : color} />;
    case 'Clock': return <Clock size={20} color={unlocked ? '#ddd6fe' : color} />;
    default: return <Trophy size={20} color={color} />;
  }
};

const getTierColor = (tier) => {
  switch (tier) {
    case 'gold':
      return { border: 'rgba(245, 158, 11, 0.45)', bg: 'rgba(245, 158, 11, 0.12)', text: '#fbbf24', glow: 'rgba(245, 158, 11, 0.3)' };
    case 'silver':
      return { border: 'rgba(148, 163, 184, 0.45)', bg: 'rgba(148, 163, 184, 0.12)', text: '#e2e8f0', glow: 'rgba(148, 163, 184, 0.25)' };
    case 'bronze':
    default:
      return { border: 'rgba(217, 119, 6, 0.45)', bg: 'rgba(217, 119, 6, 0.12)', text: '#f59e0b', glow: 'rgba(217, 119, 6, 0.25)' };
  }
};

export default function ProfileModal({
  isOpen,
  onClose,
  studentProfile,
  learnerSummary,
  initialTab = 'profile',
  onSaveProfile
}) {
  const [activeTab, setActiveTab] = useState(initialTab || 'profile');
  const [formData, setFormData] = useState({
    name: studentProfile?.name || '',
    email: studentProfile?.email || '',
    level: studentProfile?.level || 'College',
    study: studentProfile?.study || '',
    yearOfStudy: studentProfile?.yearOfStudy || '2nd Year',
    learningGoal: studentProfile?.learningGoal || '',
    theme: studentProfile?.theme || 'nexus',
    pomodoro: {
      enabled: studentProfile?.pomodoro?.enabled ?? true,
      studyTime: studentProfile?.pomodoro?.studyTime || 25,
      breakTime: studentProfile?.pomodoro?.breakTime || 5,
    },
    hydration: {
      enabled: studentProfile?.hydration?.enabled ?? true,
      interval: studentProfile?.hydration?.interval || 45,
    },
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || 'profile');
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (studentProfile) {
      setFormData({
        name: studentProfile?.name || '',
        email: studentProfile?.email || '',
        level: studentProfile?.level || 'College',
        study: studentProfile?.study || '',
        yearOfStudy: studentProfile?.yearOfStudy || '2nd Year',
        learningGoal: studentProfile?.learningGoal || '',
        theme: studentProfile?.theme || 'nexus',
        pomodoro: {
          enabled: studentProfile?.pomodoro?.enabled ?? true,
          studyTime: studentProfile?.pomodoro?.studyTime || 25,
          breakTime: studentProfile?.pomodoro?.breakTime || 5,
        },
        hydration: {
          enabled: studentProfile?.hydration?.enabled ?? true,
          interval: studentProfile?.hydration?.interval || 45,
        },
      });
    }
  }, [studentProfile]);

  if (!isOpen) return null;

  const streaks = learnerSummary?.streaks || {
    current_streak: 0,
    best_streak: 0,
    today_studied: false,
    streak_message: 'Start your streak by completing a session today!'
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
    stats: {}
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrorMsg('');
  };

  const handlePomodoroChange = (field, value) => {
    const num = parseInt(value, 10) || 1;
    setFormData(prev => ({
      ...prev,
      pomodoro: {
        ...prev.pomodoro,
        [field]: num,
      }
    }));
    setErrorMsg('');
  };

  const handleTogglePomodoro = (enabled) => {
    setFormData(prev => ({
      ...prev,
      pomodoro: { ...prev.pomodoro, enabled }
    }));
  };

  const handleHydrationChange = (value) => {
    const num = parseInt(value, 10) || 5;
    setFormData(prev => ({
      ...prev,
      hydration: {
        ...prev.hydration,
        interval: num,
      }
    }));
  };

  const handleToggleHydration = (enabled) => {
    setFormData(prev => ({
      ...prev,
      hydration: { ...prev.hydration, enabled }
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('Please enter student name.');
      return;
    }

    if (formData.pomodoro.enabled) {
      if (formData.pomodoro.breakTime >= formData.pomodoro.studyTime) {
        setErrorMsg(`Break time (${formData.pomodoro.breakTime}m) must be strictly less than study time (${formData.pomodoro.studyTime}m).`);
        return;
      }
    }

    try {
      await onSaveProfile(formData);
      setSuccessMsg('Profile and personal preferences saved successfully!');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 900);
    } catch (error) {
      setErrorMsg(error.message || 'Could not save profile.');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(5, 10, 20, 0.78)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div
        className="profile-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, #0d1829 0%, #0f223a 100%)',
          border: '1px solid rgba(45, 212, 191, 0.25)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 30px rgba(45, 212, 191, 0.1)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: activeTab === 'rewards' ? '680px' : '580px',
          maxHeight: '90vh',
          overflowY: 'auto',
          color: '#e2e8f0',
          padding: '28px',
          position: 'relative',
          transition: 'max-width 0.25s ease'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: 'none',
            color: '#94a3b8',
            borderRadius: '8px',
            padding: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: activeTab === 'rewards'
              ? 'linear-gradient(135deg, #f97316, #ea580c)'
              : 'linear-gradient(135deg, #14b8a6, #0284c7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: activeTab === 'rewards'
              ? '0 8px 18px rgba(249, 115, 22, 0.3)'
              : '0 8px 16px rgba(20, 184, 166, 0.25)'
          }}>
            {activeTab === 'rewards' ? (
              <Trophy size={24} color="#ffffff" />
            ) : (
              <User size={24} color="#ffffff" />
            )}
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              {activeTab === 'rewards' ? 'Student Streaks & Rewards' : 'Student Profile & Habits'}
            </h2>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
              {activeTab === 'rewards'
                ? 'Your daily study streak, XP level, and unlocked milestone badges'
                : 'Configure your academic details and mindful study habits'}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '12px'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: activeTab === 'profile' ? '1px solid rgba(45, 212, 191, 0.3)' : '1px solid transparent',
              background: activeTab === 'profile' ? 'rgba(45, 212, 191, 0.12)' : 'transparent',
              color: activeTab === 'profile' ? '#5eead4' : '#94a3b8',
              fontWeight: 650,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.18s ease'
            }}
          >
            <User size={15} /> Academic & Habits
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rewards')}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: activeTab === 'rewards' ? '1px solid rgba(249, 115, 22, 0.4)' : '1px solid transparent',
              background: activeTab === 'rewards' ? 'rgba(249, 115, 22, 0.15)' : 'transparent',
              color: activeTab === 'rewards' ? '#fb923c' : '#94a3b8',
              fontWeight: 650,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.18s ease'
            }}
          >
            <Flame size={15} color="#f97316" fill={streaks.current_streak > 0 ? '#f97316' : 'none'} />
            Streaks & Badges
            <span style={{
              background: streaks.current_streak > 0 ? 'rgba(249, 115, 22, 0.25)' : 'rgba(255, 255, 255, 0.08)',
              color: streaks.current_streak > 0 ? '#fb923c' : '#94a3b8',
              fontSize: '0.7rem',
              padding: '1px 6px',
              borderRadius: '999px',
              fontWeight: 700
            }}>
              {streaks.current_streak}d • {rewards.unlocked_count}/{rewards.total_badges}
            </span>
          </button>
        </div>

        {errorMsg && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            marginBottom: '16px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            fontSize: '0.85rem'
          }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            marginBottom: '16px',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#6ee7b7',
            fontSize: '0.85rem'
          }}>
            <Sparkles size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* TAB 1: ACADEMIC PROFILE & HABITS */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Academic Info Section */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 650, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <GraduationCap size={16} /> Academic Profile
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Rivera"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#f8fafc',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>
                    Email (for Alerts)
                  </label>
                  <input
                    type="email"
                    placeholder="student@example.com"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#f8fafc',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>
                    Level
                  </label>
                  <select
                    value={formData.level}
                    onChange={(e) => handleChange('level', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: '#1e293b',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#f8fafc',
                      fontSize: '0.85rem'
                    }}
                  >
                    <option value="College">College / Univ</option>
                    <option value="School">School (K-12)</option>
                    <option value="Self-Taught">Self-Taught / Professional</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>
                    Course / Major
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Computer Science"
                    value={formData.study}
                    onChange={(e) => handleChange('study', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#f8fafc',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>
                    Year of Study
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 3rd Year / Grade 11"
                    value={formData.yearOfStudy}
                    onChange={(e) => handleChange('yearOfStudy', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#f8fafc',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Learning Goal Section */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.5)',
              border: '1px solid rgba(45, 212, 191, 0.2)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <label style={{ fontSize: '0.88rem', fontWeight: 650, color: '#2dd4bf', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={16} /> Target Learning Goal
              </label>
              <textarea
                placeholder="What is your main goal? (e.g., Master Operating Systems synchronization, pass semester exams with an A+, build intuition on Data Structures)"
                rows={2}
                value={formData.learningGoal}
                onChange={(e) => handleChange('learningGoal', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#f8fafc',
                  fontSize: '0.85rem',
                  resize: 'none'
                }}
              />
            </div>

            {/* Theme Selection */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 650, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Palette size={16} /> Workspace Theme
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {THEMES.map((theme) => {
                  const isSelected = formData.theme === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => handleChange('theme', theme.id)}
                      style={{
                        padding: '10px',
                        borderRadius: '10px',
                        background: isSelected ? 'rgba(45, 212, 191, 0.15)' : 'rgba(30, 41, 59, 0.5)',
                        border: isSelected ? '2px solid #2dd4bf' : '1px solid rgba(255, 255, 255, 0.08)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {theme.colors.map((c, i) => (
                          <div key={i} style={{ width: '12px', height: '12px', borderRadius: '50%', background: c }} />
                        ))}
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: isSelected ? '#5eead4' : '#cbd5e1' }}>
                        {theme.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mindful Habits: Pomodoro & Hydration */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 650, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={16} /> Mindful Study Rhythm
              </div>

              {/* Pomodoro */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '8px',
                padding: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: formData.pomodoro.enabled ? '12px' : '0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={16} color="#fbbf24" />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Pomodoro Study Cycles</div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Mascot suggests breaks after deep work</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.pomodoro.enabled}
                    onChange={(e) => handleTogglePomodoro(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#2dd4bf', cursor: 'pointer' }}
                  />
                </div>

                {formData.pomodoro.enabled && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '3px' }}>
                        Study Time (mins)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="180"
                        value={formData.pomodoro.studyTime}
                        onChange={(e) => handlePomodoroChange('studyTime', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          background: '#0f172a',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#f8fafc',
                          fontSize: '0.85rem'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '3px' }}>
                        Break Time (mins)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={formData.pomodoro.breakTime}
                        onChange={(e) => handlePomodoroChange('breakTime', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          background: '#0f172a',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#f8fafc',
                          fontSize: '0.85rem'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Hydration */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '8px',
                padding: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: formData.hydration.enabled ? '12px' : '0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Droplets size={16} color="#38bdf8" />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Hydration Reminders</div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Gentle reminders to drink water</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.hydration.enabled}
                    onChange={(e) => handleToggleHydration(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#38bdf8', cursor: 'pointer' }}
                  />
                </div>

                {formData.hydration.enabled && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '3px' }}>
                      Reminder Every (mins)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="240"
                      value={formData.hydration.interval}
                      onChange={(e) => handleHydrationChange(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: '#0f172a',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#f8fafc',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#cbd5e1',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #0d9488, #0284c7)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)'
                }}
              >
                <Save size={16} /> Save Profile & Settings
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: STREAKS & BADGE REWARDS */}
        {activeTab === 'rewards' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* 1. Daily Study Streak Banner */}
            <div style={{
              background: 'radial-gradient(circle at 10% 20%, rgba(249, 115, 22, 0.18) 0%, rgba(15, 27, 44, 0.95) 80%)',
              border: '1px solid rgba(249, 115, 22, 0.35)',
              borderRadius: '14px',
              padding: '20px',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 12px 30px rgba(249, 115, 22, 0.12)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 20px rgba(249, 115, 22, 0.4)',
                    color: '#ffffff'
                  }}>
                    <Flame size={32} fill="#ffffff" />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1 }}>
                        {streaks.current_streak}
                      </span>
                      <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fb923c' }}>
                        {streaks.current_streak === 1 ? 'Day Streak' : 'Days Streak'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>Record: <strong>{streaks.best_streak} days</strong></span>
                      <span>•</span>
                      {streaks.today_studied ? (
                        <span style={{ color: '#34d399', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 650 }}>
                          <CheckCircle2 size={13} /> Completed today
                        </span>
                      ) : (
                        <span style={{ color: '#fbbf24', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 650 }}>
                          <Clock size={13} /> Active today
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  fontSize: '0.78rem',
                  color: '#cbd5e1',
                  maxWidth: '260px'
                }}>
                  {streaks.streak_message}
                </div>
              </div>
            </div>

            {/* 2. Level & XP Progress Card */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(168, 85, 247, 0.25)',
              borderRadius: '14px',
              padding: '18px 20px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: 'rgba(168, 85, 247, 0.2)',
                    color: '#c084fc',
                    fontWeight: 750,
                    fontSize: '0.84rem',
                    border: '1px solid rgba(168, 85, 247, 0.35)'
                  }}>
                    Level {rewards.level}
                  </div>
                  <strong style={{ fontSize: '0.98rem', color: '#f8fafc' }}>
                    {rewards.level_title}
                  </strong>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 600 }}>
                  <span style={{ color: '#a855f7', fontWeight: 750 }}>{rewards.xp}</span> Total XP
                </div>
              </div>

              {/* Progress bar */}
              <div style={{
                height: '8px',
                borderRadius: '999px',
                background: 'rgba(255, 255, 255, 0.08)',
                overflow: 'hidden',
                margin: '12px 0 8px'
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, Math.round((rewards.xp_in_level / rewards.next_level_xp) * 100))}%`,
                  background: 'linear-gradient(90deg, #a855f7, #ec4899)',
                  borderRadius: 'inherit',
                  transition: 'width 0.4s ease'
                }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8' }}>
                <span>{rewards.xp_in_level} / {rewards.next_level_xp} XP to Level {rewards.level + 1}</span>
                <span>{rewards.next_level_xp - rewards.xp_in_level} XP needed</span>
              </div>
            </div>

            {/* 3. Milestone Badges Showcase */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={18} color="#f59e0b" />
                  Milestone Badges
                </div>
                <div style={{
                  fontSize: '0.78rem',
                  fontWeight: 650,
                  color: '#94a3b8',
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '3px 10px',
                  borderRadius: '999px'
                }}>
                  Unlocked: <span style={{ color: '#2dd4bf' }}>{rewards.unlocked_count}</span> / {rewards.total_badges}
                </div>
              </div>

              {/* Badge Cards Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '12px'
              }}>
                {(rewards.badges || []).map((badge) => {
                  const isUnlocked = badge.unlocked;
                  const tierStyle = getTierColor(badge.tier);

                  return (
                    <div
                      key={badge.id}
                      style={{
                        background: isUnlocked
                          ? 'linear-gradient(145deg, rgba(15, 27, 44, 0.85) 0%, rgba(20, 38, 62, 0.95) 100%)'
                          : 'rgba(15, 23, 42, 0.4)',
                        border: isUnlocked
                          ? `1px solid ${tierStyle.border}`
                          : '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '12px',
                        padding: '14px',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '10px',
                        boxShadow: isUnlocked ? `0 6px 18px ${tierStyle.glow}` : 'none',
                        transition: 'all 0.2s ease',
                        opacity: isUnlocked ? 1 : 0.72
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '10px',
                          background: isUnlocked
                            ? 'linear-gradient(135deg, #0f766e 0%, #0369a1 100%)'
                            : 'rgba(30, 41, 59, 0.6)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          border: isUnlocked ? `1px solid ${tierStyle.border}` : '1px solid rgba(255, 255, 255, 0.08)'
                        }}>
                          {renderBadgeIcon(badge.icon, isUnlocked)}
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                            <strong style={{ fontSize: '0.86rem', color: isUnlocked ? '#f8fafc' : '#94a3b8' }}>
                              {badge.title}
                            </strong>
                            <span style={{
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              color: tierStyle.text,
                              background: tierStyle.bg,
                              border: `1px solid ${tierStyle.border}`,
                              padding: '1px 6px',
                              borderRadius: '4px'
                            }}>
                              {badge.tier}
                            </span>
                          </div>
                          <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: '#94a3b8', lineHeight: 1.4 }}>
                            {badge.description}
                          </p>
                        </div>
                      </div>

                      {/* Badge Progress Track */}
                      <div style={{ marginTop: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', marginBottom: '4px' }}>
                          <span style={{ color: isUnlocked ? '#34d399' : '#64748b', fontWeight: 650, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {isUnlocked ? (
                              <>
                                <CheckCircle2 size={12} color="#34d399" /> Unlocked
                              </>
                            ) : (
                              <>
                                <Lock size={11} color="#64748b" /> In Progress
                              </>
                            )}
                          </span>
                          <span style={{ color: '#94a3b8', fontWeight: 600 }}>
                            {badge.progress} / {badge.target}
                          </span>
                        </div>
                        <div style={{
                          height: '5px',
                          borderRadius: '999px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${badge.percent}%`,
                            background: isUnlocked
                              ? 'linear-gradient(90deg, #10b981, #2dd4bf)'
                              : 'linear-gradient(90deg, #475569, #64748b)',
                            borderRadius: 'inherit'
                          }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Close Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '8px 22px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #0d9488, #0284c7)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 650,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)'
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
