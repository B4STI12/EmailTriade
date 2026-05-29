import React, { useState, useEffect } from 'react';
import { IconReply, IconForward, IconX, IconChevronDown, IconChevronRight } from './icons/index.jsx';
import CompositionToolbar from './CompositionToolbar.jsx';

function InlineFieldRow({ label, children }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '54px 1fr',
      alignItems: 'center', gap: 10,
      padding: '6px 0',
      borderBottom: '1px solid #232326',
      minHeight: 30,
    }}>
      <span style={{ fontSize: 10.5, color: '#71717A', fontWeight: 500, letterSpacing: 0.3, textTransform: 'uppercase' }}>{label}</span>
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}

function RecipientChips({ list, setList, placeholder }) {
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

export default function InlineComposer({ mode, email, account, accounts, onClose, onSent, templates }) {
  const isReply = mode === 'reply' || mode === 'replyAll';
  const prefix = isReply ? 'Re: ' : 'Fwd: ';
  const cleanSubject = (email?.subject || '').replace(/^(Re:|Fwd:|Re:|Fwd:)\s*/i, '');

  const [from, setFrom] = useState(account?.id || accounts?.[0]?.id || '');
  const [to, setTo] = useState(isReply ? [email?.sender_email || ''] : []);
  const [subject, setSubject] = useState(prefix + cleanSubject);
  const [body, setBody] = useState(
    isReply
      ? `\n\n\n— ${account?.email?.split('@')[0] || ''}`
      : `\n\n— Forwarded message —\nFrom: ${email?.sender_name} <${email?.sender_email}>\nSubject: ${email?.subject}\n\n${email?.body || ''}`
  );
  const [showTemplates, setShowTemplates] = useState(false);
  const [showQuote, setShowQuote] = useState(isReply);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const fromAcct = accounts?.find(a => a.id === from) || account || {};

  const handleSend = async () => {
    setSending(true);
    setError(null);
    try {
      const payload = { fromAccountId: from, to, subject, body };
      if (mode === 'reply' || mode === 'replyAll') {
        await window.api.compose.reply(email.id, payload);
      } else {
        await window.api.compose.forward(email.id, payload);
      }
      if (onSent) onSent();
      onClose();
    } catch (e) {
      setError(e.message || 'Send failed');
      setSending(false);
    }
  };

  return (
    <div style={{
      margin: '0 16px 16px',
      background: '#1A1A1E',
      border: '1px solid #27272A',
      borderRadius: 8,
      boxShadow: '0 2px 12px -2px rgba(0,0,0,0.4)',
      overflow: 'hidden',
      animation: 'slideUp .15s ease-out',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '9px 14px',
        borderBottom: '1px solid #232326',
        background: '#1F1F23',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#E4E4E7', fontSize: 12, fontWeight: 600 }}>
          {isReply ? <IconReply size={12} stroke="#A5A8F4" /> : <IconForward size={12} stroke="#A5A8F4" />}
          {isReply ? 'Reply' : 'Forward'}
          <span style={{ color: '#52525B', fontWeight: 400 }}>·</span>
          <span style={{ color: '#71717A', fontWeight: 400 }}>to {isReply ? (email?.sender_name || email?.sender_email) : '…'}</span>
        </div>
        <button onClick={onClose} title="Discard (Esc)" style={{
          width: 22, height: 22, borderRadius: 3,
          background: 'transparent', border: '1px solid #27272A',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: '#71717A',
        }}>
          <IconX size={11} />
        </button>
      </div>

      <div style={{ padding: '2px 14px' }}>
        <InlineFieldRow label="From">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 16, height: 16, borderRadius: '50%',
              background: fromAcct.color || '#6366F1', color: '#fff',
              fontSize: 9, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{(fromAcct.display_name || fromAcct.email || '?')[0].toUpperCase()}</div>
            <select value={from} onChange={(e) => setFrom(e.target.value)} style={{
              background: 'transparent', border: 'none', color: '#E4E4E7',
              fontSize: 12, fontFamily: 'inherit',
            }}>
              {(accounts || []).map(a => (
                <option key={a.id} value={a.id} style={{ background: '#18181B' }}>{a.email}</option>
              ))}
            </select>
          </div>
        </InlineFieldRow>
        <InlineFieldRow label="To">
          <RecipientChips list={to} setList={setTo} placeholder="someone@example.com" />
        </InlineFieldRow>
        <InlineFieldRow label="Subject">
          <input value={subject} onChange={(e) => setSubject(e.target.value)} style={{
            width: '100%', padding: 0,
            background: 'transparent', border: 'none', outline: 'none',
            color: '#E4E4E7', fontSize: 12.5, fontFamily: 'inherit',
          }} />
        </InlineFieldRow>
      </div>

      <div style={{ position: 'relative', padding: '10px 14px 4px' }}>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your reply…"
          style={{
            width: '100%', minHeight: 140, padding: 0,
            background: 'transparent', border: 'none', outline: 'none', resize: 'vertical',
            color: '#D4D4D8', fontSize: 13.5, lineHeight: 1.6,
            fontFamily: 'Inter, sans-serif',
          }}
        />
      </div>

      <div style={{ padding: '0 14px 8px' }}>
        <button onClick={() => setShowQuote(s => !s)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 0', background: 'transparent', border: 'none',
          color: '#71717A', fontSize: 11,
        }}>
          {showQuote ? <IconChevronDown size={11} /> : <IconChevronRight size={11} />}
          <span>{showQuote ? 'Hide' : 'Show'} quoted message</span>
        </button>
        {showQuote && email && (
          <div style={{
            marginTop: 6, padding: '8px 10px',
            borderLeft: '2px solid #3F3F46',
            color: '#71717A', fontSize: 12, lineHeight: 1.55,
            whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'auto',
          }}>
            {email.sender_name} &lt;{email.sender_email}&gt; wrote:{'\n'}
            {(email.body || '').split('\n').map(l => '> ' + l).join('\n')}
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: '0 14px 8px', color: '#FCA5A5', fontSize: 12 }}>{error}</div>
      )}

      <CompositionToolbar
        draft={body}
        onDraftChange={setBody}
        onAttach={() => {}}
        showTemplates={showTemplates}
        setShowTemplates={setShowTemplates}
        onInsertTemplate={(t) => { setBody(b => b.replace(/^\n*/, t.body + '\n\n')); setShowTemplates(false); }}
        onSend={handleSend}
        onDiscard={onClose}
        compact
        templates={templates || []}
      />
    </div>
  );
}
