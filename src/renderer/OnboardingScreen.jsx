import React, { useState } from 'react';
import { IconPlus, IconChevronRight, IconCircle, IconSpinner, GmailMark, OutlookMark } from './icons/index.jsx';

export default function OnboardingScreen({ onComplete }) {
  const [variant, setVariant] = useState('start');
  const [pending, setPending] = useState(null);
  const [error, setError] = useState(null);
  const [connectedAccount, setConnectedAccount] = useState(null);

  const handleConnect = async (provider) => {
    setPending(provider);
    setVariant('loading');
    setError(null);
    try {
      const account = provider === 'gmail'
        ? await window.api.accounts.addGmail()
        : await window.api.accounts.addOutlook();
      setConnectedAccount(account);
      setVariant('added');
    } catch (err) {
      setError(err.message || 'OAuth failed');
      setVariant('start');
    }
    setPending(null);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0E0E10',
      padding: 32,
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle, #18181B 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        opacity: 0.5,
        pointerEvents: 'none',
      }} />

      <div style={{
        width: 400,
        background: '#18181B',
        border: '1px solid #27272A',
        borderRadius: 8,
        padding: '32px 32px 28px',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 5,
            background: '#6366F1',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M2 4.5L8 9L14 4.5M2 4.5V12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V4.5M2 4.5h12" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#E4E4E7', letterSpacing: -0.2 }}>MailTriage</span>
        </div>

        {error && (
          <div style={{
            marginBottom: 16, padding: '8px 12px',
            background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)',
            borderRadius: 4, color: '#FCA5A5', fontSize: 12,
          }}>{error}</div>
        )}

        {variant === 'start' && (
          <>
            <h1 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 600, color: '#E4E4E7', letterSpacing: -0.2 }}>
              Connect your first account
            </h1>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: '#A1A1AA', lineHeight: 1.5 }}>
              MailTriage reads, categorizes, and unsubscribes — all locally on your machine. We never store your messages on our servers.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <ProviderButton provider="gmail" onClick={() => handleConnect('gmail')} />
              <ProviderButton provider="outlook" onClick={() => handleConnect('outlook')} />
            </div>
            <p style={{ margin: '20px 0 0', fontSize: 11, color: '#52525B', textAlign: 'center', lineHeight: 1.5 }}>
              By continuing you agree to the Terms and Privacy Policy.
            </p>
          </>
        )}

        {variant === 'loading' && (
          <>
            <h1 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 600, color: '#E4E4E7', letterSpacing: -0.2 }}>
              Connect your first account
            </h1>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: '#A1A1AA', lineHeight: 1.5 }}>
              A browser window should open. Approve access to continue.
            </p>
            <div style={{
              border: '1px solid #27272A', borderRadius: 6,
              padding: '20px', display: 'flex', alignItems: 'center', gap: 12,
              background: '#1A1A1E',
            }}>
              <IconSpinner size={18} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 13, color: '#E4E4E7', fontWeight: 500 }}>
                  Redirecting to {pending === 'outlook' ? 'Microsoft' : 'Google'} OAuth…
                </span>
                <span style={{ fontSize: 11, color: '#71717A', marginTop: 2 }}>
                  Waiting for authorization
                </span>
              </div>
            </div>
            <button onClick={() => setVariant('start')} style={{
              marginTop: 14, width: '100%', padding: '8px 12px',
              background: 'transparent', border: '1px solid #27272A',
              borderRadius: 4, color: '#A1A1AA', fontSize: 12,
            }}>Cancel</button>
          </>
        )}

        {variant === 'added' && (
          <>
            <h1 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 600, color: '#E4E4E7', letterSpacing: -0.2 }}>
              You're all set
            </h1>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#A1A1AA', lineHeight: 1.5 }}>
              Add another account, or jump into triage.
            </p>
            {connectedAccount && (
              <div style={{
                border: '1px solid #27272A', borderRadius: 6,
                padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
                background: '#1A1A1E', marginBottom: 8,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: connectedAccount.color || '#6366F1', color: '#fff',
                  fontSize: 12, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{(connectedAccount.email || '?')[0].toUpperCase()}</div>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, color: '#E4E4E7', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {connectedAccount.email}
                  </span>
                  <span style={{ fontSize: 11, color: '#22C55E', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <IconCircle size={6} color="#22C55E" /> Connected · syncing…
                  </span>
                </div>
                {connectedAccount.provider === 'outlook' ? <OutlookMark size={16} /> : <GmailMark size={16} />}
              </div>
            )}
            <button
              onClick={() => { setPending(null); setVariant('start'); }}
              style={{
                width: '100%', padding: '10px 12px', marginBottom: 8,
                background: 'transparent', border: '1px dashed #3F3F46',
                borderRadius: 4, color: '#A1A1AA', fontSize: 12, fontWeight: 500,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
              <IconPlus size={13} /> Add another account
            </button>
            <button onClick={onComplete} style={{
              width: '100%', padding: '10px 12px', marginTop: 8,
              background: '#6366F1', border: '1px solid #6366F1',
              borderRadius: 4, color: '#fff', fontSize: 13, fontWeight: 500,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              Continue to inbox <IconChevronRight size={13} stroke="#fff" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ProviderButton({ provider, onClick }) {
  const [h, sh] = useState(false);
  const isGmail = provider === 'gmail';
  return (
    <button onClick={onClick} onMouseEnter={() => sh(true)} onMouseLeave={() => sh(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px',
        background: h ? '#1F1F23' : '#1A1A1E',
        border: `1px solid ${h ? '#3F3F46' : '#27272A'}`,
        borderRadius: 6,
        color: '#E4E4E7',
        fontSize: 13, fontWeight: 500,
        textAlign: 'left',
        transition: 'all .12s',
      }}>
      {isGmail ? <GmailMark size={20} /> : <OutlookMark size={20} />}
      <span>Connect {isGmail ? 'Gmail' : 'Outlook'}</span>
      <IconChevronRight size={13} stroke="#71717A" style={{ marginLeft: 'auto' }} />
    </button>
  );
}
