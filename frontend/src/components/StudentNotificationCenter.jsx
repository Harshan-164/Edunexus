import React, { useEffect, useMemo, useState } from 'react';
import { Bell, BookOpen, Check, ClipboardCheck, RefreshCw, X } from 'lucide-react';

const actionMeta = {
  learn: { label: 'Open Learn', icon: BookOpen },
  revise: { label: 'Open Revise', icon: RefreshCw },
  test: { label: 'Open Test', icon: ClipboardCheck },
};

const formatWhen = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

export default function StudentNotificationCenter({ notifications, onRead, onNavigate }) {
  const [open, setOpen] = useState(false);
  const unread = useMemo(() => notifications.filter((item) => !item.read_at).length, [notifications]);

  useEffect(() => {
    if (unread) setOpen(true);
  }, [unread > 0]);

  const handleOpen = async (notification) => {
    await onRead(notification.id);
    setOpen(false);
    onNavigate(notification.action_type);
  };

  return <div className="student-notifications">
    <button className="student-notification-fab" onClick={() => setOpen((value) => !value)} aria-label="Teacher notifications">
      <Bell size={20} />{unread > 0 && <span>{unread > 9 ? '9+' : unread}</span>}
    </button>
    {open && <section className="student-notification-panel" aria-label="Teacher notifications">
      <header><div><span>Teacher inbox</span><strong>{unread ? `${unread} new reminder${unread === 1 ? '' : 's'}` : 'You are all caught up'}</strong></div><button onClick={() => setOpen(false)} aria-label="Close notifications"><X size={18} /></button></header>
      <div className="student-notification-list">
        {notifications.map((notification) => {
          const meta = actionMeta[notification.action_type] || actionMeta.learn;
          const Icon = meta.icon;
          return <article key={notification.id} className={notification.read_at ? 'is-read' : ''}>
            <span className={`notification-action notification-action--${notification.action_type}`}><Icon size={17} /></span>
            <div><small>{notification.sender_username || 'Teacher'} · {formatWhen(notification.created_at)}</small><strong>{notification.title}</strong><p>{notification.message}</p><button onClick={() => handleOpen(notification)}>{meta.label}</button></div>
            {!notification.read_at && <button className="notification-read" onClick={() => onRead(notification.id)} title="Mark as read"><Check size={15} /></button>}
          </article>;
        })}
        {!notifications.length && <div className="notification-empty"><Bell size={23} /><strong>No reminders yet</strong><span>Your teacher’s notes will appear here.</span></div>}
      </div>
    </section>}
  </div>;
}
