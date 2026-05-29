const { app, BrowserWindow, ipcMain, Notification, protocol, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

// Load .env from project root without requiring dotenv package
try {
  const envPath = path.join(__dirname, '../../.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (key && !(key in process.env)) process.env[key] = val;
  }
} catch { /* .env is optional */ }
const { v4: uuidv4 } = require('uuid');

const { getDb } = require('../db/db');
const { startGmailOAuth } = require('./oauth-gmail');
const { startOutlookOAuth } = require('./oauth-outlook');
const { syncGmail, syncOutlook, getSyncErrors, applyRules, matchesRule } = require('./sync');
const { archiveEmail, deleteEmail, markReadEmail, sendEmail, replyEmail, forwardEmail } = require('./actions');
const { rephrase } = require('./deepl');

let _store = null;
function getStore() {
  if (!_store) _store = new Store({ name: 'mailtriage' });
  return _store;
}

let mainWindow = null;
let syncInterval = null;

// Register custom protocol for OAuth redirect
app.setAsDefaultProtocolClient('mailtriage');

protocol.registerSchemesAsPrivileged([
  { scheme: 'mailtriage', privileges: { secure: true, standard: true } },
]);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0E0E10',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../../public/index.html'));

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();
  startSyncLoop();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Handle macOS open-url for OAuth
app.on('open-url', (event, url) => {
  event.preventDefault();
});

// ─── Sync loop ───────────────────────────────────────────────────────────────

function startSyncLoop() {
  if (syncInterval) clearInterval(syncInterval);

  const freq = getStore().get('settings.syncFreq', '5m');
  if (freq === 'manual') return;

  const ms = freq === '1m' ? 60000 : freq === '15m' ? 900000 : 300000;

  syncInterval = setInterval(() => runSync(), ms);
  setTimeout(() => runSync(), 2000); // Initial sync after startup
}

async function runSync() {
  const db = getDb();
  const accounts = db.prepare('SELECT * FROM accounts').all();
  const rules = db.prepare('SELECT * FROM rules ORDER BY position').all();

  const results = [];

  for (const account of accounts) {
    try {
      const onNewImportant = (email) => {
        const notification = new Notification({
          title: email.sender_name || email.sender_email,
          body: email.subject || '(no subject)',
        });
        notification.on('click', () => {
          if (mainWindow) {
            mainWindow.focus();
            mainWindow.webContents.send('open-email', email.id);
          }
        });
        notification.show();
        if (mainWindow) {
          mainWindow.webContents.send('email:newImportant', email);
        }
      };

      let result;
      if (account.provider === 'gmail') {
        result = await syncGmail(account, db, getStore(), rules, onNewImportant);
      } else {
        result = await syncOutlook(account, db, getStore(), rules, onNewImportant);
      }
      results.push({ accountId: account.id, ...result, error: null });
    } catch (err) {
      results.push({ accountId: account.id, synced: 0, error: err.message });
    }
  }

  if (mainWindow) {
    mainWindow.webContents.send('sync:tick', { results, timestamp: Date.now() });
  }
}

// ─── IPC: Emails ─────────────────────────────────────────────────────────────

ipcMain.handle('emails:listInbox', (_, filter) => {
  const db = getDb();
  const now = Date.now();
  let query = `
    SELECT * FROM emails
    WHERE is_archived = 0
      AND is_deleted  = 0
      AND (snoozed_until IS NULL OR snoozed_until < ${now})
  `;
  if (filter && filter !== 'all') {
    query += ` AND category = '${filter.replace(/'/g, "''")}'`;
  }
  query += ' ORDER BY date DESC LIMIT 200';
  return db.prepare(query).all();
});

ipcMain.handle('emails:search', (_, query) => {
  const db = getDb();
  if (!query || query.trim().length === 0) return [];

  const tokens = query.trim().split(/\s+/).map(t => t + '*');
  const ftsQuery = tokens.join(' ');

  try {
    return db.prepare(`
      SELECT e.* FROM emails_fts
      JOIN emails e ON e.rowid = emails_fts.rowid
      WHERE emails_fts MATCH ?
      ORDER BY rank
      LIMIT 100
    `).all(ftsQuery);
  } catch {
    return [];
  }
});

ipcMain.handle('emails:open', (_, id) => {
  const db = getDb();
  return db.prepare('SELECT * FROM emails WHERE id = ?').get(id) || null;
});

ipcMain.handle('emails:archive', async (_, ids) => {
  const db = getDb();
  const updateStmt = db.prepare('UPDATE emails SET is_archived = 1 WHERE id = ?');
  const tx = db.transaction((ids) => { for (const id of ids) updateStmt.run(id); });
  tx(ids);

  for (const id of ids) {
    const email = db.prepare('SELECT * FROM emails WHERE id = ?').get(id);
    if (!email) continue;
    const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(email.account_id);
    if (!account) continue;
    try { await archiveEmail(email, account, getStore()); } catch (e) { console.error('Archive remote failed:', e); }
  }
});

