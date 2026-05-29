import React, { useState, useEffect } from 'react';
import {
  IconPlus, IconTrash, IconCircle, IconSparkle, IconRefresh
} from './icons/index.jsx';
import { CategoryBadge } from './TriageScreen.jsx';
import ColorMix from './ColorMix.jsx';
import { DEFAULTS as APPEARANCE_DEFAULTS, applyAppearance, saveAppearance, loadAppearance } from './appearance.js';

const CATEGORIES = {
  newsletter: 'Newsletter', spam: 'Spam', important: 'Important',
  receipt: 'Receipt', other: 'Other',
};

function SegmentRow({ label, hint, value, options, onChange }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#71717A', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'inline-flex', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 6, padding: 3, background: '#161618' }}>
        {options.map(o => {
          const active = value === o.id;
          return (
            <button key={o.id} type="button" onClick={() => onChange(o.id)} style={{
              padding: '5px 14px', fontSize: 12, fontWeight: 500,
              background: active ? '#27272A' : 'transparent', border: 'none', borderRadius: 4,
              color: active ? '#E4E4E7' : '#A1A1AA',
            }}>{o.label}</button>
          );
        })}
      </div>
      {hint && <div style={{ fontSize: 11.5, color: '#71717A', marginTop: 8 }}>{hint}</div>}
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <section>
      <header style={{ marginBottom: 10 }}>
        <h2 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#E4E4E7', letterSpacing: -0.1 }}>{title}</h2>
        {subtitle && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#71717A', lineHeight: 1.5 }}>{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

const ghostBtnStyle = {
  padding: '4px 10px', fontSize: 12,
  background: 'transparent', border: '1px solid #27272A',
  borderRadius: 4, color: '#A1A1AA', fontWeight: 500,
};

const dashedBtnStyle = {
  marginTop: 10, padding: '8px 12px',
  background: 'transparent', border: '1px dashed #3F3F46',
  borderRadius: 4, color: '#A1A1AA', fontSize: 12, fontWeight: 500,
  display: 'inline-flex', alignItems: 'center', gap: 6,
};

const patternStyle = {
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 12, color: '#E4E4E7',
  background: '#0E0E10', padding: '2px 6px', borderRadius: 3,
  border: '1px solid #232326', width: 'fit-content',
};

const inputStyle = {
  padding: '5px 8px', background: '#0E0E10',
  border: '1px solid #27272A', borderRadius: 3,
  color: '#E4E4E7', fontSize: 12, outline: 'none',
};

const inputMonoStyle = { ...inputStyle, fontFamily: 'JetBrains Mono, monospace' };

const selectStyle = {
  padding: '4px 6px', background: '#0E0E10',
  border: '1px solid #27272A', borderRadius: 3,
  color: '#E4E4E7', fontSize: 12, fontFamily: 'inherit',
};

export default function SettingsScreen({ onAddAccount }) {
  const [accounts, setAccounts] = useState([]);
  const [rules, setRules] = useState([]);
  const [newRulePattern, setNewRulePattern] = useState('');
  const [newRuleCat, setNewRuleCat] = useState('newsletter');
  const [syncFreq, setSyncFreq] = useState('5m');
  const [deeplKey, setDeeplKey] = useState('');
  const [showDeeplKey, setShowDeeplKey] = useState(false);
  const [deeplSaved, setDeeplSaved] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [newTplName, setNewTplName] = useState('');
  const [newTplBody, setNewTplBody] = useState('');
  const [dbInfo, setDbInfo] = useState(null);
  const [syncErrors, setSyncErrors] = useState({});
  const [appearance, setAppearance] = useState(APPEARANCE_DEFAULTS);

  useEffect(() => {
    Promise.all([
      window.api.accounts.list(),
      window.api.rules.list(),
      window.api.settings.getSyncFreq(),
      window.api.settings.getDeeplKey(),
      window.api.templates.list(),
      window.api.settings.getDbInfo(),
      window.api.accounts.getSyncErrors(),
      loadAppearance(),
    ]).then(([accts, rls, freq, key, tmpls, info, errs, appr]) => {
      setAccounts(accts);
      setRules(rls);
      setSyncFreq(freq);
      setDeeplKey(key);
      setTemplates(tmpls);
      setDbInfo(info);
      setSyncErrors(errs || {});
      setAppearance(appr);
    }).catch(console.error);
  }, []);

  const addRule = async () => {
    if (!newRulePattern.trim()) return;
    const r = await window.api.rules.add(newRulePattern.trim(), newRuleCat);
    setRules(prev => [...prev, r]);
    setNewRulePattern(''); setNewRuleCat('newsletter');
  };

  const removeRule = async (id) => {
    await window.api.rules.remove(id);
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const addTemplate = async () => {
    if (!newTplName.trim() || !newTplBody.trim()) return;
    const t = await window.api.templates.add(newTplName.trim(), newTplBody.trim());
    setTemplates(prev => [...prev, t]);
    setNewTplName(''); setNewTplBody('');
  };

  const removeTemplate = async (id) => {
    await window.api.templates.remove(id);
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const removeAccount = async (id) => {
    if (!confirm('Remove this account? Local emails will be kept.')) return;
    await window.api.accounts.remove(id);
    setAccounts(prev => prev.filter(a => a.id !== id));
  };

  const reconnectAccount = async (id) => {
    try {
      await window.api.accounts.reconnect(id);
      const errs = await window.api.accounts.getSyncErrors();
      setSyncErrors(errs);
    } catch (e) {
      alert('Reconnect failed: ' + e.message);
    }
  };

  const handleSyncFreq = async (v) => {
    setSyncFreq(v);
    await window.api.settings.setSyncFreq(v);
  };

  const handleSaveDeeplKey = async () => {
    await window.api.settings.setDeeplKey(deeplKey);
    setDeeplSaved(true);
    setTimeout(() => setDeeplSaved(false), 2000);
  };

  const updateAppearance = async (patch) => {
    const next = { ...appearance, ...patch };
    setAppearance(next);
    applyAppearance(next);
    window.dispatchEvent(new CustomEvent('appearance:change', { detail: next }));
    await saveAppearance(patch);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{
        padding: '14px 24px', borderBottom: '1px solid #27272A', background: '#18181B',
        flexShrink: 0, display: 'flex', alignItems: 'baseline', gap: 12,
      }}>
        <h1 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#E4E4E7', letterSpacing: -0.1 }}>Settings</h1>
        <span style={{ fontSize: 12, color: '#71717A' }}>Manage accounts, rules, sync, DeepL Write & templates</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px 48px' }}>
        <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 32 }}>

          {/* Accounts */}
          <Section title="Accounts" subtitle="Mail accounts connected to this client.">
            <div style={{ border: '1px solid #27272A', borderRadius: 6, overflow: 'hidden', background: '#18181B' }}>
              {accounts.length === 0 && (
                <div style={{ padding: '20px', color: '#52525B', fontSize: 12 }}>No accounts connected.</div>
              )}
              {accounts.map((a, i) => (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px',
                  borderTop: i > 0 ? '1px solid #232326' : 'none',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: a.color || '#6366F1', color: '#fff',
                    fontSize: 12, fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{(a.display_name || a.email || '?')[0].toUpperCase()}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, color: '#E4E4E7', fontWeight: 500 }}>{a.email}</span>
                    <span style={{ fontSize: 11, color: '#71717A', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {a.provider === 'gmail' ? 'Gmail' : 'Outlook'}
                      <span style={{ color: '#3F3F46' }}>·</span>
                      {syncErrors[a.id] ? (
                        <span style={{ color: '#FCA5A5', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <IconCircle size={5} color="#EF4444" /> Sync failed
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <IconCircle size={5} color="#22C55E" /> Active
                        </span>
                      )}
                    </span>
                  </div>
                  <button onClick={() => reconnectAccount(a.id)} style={ghostBtnStyle}>
                    <IconRefresh size={12} style={{ display: 'inline', marginRight: 4 }} />Reconnect
                  </button>
                  <button onClick={() => removeAccount(a.id)}
                    style={{ ...ghostBtnStyle, color: '#FCA5A5' }}>Remove</button>
                </div>
              ))}
            </div>
            <button onClick={onAddAccount} style={dashedBtnStyle}>
              <IconPlus size={13} /> Add account
            </button>
          </Section>

          {/* Category rules */}
          <Section title="Category rules" subtitle="Senders matching a pattern are auto-assigned a category. Rules apply top-to-bottom.">
            <div style={{ border: '1px solid #27272A', borderRadius: 6, overflow: 'hidden', background: '#18181B' }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 160px 80px',
                padding: '8px 14px', background: '#1A1A1E',
                borderBottom: '1px solid #27272A',
                fontSize: 11, color: '#71717A', fontWeight: 500, letterSpacing: 0.3, textTransform: 'uppercase',
              }}>
                <span>Sender pattern</span><span>Category</span><span style={{ textAlign: 'right' }}>Actions</span>
              </div>
              {rules.map((r, i) => (
                <div key={r.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr 160px 80px',
                  alignItems: 'center', padding: '9px 14px',
                  borderTop: i > 0 ? '1px solid #232326' : 'none',
                }}>
                  <code style={patternStyle}>{r.pattern}</code>
                  <CategoryBadge category={r.category} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={() => removeRule(r.id)} style={{
                      padding: 4, background: 'transparent', border: 'none', color: '#71717A',
                      display: 'inline-flex', alignItems: 'center',
                    }} title="Delete rule"><IconTrash size={13} /></button>
                  </div>
                </div>
              ))}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 160px 80px',
                alignItems: 'center', gap: 8,
                padding: '9px 14px', borderTop: '1px solid #232326', background: '#1A1A1E',
              }}>
                <input
                  value={newRulePattern}
                  onChange={(e) => setNewRulePattern(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addRule()}
                  placeholder="*@example.com"
                  style={{ ...inputMonoStyle, width: '100%' }}
                />
                <select value={newRuleCat} onChange={(e) => setNewRuleCat(e.target.value)} style={selectStyle}>
                  {Object.entries(CATEGORIES).map(([id, label]) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={addRule} disabled={!newRulePattern.trim()} style={{
                    padding: '4px 10px', fontSize: 11.5,
                    background: newRulePattern.trim() ? 'var(--accent-gradient)' : '#27272A',
                    border: '1px solid ' + (newRulePattern.trim() ? 'var(--accent)' : '#3F3F46'),
                    borderRadius: 4,
                    color: newRulePattern.trim() ? '#fff' : '#52525B',
                    fontWeight: 500,
                    cursor: newRulePattern.trim() ? 'pointer' : 'not-allowed',
                  }}>Add</button>
                </div>
              </div>
            </div>
          </Section>

          {/* Sync frequency */}
          <Section title="Sync frequency" subtitle="How often MailTriage checks for new messages.">
            <div style={{
              display: 'inline-flex', border: '1px solid #27272A',
              borderRadius: 6, padding: 3, background: '#18181B',
            }}>
              {[{ id: '1m', label: '1 min' }, { id: '5m', label: '5 min' }, { id: '15m', label: '15 min' }, { id: 'manual', label: 'Manual' }].map(o => {
                const active = syncFreq === o.id;
                return (
                  <button key={o.id} onClick={() => handleSyncFreq(o.id)} style={{
                    padding: '5px 14px', fontSize: 12, fontWeight: 500,
                    background: active ? '#27272A' : 'transparent', border: 'none', borderRadius: 4,
                    color: active ? '#E4E4E7' : '#A1A1AA',
                  }}>{o.label}</button>
                );
              })}
            </div>
          </Section>

          {/* DeepL Write */}
          <Section title="DeepL Write" subtitle="Polish drafts inside the compose window. Your key is stored locally and never sent anywhere but DeepL.">
            <div style={{ border: '1px solid #27272A', borderRadius: 6, background: '#18181B', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#71717A', fontWeight: 500, letterSpacing: 0.3, textTransform: 'uppercase' }}>
                <IconSparkle size={11} stroke="#A5A8F4" /> API key
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type={showDeeplKey ? 'text' : 'password'}
                  value={deeplKey}
                  onChange={(e) => setDeeplKey(e.target.value)}
                  placeholder="dwk-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  style={{ ...inputMonoStyle, flex: 1, fontSize: 12 }}
                />
                <button onClick={() => setShowDeeplKey(s => !s)} style={ghostBtnStyle}>
                  {showDeeplKey ? 'Hide' : 'Show'}
                </button>
                <button onClick={handleSaveDeeplKey} style={{
                  padding: '4px 12px', fontSize: 12,
                  background: deeplSaved ? '#22C55E' : 'var(--accent-gradient)',
                  border: '1px solid ' + (deeplSaved ? '#22C55E' : 'var(--accent)'),
                  borderRadius: 4, color: '#fff', fontWeight: 500,
                }}>{deeplSaved ? 'Saved!' : 'Save'}</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#71717A' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px', borderRadius: 3,
                  background: deeplKey ? 'rgba(34,197,94,0.12)' : 'rgba(113,113,122,0.12)',
                  color: deeplKey ? '#86EFAC' : '#A1A1AA',
                }}>
                  <IconCircle size={5} color={deeplKey ? '#22C55E' : '#71717A'} />
                  {deeplKey ? 'Connected' : 'Not connected'}
                </span>
                <span>Get a key at <span style={{ color: '#A5A8F4' }}>deepl.com/write/api</span></span>
              </div>
            </div>
          </Section>

          {/* Templates */}
          <Section title="Quick reply templates" subtitle="Snippets you can drop into any compose or reply. Surfaced in the toolbar dropdown.">
            <div style={{ border: '1px solid #27272A', borderRadius: 6, overflow: 'hidden', background: '#18181B' }}>
              {templates.map((t, i) => (
                <div key={t.id} style={{
                  display: 'grid', gridTemplateColumns: '180px 1fr 32px',
                  alignItems: 'start', gap: 12,
                  padding: '12px 14px', borderTop: i > 0 ? '1px solid #232326' : 'none',
                }}>
                  <span style={{ fontSize: 12.5, color: '#E4E4E7', fontWeight: 500, paddingTop: 1 }}>{t.name}</span>
                  <span style={{ fontSize: 12, color: '#A1A1AA', lineHeight: 1.5 }}>{t.body}</span>
                  <button onClick={() => removeTemplate(t.id)} style={{
                    padding: 4, background: 'transparent', border: 'none', color: '#71717A',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end',
                  }} title="Delete template"><IconTrash size={13} /></button>
                </div>
              ))}
              <div style={{ padding: '12px 14px', borderTop: templates.length > 0 ? '1px solid #232326' : 'none', background: '#1A1A1E', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 70px', gap: 12, alignItems: 'flex-start' }}>
                  <input value={newTplName} onChange={(e) => setNewTplName(e.target.value)}
                    placeholder="Template name" style={{ ...inputStyle, fontFamily: 'inherit', fontSize: 12.5, width: '100%' }} />
                  <textarea value={newTplBody} onChange={(e) => setNewTplBody(e.target.value)}
                    placeholder="Body text — inserted at cursor when selected from the toolbar"
                    style={{ ...inputStyle, fontFamily: 'inherit', fontSize: 12, minHeight: 56, resize: 'vertical', width: '100%' }} />
                  <button onClick={addTemplate}
                    disabled={!newTplName.trim() || !newTplBody.trim()}
                    style={{
                      padding: '6px 10px', fontSize: 11.5,
                      background: (newTplName.trim() && newTplBody.trim()) ? 'var(--accent-gradient)' : '#27272A',
                      border: '1px solid ' + ((newTplName.trim() && newTplBody.trim()) ? 'var(--accent)' : '#3F3F46'),
                      borderRadius: 4,
                      color: (newTplName.trim() && newTplBody.trim()) ? '#fff' : '#52525B',
                      fontWeight: 500, alignSelf: 'flex-start',
                      cursor: (newTplName.trim() && newTplBody.trim()) ? 'pointer' : 'not-allowed',
                    }}>Add</button>
                </div>
              </div>
            </div>
          </Section>

          {/* Appearance */}
          <Section title="Appearance" subtitle="Customize the accent color, density and feel of the app.">
            <div style={{ border: '1px solid #27272A', borderRadius: 6, background: '#18181B', padding: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <ColorMix
                value={appearance.accentMix}
                onChange={(mix) => updateAppearance({ accentMix: mix })}
                onReset={() => updateAppearance({ accentMix: APPEARANCE_DEFAULTS.accentMix })}
                ui={{ bg: '#18181B', text: '#E4E4E7', muted: '#71717A', border: 'rgba(255,255,255,0.08)' }}
              />

              <SegmentRow
                label="Density"
                hint="How tight the email rows and navigation should be."
                value={appearance.density}
                options={[{ id: 'comfortable', label: 'Comfortable' }, { id: 'compact', label: 'Compact' }]}
                onChange={(v) => updateAppearance({ density: v })}
              />

              <SegmentRow
                label="Font size"
                hint="Scale the entire interface up or down."
                value={appearance.fontSize}
                options={[{ id: 'small', label: 'Small' }, { id: 'medium', label: 'Medium' }, { id: 'large', label: 'Large' }]}
                onChange={(v) => updateAppearance({ fontSize: v })}
              />

              <SegmentRow
                label="Background"
                hint="Solid dark, or a subtle gradient tinted with the accent colors."
                value={appearance.bgStyle}
                options={[{ id: 'solid', label: 'Solid' }, { id: 'gradient', label: 'Gradient' }]}
                onChange={(v) => updateAppearance({ bgStyle: v })}
              />
            </div>
          </Section>

          {/* About */}
          <Section title="About" subtitle={null}>
            <div style={{ fontSize: 12, color: '#71717A', lineHeight: 1.7 }}>
              <div>MailTriage <span style={{ color: '#E4E4E7' }}>{dbInfo?.version || '0.4.2'}</span></div>
              <div>Local data: <span style={{ color: '#E4E4E7' }}>{dbInfo?.dataPath || '…'}</span></div>
              <div>Index size: <span style={{ color: '#E4E4E7' }}>{dbInfo?.indexSize || '…'}</span></div>
            </div>
          </Section>

        </div>
      </div>
    </div>
  );
}
