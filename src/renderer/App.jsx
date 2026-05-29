import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar.jsx';
import OnboardingScreen from './OnboardingScreen.jsx';
import TriageScreen from './TriageScreen.jsx';
import ReadingPane from './ReadingPane.jsx';
import ComposeModal from './ComposeModal.jsx';
import SearchResultsScreen from './SearchResultsScreen.jsx';
import SettingsScreen from './SettingsScreen.jsx';
import QuickCleanModal from './QuickCleanModal.jsx';

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function EmailListScreen({ title, loader, openEmailId, setOpenEmailId }) {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loader().then(data => { setEmails(data || []); setLoading(false); }).catch(() => setLoading(false));
  }, [loader]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{
        padding: '10px 16px', borderBottom: '1px solid #27272A', background: '#18181B',
        height: 48, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#E4E4E7' }}>{title}</span>
        {!loading && (
          <span style={{
            fontSize: 11, fontWeight: 500, padding: '2px 7px', borderRadius: 4,
            background: 'rgba(99,102,241,0.14)', color: '#A5A8F4',
            fontVariantNumeric: 'tabular-nums',
          }}>{emails.length}</span>
        )}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', background: '#0E0E10' }}>
        {loading ? (
          <div style={{ padding: '80px 24px', textAlign: 'center', color: '#52525B', fontSize: 13 }}>Loading…</div>
        ) : emails.length === 0 ? (
          <div style={{ padding: '80px 24px', textAlign: 'center', color: '#52525B', fontSize: 13 }}>No messages.</div>
        ) : (
          emails.map(e => (
            <div key={e.id} onClick={() => setOpenEmailId(e.id)} style={{
              display: 'grid', gridTemplateColumns: '1fr auto',
              gap: 12, padding: '11px 16px', borderBottom: '1px solid #1F1F22',
              borderLeft: openEmailId === e.id ? '2px solid #6366F1' : '2px solid transparent',
              background: openEmailId === e.id ? 'rgba(99,102,241,0.10)' : 'transparent',
              cursor: 'pointer',
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#E4E4E7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {e.sender_name || e.sender_email}
                  </span>
                  <span style={{ fontSize: 12, color: '#A1A1AA', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                    {e.subject}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#52525B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {e.body?.slice(0, 120) || ''}
                </div>
              </div>
              <span style={{ fontSize: 12, color: '#71717A', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', alignSelf: 'center' }}>
                {formatDate(e.date)}
              </span>
            </div>
          ))
        )}
        <div style={{ height: 60 }} />
      </div>
    </div>
  );
}

export default function App() {
  const [phase, setPhase] = useState('loading');
  const [accounts, setAccounts] = useState([]);
  const [activeAccount, setActiveAccount] = useState(null);
  const [activeNav, setActiveNav] = useState('inbox');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState([]);
  const [openEmailId, setOpenEmailId] = useState(null);
  const [replyMode, setReplyMode] = useState('none');
  const [snoozeOpenId, setSnoozeOpenId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [quickCleanOpen, setQuickCleanOpen] = useState(false);

  const refreshAccounts = useCallback(async () => {
    try {
      const accts = await window.api.accounts.list();
      setAccounts(accts);
      if (accts.length === 0) {
        setPhase('onboarding');
      } else {
        setPhase('app');
        if (!activeAccount && accts.length > 0) {
          setActiveAccount(accts[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load accounts:', e);
      setPhase('onboarding');
    }
  }, [activeAccount]);

  const refreshTemplates = useCallback(async () => {
    try {
      const tmpls = await window.api.templates.list();
      setTemplates(tmpls);
    } catch {}
  }, []);

  useEffect(() => {
    refreshAccounts();
    refreshTemplates();
  }, []);

  useEffect(() => {
    const unsub = window.api.events.onOpenEmail((id) => {
      setActiveNav('inbox');
      setSearchQuery('');
      setOpenEmailId(id);
      setReplyMode('none');
    });
    return unsub;
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;

      const key = e.key.toLowerCase();

      if ((e.metaKey || e.ctrlKey) && key === 'k') {
        e.preventDefault();
        setActiveNav('inbox');
        setSearchQuery(' ');
        return;
      }

      if (key === '/' && !searchQuery && !openEmailId && !composeOpen) {
        e.preventDefault();
        setActiveNav('inbox');
        setSearchQuery(' ');
        return;
      }

      if (key === 'escape') {
        if (snoozeOpenId) { setSnoozeOpenId(null); return; }
        if (replyMode !== 'none') { setReplyMode('none'); return; }
        if (openEmailId) { setOpenEmailId(null); setReplyMode('none'); return; }
        if (searchQuery) { setSearchQuery(''); return; }
        if (composeOpen) { setComposeOpen(false); return; }
        return;
      }

      if (openEmailId) return;

      if (key === 'c') { setComposeOpen(true); return; }
      if (key === 'e') {
        if (selected.length > 0) window.api.emails.archive(selected).then(() => setSelected([]));
        return;
      }
      if (key === '#') {
        if (selected.length > 0) window.api.emails.delete(selected).then(() => setSelected([]));
        return;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [snoozeOpenId, replyMode, openEmailId, searchQuery, composeOpen, selected]);

  const handleOnboardingComplete = () => {
    refreshAccounts();
    refreshTemplates();
  };

  const handleAddAccount = () => {
    setPhase('onboarding');
  };

  if (phase === 'loading') {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0E0E10', color: '#52525B' }}>
        Loading…
      </div>
    );
  }

  if (phase === 'onboarding') {
    return (
      <OnboardingScreen onComplete={handleOnboardingComplete} />
    );
  }

  // Bug 5 fix: use !== '' so a single space activates search mode
  const searchActive = activeNav === 'inbox' && searchQuery !== '';
  const showSearch = searchActive;
  const showTriage = activeNav === 'inbox' && !searchActive;

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0E0E10' }}>
      <Sidebar
        accounts={accounts}
        activeAccount={activeAccount}
        setActiveAccount={setActiveAccount}
        activeNav={activeNav}
        setActiveNav={(n) => {
          setActiveNav(n);
          setOpenEmailId(null);
          setSearchQuery('');
          setSnoozeOpenId(null);
        }}
        onCompose={() => setComposeOpen(true)}
        onAddAccount={handleAddAccount}
        onQuickClean={() => setQuickCleanOpen(true)}
      />

      <main style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
        {snoozeOpenId && (
          <div onClick={() => setSnoozeOpenId(null)} style={{
            position: 'absolute', inset: 0, zIndex: 15, background: 'transparent',
          }} />
        )}

        {showTriage && (
          <TriageScreen
            accounts={accounts}
            filter={filter}
            setFilter={setFilter}
            selected={selected}
            setSelected={setSelected}
            openEmailId={openEmailId}
            setOpenEmailId={(id) => { setOpenEmailId(id); setReplyMode('none'); }}
            snoozeOpenId={snoozeOpenId}
            setSnoozeOpenId={setSnoozeOpenId}
            onOpenSearch={() => { setSearchQuery(' '); }}
          />
        )}

        {showSearch && (
          <SearchResultsScreen
            query={searchQuery.trim()}
            setQuery={setSearchQuery}
            onClear={() => setSearchQuery('')}
            openEmailId={openEmailId}
            setOpenEmailId={(id) => { setOpenEmailId(id); setReplyMode('none'); }}
          />
        )}

        {activeNav === 'starred' && (
          <EmailListScreen
            title="Starred"
            loader={window.api.emails.listStarred}
            openEmailId={openEmailId}
            setOpenEmailId={(id) => { setOpenEmailId(id); setReplyMode('none'); }}
          />
        )}
        {activeNav === 'sent' && (
          <EmailListScreen
            title="Sent"
            loader={window.api.emails.listSent}
            openEmailId={openEmailId}
            setOpenEmailId={(id) => { setOpenEmailId(id); setReplyMode('none'); }}
          />
        )}
        {activeNav === 'archived' && (
          <EmailListScreen
            title="Archive"
            loader={window.api.emails.listArchived}
            openEmailId={openEmailId}
            setOpenEmailId={(id) => { setOpenEmailId(id); setReplyMode('none'); }}
          />
        )}
        {activeNav === 'settings' && (
          <SettingsScreen onAddAccount={handleAddAccount} />
        )}

        {openEmailId && (
          <ReadingPane
            emailId={openEmailId}
            onClose={() => { setOpenEmailId(null); setReplyMode('none'); }}
            replyMode={replyMode}
            setReplyMode={setReplyMode}
            accounts={accounts}
            templates={templates}
          />
        )}
      </main>

      {composeOpen && (
        <ComposeModal
          onClose={() => setComposeOpen(false)}
          accounts={accounts}
          templates={templates}
        />
      )}

      {quickCleanOpen && (
        <QuickCleanModal onClose={() => setQuickCleanOpen(false)} />
      )}
    </div>
  );
}
