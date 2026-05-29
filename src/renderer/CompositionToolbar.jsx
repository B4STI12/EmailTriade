import React, { useState } from 'react';
import { IconSparkle, IconMail, IconPaperclip, IconSend, IconChevronDown, IconSpinner } from './icons/index.jsx';

function ToolbarBtn({ children, onClick, accent, disabled }) {
  const [h, sh] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => sh(true)}
      onMouseLeave={() => sh(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '5px 9px',
        background: h && !disabled ? (accent ? 'rgba(99,102,241,0.14)' : '#27272A') : 'transparent',
        border: `1px solid ${h && !disabled ? (accent ? 'rgba(99,102,241,0.30)' : '#3F3F46') : '#27272A'}`,
        borderRadius: 4,
        color: disabled ? '#52525B' : (accent ? '#A5A8F4' : '#E4E4E7'),
        fontSize: 12, fontWeight: 500,
        cursor: disabled ? 'default' : 'pointer',
      }}>
      {children}
    </button>
  );
}

export default function CompositionToolbar({
  draft, onDraftChange,
  onAttach, showTemplates, setShowTemplates,
  onInsertTemplate, onSend, onDiscard, compact, templates = [],
}) {
  const [polishing, setPolishing] = useState(false);
  const [polishError, setPolishError] = useState(null);

  const handleRephrase = async () => {
    if (!draft?.trim() || polishing) return;
    setPolishing(true);
    setPolishError(null);
    try {
      const result = await window.api.deepl.rephrase(draft, { targetLang: 'de' });
      if (result.ok) {
        const improved = result.improvements[0]?.text;
        if (improved) onDraftChange(improved);
      } else {
        setPolishError(result.error || 'DeepL Write failed');
      }
    } catch (e) {
      setPolishError(e.message || 'DeepL Write failed');
    } finally {
      setPolishing(false);
    }
  };

  return (
    <div style={{
      padding: compact ? '10px 12px' : '12px 16px',
      borderTop: '1px solid #27272A',
      background: '#1A1A1E',
      position: 'relative',
    }}>
      {polishError && (
        <div style={{
          marginBottom: 8, padding: '5px 8px',
          background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 4, fontSize: 11, color: '#FCA5A5',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}>
          <span>{polishError}</span>
          <button onClick={() => setPolishError(null)} style={{
            background: 'transparent', border: 'none', color: '#FCA5A5',
            fontSize: 11, padding: 0, cursor: 'pointer', flexShrink: 0,
          }}>✕</button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <ToolbarBtn onClick={handleRephrase} accent disabled={polishing || !draft?.trim()}>
          {polishing
            ? <><IconSpinner size={13} /><span>Rephrasing…</span></>
            : <><IconSparkle size={13} /><span>DeepL Write</span></>}
        </ToolbarBtn>

        <div style={{ position: 'relative' }}>
          <ToolbarBtn onClick={() => setShowTemplates(s => !s)}>
            <IconMail size={13} /> <span>Templates</span>
            <IconChevronDown size={11} stroke="#71717A" />
          </ToolbarBtn>
          {showTemplates && templates.length > 0 && (
            <div style={{
              position: 'absolute', bottom: 'calc(100% + 6px)', left: 0,
              width: 260,
              background: '#1F1F23', border: '1px solid #3F3F46', borderRadius: 6,
              boxShadow: '0 12px 32px -8px rgba(0,0,0,0.7)',
              padding: 4, zIndex: 50,
            }}>
              <div style={{
                padding: '6px 8px 8px',
                borderBottom: '1px solid #27272A', marginBottom: 4,
                fontSize: 11, color: '#71717A', fontWeight: 500,
                letterSpacing: 0.3, textTransform: 'uppercase',
              }}>Quick reply templates</div>
              {templates.map(t => (
                <button key={t.id} onClick={() => onInsertTemplate(t)} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
                  width: '100%', padding: '7px 8px',
                  background: 'transparent', border: 'none', borderRadius: 4,
                  color: '#E4E4E7', fontSize: 12, fontWeight: 500,
                  textAlign: 'left',
                }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#27272A'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <span>{t.name}</span>
                  <span style={{ color: '#71717A', fontSize: 11, fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', whiteSpace: 'nowrap' }}>{t.body}</span>
                </button>
              ))}
            </div>
          )}
          {showTemplates && templates.length === 0 && (
            <div style={{
              position: 'absolute', bottom: 'calc(100% + 6px)', left: 0,
              width: 220,
              background: '#1F1F23', border: '1px solid #3F3F46', borderRadius: 6,
              padding: '12px', zIndex: 50, fontSize: 12, color: '#71717A',
            }}>
              No templates yet. Add them in Settings.
            </div>
          )}
        </div>

        <ToolbarBtn onClick={onAttach}>
          <IconPaperclip size={13} /> <span>Attach</span>
        </ToolbarBtn>

        <div style={{ flex: 1 }} />

        <button onClick={onDiscard} style={{
          padding: '6px 10px',
          background: 'transparent', border: '1px solid #27272A', borderRadius: 4,
          color: '#A1A1AA', fontSize: 12, fontWeight: 500,
        }}>Discard</button>

        <button onClick={onSend} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 14px',
          background: '#6366F1', border: '1px solid #6366F1', borderRadius: 4,
          color: '#fff', fontSize: 12, fontWeight: 600,
        }}>
          <IconSend size={12} stroke="#fff" /> <span>Send</span>
        </button>
      </div>
    </div>
  );
}