ipcMain.handle('emails:delete', async (_, ids) => {
  const db = getDb();
  const updateStmt = db.prepare('UPDATE emails SET is_deleted = 1 WHERE id = ?');
  const tx = db.transaction((ids) => { for (const id of ids) updateStmt.run(id); });
  tx(ids);

  for (const id of ids) {
    const email = db.prepare('SELECT * FROM emails WHERE id = ?').get(id);
    if (!email) continue;
    const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(email.account_id);
    if (!account) continue;
    try { await deleteEmail(email, account, getStore()); } catch (e) { console.error('Delete remote failed:', e); }
  }
});

ipcMain.handle('emails:markRead', async (_, ids, read) => {
  const db = getDb();
  const updateStmt = db.prepare('UPDATE emails SET is_read = ? WHERE id = ?');
  const tx = db.transaction((ids) => { for (const id of ids) updateStmt.run(read ? 1 : 0, id); });
  tx(ids);

  for (const id of ids) {
    const email = db.prepare('SELECT * FROM emails WHERE id = ?').get(id);
    if (!email) continue;
    const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(email.account_id);
    if (!account) continue;
    try { await markReadEmail(email, account, getStore(), read); } catch (e) { console.error('MarkRead remote failed:', e); }
  }
});

ipcMain.handle('emails:snooze', (_, ids, until) => {
  const db = getDb();
  const stmt = db.prepare('UPDATE emails SET snoozed_until = ? WHERE id = ?');
  const tx = db.transaction((ids) => { for (const id of ids) stmt.run(until, id); });
  tx(ids);
});

ipcMain.handle('emails:unsubscribe', (_, id) => {
  const db = getDb();
  const email = db.prepare('SELECT list_unsubscribe_header FROM emails WHERE id = ?').get(id);
  if (!email?.list_unsubscribe_header) return null;

  const header = email.list_unsubscribe_header;
  const urls = header.match(/<([^>]+)>/g) || [];

  let httpTarget = null;
  let mailtoTarget = null;

  for (const match of urls) {
    const url = match.slice(1, -1).trim();
    if (url.startsWith('https://') || url.startsWith('http://')) {
      httpTarget = url;
    } else if (url.startsWith('mailto:')) {
      mailtoTarget = url;
    }
  }

  if (httpTarget) {
    shell.openExternal(httpTarget);
    return { method: 'http', target: httpTarget };
  } else if (mailtoTarget) {
    shell.openExternal(mailtoTarget);
    return { method: 'mailto', target: mailtoTarget };
  }

  return null;
});

ipcMain.handle('emails:keep', (_, id) => {
  const db = getDb();
  db.prepare('UPDATE emails SET is_kept = 1 WHERE id = ?').run(id);
});

ipcMain.handle('emails:star', (_, id, starred) => {
  const db = getDb();
  db.prepare('UPDATE emails SET is_starred = ? WHERE id = ?').run(starred ? 1 : 0, id);
});

ipcMain.handle('emails:listStarred', () => {
  const db = getDb();
  return db.prepare('SELECT * FROM emails WHERE is_starred = 1 AND is_deleted = 0 ORDER BY date DESC LIMIT 200').all();
});

ipcMain.handle('emails:listArchived', () => {
  const db = getDb();
  return db.prepare('SELECT * FROM emails WHERE is_archived = 1 AND is_deleted = 0 ORDER BY date DESC LIMIT 200').all();
});

ipcMain.handle('emails:listSent', () => {
  const db = getDb();
  return db.prepare('SELECT * FROM emails WHERE is_sent = 1 AND is_deleted = 0 ORDER BY date DESC LIMIT 200').all();
});

ipcMain.handle('emails:quickCleanCandidates', () => {
  const db = getDb();
  return db.prepare(`
    SELECT e.sender_email, e.sender_name, COUNT(*) as cnt,
      (SELECT subject FROM emails e2
       WHERE e2.sender_email = e.sender_email AND e2.is_archived = 0 AND e2.is_deleted = 0
       ORDER BY e2.date DESC LIMIT 1) as latest_subject
    FROM emails e
    WHERE e.is_archived = 0 AND e.is_deleted = 0
    GROUP BY e.sender_email
    ORDER BY cnt DESC
    LIMIT 10
  `).all();
});

