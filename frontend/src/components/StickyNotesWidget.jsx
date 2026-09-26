import React, { useState, useEffect, useRef } from 'react';
import {
  StickyNote,
  Plus,
  Trash2,
  Image as ImageIcon,
  Upload,
  X,
  Maximize2,
  Check,
  Sparkles,
  Calendar,
  Eye
} from 'lucide-react';

const COLOR_THEMES = [
  { id: 'amber', name: 'Warm Amber', bg: '#fef3c7', text: '#1e293b', border: '#f59e0b', dot: '#f59e0b', header: 'rgba(245, 158, 11, 0.15)' },
  { id: 'cyan', name: 'Fresh Mint', bg: '#ccfbf1', text: '#0f172a', border: '#14b8a6', dot: '#14b8a6', header: 'rgba(20, 184, 166, 0.15)' },
  { id: 'purple', name: 'Lavender', bg: '#f3e8ff', text: '#1e1b4b', border: '#a855f7', dot: '#a855f7', header: 'rgba(168, 85, 247, 0.15)' },
  { id: 'rose', name: 'Soft Coral', bg: '#ffe4e6', text: '#4c0519', border: '#fb7185', dot: '#fb7185', header: 'rgba(251, 113, 133, 0.15)' },
  { id: 'blue', name: 'Sky Blue', bg: '#e0f2fe', text: '#0c4a6e', border: '#38bdf8', dot: '#38bdf8', header: 'rgba(56, 189, 248, 0.15)' },
  { id: 'dark', name: 'Night Slate', bg: '#132238', text: '#f8fafc', border: '#2dd4bf', dot: '#2dd4bf', header: 'rgba(45, 212, 191, 0.18)' },
];

