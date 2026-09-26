import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, ArrowDownToLine, BarChart3, BellRing, BookOpen, ChevronDown, ChevronUp, ClipboardCheck, Clock3, GraduationCap, HeartPulse, LogOut, RefreshCw, Search, Send, ShieldCheck, Sparkles, TrendingUp, Users, X } from 'lucide-react';

const formatDateTime = (value) => {
  if (!value) return 'No activity yet';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};
const csvCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
const formatDuration = (seconds = 0) => {
  if (seconds < 60) return seconds ? '< 1 min' : 'No time yet';
  const hours = Math.floor(seconds / 3600); const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes} min`;
};

export default function Admin({ account, onLogout }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [standing, setStanding] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [section, setSection] = useState('performance');
  const [reminderStudent, setReminderStudent] = useState(null);
  const [reminderAction, setReminderAction] = useState('learn');
  const [reminderMessage, setReminderMessage] = useState('A quick learning session today will keep your momentum going.');
  const [sendingReminder, setSendingReminder] = useState(false);
  const [toast, setToast] = useState('');

  const loadOverview = async (quiet = false) => {
    quiet ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/overview');
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || 'Could not load student analytics.');
      setData(payload);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadOverview(); }, []);

  const students = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (data?.students || []).filter((student) => {
      const matchesStanding = standing === 'all' || student.standing === standing;
      const searchable = [student.name, student.username, student.email, student.course_year, ...(student.progress?.topic_names || [])].join(' ').toLowerCase();
      return matchesStanding && (!normalized || searchable.includes(normalized));
    });
  }, [data, query, standing]);

  const exportCsv = () => {
    const headers = ['Username', 'Tester Name', 'Tester Type', 'Course/Year', 'Prior Knowledge', 'Test Number', 'Date', 'Start Time', 'End Time', 'Learning Material Used', 'Topic Selected', 'Concept Being Tested', 'Facilitator', 'Observer', 'Technical Monitor', 'Topics', 'Learn Chats', 'Revisions', 'Tests', 'Average Score', 'Pass Rate', 'Mastered', 'Weak', 'Misconceptions', 'Standing'];
    const rows = students.map((student) => {
      const walk = student.walkthrough;
      const progress = student.progress;
      return [student.username, walk.tester_name, walk.tester_type, walk.course_year, walk.prior_knowledge, walk.test_number, walk.date, walk.start_time, walk.end_time, walk.learning_material, walk.topic_selected, walk.concept_being_tested, walk.facilitator, walk.observer, walk.technical_monitor, progress.topics, progress.chat_sessions, progress.revision_sessions, progress.completed_tests, `${progress.average_score}%`, `${progress.pass_rate}%`, progress.mastered, progress.weak, progress.misconceptions, student.standing];
    });
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `nexora-students-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const summary = data?.summary || {};
  const allStudents = data?.students || [];
  const maxActivity = Math.max(1, ...allStudents.map((student) => student.progress.chat_sessions + student.progress.revision_sessions + student.progress.completed_tests));
  const sendReminder = async () => {
    if (!reminderStudent || !reminderMessage.trim()) return;
    setSendingReminder(true);
    try {
      const response = await fetch('/api/admin/reminders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: reminderStudent.id, action_type: reminderAction, title: `Time to ${reminderAction}`, message: reminderMessage }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || 'Could not send reminder.');
      setToast(`Reminder sent to ${reminderStudent.name}.`);
      setReminderStudent(null);
      setTimeout(() => setToast(''), 3500);
      loadOverview(true);
    } catch (sendError) { setToast(sendError.message); }
    finally { setSendingReminder(false); }
  };
  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div className="admin-topbar__brand"><span><GraduationCap size={22} /></span><div><strong>Nexora</strong><small>Top Teacher Console</small></div></div>
        <div className="admin-topbar__account"><span className="admin-role-pill"><ShieldCheck size={14} /> Administrator</span><div><strong>{account.profile?.name || 'Top Teacher'}</strong><small>@{account.username}</small></div><button onClick={onLogout} title="Sign out" aria-label="Sign out"><LogOut size={17} /></button></div>
      </header>

      <main className="admin-main">
        <section className="admin-heading">
          <div><span className="admin-eyebrow"><Activity size={14} /> Live local analytics</span><h1>Student progress command center</h1><p>Review learning activity, assessment performance, mastery signals, and evaluator walkthrough information across every student account.</p></div>
          <button className="admin-refresh" onClick={() => loadOverview(true)} disabled={refreshing}><RefreshCw size={16} className={refreshing ? 'spin' : ''} /> {refreshing ? 'Refreshing…' : 'Refresh data'}</button>
        </section>
        {error && <div className="admin-error"><AlertTriangle size={18} /><span>{error}</span><button onClick={() => loadOverview()}>Try again</button></div>}

        {loading ? <div className="admin-loading"><span className="admin-loading__orb"><BarChart3 size={24} /></span><div className="generation-skeleton"><i /><i /><i /></div><strong>Aggregating student workspaces…</strong></div> : <>
          <section className="admin-metrics" aria-label="Student overview">
            <article><span className="metric-icon metric-icon--cyan"><Users size={19} /></span><div><small>Total students</small><strong>{summary.total_students || 0}</strong><em>{summary.active_students || 0} have started</em></div></article>
            <article><span className="metric-icon metric-icon--violet"><ClipboardCheck size={19} /></span><div><small>Tests completed</small><strong>{summary.tests_completed || 0}</strong><em>{summary.topics_explored || 0} topic journeys</em></div></article>
            <article><span className="metric-icon metric-icon--green"><BarChart3 size={19} /></span><div><small>Cohort average</small><strong>{summary.average_score || 0}%</strong><em>Across completed tests</em></div></article>
            <article><span className="metric-icon metric-icon--rose"><AlertTriangle size={19} /></span><div><small>Needs attention</small><strong>{summary.needs_attention || 0}</strong><em>Students below 60%</em></div></article>
          </section>

          <nav className="admin-section-tabs" aria-label="Teacher console sections">
            <button className={section === 'performance' ? 'is-active' : ''} onClick={() => setSection('performance')}><TrendingUp size={17} /> Performance</button>
            <button className={section === 'students' ? 'is-active' : ''} onClick={() => setSection('students')}><Users size={17} /> Student register</button>
            <button className={section === 'care' ? 'is-active' : ''} onClick={() => setSection('care')}><HeartPulse size={17} /> Student Care</button>
          </nav>

          {section === 'performance' && <section className="performance-grid">
            <article className="admin-chart-card admin-chart-card--wide">
              <div className="chart-heading"><div><span>Assessment performance</span><h2>Student score overview</h2></div><BarChart3 size={21} /></div>
              <div className="performance-bars">{allStudents.map((student) => <div className="performance-bar-row" key={student.id}>
                <label><strong>{student.name}</strong><small>{student.progress.completed_tests ? `${student.progress.completed_tests} completed` : 'No completed tests'}</small></label>
                <div><span style={{ width: `${student.progress.average_score}%` }} className={student.progress.average_score < 60 ? 'is-low' : student.progress.average_score >= 80 ? 'is-high' : ''} /></div><b>{student.progress.average_score}%</b>
              </div>)}{!allStudents.length && <div className="admin-empty"><Users size={22} /><strong>No student performance yet</strong></div>}</div>
            </article>
            <article className="admin-chart-card">
              <div className="chart-heading"><div><span>Cohort health</span><h2>Standing mix</h2></div><Sparkles size={20} /></div>
              <div className="standing-visual"><div className="standing-donut" style={{ '--excellent': `${allStudents.length ? allStudents.filter((s) => s.standing === 'Excelling').length / allStudents.length * 100 : 0}%`, '--attention': `${allStudents.length ? allStudents.filter((s) => s.standing === 'Needs attention').length / allStudents.length * 100 : 0}%` }}><strong>{allStudents.length}</strong><small>students</small></div><div className="standing-legend">{['Excelling', 'On track', 'Needs attention', 'Not started'].map((label) => <span key={label}><i className={`legend-${label.toLowerCase().replaceAll(' ', '-')}`} />{label}<b>{allStudents.filter((student) => student.standing === label).length}</b></span>)}</div></div>
            </article>
            <article className="admin-chart-card admin-chart-card--wide">
              <div className="chart-heading"><div><span>Learning engagement</span><h2>Workspace activity by student</h2></div><Activity size={20} /></div>
              <div className="activity-chart">{allStudents.map((student) => { const p = student.progress; const total = p.chat_sessions + p.revision_sessions + p.completed_tests; return <div key={student.id} className="activity-chart-row"><label>{student.name}</label><div title={`${p.chat_sessions} learn · ${p.revision_sessions} revise · ${p.completed_tests} tests`}><i className="activity-learn" style={{ width: `${p.chat_sessions / maxActivity * 100}%` }} /><i className="activity-revise" style={{ width: `${p.revision_sessions / maxActivity * 100}%` }} /><i className="activity-test" style={{ width: `${p.completed_tests / maxActivity * 100}%` }} /></div><b>{total}</b></div>; })}</div>
              <footer className="activity-legend"><span><i className="activity-learn" /> Learn</span><span><i className="activity-revise" /> Revise</span><span><i className="activity-test" /> Tests</span></footer>
            </article>
            <article className="admin-chart-card insight-card"><span><BellRing size={22} /></span><h2>Teacher insight</h2><p>{summary.needs_attention ? `${summary.needs_attention} student${summary.needs_attention === 1 ? '' : 's'} may benefit from a Test or Revise reminder.` : 'The cohort is currently on track. Keep encouraging regular learning sessions.'}</p><button onClick={() => setSection('care')}>Open Student Care</button></article>
          </section>}

          {section === 'care' && <section className="student-care-section">
            <div className="care-summary"><div><span><Clock3 size={17} /> Total focused time</span><strong>{formatDuration(summary.total_active_seconds)}</strong></div><div><span><Activity size={17} /> Active today</span><strong>{summary.active_today || 0}</strong></div><div><span><BellRing size={17} /> Unread reminders</span><strong>{summary.pending_reminders || 0}</strong></div></div>
            <div className="care-heading"><div><span>Engagement & wellbeing</span><h2>Student Care</h2><p>See participation signals and send a gentle, actionable reminder directly to a student’s inbox.</p></div></div>
            <div className="student-care-grid">{allStudents.map((student) => <article className="care-student-card" key={student.id}>
              <header><div className="student-identity"><span>{student.name.slice(0, 1).toUpperCase()}</span><div><strong>{student.name}</strong><small>@{student.username}</small></div></div><em className={`engagement-badge engagement-badge--${student.usage.status.toLowerCase().replaceAll(' ', '-')}`}>{student.usage.status}</em></header>
              <div className="care-time"><Clock3 size={22} /><div><small>Time in Nexora</small><strong>{formatDuration(student.usage.total_active_seconds)}</strong><span>Last seen {formatDateTime(student.usage.last_seen)}</span></div></div>
              <div className="care-signals"><span><b>{student.progress.average_score}%</b> average</span><span><b>{student.progress.topics}</b> topics</span><span><b>{student.usage.unread_notifications}</b> unread</span></div>
              <button onClick={() => { setReminderStudent(student); setReminderAction('learn'); setReminderMessage('A quick learning session today will keep your momentum going.'); }}><Send size={16} /> Send reminder</button>
            </article>)}</div>
          </section>}

          {section === 'students' && <section className="admin-table-card">
            <div className="admin-table-heading"><div><span><Sparkles size={15} /> Student data register</span><h2>All student records</h2><p>One row per student. Scroll horizontally for the complete evaluator walkthrough.</p></div><button onClick={exportCsv} disabled={!students.length}><ArrowDownToLine size={16} /> Export CSV</button></div>
            <div className="admin-table-tools"><label><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, username, course or topic…" /></label><select value={standing} onChange={(event) => setStanding(event.target.value)} aria-label="Filter by standing"><option value="all">All standings</option><option>Excelling</option><option>On track</option><option>Needs attention</option><option>Not started</option></select><span>{students.length} of {data?.students?.length || 0} students</span></div>
            <div className="admin-table-scroll"><table className="admin-student-table">
              <thead><tr><th className="is-sticky">Student account</th><th>Standing</th><th>Overall progress</th><th>Test number</th><th>Date</th><th>Start time</th><th>End time</th><th>Tester name</th><th>Tester type</th><th>Course / Year</th><th>Prior knowledge</th><th>Learning material used</th><th>Topic selected</th><th>Concept being tested</th><th>Facilitator</th><th>Observer</th><th>Technical monitor</th><th aria-label="Expand row" /></tr></thead>
              <tbody>{students.map((student) => {
                const walk = student.walkthrough; const progress = student.progress; const isExpanded = expandedId === student.id;
                const progressValue = progress.completed_tests ? progress.average_score : Math.min(100, progress.topics * 20);
                return <React.Fragment key={student.id}>
                  <tr className={isExpanded ? 'is-expanded' : ''}>
                    <td className="is-sticky"><div className="student-identity"><span>{student.name.slice(0, 1).toUpperCase()}</span><div><strong>{student.name}</strong><small>@{student.username}</small></div></div></td>
                    <td><span className={`standing-badge standing-badge--${student.standing.toLowerCase().replaceAll(' ', '-')}`}>{student.standing}</span></td>
                    <td><div className="table-progress"><span><i style={{ width: `${progressValue}%` }} /></span><small>{progress.completed_tests ? `${progress.average_score}% test average` : `${progress.topics} topics explored`}</small></div></td>
                    <td>{walk.test_number}</td><td>{walk.date}</td><td>{walk.start_time}</td><td>{walk.end_time}</td><td>{walk.tester_name}</td><td>{walk.tester_type}</td><td>{walk.course_year}</td><td>{walk.prior_knowledge}</td><td className="admin-wide-cell">{walk.learning_material}</td><td>{walk.topic_selected}</td><td className="admin-wide-cell">{walk.concept_being_tested}</td><td>{walk.facilitator}</td><td>{walk.observer}</td><td>{walk.technical_monitor}</td>
                    <td><button className="row-expand" onClick={() => setExpandedId(isExpanded ? null : student.id)} aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${student.name}`}>{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button></td>
                  </tr>
                  {isExpanded && <tr className="student-detail-row"><td colSpan="18"><div className="student-detail-grid">
                    <div className="student-detail-profile"><span><BookOpen size={16} /> Student context</span><strong>{student.course_year}</strong><p>{student.learning_goal || 'No learning goal has been added yet.'}</p><small>Last activity: {formatDateTime(student.last_activity)}</small></div>
                    <div className="student-detail-stats"><div><small>Learn chats</small><strong>{progress.chat_sessions}</strong></div><div><small>Revisions</small><strong>{progress.revision_sessions}</strong></div><div><small>Tests</small><strong>{progress.completed_tests}</strong></div><div><small>Pass rate</small><strong>{progress.pass_rate}%</strong></div><div><small>Mastered</small><strong>{progress.mastered}</strong></div><div><small>Needs work</small><strong>{progress.weak}</strong></div><div><small>Misconceptions</small><strong>{progress.misconceptions}</strong></div><div><small>Scheduled</small><strong>{progress.scheduled}</strong></div></div>
                    <div className="student-topic-list"><span>Topics explored</span><div>{progress.topic_names.length ? progress.topic_names.map((topic) => <em key={topic}>{topic}</em>) : <small>No topics recorded</small>}</div></div>
                  </div></td></tr>}
                </React.Fragment>;
              })}{!students.length && <tr><td colSpan="18"><div className="admin-empty"><Users size={23} /><strong>No matching students</strong><span>Try clearing the search or standing filter.</span></div></td></tr>}</tbody>
            </table></div>
          </section>}
        </>}
      </main>
      {reminderStudent && <div className="reminder-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setReminderStudent(null)}><section className="reminder-dialog" role="dialog" aria-modal="true" aria-label="Send student reminder"><header><div><span>Teacher reminder</span><h2>Message {reminderStudent.name}</h2></div><button onClick={() => setReminderStudent(null)} aria-label="Close"><X size={19} /></button></header><div className="reminder-action-options">{['learn', 'revise', 'test'].map((action) => <button key={action} className={reminderAction === action ? 'is-active' : ''} onClick={() => { setReminderAction(action); setReminderMessage(action === 'learn' ? 'A quick learning session today will keep your momentum going.' : action === 'revise' ? 'Please revisit your recent topics today to strengthen your recall.' : 'You are ready for a quick test. Complete one today to check your progress.'); }}>{action === 'learn' ? <BookOpen size={17} /> : action === 'revise' ? <RefreshCw size={17} /> : <ClipboardCheck size={17} />}<span>{action}</span></button>)}</div><label>Message<textarea rows="4" maxLength="500" value={reminderMessage} onChange={(event) => setReminderMessage(event.target.value)} /></label><footer><small>The reminder stays in the student inbox until they read it.</small><button onClick={sendReminder} disabled={sendingReminder || !reminderMessage.trim()}><Send size={16} /> {sendingReminder ? 'Sending…' : 'Send reminder'}</button></footer></section></div>}
      {toast && <div className="admin-toast"><CheckCircleIcon />{toast}</div>}
    </div>
  );
}

function CheckCircleIcon() { return <span aria-hidden="true">✓</span>; }