ipcMain.handle('emails:deleteAllFromSender', (_, senderEmail) => {
  const db = getDb();
  db.prepare('UPDATE emails SET is_deleted = 1 WHERE sender_email = ? AND is_archived = 0 AND is_deleted = 0').run(senderEmail);
});

ipcMain.handle('emails:blockSender', async (_, id) => {
  const db = getDb();
  const email = db.prepare('SELECT * FROM emails WHERE id = ?').get(id);
  if (!email) return;

  const domain = email.sender_email?.split('@')[1];
  if (!domain) return;

  const pattern = `*@${domain}`;

  const existingRules = db.prepare('SELECT * FROM rules ORDER BY position').all();
  const maxPos = existingRules.reduce((m, r) => Math.max(m, r.position), -1);
  db.prepare('INSERT INTO rules (pattern, category, position) VALUES (?, ?, ?)').run(pattern, 'spam', maxPos + 1);

  // Bulk-archive existing emails from this domain
  const matchingEmails = db.prepare(
    "SELECT id, provider_id, account_id FROM emails WHERE sender_email LIKE ? AND is_archived = 0 AND is_deleted = 0"
  ).all(`%@${domain}`);

  if (matchingEmails.length > 0) {
    const updateStmt = db.prepare('UPDATE emails SET is_archived = 1, category = ? WHERE id = ?');
    const tx = db.transaction((emails) => {
      for (const e of emails) updateStmt.run('spam', e.id);
    });
    tx(matchingEmails);

    for (const e of matchingEmails) {
      const fullEmail = db.prepare('SELECT * FROM emails WHERE id = ?').get(e.id);
      const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(e.account_id);
      if (fullEmail && account) {
        try { await archiveEmail(fullEmail, account, getStore()); } catch {}
      }
    }
  }
});

// ─── IPC: Compose ─────────────────────────────────────────────────────────────

ipcMain.handle('compose:send', async (_, payload) => {
  const db = getDb();
  const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(payload.fromAccountId);
  if (!account) throw new Error('Account not found');
  await sendEmail(account, getStore(), payload);
});

ipcMain.handle('compose:reply', async (_, emailId, payload) => {
  const db = getDb();
  const email = db.prepare('SELECT * FROM emails WHERE id = ?').get(emailId);
  if (!email) throw new Error('Email not found');
  const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(payload.fromAccountId || email.account_id);
  if (!account) throw new Error('Account not found');
  await replyEmail(email, account, getStore(), payload);
});

ipcMain.handle('compose:forward', async (_, emailId, payload) => {
  const db = getDb();
  const email = db.prepare('SELECT * FROM emails WHERE id = ?').get(emailId);
  if (!email) throw new Error('Email not found');
  const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(payload.fromAccountId || email.account_id);
  if (!account) throw new Error('Account not found');
  await forwardEmail(email, account, getStore(), payload);
});

ipcMain.handle('compose:polish', async (_, text) => {
  const improvements = await rephrase(text);
  return improvements[0]?.text || text;
});

