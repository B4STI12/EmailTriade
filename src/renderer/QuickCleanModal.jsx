import React, { useState, useEffect } from 'react';
import { IconX, IconTrash, IconCheck } from './icons/index.jsx';

export default function QuickCleanModal({ onClose }) {
  const [candidates, setCandidates] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deletedCount, setDeletedCount] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    window.api.emails.quickCleanCandidates().then(data => {
      setCandidates(data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const current = candidates[index];

  const advance = () => {
    const next = index + 1;
    if (next >= candidates.length) {
      setDone(true);
    } else {
      setIndex(next);
    }
  };

  const handleDeleteAll = async () => {
    if (!current) return;
    await window.api.emails.deleteAllFromSender(current.sender_email);
    setDeletedCount(d => d + current.cnt);
    advance();
  };

  const handleKeepAll = () => {
    advance();
  };

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(8,8,10,0.7)',
        zIndex: 100, animation: 'fadeIn .14s ease-out',
      }} />

      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 440, background: '#18181B',
        border: '1px solid #27272A', borderRadius: 10,
        zIndex: 101,
        animation: 'slideInRight .18s ease-out',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', borderBottom: '1px solid #27272A',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#E4E4E7' }}>QuickClean</span>
            {!loading && !done && candidates.length > 0 && (
              <span style={{
                fontSize: 11, padding: '2px 7px', borderRadius: 4,
                background: 'rgba(99,102,241,0.14)', color: '#A5A8F4',
                fontVariantNumeric: 'tabular-nums',
              }}>{index + 1} of {candidates.length}</span>
            )}
          </div>
          <button onClick={onClose} style={{
            width: 24, height: 24, borderRadius: 4,
            background: 'transparent', border: '1px solid #27272A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#A1A1AA',
          }}>
            <IconX size={12} />
          </button>
        </div>

        <div style={{ padding: '24px 18px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#52525B', fontSize: 13, padding: '20px 0' }}>
              Loading…
            </div>
          ) : done || candidates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: '#22C55E', marginBottom: 14,
              }}>
                <IconCheck size={18} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#E4E4E7', marginBottom: 6 }}>
                {deletedCount > 0 ? `Cleaned ${deletedCount} email${deletedCount === 1 ? '' : 's'}` : 'Nothing to clean'}
              </div>
              <div style={{ fontSize: 12, color: '#71717A', marginBottom: 20 }}>
                {candidates.length === 0 ? 'Your inbox is already clean.' : 'All top senders reviewed.'}
              </div>
              <button onClick={onClose} style={{
                padding: '7px 18px', borderRadius: 5,
                background: '#6366F1', border: 'none',
                color: '#fff', fontSize: 13, fontWeight: 500,
              }}>Done</button>
            </div>
          ) : current ? (
            <>
              <div style={{
                background: '#0E0E10', border: '1px solid #27272A', borderRadius: 8,
                padding: '16px', marginBottom: 20,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#E4E4E7', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {current.sender_name || current.sender_email}
                    </div>
                    <div style={{ fontSize: 12, color: '#71717A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {current.sender_email}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    padding: '3px 8px', borderRadius: 4, flexShrink: 0, marginLeft: 12,
                    background: 'rgba(239,68,68,0.12)', color: '#FCA5A5',
                    fontVariantNumeric: 'tabular-nums',
                  }}>{current.cnt} email{current.cnt === 1 ? '' : 's'}</span>
                </div>

                {current.latest_subject && (
                  <div style={{
                    fontSize: 12, color: '#52525B',
                    borderTop: '1px solid #27272A', paddingTop: 10,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    Latest: {current.latest_subject}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleDeleteAll} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  padding: '9px 0', borderRadius: 6,
                  background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.28)',
                  color: '#FCA5A5', fontSize: 13, fontWeight: 500,
                }}>
                  <IconTrash size={14} />
                  Delete all ({current.cnt})
                </button>
                <button onClick={handleKeepAll} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  padding: '9px 0', borderRadius: 6,
                  background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.25)',
                  color: '#86EFAC', fontSize: 13, fontWeight: 500,
                }}>
                  <IconCheck size={14} />
                  Keep all
                </button>
              </div>

              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: '#52525B' }}>Progress</span>
                  <span style={{ fontSize: 11, color: '#52525B', fontVariantNumeric: 'tabular-nums' }}>
                    {index + 1} / {candidates.length}
                  </span>
                </div>
                <div style={{ height: 3, background: '#27272A', borderRadius: 2 }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    background: '#6366F1',
                    width: `${((index + 1) / candidates.length) * 100}%`,
                    transition: 'width .2s ease',
                  }} />
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