const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 1200;
        let { width, height } = img;
        if (width > height && width > MAX_DIM) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else if (height > MAX_DIM) {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

export default function StickyNotesWidget({ studentId = 'default' }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImagePreview, setActiveImagePreview] = useState(null);
  const [saveStatus, setSaveStatus] = useState({}); // { [noteId]: 'saved' | 'saving' }
  const debounceTimers = useRef({});
  const fileInputRefs = useRef({});

  const localKey = `nexora:sticky-notes:${studentId || 'default'}`;

  // Load notes from server first, fallback to localStorage
  useEffect(() => {
    let isMounted = true;
    const loadNotes = async () => {
      let initialData = [];
      const cached = localStorage.getItem(localKey);
      if (cached) {
        try {
          initialData = JSON.parse(cached);
          if (isMounted) setNotes(initialData);
        } catch (e) {
          // ignore cache error
        }
      }

      if (studentId) {
        try {
          const res = await fetch(`/api/learner/${studentId}/notes`);
          if (res.ok) {
            const data = await res.json();
            if (isMounted && Array.isArray(data.notes)) {
              setNotes(data.notes);
              localStorage.setItem(localKey, JSON.stringify(data.notes));
            }
          }
        } catch (err) {
          console.warn('Could not sync sticky notes from backend:', err);
        }
      }
      if (isMounted) setLoading(false);
    };

    loadNotes();
    return () => { isMounted = false; };
  }, [studentId, localKey]);

  const saveToStorage = (updatedNotes) => {
    try {
      localStorage.setItem(localKey, JSON.stringify(updatedNotes));
    } catch (e) {
      console.warn('LocalStorage limit reached for notes:', e);
    }
  };

  const handleCreateNote = async (chosenColor = 'amber') => {
    const tempId = `temp_${Date.now()}`;
    const newNote = {
      id: tempId,
      student_id: studentId,
      title: '',
      content: '',
      color: chosenColor,
      image_data: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const nextNotes = [newNote, ...notes];
    setNotes(nextNotes);
    saveToStorage(nextNotes);

    try {
      const res = await fetch(`/api/learner/${studentId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '',
          content: '',
          color: chosenColor,
          image_data: '',
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setNotes((current) => {
          const replaced = current.map((n) => (n.id === tempId ? created : n));
          saveToStorage(replaced);
          return replaced;
        });
      }
    } catch (err) {
      console.warn('Error creating note on backend:', err);
    }
  };

  const handleUpdateNote = (id, field, value) => {
    setSaveStatus((prev) => ({ ...prev, [id]: 'saving' }));
    const nextNotes = notes.map((note) => {
      if (note.id === id) {
        return { ...note, [field]: value, updated_at: new Date().toISOString() };
      }
      return note;
    });
    setNotes(nextNotes);
    saveToStorage(nextNotes);

    // Debounce save to backend
    if (debounceTimers.current[id]) {
      clearTimeout(debounceTimers.current[id]);
    }

    debounceTimers.current[id] = setTimeout(async () => {
      const noteToSave = nextNotes.find((n) => n.id === id);
      if (!noteToSave) return;

      try {
        await fetch(`/api/learner/${studentId}/notes/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: noteToSave.title,
            content: noteToSave.content,
            color: noteToSave.color,
            image_data: noteToSave.image_data,
          }),
        });
        setSaveStatus((prev) => ({ ...prev, [id]: 'saved' }));
        setTimeout(() => {
          setSaveStatus((prev) => {
            const copy = { ...prev };
            delete copy[id];
            return copy;
          });
        }, 1800);
      } catch (e) {
        setSaveStatus((prev) => ({ ...prev, [id]: 'error' }));
      }
    }, 600);
  };

  const handleDeleteNote = async (id) => {
    const nextNotes = notes.filter((n) => n.id !== id);
    setNotes(nextNotes);
    saveToStorage(nextNotes);

    try {
      await fetch(`/api/learner/${studentId}/notes/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Error deleting note from backend:', err);
    }
  };

  const handleImageFileChange = async (id, file) => {
    if (!file || !file.type.startsWith('image/')) return;
    try {
      const compressedDataUrl = await compressImage(file);
      handleUpdateNote(id, 'image_data', compressedDataUrl);
    } catch (err) {
      console.error('Failed to process image:', err);
    }
  };

  return (
    <section className="sticky-notes-widget" aria-label="Student personal sticky notes" style={{ marginBottom: '52px' }}>
      {/* Widget Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '20px',
        padding: '0 4px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '9px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
            }}>
              <StickyNote size={18} />
            </span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 750, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
              My Study Sticky Desk
            </h2>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#f59e0b',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.28)',
              padding: '2px 8px',
              borderRadius: '999px'
            }}>
              {notes.length} {notes.length === 1 ? 'Sheet' : 'Sheets'}
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
            Your personal scratchpad for formulas, diagram snapshots, and quick revision thoughts.
          </p>
        </div>

        {/* Action Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => handleCreateNote('amber')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 6px 18px rgba(245, 158, 11, 0.28)',
              transition: 'all 0.2s ease'
            }}
          >
            <Plus size={16} strokeWidth={2.4} /> Add Sticky Note
          </button>
        </div>
      </div>

      {/* Empty State */}
      {notes.length === 0 && !loading && (
        <div style={{
          background: 'rgba(15, 23, 42, 0.45)',
          border: '1px dashed rgba(245, 158, 11, 0.35)',
          borderRadius: '16px',
          padding: '40px 24px',
          textAlign: 'center',
          color: '#94a3b8'
        }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '16px',
            background: 'rgba(245, 158, 11, 0.12)',
            color: '#f59e0b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px'
          }}>
            <StickyNote size={26} />
          </div>
          <h3 style={{ fontSize: '1rem', color: '#f8fafc', margin: '0 0 6px' }}>No Sticky Notes Yet</h3>
          <p style={{ fontSize: '0.82rem', maxWidth: '420px', margin: '0 auto 18px', lineHeight: 1.5 }}>
            Pin formulas, homework tasks, or upload study screenshots here. They stay private to your student account.
          </p>
          <button
            type="button"
            onClick={() => handleCreateNote('amber')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.18)',
              color: '#fbbf24',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              fontWeight: 650,
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            <Plus size={15} /> Create your first note
          </button>
        </div>
      )}

      {/* Sticky Notes Grid */}
      {notes.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
          gap: '20px',
          alignItems: 'start'
        }}>
          {notes.map((note) => {
            const currentTheme = COLOR_THEMES.find((t) => t.id === note.color) || COLOR_THEMES[0];
            const isDarkNote = currentTheme.id === 'dark';

            return (
              <div
                key={note.id}
                className="sticky-note-card"
                style={{
                  background: currentTheme.bg,
                  color: currentTheme.text,
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: '14px',
                  padding: '16px',
                  boxShadow: isDarkNote
                    ? '0 12px 28px rgba(0, 0, 0, 0.4), 0 0 16px rgba(45, 212, 191, 0.1)'
                    : '0 10px 25px rgba(0, 0, 0, 0.25), 0 2px 6px rgba(0, 0, 0, 0.1)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
              >
                {/* Note Header: Color Selector & Controls */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '8px',
                  borderBottom: `1px solid ${isDarkNote ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`
                }}>
                  {/* Color dots picker */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {COLOR_THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => handleUpdateNote(note.id, 'color', theme.id)}
                        title={`Color: ${theme.name}`}
                        style={{
                          width: '13px',
                          height: '13px',
                          borderRadius: '50%',
                          background: theme.dot,
                          border: note.color === theme.id ? `2px solid ${isDarkNote ? '#ffffff' : '#000000'}` : '1px solid rgba(0,0,0,0.15)',
                          cursor: 'pointer',
                          padding: 0,
                          transform: note.color === theme.id ? 'scale(1.25)' : 'scale(1)',
                          transition: 'transform 0.15s ease'
                        }}
                      />
                    ))}
                  </div>

                  {/* Actions & Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {saveStatus[note.id] === 'saving' && (
                      <span style={{ fontSize: '0.65rem', opacity: 0.65, fontWeight: 600 }}>Saving…</span>
                    )}
                    {saveStatus[note.id] === 'saved' && (
                      <span style={{ fontSize: '0.65rem', color: isDarkNote ? '#5eead4' : '#0d9488', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                        <Check size={11} /> Saved
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteNote(note.id)}
                      title="Delete sticky note"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: isDarkNote ? '#94a3b8' : 'rgba(0,0,0,0.45)',
                        cursor: 'pointer',
                        padding: '3px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'color 0.15s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = isDarkNote ? '#94a3b8' : 'rgba(0,0,0,0.45)'; }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Title Input */}
                <input
                  type="text"
                  placeholder="Note Title (e.g. Formula / Task)..."
                  value={note.title || ''}
                  onChange={(e) => handleUpdateNote(note.id, 'title', e.target.value)}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontWeight: 750,
                    fontSize: '0.94rem',
                    color: currentTheme.text,
                    fontFamily: 'inherit',
                    padding: '2px 0'
                  }}
                />

                {/* Content Textarea */}
                <textarea
                  placeholder="Type notes, formulas, reminders or steps here..."
                  rows={4}
                  value={note.content || ''}
                  onChange={(e) => handleUpdateNote(note.id, 'content', e.target.value)}
                  style={{
                    width: '100%',
                    background: isDarkNote ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.45)',
                    border: `1px solid ${isDarkNote ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'}`,
                    borderRadius: '8px',
                    outline: 'none',
                    fontSize: '0.84rem',
                    lineHeight: 1.5,
                    color: currentTheme.text,
                    fontFamily: 'inherit',
                    padding: '8px 10px',
                    resize: 'vertical',
                    minHeight: '75px'
                  }}
                />

                {/* Image Section (Visible Image Input & Preview) */}
                {note.image_data ? (
                  <div style={{
                    position: 'relative',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: `1px solid ${isDarkNote ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)'}`,
                    background: '#000000',
                    maxHeight: '220px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <img
                      src={note.image_data}
                      alt="Sticky note diagram or reminder"
                      onClick={() => setActiveImagePreview(note.image_data)}
                      style={{
                        width: '100%',
                        height: 'auto',
                        maxHeight: '220px',
                        objectFit: 'contain',
                        cursor: 'zoom-in',
                        display: 'block'
                      }}
                    />

                    {/* Image Action Buttons */}
                    <div style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      display: 'flex',
                      gap: '4px',
                      background: 'rgba(0, 0, 0, 0.65)',
                      backdropFilter: 'blur(4px)',
                      padding: '3px 6px',
                      borderRadius: '6px'
                    }}>
                      <button
                        type="button"
                        onClick={() => setActiveImagePreview(note.image_data)}
                        title="View full image"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ffffff',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <Maximize2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateNote(note.id, 'image_data', '')}
                        title="Remove image"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#f87171',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                    <input
                      type="file"
                      accept="image/*"
                      ref={(el) => { fileInputRefs.current[note.id] = el; }}
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleImageFileChange(note.id, e.target.files[0]);
                        }
                      }}
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRefs.current[note.id]?.click()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: isDarkNote ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                        border: `1px dashed ${isDarkNote ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.18)'}`,
                        color: currentTheme.text,
                        fontSize: '0.74rem',
                        fontWeight: 650,
                        cursor: 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <ImageIcon size={13} /> Attach Image / Diagram
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Image Preview Modal */}
      {activeImagePreview && (
        <div
          className="image-lightbox-modal"
          onClick={() => setActiveImagePreview(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 10, 20, 0.88)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '24px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              background: '#091524',
              borderRadius: '12px',
              border: '1px solid rgba(45, 212, 191, 0.3)',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ImageIcon size={16} color="#2dd4bf" /> Pinned Diagram & Note Image
              </span>
              <button
                type="button"
                onClick={() => setActiveImagePreview(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#94a3b8',
                  borderRadius: '6px',
                  padding: '4px',
                  cursor: 'pointer',
                  display: 'flex'
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '16px', overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={activeImagePreview}
                alt="Enlarged sticky note diagram"
                style={{
                  maxWidth: '100%',
                  maxHeight: '75vh',
                  objectFit: 'contain',
                  borderRadius: '8px'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
