import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IconSearch, IconArrowLeft } from './icons/index.jsx';
import { CategoryBadge } from './TriageScreen.jsx';

function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function Highlight({ text, query }) {
  if (!query || !text) return <>{text}</>;
  const parts = String(text).split(new RegExp(`(${escapeRegExp(query)})`, 'ig'));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === query.toLowerCase()
          ? <mark key={i} style={{ background: 'rgba(99,102,241,0.28)', color: '#E4E4E7', padding: '0 1px', borderRadius: 2 }}>{p}</mark>
          : <React.Fragment key={i}>{p}</React.Fragment>
      )}
    </>
  );
}

function bodySnippet(body, query) {
  if (!body) return '';
  if (!query) return body.slice(0, 140);
  const i = body.toLowerCase().indexOf(query.toLowerCase());
  if (i === -1) return body.slice(0, 140);
  const start = Math.max(0, i - 40);
  const end = Math.min(body.length, i + query.length + 100);
  return (start > 0 ? '…' : '') + body.slice(start, end).replace(/\n/g, ' ') + (end < body.length ? '…' : '');
}

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

function SearchResultCard({ email, query, onOpen, isOpen }) {
  const [hovered, setHovered] = useState(false);
  const snippet = bodySnippet(email.body, query);

  const bg = isOpen ? 'rgba(99,102,241,0.10)' : hovered ? '#1A1A1E' : 'transparent';
  const borderLeft = isOpen ? '2px solid #6366F1' : '2px solid transparent';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onOpen(email.id)}
      style={{
        display: 'grid', gridTemplateColumns: '200px 1fr auto',
        gap: 16, padding: '12px 16px 14px 14px',
        borderBottom: '1px solid #1F1F22', borderLeft, background: bg,
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{ fontWeight: 500, color: '#E4E4E7', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <Highlight text={email.sender_name || email.sender_email} query={query} />
          </span>
          <span style={{ fontSize: 11, color: '#71717A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <Highlight text={email.sender_email} query={query} />
          </span>
        </div>
      </div>

      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ color: '#E4E4E7', fontWeight: 500, fontSize: 13, lineHeight: 1.35 }}>
          <Highlight text={email.subject} query={query} />
        </span>
        <span style={{
          color: '#71717A', fontSize: 12, lineHeight: 1.5,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          <Highlight text={snippet} query={query} />
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
        <span style={{ fontSize: 12, color: '#71717A', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
          {formatDate(email.date)}
        </span>
        <CategoryBadge category={email.category} />
      </div>
    </div>
  );
}

export default function SearchResultsScreen({ query, setQuery, onClear, openEmailId, setOpenEmailId }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const data = await window.api.emails.search(q);
      setResults(data);
    } catch (e) {
      console.error('Search failed:', e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 120);
    return () => clearTimeout(debounceRef.current);
  }, [query, doSearch]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !openEmailId) onClear();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClear, openEmailId]);

  // Use the raw query words for highlighting (first word)
  const highlightQuery = query.trim().split(/\s+/)[0] || '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px',
        borderBottom: '1px solid #27272A',
        background: '#18181B',
        height: 48, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClear} style={{
            width: 26, height: 26, borderRadius: 4,
            background: 'transparent', border: '1px solid #27272A',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#A1A1AA',
          }} title="Back to inbox (Esc)">
            <IconArrowLeft size={13} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#E4E4E7' }}>
            <span style={{ color: '#A1A1AA', fontWeight: 400 }}>Search</span>
            <span style={{ color: '#3F3F46', margin: '0 8px' }}>/</span>
            <span style={{ color: '#E4E4E7' }}>"{query}"</span>
          </span>
          {!loading && (
            <span style={{
              fontSize: 11, fontWeight: 500,
              padding: '2px 7px', borderRadius: 4,
              background: 'rgba(99,102,241,0.14)', color: '#A5A8F4',
              fontVariantNumeric: 'tabular-nums',
            }}>{results.length} result{results.length === 1 ? '' : 's'}</span>
          )}
        </div>

        <div style={{
          width: 320, display: 'flex', alignItems: 'center', gap: 6, padding: '5px 9px',
          border: '1px solid #3F3F46', borderRadius: 4, background: '#0E0E10',
        }}>
          <IconSearch size={13} stroke="#A1A1AA" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: '#E4E4E7', fontSize: 12, fontFamily: 'inherit',
            }}
          />
          <span style={{ fontSize: 11, color: '#52525B', fontFamily: 'JetBrains Mono, monospace' }}>Esc</span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', background: '#0E0E10' }}>
        {loading ? (
          <div style={{ padding: '80px 24px', textAlign: 'center', color: '#52525B', fontSize: 13 }}>Searching…</div>
        ) : results.length === 0 && query.trim() ? (
          <div style={{ padding: '80px 24px', textAlign: 'center' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: '#18181B', border: '1px solid #27272A',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: '#52525B', marginBottom: 12,
            }}><IconSearch size={16} stroke="#52525B" /></div>
            <div style={{ color: '#A1A1AA', fontSize: 13, marginBottom: 4 }}>No matches for "{query}"</div>
            <div style={{ color: '#52525B', fontSize: 12 }}>Try a different search, or press Esc to return to your inbox.</div>
          </div>
        ) : (
          results.map(e => (
            <SearchResultCard
              key={e.id} email={e} query={highlightQuery}
              isOpen={openEmailId === e.id}
              onOpen={(id) => setOpenEmailId(id)}
            />
          ))
        )}
        <div style={{ height: 60 }} />
      </div>
    </div>
  );
}
