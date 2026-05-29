import React, { useEffect, useRef } from 'react';
import { IconClock } from './icons/index.jsx';

function getSnoozePresets() {
  const now = new Date();
  const todayAt = (h) => { const d = new Date(now); d.setHours(h, 0, 0, 0); return d; };
  const nextDay = (dayOfWeek, h) => {
    const d = new Date(now);
    const diff = (dayOfWeek - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    d.setHours(h, 0, 0, 0);
    return d;
  };

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const fmt = (d) => `${days[d.getDay()]}, ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
  const fmtDate = (d) => `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}, ${d.getHours()}:00 AM`;

  const laterToday = todayAt(17);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const weekend = nextDay(6, 9);
  const nextWeek = nextDay(1, 9);

  return [
    { id: 'later',   label: 'Later today',      hint: `${laterToday.getHours()}:00 PM today`, ts: laterToday.getTime() },
    { id: 'tmrw',    label: 'Tomorrow morning',  hint: `${days[tomorrow.getDay()]}, 9:00 AM`,  ts: tomorrow.getTime() },
    { id: 'weekend', label: 'This weekend',      hint: `${days[weekend.getDay()]}, 9:00 AM`,   ts: weekend.getTime() },
    { id: 'next',    label: 'Next week',         hint: `${days[nextWeek.getDay()]} ${months[nextWeek.getMonth()]} ${nextWeek.getDate()}, 9:00 AM`, ts: nextWeek.getTime() },
  ];
}

export default function SnoozePopover({ onClose, onSnooze }) {
  const presets = getSnoozePresets();
  const dateRef = useRef(null);
  const timeRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const today = new Date();
  const defaultDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate() + 1).padStart(2, '0')}`;

  const handleCustomSnooze = () => {
    const d = dateRef.current?.value;
    const t = timeRef.current?.value || '09:00';
    if (!d) return;
    const ts = new Date(`${d}T${t}`).getTime();
    if (!isNaN(ts)) onSnooze(ts);
  };

  const fieldStyle = {
    flex: 1,
    padding: '5px 7px',
    background: '#0E0E10',
    border: '1px solid #27272A',
    borderRadius: 4,
    color: '#E4E4E7',
    fontSize: 12,
    fontFamily: 'inherit',
    colorScheme: 'dark',
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        top: 'calc(100% + 6px)',
        right: 12,
        width: 280,
        background: '#1F1F23',
        border: '1px solid #3F3F46',
        borderRadius: 8,
        boxShadow: '0 12px 32px -8px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,0,0,0.4)',
        padding: 6,
        zIndex: 20,
        animation: 'slideUp .12s ease-out',
        fontSize: 12,
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 8px 8px',
        borderBottom: '1px solid #27272A',
        marginBottom: 4,
      }}>
        <IconClock size={12} stroke="#A1A1AA" />
        <span style={{ color: '#E4E4E7', fontWeight: 500 }}>Snooze until</span>
      </div>

      {presets.map(p => (
        <button key={p.id} onClick={() => onSnooze(p.ts)} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%',
          padding: '7px 8px',
          background: 'transparent', border: 'none', borderRadius: 4,
          color: '#E4E4E7', fontSize: 12, fontWeight: 500,
          textAlign: 'left',
        }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#27272A'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <span>{p.label}</span>
          <span style={{ color: '#71717A', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{p.hint}</span>
        </button>
      ))}

      <div style={{ marginTop: 4, paddingTop: 8, borderTop: '1px solid #27272A' }}>
        <div style={{ padding: '0 8px 6px', color: '#71717A', fontSize: 11, fontWeight: 500, letterSpacing: 0.3, textTransform: 'uppercase' }}>
          Pick a date & time
        </div>
        <div style={{ display: 'flex', gap: 6, padding: '0 8px 8px' }}>
          <input ref={dateRef} type="date" defaultValue={defaultDate} style={fieldStyle} />
          <input ref={timeRef} type="time" defaultValue="09:00" style={{ ...fieldStyle, width: 92 }} />
        </div>
        <button onClick={handleCustomSnooze} style={{
          margin: '0 8px 4px',
          width: 'calc(100% - 16px)',
          padding: '7px 10px',
          background: '#6366F1', border: '1px solid #6366F1',
          borderRadius: 4,
          color: '#fff', fontSize: 12, fontWeight: 500,
        }}>Snooze</button>
      </div>
    </div>
  );
}
