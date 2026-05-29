const { BrowserWindow } = require('electron');
const { v4: uuidv4 } = require('uuid');
const http = require('http');

const GMAIL_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GMAIL_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

function getCredentials() {
  try {
    const Store = require('electron-store');
    const store = new Store({ name: 'credentials' });
    return {
      clientId: store.get('gmail.clientId', process.env.GMAIL_CLIENT_ID || ''),
      clientSecret: store.get('gmail.clientSecret', process.env.GMAIL_CLIENT_SECRET || ''),
    };
  } catch {
    return { clientId: '', clientSecret: '' };
  }
}

function startLocalServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      console.log('[oauth-gmail] Local server started on port', port);
      resolve({ server, port });
    });
    server.on('error', reject);
  });
}

async function startGmailOAuth(store) {
  const { clientId, clientSecret } = getCredentials();
  if (!clientId || !clientSecret) {
    throw new Error('Gmail OAuth credentials not configured. Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in your .env file.');
  }

  const state = uuidv4();
  const { server, port } = await startLocalServer();
  const redirectUri = `http://127.0.0.1:${port}`;

  const authUrl = new URL(GMAIL_AUTH_URL);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', SCOPES);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  console.log('[oauth-gmail] Opening auth URL with redirect:', redirectUri);

  return new Promise((resolve, reject) => {
    // Tracks whether the HTTP server received the redirect — used by the
    // closed handler to distinguish user-cancelled from post-code-close.
    let codeReceived = false;

    const win = new BrowserWindow({
      width: 500,
      height: 660,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
      title: 'Connect Gmail',
    });

    win.loadURL(authUrl.toString());

    server.on('request', async (req, res) => {
      console.log('[oauth-gmail] Redirect received:', req.url);

      // Ignore favicon or other spurious requests
      if (!req.url.startsWith('/?') && req.url !== '/') {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url, redirectUri);
      const code = url.searchParams.get('code');
      const returnedState = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      // Respond immediately so the browser shows a clean success page
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body style="font-family:sans-serif;text-align:center;padding-top:80px"><h2>Authentication complete.</h2><p>You can close this window.</p></body></html>');
      server.close();

      if (error || returnedState !== state) {
        console.log('[oauth-gmail] Auth error or state mismatch:', error);
        if (!win.isDestroyed()) win.close();
        reject(new Error(error || 'OAuth state mismatch'));
        return;
      }

      console.log('[oauth-gmail] Auth code captured, exchanging for tokens...');
      // Mark before closing the window so the closed handler doesn't race us
      codeReceived = true;
      if (!win.isDestroyed()) win.close();

      try {
        const tokens = await exchangeGmailCode(code, clientId, clientSecret, redirectUri);
        console.log('[oauth-gmail] Token exchange complete, fetching user info...');
        const userInfo = await fetchGmailUserInfo(tokens.access_token);
        console.log('[oauth-gmail] User info fetched:', userInfo.email);

        const accountId = uuidv4();
        const accountColors = ['#6366F1', '#F59E0B', '#22C55E', '#3B82F6', '#EC4899', '#8B5CF6'];
        const color = accountColors[Math.floor(Math.random() * accountColors.length)];

        const account = {
          id: accountId,
          provider: 'gmail',
          email: userInfo.email,
          display_name: userInfo.name || userInfo.email,
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

        console.log('[oauth-gmail] Account stored, resolving.');
        resolve(account);
      } catch (err) {
        console.error('[oauth-gmail] Token exchange failed:', err);
        reject(err);
      }
    });

    win.on('closed', () => {
      server.close();
      if (!codeReceived) {
        console.log('[oauth-gmail] Window closed before code was received.');
        reject(new Error('OAuth window closed by user'));
      }
    });
  });
}

async function exchangeGmailCode(code, clientId, clientSecret, redirectUri) {
  const res = await fetch(GMAIL_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
  return res.json();
}

async function fetchGmailUserInfo(accessToken) {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to fetch user info');
  return res.json();
}

async function refreshGmailToken(account, store) {
  const { clientId, clientSecret } = getCredentials();
  const stored = store.get(`accounts.${account.id}`, {});
  const refreshToken = stored.refresh || account.refresh_token;

  if (!refreshToken) throw new Error('No refresh token available');

  const res = await fetch(GMAIL_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);
  const tokens = await res.json();

  const newExpiry = Date.now() + (tokens.expires_in * 1000);
  store.set(`accounts.${account.id}.access`, tokens.access_token);
  store.set(`accounts.${account.id}.expiry`, newExpiry);

  return { access_token: tokens.access_token, token_expiry: newExpiry };
}

module.exports = { startGmailOAuth, refreshGmailToken };
