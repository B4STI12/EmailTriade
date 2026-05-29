import React, { useState, useEffect } from 'react';
import {
  IconX, IconUnsub, IconBan, IconClock, IconArchive, IconTrash,
  IconReply, IconForward, IconCornerUpLeft, IconSpinner, IconStar
} from './icons/index.jsx';
import { CategoryBadge, ActionBtn } from './TriageScreen.jsx';
import InlineComposer from './InlineComposer.jsx';
import SnoozePopover from './SnoozePopover.jsx';

const kbdStyle = {
  marginLeft: 4, padding: '0 4px',
  border: '1px solid rgba(255,255,255,0.2)', borderRadius: 3,
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 10, color: 'rgba(255,255,255,0.85)',
};

function ReplyChip({ children, onClick, primary }) {
  const [h, sh] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => sh(true)} onMouseLeave={() => sh(false)} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '6px 12px',
      background: primary ? (h ? '#5558E0' : '#6366F1') : (h ? '#232328' : 'transparent'),
      border: primary ? '1px solid #5558E0' : `1px solid ${h ? '#3F3F46' : '#27272A'}`,
      borderRadius: 4, color: primary ? '#fff' : '#E4E4E7',
      fontSize: 12, fontWeight: 500,
    }}>{children}</button>
  );
}

