import React, { useState } from 'react';
import { IconInbox, IconStar, IconSend, IconArchive, IconSettings, IconPlus, IconSparkle } from './icons/index.jsx';

function NavBtn({ icon, active, onClick, label }) {
  const [h, sh] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => sh(true)} onMouseLeave={() => sh(false)}
      title={label}
      style={{
        position: 'relative',
        width: 32, height: 32, borderRadius: 5,
        background: active ? 'var(--accent-soft-strong)' : (h ? '#1A1A1E' : 'transparent'),
        border: 'none',
        color: active ? 'var(--accent-text)' : (h ? '#E4E4E7' : '#71717A'),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all .1s',
      }}>
      {active && (
        <div style={{
          position: 'absolute', left: -10, top: 6, bottom: 6,
          width: 2, borderRadius: 1, background: 'var(--accent-gradient)',
        }} />
      )}
      {icon}
    </button>
  );
}

export default function Sidebar({ accounts, activeAccount, setActiveAccount, activeNav, setActiveNav, onCompose, onAddAccount, onQuickClean }) {
  const [qcHover, setQcHover] = useState(false);

  return (
    <div style={{
      width: 52, flexShrink: 0,
      background: '#0B0B0D',
      borderRight: '1px solid #27272A',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center',
      padding: '12px 0',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 6,
        background: 'var(--accent-gradient)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 14,
        flexShrink: 0,
      }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 4.5L8 9L14 4.5M2 4.5V12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V4.5M2 4.5h12"
            stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <button onClick={onCompose} title="New message (C)" style={{
        width: 28, height: 28, borderRadius: 6,
        background: 'var(--accent-soft-strong)', border: '1px solid var(--accent-border)',
        color: 'var(--accent-text)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 14,
      }}>
        <IconPlus size={14} />
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
        {accounts.map(a => {
          const active = activeAccount === a.id;
          const initial = (a.display_name || a.email || '?')[0].toUpperCase();
          return (
            <button key={a.id} onClick={() => setActiveAccount(a.id)}
              title={a.email}
              style={{
                position: 'relative',
                width: 28, height: 28, borderRadius: '50%',
                background: a.color || 'var(--accent)', color: '#fff',
                fontSize: 12, fontWeight: 600,
                border: active ? '2px solid #fff' : '2px solid transparent',
                outline: active ? '1px solid var(--accent)' : 'none',
                outlineOffset: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: active ? 1 : 0.85,
              }}>{initial}</button>
          );
        })}
        <button onClick={onAddAccount} title="Add account" style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'transparent', border: '1px dashed #3F3F46',
          color: '#71717A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <IconPlus size={12} />
        </button>
      </div>

      <div style={{ width: 24, height: 1, background: '#27272A', margin: '14px 0' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
        <NavBtn icon={<IconInbox size={16} />} active={activeNav === 'inbox'} onClick={() => setActiveNav('inbox')} label="Inbox" />
        <NavBtn icon={<IconStar size={16} />} active={activeNav === 'starred'} onClick={() => setActiveNav('starred')} label="Starred" />
        <NavBtn icon={<IconSend size={16} />} active={activeNav === 'sent'} onClick={() => setActiveNav('sent')} label="Sent" />
        <NavBtn icon={<IconArchive size={16} />} active={activeNav === 'archived'} onClick={() => setActiveNav('archived')} label="Archive" />
      </div>

      <div style={{ flex: 1 }} />

      <button
        onClick={onQuickClean}
        onMouseEnter={() => setQcHover(true)}
        onMouseLeave={() => setQcHover(false)}
        title="QuickClean"
        style={{
          width: 32, height: 32, borderRadius: 5, marginBottom: 6,
          background: qcHover ? 'var(--accent-soft-strong)' : 'transparent',
          border: 'none',
          color: qcHover ? 'var(--accent-text)' : '#71717A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .1s',
        }}>
        <IconSparkle size={16} />
      </button>

      <NavBtn icon={<IconSettings size={16} />} active={activeNav === 'settings'} onClick={() => setActiveNav('settings')} label="Settings" />
    </div>
  );
}
