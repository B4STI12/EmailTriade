import React, { useState, useEffect, useCallback } from 'react';
import {
  IconCheck, IconArchive, IconTrash, IconClock, IconUnsub, IconSearch, IconCircle, IconStar
} from './icons/index.jsx';
import SnoozePopover from './SnoozePopover.jsx';

const CATEGORIES = {
  newsletter: { label: 'Newsletter', color: '#F59E0B' },
  spam:       { label: 'Spam',       color: '#EF4444' },
  important:  { label: 'Important',  color: '#3B82F6' },
  receipt:    { label: 'Receipt',    color: '#22C55E' },
  other:      { label: 'Other',      color: '#71717A' },
};

export function CategoryBadge({ category, size = 'sm' }) {
  const c = CATEGORIES[category] || CATEGORIES.other;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: size === 'sm' ? '2px 7px' : '3px 9px',
      borderRadius: 4,
      fontSize: 11, fontWeight: 500, letterSpacing: 0.1,
      color: c.color,
      background: c.color + '1F',
      whiteSpace: 'nowrap',
      lineHeight: 1.2,
    }}>{c.label}</span>
  );
}

export function ActionBtn({ icon, label, tone = 'gray', onClick }) {
  const [hover, setHover] = useState(false);
  const map = {
    red:   { fg: '#EF4444', hoverBg: 'rgba(239,68,68,0.10)', hoverBorder: 'rgba(239,68,68,0.30)' },
    green: { fg: '#22C55E', hoverBg: 'rgba(34,197,94,0.10)', hoverBorder: 'rgba(34,197,94,0.30)' },
    gray:  { fg: '#A1A1AA', hoverBg: '#27272A',              hoverBorder: '#3F3F46' },
    ghost: { fg: '#71717A', hoverBg: '#27272A',              hoverBorder: '#3F3F46' },
  };
  const t = map[tone] || map.gray;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={label}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '4px 8px',
        background: hover ? t.hoverBg : 'transparent',
        border: `1px solid ${hover ? t.hoverBorder : '#27272A'}`,
        borderRadius: 4,
        color: t.fg,
        fontSize: 11.5, fontWeight: 500,
        lineHeight: 1.2,
        transition: 'background .1s, border-color .1s',
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);

  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: 'short' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function TriageCard({ email, accounts, selected, onSelect, onOpen, isOpen, snoozeOpen, onOpenSnooze, onCloseSnooze, onArchive, onDelete, onUnsubscribe, onSnooze, onKeep, onStar }) {
  const [hovered, setHovered] = useState(false);
  const isHover = hovered || snoozeOpen;

  const acct = accounts.find(a => a.id === email.account_id) || {};

  const bg = isOpen ? 'var(--accent-soft)'
    : selected ? 'var(--accent-soft)'
    : isHover ? '#1A1A1E' : 'transparent';
  const borderLeft = (isOpen || selected) ? '2px solid var(--accent)' : '2px solid transparent';

  const initial = (acct.display_name || acct.email || '?')[0].toUpperCase();

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => {
        if (e.target.closest('[data-stop]')) return;
        onOpen(email.id);
      }}
      style={{
        display: 'grid',
        gridTemplateColumns: '28px 16px 200px 1fr 80px auto',
        alignItems: 'center',
        gap: 12,
        padding: 'var(--row-pad-y) var(--row-pad-x) var(--row-pad-y) 14px',
        borderBottom: '1px solid #1F1F22',
        borderLeft,
        background: bg,
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      <div data-stop onClick={(e) => { e.stopPropagation(); onSelect(email.id); }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (isHover || selected) ? 1 : 0, transition: 'opacity .12s' }}>
        <div style={{
          width: 16, height: 16, borderRadius: 3,
          border: selected ? '1px solid var(--accent)' : '1px solid #52525B',
          background: selected ? 'var(--accent)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {selected && <IconCheck size={11} stroke="#fff" strokeWidth={2} />}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {!email.is_read && <IconCircle size={6} color="var(--accent)" />}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <div title={acct.email} style={{
          width: 16, height: 16, borderRadius: '50%',
          background: acct.color || 'var(--accent)', color: '#fff',
          fontSize: 9, fontWeight: 600, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{initial}</div>
        <div style={{
          fontWeight: email.is_read ? 500 : 600,
          color: email.is_read ? '#A1A1AA' : '#E4E4E7',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          fontSize: 13,
        }}>{email.sender_name || email.sender_email}</div>
      </div>

      <div style={{ minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 8, overflow: 'hidden' }}>
        <span style={{
          color: email.is_read ? '#A1A1AA' : '#E4E4E7',
          fontWeight: email.is_read ? 400 : 500,
          whiteSpace: 'nowrap', flexShrink: 0,
          maxWidth: '40%', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{email.subject}</span>
        <span style={{ color: '#52525B', flexShrink: 0 }}>—</span>
        <span style={{
          color: '#71717A', whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis',
          flex: 1, minWidth: 0,
        }}>{email.body?.slice(0, 120) || ''}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
        {!isHover && (
          <>
            <button
              data-stop
              onClick={(e) => { e.stopPropagation(); onStar(email.id, !email.is_starred); }}
              title={email.is_starred ? 'Unstar' : 'Star'}
              style={{
                background: 'transparent', border: 'none', padding: 2,
                color: email.is_starred ? '#F59E0B' : '#3F3F46',
                display: 'flex', alignItems: 'center', cursor: 'pointer',
                opacity: email.is_starred ? 1 : 0,
                transition: 'opacity .1s',
              }}>
              <IconStar size={13} fill={email.is_starred ? 'currentColor' : 'none'} stroke={email.is_starred ? 'none' : 'currentColor'} />
            </button>
            <span style={{ fontSize: 12, color: '#71717A', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
              {formatDate(email.date)}
            </span>
          </>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
        {isHover ? (
          <div data-stop style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
            <ActionBtn icon={<IconStar size={13} fill={email.is_starred ? 'currentColor' : 'none'} stroke={email.is_starred ? 'none' : 'currentColor'} />} label={email.is_starred ? 'Unstar' : 'Star'} tone="gray" onClick={() => onStar(email.id, !email.is_starred)} />
            <ActionBtn icon={<IconUnsub size={13} />} label="Unsubscribe" tone="red" onClick={() => onUnsubscribe(email.id)} />
            <ActionBtn icon={<IconCheck size={13} />} label="Keep" tone="green" onClick={() => onKeep(email.id)} />
            <ActionBtn icon={<IconArchive size={13} />} label="Archive" tone="gray" onClick={() => onArchive([email.id])} />
            <ActionBtn icon={<IconClock size={13} />} label="Snooze" tone="gray" onClick={() => onOpenSnooze(email.id)} />
            <ActionBtn icon={<IconTrash size={13} />} label="Delete" tone="ghost" onClick={() => onDelete([email.id])} />
          </div>
        ) : (
          <CategoryBadge category={email.category} />
        )}
      </div>

      {snoozeOpen && (
        <SnoozePopover
          onClose={onCloseSnooze}
          onSnooze={(ts) => { onSnooze([email.id], ts); onCloseSnooze(); }}
        />
      )}
    </div>
  );
}

function TopBar({ unreadCount, filter, setFilter, onOpenSearch }) {
  const chips = [
    { id: 'all', label: 'All' },
    { id: 'newsletter', label: 'Newsletters' },
    { id: 'spam', label: 'Spam' },
    { id: 'receipt', label: 'Receipts' },
    { id: 'important', label: 'Important' },
  ];
  const [searchHover, setSearchHover] = useState(false);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 16px',
      borderBottom: '1px solid #27272A',
      background: '#18181B',
      height: 48, flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#E4E4E7' }}>Inbox</span>
        <span style={{
          fontSize: 11, fontWeight: 500,
          padding: '2px 7px', borderRadius: 4,
          background: 'var(--accent-soft-strong)', color: 'var(--accent-text)',
          fontVariantNumeric: 'tabular-nums',
        }}>{unreadCount} unread</span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {chips.map(c => {
          const active = filter === c.id;
          return (
            <button key={c.id} onClick={() => setFilter(c.id)} style={{
              padding: '4px 10px', fontSize: 12, fontWeight: 500,
              borderRadius: 4,
              border: active ? '1px solid var(--accent)' : '1px solid #27272A',
              background: active ? 'var(--accent-soft-strong)' : 'transparent',
              color: active ? 'var(--accent-text)' : '#A1A1AA',
              transition: 'all .1s',
            }}>{c.label}</button>
          );
        })}
      </div>
      <button
        onClick={onOpenSearch}
        onMouseEnter={() => setSearchHover(true)}
        onMouseLeave={() => setSearchHover(false)}
        style={{
          width: 220, display: 'flex', alignItems: 'center', gap: 6, padding: '5px 9px',
          border: '1px solid ' + (searchHover ? '#3F3F46' : '#27272A'),
          background: searchHover ? '#1A1A1E' : 'transparent',
          borderRadius: 4, color: '#71717A', fontSize: 12,
          fontFamily: 'inherit', textAlign: 'left',
        }}>
        <IconSearch size={13} stroke="#71717A" />
        <span>Search mail</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#52525B', fontFamily: 'JetBrains Mono, monospace' }}>⌘K</span>
      </button>
    </div>
  );
}

function BulkBtn({ children, onClick, tone }) {
  const [h, sh] = useState(false);
  const isRed = tone === 'red';
  return (
    <button onClick={onClick} onMouseEnter={() => sh(true)} onMouseLeave={() => sh(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '5px 10px',
        background: h ? (isRed ? 'rgba(239,68,68,0.12)' : '#27272A') : '#232328',
        border: `1px solid ${h ? (isRed ? 'rgba(239,68,68,0.35)' : '#3F3F46') : '#3F3F46'}`,
        borderRadius: 4,
        color: isRed ? '#FCA5A5' : '#E4E4E7',
        fontSize: 12, fontWeight: 500,
      }}>{children}</button>
  );
}

function BulkActionBar({ count, selected, onClear, onArchive, onDelete, onMarkRead, onUnsubAll }) {
  return (
    <div style={{
      position: 'absolute', left: 16, right: 16, bottom: 16,
      background: '#1F1F23', border: '1px solid #3F3F46', borderRadius: 6,
      padding: '10px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
      animation: 'slideUp .15s ease-out',
      boxShadow: '0 8px 24px -8px rgba(0,0,0,0.6)',
      zIndex: 5,
    }}>
      <div style={{
        fontSize: 12, fontWeight: 600,
        padding: '3px 8px', background: 'var(--accent-soft-strong)',
        color: 'var(--accent-text)', borderRadius: 4,
        fontVariantNumeric: 'tabular-nums',
      }}>{count} selected</div>
      <button onClick={onClear} style={{
        background: 'transparent', border: 'none', color: '#71717A', fontSize: 12, padding: '4px 6px',
      }}>Clear</button>
      <div style={{ flex: 1 }} />
      <BulkBtn onClick={onArchive}><IconArchive size={13} /><span>Archive all</span><span style={{ color: '#71717A', fontVariantNumeric: 'tabular-nums' }}>({count})</span></BulkBtn>
      <BulkBtn onClick={onMarkRead}><IconCheck size={13} /><span>Mark read</span></BulkBtn>
      <BulkBtn onClick={onUnsubAll} tone="red"><IconUnsub size={13} /><span>Unsubscribe all</span></BulkBtn>
      <BulkBtn onClick={onDelete}><IconTrash size={13} /><span>Delete all</span></BulkBtn>
    </div>
  );
}

export default function TriageScreen({
  accounts, filter, setFilter, selected, setSelected,
  openEmailId, setOpenEmailId, snoozeOpenId, setSnoozeOpenId,
  onOpenSearch, onRefresh,
}) {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadEmails = useCallback(async () => {
    try {
      const data = await window.api.emails.listInbox(filter === 'all' ? null : filter);
      setEmails(data);
    } catch (e) {
      console.error('Failed to load inbox:', e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadEmails(); }, [loadEmails]);

  useEffect(() => {
    const unsub = window.api.events.onSyncTick(() => loadEmails());
    return unsub;
  }, [loadEmails]);

  const unreadCount = emails.filter(e => !e.is_read).length;

  const toggleSelect = (id) => {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };

  const handleArchive = async (ids) => {
    await window.api.emails.archive(ids);
    setSelected(s => s.filter(id => !ids.includes(id)));
    loadEmails();
  };

  const handleDelete = async (ids) => {
    await window.api.emails.delete(ids);
    setSelected(s => s.filter(id => !ids.includes(id)));
    loadEmails();
  };

  const handleSnooze = async (ids, until) => {
    await window.api.emails.snooze(ids, until);
    setSelected(s => s.filter(id => !ids.includes(id)));
    loadEmails();
  };

  const handleUnsubscribe = async (id) => {
    await window.api.emails.unsubscribe(id);
  };

  const handleKeep = async (id) => {
    await window.api.emails.keep(id);
    setSelected(s => s.filter(x => x !== id));
    loadEmails();
  };

  const handleStar = async (id, starred) => {
    await window.api.emails.star(id, starred);
    setEmails(prev => prev.map(e => e.id === id ? { ...e, is_starred: starred ? 1 : 0 } : e));
  };

  const handleMarkRead = async (ids) => {
    await window.api.emails.markRead(ids, true);
    loadEmails();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <TopBar unreadCount={0} filter={filter} setFilter={setFilter} onOpenSearch={onOpenSearch} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52525B' }}>
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', minHeight: 0 }}>
      <TopBar unreadCount={unreadCount} filter={filter} setFilter={setFilter} onOpenSearch={onOpenSearch} />
      <div style={{ flex: 1, overflowY: 'auto', background: '#0E0E10' }}>
        {emails.length === 0 ? (
          <div style={{ padding: '80px 24px', textAlign: 'center' }}>
            <div style={{ color: '#A1A1AA', fontSize: 13, marginBottom: 4 }}>
              {filter === 'all' ? 'Your inbox is empty.' : `No ${filter} messages.`}
            </div>
            <div style={{ color: '#52525B', fontSize: 12 }}>
              {filter !== 'all' && 'Switch to "All" to see all messages.'}
            </div>
          </div>
        ) : (
          emails.map(e => (
            <TriageCard
              key={e.id}
              email={e}
              accounts={accounts}
              selected={selected.includes(e.id)}
              onSelect={toggleSelect}
              onOpen={(id) => setOpenEmailId(id)}
              isOpen={openEmailId === e.id}
              snoozeOpen={snoozeOpenId === e.id}
              onOpenSnooze={(id) => setSnoozeOpenId(id)}
              onCloseSnooze={() => setSnoozeOpenId(null)}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onSnooze={handleSnooze}
              onUnsubscribe={handleUnsubscribe}
              onKeep={handleKeep}
              onStar={handleStar}
            />
          ))
        )}
        <div style={{ height: 80 }} />
      </div>
      {selected.length > 0 && (
        <BulkActionBar
          count={selected.length}
          selected={selected}
          onClear={() => setSelected([])}
          onArchive={() => handleArchive(selected)}
          onDelete={() => handleDelete(selected)}
          onMarkRead={() => handleMarkRead(selected)}
          onUnsubAll={() => selected.forEach(id => handleUnsubscribe(id))}
        />
      )}
    </div>
  );
}