export default function ReadingPane({
  emailId, onClose, replyMode, setReplyMode, accounts, templates,
  onArchive, onDelete, onSnooze, onMarkRead,
}) {
  const [email, setEmail] = useState(null);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    window.api.emails.open(emailId).then(e => {
      if (!active) return;
      setEmail(e);
      setLoading(false);
      if (e && !e.is_read) {
        window.api.emails.markRead([emailId], true).catch(() => {});
      }
    });
    return () => { active = false; };
  }, [emailId]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
      if (e.key === 'Escape') {
        if (replyMode && replyMode !== 'none') { setReplyMode('none'); return; }
        if (snoozeOpen) { setSnoozeOpen(false); return; }
        onClose();
      } else if (e.key.toLowerCase() === 'r' && (!replyMode || replyMode === 'none') && !snoozeOpen) {
        setReplyMode('reply');
      } else if (e.key.toLowerCase() === 'f' && (!replyMode || replyMode === 'none') && !snoozeOpen) {
        setReplyMode('forward');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, replyMode, setReplyMode, snoozeOpen]);

  const isReplying = replyMode === 'reply' || replyMode === 'forward' || replyMode === 'replyAll';
  const acct = accounts?.find(a => a.id === email?.account_id) || {};

  const handleUnsubscribe = async () => {
    if (!email) return;
    await window.api.emails.unsubscribe(email.id);
  };

  const handleStar = async () => {
    if (!email) return;
    const newStarred = !email.is_starred;
    await window.api.emails.star(email.id, newStarred);
    setEmail(prev => ({ ...prev, is_starred: newStarred ? 1 : 0 }));
  };

  const handleBlockSender = async () => {
    if (!email) return;
    await window.api.emails.blockSender(email.id);
    onClose();
  };

  const handleArchive = async () => {
    if (!email) return;
    await window.api.emails.archive([email.id]);
    onClose();
  };

  const handleDelete = async () => {
    if (!email) return;
    await window.api.emails.delete([email.id]);
    onClose();
  };

  const handleSnooze = async (ts) => {
    if (!email) return;
    await window.api.emails.snooze([email.id], ts);
    setSnoozeOpen(false);
    onClose();
  };

  const handleMarkReadToggle = async () => {
    if (!email) return;
    const newRead = !email.is_read;
    await window.api.emails.markRead([email.id], newRead);
    setEmail(prev => ({ ...prev, is_read: newRead ? 1 : 0 }));
  };

  return (
    <>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(8,8,10,0.55)',
        animation: 'fadeIn .14s ease-out',
        zIndex: 10,
      }} />

      <div style={{
        position: 'absolute', top: 0, bottom: 0, right: 0,
        width: '60%', minWidth: 560,
        background: '#18181B',
        borderLeft: '1px solid #27272A',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight .18s ease-out',
        zIndex: 11,
      }}>
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconSpinner size={20} />
          </div>
        ) : !email ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52525B' }}>
            Email not found
          </div>
        ) : (
          <>
            <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid #27272A', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={onClose} style={{
                    width: 26, height: 26, borderRadius: 4,
                    background: 'transparent', border: '1px solid #27272A',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    color: '#A1A1AA',
                  }} title="Close (Esc)">
                    <IconX size={13} />
                  </button>
                  <CategoryBadge category={email.category} />
                  <button onClick={handleMarkReadToggle} style={{
                    padding: '2px 8px', fontSize: 11, borderRadius: 3,
                    background: email.is_read ? 'rgba(99,102,241,0.10)' : 'rgba(99,102,241,0.20)',
                    border: '1px solid rgba(99,102,241,0.25)',
                    color: '#A5A8F4', fontWeight: 500,
                  }}>
                    {email.is_read ? 'Mark unread' : 'Mark read'}
                  </button>
                  <span style={{ fontSize: 11, color: '#71717A', fontFamily: 'JetBrains Mono, monospace' }}>Esc to close</span>
                </div>
                <div style={{ display: 'flex', gap: 6, position: 'relative' }}>
                  <ActionBtn
                    icon={<IconStar size={13} fill={email.is_starred ? 'currentColor' : 'none'} stroke={email.is_starred ? 'none' : 'currentColor'} />}
                    label={email.is_starred ? 'Unstar' : 'Star'}
                    tone="gray"
                    onClick={handleStar}
                  />
                  <ActionBtn icon={<IconUnsub size={13} />} label="Unsubscribe" tone="red" onClick={handleUnsubscribe} />
                  <ActionBtn icon={<IconBan size={13} />} label="Block sender" tone="ghost" onClick={handleBlockSender} />
                  <div style={{ position: 'relative' }}>
                    <ActionBtn icon={<IconClock size={13} />} label="Snooze" tone="gray" onClick={() => setSnoozeOpen(s => !s)} />
                    {snoozeOpen && (
                      <SnoozePopover onClose={() => setSnoozeOpen(false)} onSnooze={handleSnooze} />
                    )}
                  </div>
                  <ActionBtn icon={<IconArchive size={13} />} label="Archive" tone="gray" onClick={handleArchive} />
                  <ActionBtn icon={<IconTrash size={13} />} label="Delete" tone="ghost" onClick={handleDelete} />
                </div>
              </div>

              <h1 style={{
                margin: 0, fontSize: 17, fontWeight: 600, color: '#E4E4E7',
                letterSpacing: -0.2, lineHeight: 1.35,
              }}>{email.subject}</h1>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: (acct.color || '#6366F1') + '40', color: acct.color || '#6366F1',
                  border: `1px solid ${(acct.color || '#6366F1')}60`,
                  fontSize: 12, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{(email.sender_name || email.sender_email || '?')[0]}</div>
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                  <span style={{ fontSize: 13, color: '#E4E4E7', fontWeight: 500 }}>
                    {email.sender_name} <span style={{ color: '#71717A', fontWeight: 400 }}>&lt;{email.sender_email}&gt;</span>
                  </span>
                  <span style={{ fontSize: 12, color: '#71717A' }}>
                    to {acct.email} · {email.date ? new Date(email.date).toLocaleString() : ''}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              <div style={{ padding: '20px 24px 24px' }}>
                <pre style={{
                  margin: 0, fontFamily: 'Inter, sans-serif',
                  fontSize: 14, lineHeight: 1.65,
                  color: '#D4D4D8',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>{email.body}</pre>
              </div>

              {isReplying && (
                <InlineComposer
                  mode={replyMode}
                  email={email}
                  account={acct}
                  accounts={accounts}
                  onClose={() => setReplyMode('none')}
                  templates={templates}
                />
              )}

              <div style={{ height: isReplying ? 12 : 60 }} />
            </div>

            {!isReplying && (
              <div style={{
                padding: '12px 20px',
                borderTop: '1px solid #27272A',
                display: 'flex', gap: 8,
                background: '#18181B', flexShrink: 0,
              }}>
                <ReplyChip onClick={() => setReplyMode('reply')} primary>
                  <IconReply size={13} /> <span>Reply</span>
                  <kbd style={kbdStyle}>R</kbd>
                </ReplyChip>
                <ReplyChip onClick={() => setReplyMode('replyAll')}>
                  <IconCornerUpLeft size={13} /> <span>Reply all</span>
                </ReplyChip>
                <ReplyChip onClick={() => setReplyMode('forward')}>
                  <IconForward size={13} /> <span>Forward</span>
                  <kbd style={kbdStyle}>F</kbd>
                </ReplyChip>
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 11, color: '#52525B', alignSelf: 'center', fontFamily: 'JetBrains Mono, monospace' }}>
                  R · F · E archive · # delete
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
