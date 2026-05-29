const { BrowserWindow, app } = require('electron');
const { v4: uuidv4 } = require('uuid');

const OUTLOOK_AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const OUTLOOK_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const SCOPES = ['Mail.Read', 'Mail.Send', 'Mail.ReadWrite', 'User.Read', 'offline_access'].join(' ');

function getCredentials() {
  try {
    const Store = require('electron-store');
    const store = new Store({ name: 'credentials' });
    return {
      clientId: store.get('outlook.clientId', process.env.OUTLOOK_CLIENT_ID || ''),
      clientSecret: store.get('outlook.clientSecret', process.env.OUTLOOK_CLIENT_SECRET || ''),
    };
  } catch {
    return { clientId: '', clientSecret: '' };
  }
}

async function startOutlookOAuth(store) {
  const { clientId, clientSecret } = getCredentials();
  if (!clientId) {
    throw new Error('Outlook OAuth credentials not configured. Set OUTLOOK_CLIENT_ID in your .env file.');
  }

  const redirectUri = 'mailtriage://oauth/outlook';
  const state = uuidv4();

  const authUrl = new URL(OUTLOOK_AUTH_URL);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', SCOPES);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('response_mode', 'query');

  return new Promise((resolve, reject) => {
    const win = new BrowserWindow({
      width: 500,
      height: 660,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
      title: 'Connect Outlook',
    });

    win.loadURL(authUrl.toString());

    const handleUrl = async (url) => {
      try {
        const parsed = new URL(url);
        if (parsed.hostname !== 'oauth' || parsed.pathname !== '/outlook') return;

        const returnedState = parsed.searchParams.get('state');
        const code = parsed.searchParams.get('code');
        const error = parsed.searchParams.get('error');

        win.close();

        if (error || returnedState !== state) {
          reject(new Error(error || 'State mismatch'));
          return;
        }

        const tokens = await exchangeOutlookCode(code, clientId, clientSecret, redirectUri);
        const userInfo = await fetchOutlookUserInfo(tokens.access_token);

        const accountId = uuidv4();
        const accountColors = ['#6366F1', '#F59E0B', '#22C55E', '#3B82F6', '#EC4899', '#8B5CF6'];
        const color = accountColors[Math.floor(Math.random() * accountColors.length)];

        const account = {
          id: accountId,
          provider: 'outlook',
          email: userInfo.mail || userInfo.userPrincipalName,
          display_name: userInfo.displayName || userInfo.mail,
          color,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || '',
          token_expiry: Date.now() + (tokens.expires_in * 1000),
        };

        store.set(`accounts.${accountId}`, {
          access: tokens.access_token,
          refresh: tokens.refresh_token || '',
          expiry: account.token_expiry,
        });

        resolve(account);
      } catch (err) {
        win.close();
        reject(err);
      }
    };

    app.on('open-url', (event, url) => {
      event.preventDefault();
      handleUrl(url);
    });

    win.webContents.on('will-redirect', (event, url) => {
      if (url.startsWith('mailtriage://')) {
        event.preventDefault();
        handleUrl(url);
      }
    });

    win.on('closed', () => {
      reject(new Error('OAuth window closed by user'));
    });
  });
}

async function exchangeOutlookCode(code, clientId, clientSecret, redirectUri) {
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
    scope: SCOPES,
  });
  if (clientSecret) body.set('client_secret', clientSecret);

  const res = await fetch(OUTLOOK_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
  return res.json();
}

async function fetchOutlookUserInfo(accessToken) {
  const res = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to fetch user info');
  return res.json();
}

async function refreshOutlookToken(account, store) {
  const { clientId, clientSecret } = getCredentials();
  const stored = store.get(`accounts.${account.id}`, {});
  const refreshToken = stored.refresh || account.refresh_token;

  if (!refreshToken) throw new Error('No refresh token available');

  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    grant_type: 'refresh_token',
    scope: SCOPES,
  });
  if (clientSecret) body.set('client_secret', clientSecret);

  const res = await fetch(OUTLOOK_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);
  const tokens = await res.json();

  const newExpiry = Date.now() + (tokens.expires_in * 1000);
  store.set(`accounts.${account.id}.access`, tokens.access_token);
  store.set(`accounts.${account.id}.expiry`, newExpiry);

  return { access_token: tokens.access_token, token_expiry: newExpiry };
}

module.exports = { startOutlookOAuth, refreshOutlookToken };
