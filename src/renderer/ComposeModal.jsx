import React, { useState, useEffect } from 'react';
import { IconX, IconPaperclip } from './icons/index.jsx';
import CompositionToolbar from './CompositionToolbar.jsx';

function FieldRow({ label, trailing, children }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '64px 1fr auto',
      alignItems: 'center', gap: 10,
      padding: '8px 0', borderBottom: '1px solid #232326', minHeight: 36,
    }}>
      <span style={{ fontSize: 11, color: '#71717A', fontWeight: 500, letterSpacing: 0.3, textTransform: 'uppercase' }}>{label}</span>
      <div style={{ minWidth: 0 }}>{children}</div>
      <div>{trailing}</div>
    </div>
  );
}

function RecipientField({ list, setList, placeholder }) {
  const [draft, setDraft] = useState('');

  const commit = () => {
    const v = draft.trim().replace(/,$/, '');
    if (v && !list.includes(v)) setList([...list, v]);
    setDraft('');
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
      {list.map(addr => (
        <span key={addr} style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '2px 4px 2px 8px',
          background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(99,102,241,0.30)',
          borderRadius: 3, fontSize: 12, color: '#C7C9FF',
        }}>
          {addr}
          <button onClick={() => setList(list.filter(x => x !== addr))}
            style={{ background: 'transparent', border: 'none', color: '#C7C9FF', padding: 2, display: 'inline-flex' }}>
            <IconX size={9} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
            if (draft.trim()) { e.preventDefault(); commit(); }
          } else if (e.key === 'Backspace' && !draft && list.length) {
            setList(list.slice(0, -1));
          }
        }}
        onBlur={commit}
        placeholder={list.length === 0 ? placeholder : ''}
        style={{
          flex: 1, minWidth: 160, padding: '2px 0',
          background: 'transparent', border: 'none', outline: 'none',
          color: '#E4E4E7', fontSize: 13, fontFamily: 'inherit',
        }}
      />
    </div>
  );
}

export default function ComposeModal({ onClose, accounts, templates, initial }) {
  const init = initial || {};
  const defaultAccount = accounts?.[0]?.id || '';

  const [from, setFrom] = useState(init.from || defaultAccount);
  const [to, setTo] = useState(init.to || []);
  const [cc, setCc] = useState(init.cc || []);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [subject, setSubject] = useState(init.subject || '');
  const [body, setBody] = useState(init.body || '');
  const [attachments, setAttachments] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' &&
        e.target.tagName !== 'INPUT' &&
        e.target.tagName !== 'TEXTAREA' &&
        !e.target.isContentEditable) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const fromAcct = accounts?.find(a => a.id === from) || {};

  const handleSend = async () => {
    if (!from || to.length === 0) return;
    setSending(true);
    setError(null);
    try {
      await window.api.compose.send({ fromAccountId: from, to, cc, subject, body });
      onClose();
    } catch (e) {
      setError(e.message || 'Send failed');
      setSending(false);
    }
  };

  const chipBtnStyle = {
    padding: '3px 8px', fontSize: 11,
    background: 'transparent', border: '1px solid #27272A', borderRadius: 4,
    color: '#A1A1AA', fontWeight: 500,
  };

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0,
        background: 'rgba(8,8,10,0.65)',
        backdropFilter: 'blur(2px)',
        animation: 'fadeIn .14s ease-out',
        zIndex: 100,
      }} />

      <div style={{
        position: 'fixed', top: '7%', left: '50%', transform: 'translateX(-50%)',
        width: 'min(760px, 92vw)', maxHeight: '86vh',
        background: '#18181B', border: '1px solid #27272A', borderRadius: 8,
        boxShadow: '0 24px 64px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,0,0,0.4)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideUp .16s ease-out',
        zIndex: 101, overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: '1px solid #27272A', background: '#1A1A1E',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#E4E4E7' }}>New message</span>
          </div>
          <button onClick={onClose} title="Close (Esc)" style={{
            width: 26, height: 26, borderRadius: 4,
            background: 'transparent', border: '1px solid #27272A',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: '#A1A1AA',
          }}>
            <IconX size={13} />
          </button>
        </div>

        <div style={{ padding: '4px 16px 0' }}>
          <FieldRow label="From">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 18, height: 18, borderRadius: '50%',
                background: fromAcct.color || '#6366F1', color: '#fff',
                fontSize: 10, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{(fromAcct.display_name || fromAcct.email || '?')[0]?.toUpperCase()}</div>
              <select value={from} onChange={(e) => setFrom(e.target.value)} style={{
                background: 'transparent', border: 'none', color: '#E4E4E7',
                fontSize: 13, fontFamily: 'inherit',
              }}>
                {(accounts || []).map(a => (
                  <option key={a.id} value={a.id} style={{ background: '#18181B' }}>{a.email}</option>
                ))}
              </select>
            </div>
          </FieldRow>

          <FieldRow label="To" trailing={
            !showCcBcc && (
              <button onClick={() => setShowCcBcc(true)} style={chipBtnStyle}>Cc/Bcc</button>
            )
          }>
            <RecipientField list={to} setList={setTo} placeholder="someone@example.com" />
          </FieldRow>

          {showCcBcc && (
            <FieldRow label="Cc">
              <RecipientField list={cc} setList={setCc} placeholder="" />
            </FieldRow>
          )}

          <FieldRow label="Subject">
            <input value={subject} onChange={(e) => setSubject(e.target.value)}
              placeholder="What's this about?"
              style={{
                width: '100%', padding: 0,
                background: 'transparent', border: 'none', outline: 'none',
                color: '#E4E4E7', fontSize: 13, fontFamily: 'inherit',
              }} />
          </FieldRow>
        </div>

        <div style={{ flex: 1, padding: '14px 16px 0', minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message…"
            style={{
              flex: 1, width: '100%', minHeight: 220, padding: 0,
              background: 'transparent', border: 'none', outline: 'none', resize: 'none',
              color: '#D4D4D8', fontSize: 14, lineHeight: 1.65,
              fontFamily: 'Inter, sans-serif',
            }}
          />
        </div>

        {attachments.length > 0 && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid #27272A', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {attachments.map((f, i) => (
              <span key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 8px', background: '#232328', border: '1px solid #3F3F46', borderRadius: 4,
                fontSize: 12, color: '#E4E4E7',
              }}>
                <IconPaperclip size={11} stroke="#A1A1AA" />
                {f.name}
                <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                  style={{ background: 'transparent', border: 'none', color: '#71717A', padding: 0, marginLeft: 2 }}>
                  <IconX size={10} />
                </button>
              </span>
            ))}
          </div>
        )}

        {error && (
          <div style={{ padding: '8px 16px', color: '#FCA5A5', fontSize: 12 }}>{error}</div>
        )}

        <CompositionToolbar
          draft={body}
          onDraftChange={setBody}
          onAttach={() => setAttachments(prev => [...prev, { name: 'attachment.pdf', size: '124 KB' }])}
          showTemplates={showTemplates}
          setShowTemplates={setShowTemplates}
          onInsertTemplate={(t) => { setBody(b => (b ? b + '\n\n' : '') + t.body); setShowTemplates(false); }}
          onSend={handleSend}
          onDiscard={onClose}
          templates={templates || []}
        />
      </div>
    </>
  );
}