ipcMain.handle('deepl:rephrase', async (_, { text, opts }) => {
  try {
    const improvements = await rephrase(text, opts);
    return { ok: true, improvements };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// ─── IPC: Accounts ───────────────────────────────────────────────────────────

ipcMain.handle('accounts:list', () => {
  const db = getDb();
  const accounts = db.prepare('SELECT id, provider, email, display_name, color FROM accounts').all();
  const errors = getSyncErrors();
  return accounts.map(a => ({ ...a, syncError: errors[a.id] || null }));
});

ipcMain.handle('accounts:addGmail', async () => {
  const account = await startGmailOAuth(getStore());
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO accounts (id, provider, email, display_name, color, access_token, refresh_token, token_expiry)
    VALUES (@id, @provider, @email, @display_name, @color, @access_token, @refresh_token, @token_expiry)
  `).run(account);

  // Trigger initial sync for this account
  setTimeout(() => runSync(), 500);

  return { id: account.id, provider: account.provider, email: account.email, display_name: account.display_name, color: account.color };
});

ipcMain.handle('accounts:addOutlook', async () => {
  const account = await startOutlookOAuth(getStore());
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO accounts (id, provider, email, display_name, color, access_token, refresh_token, token_expiry)
    VALUES (@id, @provider, @email, @display_name, @color, @access_token, @refresh_token, @token_expiry)
  `).run(account);

  setTimeout(() => runSync(), 500);

  return { id: account.id, provider: account.provider, email: account.email, display_name: account.display_name, color: account.color };
});

ipcMain.handle('accounts:remove', (_, id) => {
  const db = getDb();
  db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
  getStore().delete(`accounts.${id}`);
});

ipcMain.handle('accounts:reconnect', async (_, id) => {
  const db = getDb();
  const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
  if (!account) throw new Error('Account not found');

  let newTokens;
  if (account.provider === 'gmail') {
    const { refreshGmailToken } = require('./oauth-gmail');
    newTokens = await refreshGmailToken(account, getStore());
  } else {
    const { refreshOutlookToken } = require('./oauth-outlook');
    newTokens = await refreshOutlookToken(account, getStore());
  }

  db.prepare('UPDATE accounts SET access_token = ?, token_expiry = ? WHERE id = ?')
    .run(newTokens.access_token, newTokens.token_expiry, id);
});

ipcMain.handle('accounts:getSyncErrors', () => getSyncErrors());

// ─── IPC: Rules ──────────────────────────────────────────────────────────────

ipcMain.handle('rules:list', () => {
  const db = getDb();
  return db.prepare('SELECT * FROM rules ORDER BY position').all();
});

ipcMain.handle('rules:add', (_, pattern, category) => {
  const db = getDb();
  const maxPos = db.prepare('SELECT MAX(position) as m FROM rules').get()?.m ?? -1;
  const result = db.prepare('INSERT INTO rules (pattern, category, position) VALUES (?, ?, ?)').run(pattern, category, maxPos + 1);

  // Backfill: retroactively categorize existing emails matching this pattern
  const allEmails = db.prepare('SELECT id, sender_email FROM emails WHERE is_deleted = 0').all();
  const matching = allEmails.filter(e => matchesRule(pattern, e.sender_email));
  if (matching.length > 0) {
    const updateStmt = db.prepare('UPDATE emails SET category = ? WHERE id = ?');
    const tx = db.transaction((rows) => { for (const e of rows) updateStmt.run(category, e.id); });
    tx(matching);
  }

  return db.prepare('SELECT * FROM rules WHERE id = ?').get(result.lastInsertRowid);
});

ipcMain.handle('rules:remove', (_, id) => {
  const db = getDb();
  db.prepare('DELETE FROM rules WHERE id = ?').run(id);
});

ipcMain.handle('rules:reorder', (_, ids) => {
  const db = getDb();
  const stmt = db.prepare('UPDATE rules SET position = ? WHERE id = ?');
  const tx = db.transaction((ids) => {
    ids.forEach((id, i) => stmt.run(i, id));
  });
  tx(ids);
});

// ─── IPC: Templates ──────────────────────────────────────────────────────────

ipcMain.handle('templates:list', () => {
  const db = getDb();
  return db.prepare('SELECT * FROM templates ORDER BY id').all();
});

ipcMain.handle('templates:add', (_, name, body) => {
  const db = getDb();
  const result = db.prepare('INSERT INTO templates (name, body) VALUES (?, ?)').run(name, body);
  return db.prepare('SELECT * FROM templates WHERE id = ?').get(result.lastInsertRowid);
});

ipcMain.handle('templates:remove', (_, id) => {
  const db = getDb();
  db.prepare('DELETE FROM templates WHERE id = ?').run(id);
});

// ─── IPC: Settings ───────────────────────────────────────────────────────────

ipcMain.handle('settings:getSyncFreq', () => getStore().get('settings.syncFreq', '5m'));

ipcMain.handle('settings:setSyncFreq', (_, v) => {
  getStore().set('settings.syncFreq', v);
  startSyncLoop();
});

ipcMain.handle('settings:getDeeplKey', () => getStore().get('settings.deeplKey', ''));

ipcMain.handle('settings:setDeeplKey', (_, key) => {
  getStore().set('settings.deeplKey', key);
});

ipcMain.handle('settings:getDbInfo', () => {
  const db = getDb();
  const pageCount = db.pragma('page_count')[0]?.page_count || 0;
  const pageSize = db.pragma('page_size')[0]?.page_size || 4096;
  const bytes = pageCount * pageSize;
  const mb = (bytes / 1024 / 1024).toFixed(1);
  return {
    dataPath: app.getPath('userData'),
    indexSize: `${mb} MB`,
    version: app.getVersion(),
  };
});

// Snooze wakeup: poll every minute to unsnooze expired items
setInterval(() => {
  try {
    const db = getDb();
    const now = Date.now();
    const expired = db.prepare(
      'SELECT id FROM emails WHERE snoozed_until IS NOT NULL AND snoozed_until < ?'
    ).all(now);
    if (expired.length > 0) {
      const stmt = db.prepare('UPDATE emails SET snoozed_until = NULL, is_read = 0 WHERE id = ?');
      const tx = db.transaction((rows) => { for (const r of rows) stmt.run(r.id); });
      tx(expired);
      if (mainWindow) {
        mainWindow.webContents.send('sync:tick', { results: [], timestamp: now });
      }
    }
  } catch {}
}, 60000);
