import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, BookOpen, CheckCircle2, Clock3, FileText, Loader2,
  MessageSquare, Paperclip, Plus, Search, Send, Sparkles, X,
} from 'lucide-react';
import Visualizer from '../components/Visualizer';

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const fileSize = (bytes = 0) => bytes < 1024 * 1024
  ? `${Math.max(1, Math.round(bytes / 1024))} KB`
  : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

function ThinkingIndicator() {
  const [stage, setStage] = useState(0);
  const stages = ['Thinking...', 'Preparing...', 'Final drafting...'];
  const widths = ['40%', '70%', '100%'];

  useEffect(() => {
    const timer1 = setTimeout(() => setStage(1), 2400);
    const timer2 = setTimeout(() => setStage(2), 5200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <div className="shimmer-indicator-bubble">
      <span key={stage} className="skeleton-shimmer-text shimmer-stage-animate">
        {stages[stage]}
      </span>
      <div className="skeleton-progress-bar" style={{ width: widths[stage] }} />
    </div>
  );
}

function parseInline(text) {
  if (!text) return text;
  const parts = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(<code key={key++} className="md-inline-code">{token.slice(1, -1)}</code>);
    } else if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(<strong key={key++} className="md-bold">{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(<em key={key++} className="md-italic">{token.slice(1, -1)}</em>);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? parts : text;
}

function FormattedText({ content }) {
  if (!content) return null;
  const blocks = [];
  const lines = content.split('\n');
  let inCodeBlock = false;
  let codeBuffer = [];
  let listBuffer = [];
  let listType = null;
  let blockKey = 0;

  const flushList = () => {
    if (listBuffer.length > 0) {
      const items = listBuffer.map((item, idx) => (
        <li key={idx} className="md-list-item">{parseInline(item)}</li>
      ));
      if (listType === 'ol') {
        blocks.push(<ol key={blockKey++} className="md-ol">{items}</ol>);
      } else {
        blocks.push(<ul key={blockKey++} className="md-ul">{items}</ul>);
      }
      listBuffer = [];
      listType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      flushList();
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBuffer = [];
      } else {
        inCodeBlock = false;
        blocks.push(
          <pre key={blockKey++} className="md-pre">
            <code className="md-code-block">{codeBuffer.join('\n')}</code>
          </pre>
        );
        codeBuffer = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      if (level <= 2) {
        blocks.push(<h3 key={blockKey++} className="md-h2">{parseInline(headingText)}</h3>);
      } else {
        blocks.push(<h4 key={blockKey++} className="md-h3">{parseInline(headingText)}</h4>);
      }
      continue;
    }

    const ulMatch = line.match(/^(\*|-)\s+(.+)$/);
    if (ulMatch) {
      if (listType !== 'ul') flushList();
      listType = 'ul';
      listBuffer.push(ulMatch[2]);
      continue;
    }

    const olMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (olMatch) {
      if (listType !== 'ol') flushList();
      listType = 'ol';
      listBuffer.push(olMatch[2]);
      continue;
    }

    flushList();
    if (line.trim() === '') {
      blocks.push(<div key={blockKey++} className="md-spacer" />);
    } else {
      blocks.push(<p key={blockKey++} className="md-p">{parseInline(line)}</p>);
    }
  }

  flushList();
  if (inCodeBlock && codeBuffer.length > 0) {
    blocks.push(
      <pre key={blockKey++} className="md-pre">
        <code className="md-code-block">{codeBuffer.join('\n')}</code>
      </pre>
    );
  }

  return <div className="formatted-markdown">{blocks}</div>;
}

function ProgressiveMessageText({ text, isNew = false, onProgress }) {
  const [displayedLength, setDisplayedLength] = useState(isNew ? 0 : (text ? text.length : 0));

  useEffect(() => {
    if (!isNew || !text) {
      setDisplayedLength(text ? text.length : 0);
      return;
    }

    const tokens = text.split(/(\s+)/);
    let index = 0;
    const chunkSize = 2;
    const intervalMs = 26;

    const timer = setInterval(() => {
      index += chunkSize;
      if (index >= tokens.length) {
        setDisplayedLength(text.length);
        clearInterval(timer);
        onProgress?.();
      } else {
        const currentSlice = tokens.slice(0, index).join('');
        setDisplayedLength(currentSlice.length);
        onProgress?.();
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [text, isNew]);

  const visibleContent = isNew ? text.slice(0, displayedLength) : text;
  const isTyping = isNew && displayedLength < text.length;

  return (
    <div className={`message-text ${isTyping ? 'is-streaming' : ''}`}>
      <FormattedText content={visibleContent} />
      {isTyping && <span className="progressive-cursor" />}
    </div>
  );
}

export default function Learn({ studentId, onRefreshProfile }) {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [openingSession, setOpeningSession] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [sessionSearch, setSessionSearch] = useState('');
  const [newLesson, setNewLesson] = useState({ title: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [inputMsg, setInputMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [streamingMessageId, setStreamingMessageId] = useState(null);
  const [checkQuiz, setCheckQuiz] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const messageEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const loadSessions = async (preferredId) => {
    setLoadingSessions(true);
    setError('');
    try {
      const res = await fetch(`/api/learn/sessions/${encodeURIComponent(studentId)}`);
      if (!res.ok) throw new Error('Could not load your chats.');
      const data = await res.json();
      setSessions(data.sessions || []);
      const remembered = preferredId || localStorage.getItem(`edunexus:last-chat:${studentId}`);
      if (remembered && data.sessions?.some((session) => session.id === remembered)) {
        await openSession(remembered, false);
      } else {
        setActiveSession(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingSessions(false);
    }
  };

  const openSession = async (sessionId, closeMobile = true) => {
    setOpeningSession(true);
    setError('');
    setStreamingMessageId(null);
    setCheckQuiz(null);
    setQuizResult(null);
    try {
      const res = await fetch(`/api/learn/session/${sessionId}`);
      if (!res.ok) throw new Error('Could not open this chat.');
      const session = await res.json();
      setActiveSession(session);
      localStorage.setItem(`edunexus:last-chat:${studentId}`, sessionId);
      if (closeMobile && window.innerWidth <= 760) setSidebarOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setOpeningSession(false);
    }
  };

  useEffect(() => { loadSessions(); }, [studentId]);
  useEffect(() => { messageEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activeSession?.messages, sending]);

  const createSession = async (event) => {
    event.preventDefault();
    if (!newLesson.title.trim() || !newLesson.description.trim()) return;
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/learn/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId, ...newLesson }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Could not create the chat.');
      setActiveSession(data);
      setSessions((previous) => [{ ...data, message_count: 0, attachment_count: 0 }, ...previous]);
      localStorage.setItem(`edunexus:last-chat:${studentId}`, data.id);
      setNewLesson({ title: '', description: '' });
      setShowCreate(false);
      setSidebarOpen(window.innerWidth > 760);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const sendMessage = async (event) => {
    event?.preventDefault();
    const text = inputMsg.trim();
    if (!text || sending || !activeSession) return;
    const optimistic = { id: `pending-${Date.now()}`, sender: 'user', text, created_at: new Date().toISOString() };
    setActiveSession((previous) => ({ ...previous, messages: [...previous.messages, optimistic] }));
    setInputMsg('');
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/learn/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          session_id: activeSession.id,
          topic: activeSession.title,
          message: text,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'The tutor could not respond.');
      const tutorMessage = data.message || {
        id: `reply-${Date.now()}`,
        sender: 'tutor',
        text: data.response,
        visualization: data.visualization,
        is_grounded: data.is_grounded,
        created_at: new Date().toISOString(),
      };
      setStreamingMessageId(tutorMessage.id);
      setActiveSession((previous) => ({ ...previous, messages: [...previous.messages, tutorMessage] }));
      setSessions((previous) => previous.map((session) => session.id === activeSession.id
        ? { ...session, updated_at: new Date().toISOString(), message_count: (session.message_count || 0) + 2 }
        : session).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)));
      onRefreshProfile?.();
    } catch (err) {
      setError(err.message);
      setActiveSession((previous) => ({ ...previous, messages: previous.messages.filter((message) => message.id !== optimistic.id) }));
      setInputMsg(text);
    } finally {
      setSending(false);
    }
  };

  const uploadFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !activeSession) return;
    setUploading(true);
    setError('');
    const body = new FormData();
    body.append('file', file);
    try {
      const res = await fetch(`/api/learn/session/${activeSession.id}/documents`, { method: 'POST', body });
      const attachment = await res.json();
      if (!res.ok) throw new Error(attachment.detail || 'Could not upload the document.');
      setActiveSession((previous) => ({ ...previous, attachments: [...previous.attachments, attachment] }));
      setSessions((previous) => previous.map((session) => session.id === activeSession.id
        ? { ...session, attachment_count: (session.attachment_count || 0) + 1, updated_at: new Date().toISOString() }
        : session));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const checkUnderstanding = async () => {
    if (!activeSession) return;
    setSending(true);
    setQuizResult(null);
    setUserAnswers({});
    try {
      const res = await fetch('/api/learn/check_understanding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          topic: activeSession.title,
          document_name: activeSession.attachments[0]?.stored_name || null,
        }),
      });
      if (!res.ok) throw new Error('Could not create a knowledge check.');
      const data = await res.json();
      setCheckQuiz(data.questions);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const submitQuiz = () => {
    const score = checkQuiz.reduce((total, question) => {
      const answer = userAnswers[question.id];
      const correct = question.correct_answer?.replace(/^Option \d+:\s*/i, '');
      return total + (answer?.toLowerCase() === correct?.toLowerCase() ? 1 : 0);
    }, 0);
    const passed = score === checkQuiz.length;
    setQuizResult({ score, passed });
    fetch('/api/learn/save_event', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: studentId, topic: activeSession.title,
        source_type: activeSession.attachments.length ? 'uploaded_document' : 'freeform',
        document_name: activeSession.attachments[0]?.display_name || null,
        mode: 'learn', status: passed ? 'LEARNED' : 'EXPOSED',
      }),
    });
    onRefreshProfile?.();
  };

  const filteredSessions = sessions.filter((session) =>
    `${session.title} ${session.description}`.toLowerCase().includes(sessionSearch.toLowerCase())
  );

  return (
    <div className="learn-workspace">
      <aside className={`chat-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="chat-sidebar__header">
          <div><span>Learning workspace</span><strong>Your chats</strong></div>
          <button className="icon-button mobile-sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar"><X size={18} /></button>
        </div>
        <button className="new-chat-button" onClick={() => setShowCreate(true)}><Plus size={17} /> New chat</button>
        <label className="chat-search"><Search size={15} /><input value={sessionSearch} onChange={(event) => setSessionSearch(event.target.value)} placeholder="Search chats" /></label>
        <div className="session-list">
          {loadingSessions ? <div className="sidebar-status"><Loader2 className="spin" size={18} /> Loading chats</div> : filteredSessions.length ? filteredSessions.map((session) => (
            <button key={session.id} className={`session-item ${activeSession?.id === session.id ? 'is-active' : ''}`} onClick={() => openSession(session.id)}>
              <span className="session-item__icon"><MessageSquare size={16} /></span>
              <span className="session-item__copy"><strong>{session.title}</strong><small>{session.description}</small><em><Clock3 size={11} /> {formatDate(session.updated_at)}{session.attachment_count > 0 && <> · {session.attachment_count} file{session.attachment_count > 1 ? 's' : ''}</>}</em></span>
            </button>
          )) : <div className="sidebar-empty">No chats yet.<br />Create one to begin learning.</div>}
        </div>
        <div className="sidebar-storage"><CheckCircle2 size={14} /><span><strong>Saved locally</strong><small>Chats and files stay on this device</small></span></div>
      </aside>

      <section className="chat-panel">
        {error && <div className="chat-error"><span>{error}</span><button onClick={() => setError('')}><X size={15} /></button></div>}
        {openingSession ? (
          <div className="chat-loading"><Loader2 className="spin" size={24} /> Opening chat…</div>
        ) : !activeSession ? (
          <div className="chat-zero-state">
            <span className="zero-state-icon"><BookOpen size={30} /></span>
            <span>Persistent learning chats</span>
            <h2>What would you like to learn?</h2>
            <p>Create a lesson workspace. Your conversation and uploaded course files will be here when you return.</p>
            <button className="btn-primary" onClick={() => setShowCreate(true)}><Plus size={17} /> Create your first chat</button>
          </div>
        ) : (
          <>
            <header className="chat-header">
              <button className="icon-button sidebar-toggle" onClick={() => setSidebarOpen(true)} aria-label="Show chats"><ArrowLeft size={18} /></button>
              <div className="chat-heading"><span>Lesson</span><h2>{activeSession.title}</h2><p>{activeSession.description}</p></div>
              <button className="knowledge-button" onClick={checkUnderstanding} disabled={sending}><Sparkles size={16} /><span>Check understanding</span></button>
            </header>

            {activeSession.attachments.length > 0 && (
              <div className="attachment-bar"><span className="attachment-bar__label">Sources</span>{activeSession.attachments.map((attachment) => (
                <a className="attachment-chip" key={attachment.id} href={attachment.download_url} target="_blank" rel="noreferrer"><FileText size={15} /><span><strong>{attachment.display_name}</strong><small>{fileSize(attachment.size)}</small></span></a>
              ))}</div>
            )}

            <div className="message-stream">
              {activeSession.messages.length === 0 && (
                <div className="lesson-welcome"><span><Sparkles size={20} /></span><div><strong>Ready to explore {activeSession.title}</strong><p>Ask a question below, or attach a PDF so the tutor can answer from your own material.</p></div></div>
              )}
              {activeSession.messages.map((message) => (
                <div className={`message-row message-row--${message.sender}`} key={message.id}>
                  {message.sender === 'tutor' && <span className="tutor-avatar"><Sparkles size={15} /></span>}
                  <div className="message-bubble">
                    {message.is_grounded && <span className="grounded-label"><FileText size={12} /> Answered from your sources</span>}
                    {message.sender === 'tutor' ? (
                      <ProgressiveMessageText
                        text={message.text}
                        isNew={message.id === streamingMessageId}
                        onProgress={() => messageEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
                      />
                    ) : (
                      <div className="message-text">
                        <FormattedText content={message.text} />
                      </div>
                    )}
                    {message.visualization && <Visualizer data={message.visualization} />}
                    <time>{formatDate(message.created_at)}</time>
                  </div>
                </div>
              ))}
              {sending && (
                <div className="message-row message-row--tutor">
                  <span className="tutor-avatar"><Sparkles size={15} /></span>
                  <ThinkingIndicator />
                </div>
              )}
              <div ref={messageEndRef} />
            </div>

            <div className="composer-wrap">
              <form className="chat-composer" onSubmit={sendMessage}>
                <input ref={fileInputRef} type="file" accept=".pdf,.txt" onChange={uploadFile} hidden />
                <button type="button" className="composer-tool" onClick={() => fileInputRef.current?.click()} disabled={uploading} aria-label="Attach PDF or text file">{uploading ? <Loader2 className="spin" size={19} /> : <Paperclip size={19} />}</button>
                <textarea rows="1" value={inputMsg} onChange={(event) => setInputMsg(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} placeholder={`Message your ${activeSession.title} tutor…`} />
                <button className="composer-send" type="submit" disabled={!inputMsg.trim() || sending} aria-label="Send message"><Send size={18} /></button>
              </form>
              <p>Attach PDF or TXT files for source-grounded answers. Enter to send · Shift + Enter for a new line.</p>
            </div>

            {checkQuiz && (
              <div className="quiz-overlay" role="dialog" aria-modal="true" aria-label="Knowledge check">
                <div className="quiz-dialog">
                  <div className="quiz-dialog__header"><div><span>Knowledge check</span><h3>{activeSession.title}</h3></div><button className="icon-button" onClick={() => setCheckQuiz(null)}><X size={18} /></button></div>
                  {checkQuiz.map((question, index) => (
                    <div className="quiz-question" key={question.id}><strong>{index + 1}. {question.question}</strong>{question.options.map((option) => <label key={option}><input type="radio" name={question.id} checked={userAnswers[question.id] === option} onChange={() => setUserAnswers((previous) => ({ ...previous, [question.id]: option }))} /><span>{option}</span></label>)}</div>
                  ))}
                  {quizResult ? <div className={`quiz-result ${quizResult.passed ? 'is-passed' : ''}`}><CheckCircle2 size={18} /><span><strong>{quizResult.score}/{checkQuiz.length} correct</strong>{quizResult.passed ? 'Excellent—this lesson is looking strong.' : 'Keep going. Ask the tutor to revisit the questions you missed.'}</span></div> : <button className="btn-primary" onClick={submitQuiz}>Submit answers</button>}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {showCreate && (
        <div className="create-chat-overlay" role="dialog" aria-modal="true" aria-labelledby="create-chat-title">
          <form className="create-chat-dialog" onSubmit={createSession}>
            <button type="button" className="icon-button create-chat-close" onClick={() => setShowCreate(false)}><X size={18} /></button>
            <span className="create-chat-icon"><BookOpen size={23} /></span>
            <span className="create-chat-eyebrow">New learning chat</span>
            <h2 id="create-chat-title">What are you going to learn?</h2>
            <p>Set a clear focus now. You can add course material once the chat is created.</p>
            <label><span>Lesson or topic</span><input autoFocus maxLength="120" value={newLesson.title} onChange={(event) => setNewLesson((previous) => ({ ...previous, title: event.target.value }))} placeholder="e.g. Introduction to thermodynamics" required /></label>
            <label><span>Short description</span><textarea rows="3" maxLength="500" value={newLesson.description} onChange={(event) => setNewLesson((previous) => ({ ...previous, description: event.target.value }))} placeholder="What do you want to understand or accomplish?" required /></label>
            <div className="create-chat-actions"><button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button><button className="btn-primary" disabled={creating || !newLesson.title.trim() || !newLesson.description.trim()}>{creating ? <><Loader2 className="spin" size={16} /> Creating…</> : <>Create chat <Plus size={16} /></>}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
