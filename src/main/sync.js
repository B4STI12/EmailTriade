const { v4: uuidv4 } = require('uuid');
const { refreshGmailToken } = require('./oauth-gmail');
const { refreshOutlookToken } = require('./oauth-outlook');

const SYNC_ERRORS = new Map(); // accountId → error message

function getSyncErrors() {
  return Object.fromEntries(SYNC_ERRORS);
}

async function getValidToken(account, store) {
  const stored = store.get(`accounts.${account.id}`, {});
  const expiry = stored.expiry || account.token_expiry;

  if (expiry - Date.now() > 60000) {
    return stored.access || account.access_token;
  }

  try {
    if (account.provider === 'gmail') {
      const refreshed = await refreshGmailToken(account, store);
      return refreshed.access_token;
    } else {
      const refreshed = await refreshOutlookToken(account, store);
      return refreshed.access_token;
    }
  } catch (err) {
    SYNC_ERRORS.set(account.id, err.message);
    throw err;
  }
}

function applyRules(rules, email) {
  for (const rule of rules) {
    if (matchesRule(rule.pattern, email.sender_email)) {
      return rule.category;
    }
  }
  return 'other';
}

function matchesRule(pattern, senderEmail) {
  if (!senderEmail) return false;
  const email = senderEmail.toLowerCase();
  const pat = pattern.toLowerCase();

  if (pat.startsWith('*@')) {
    return email.endsWith(pat.slice(1));
  }
  if (pat.endsWith('@*')) {
    return email.startsWith(pat.slice(0, -1));
  }
  if (pat.includes('*')) {
    const escaped = pat.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp(`^${escaped}$`).test(email);
  }
  return email === pat;
}

async function syncGmail(account, db, store, rules, onNewImportant) {
  try {
    const token = await getValidToken(account, store);

    const [inboxRes, sentRes] = await Promise.all([
      fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=newer_than%3A7d&maxResults=100`,
        { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=SENT&maxResults=50`,
        { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    if (!inboxRes.ok) {
      const err = await inboxRes.text();
      throw new Error(`Gmail list failed: ${err}`);
    }

    const inboxData = await inboxRes.json();
    const sentData = sentRes.ok ? await sentRes.json() : { messages: [] };

    const seen = new Set();
    const messages = [];
    for (const msg of [...(inboxData.messages || []), ...(sentData.messages || [])]) {
      if (!seen.has(msg.id)) { seen.add(msg.id); messages.push(msg); }
    }

    const existingCheck = db.prepare('SELECT provider_id FROM emails WHERE account_id = ? AND provider_id = ?');
    const insertEmail = db.prepare(`
      INSERT OR IGNORE INTO emails
        (id, account_id, provider_id, subject, sender_name, sender_email,
         recipient, body, date, is_read, is_sent, category, has_attachment, list_unsubscribe_header)
      VALUES
        (@id, @account_id, @provider_id, @subject, @sender_name, @sender_email,
         @recipient, @body, @date, @is_read, @is_sent, @category, @has_attachment, @list_unsubscribe_header)
    `);

    const insertMany = db.transaction((emails) => {
      for (const e of emails) insertEmail.run(e);
    });

    const newEmails = [];
    const batchSize = 10;

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      await Promise.all(batch.map(async (msg) => {
        try {
          const existing = existingCheck.get(account.id, msg.id);
          if (existing) return;

          const msgRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (!msgRes.ok) return;
          const msgData = await msgRes.json();

          const parsed = parseGmailMessage(msgData, account.id, rules);
          newEmails.push(parsed);
        } catch (e) {
          console.error('Error fetching Gmail message:', e);
        }
      }));
    }

    if (newEmails.length > 0) {
      insertMany(newEmails);
      for (const email of newEmails) {
        if (email.category === 'important' && onNewImportant) {
          onNewImportant(email);
        }
      }
    }

    SYNC_ERRORS.delete(account.id);
    return { synced: newEmails.length };
  } catch (err) {
    SYNC_ERRORS.set(account.id, err.message);
    throw err;
  }
}

function parseGmailMessage(msg, accountId, rules) {
  const headers = msg.payload?.headers || [];
  const get = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

  const subject = get('Subject');
  const from = get('From');
  const to = get('To');
  const dateStr = get('Date');
  const listUnsub = get('List-Unsubscribe');

  const senderMatch = from.match(/^(?:"?([^"<]+)"?\s*)?<?([^>]+)>?$/);
  const senderName = senderMatch?.[1]?.trim() || from;
  const senderEmail = senderMatch?.[2]?.trim() || from;

  const date = dateStr ? new Date(dateStr).getTime() : Date.now();
  const isRead = !msg.labelIds?.includes('UNREAD') ? 1 : 0;
  const isSent = msg.labelIds?.includes('SENT') ? 1 : 0;
  const hasAttachment = (msg.payload?.parts || []).some(p => p.filename) ? 1 : 0;

  const body = extractGmailBody(msg.payload);
  const category = applyRules(rules, { sender_email: senderEmail, subject });

  return {
    id: uuidv4(),
    account_id: accountId,
    provider_id: msg.id,
    subject,
    sender_name: senderName,
    sender_email: senderEmail,
    recipient: to,
    body,
    date,
    is_read: isRead,
    is_sent: isSent,
    category,
    has_attachment: hasAttachment,
    list_unsubscribe_header: listUnsub || null,
  };
}

function extractGmailBody(payload) {
  if (!payload) return '';

  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64url').toString('utf8');
  }

  const parts = payload.parts || [];
  const textPlain = parts.find(p => p.mimeType === 'text/plain');
  if (textPlain?.body?.data) {
    return Buffer.from(textPlain.body.data, 'base64url').toString('utf8');
  }

  for (const part of parts) {
    const nested = extractGmailBody(part);
    if (nested) return nested;
  }

  return '';
}

async function syncOutlook(account, db, store, rules, onNewImportant) {
  try {
    const token = await getValidToken(account, store);

    const res = await fetch(
      'https://graph.microsoft.com/v1.0/me/messages?$top=100&$orderby=receivedDateTime%20desc&$select=id,subject,from,toRecipients,body,receivedDateTime,isRead,hasAttachments,internetMessageHeaders',
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Outlook list failed: ${err}`);
    }

    const data = await res.json();
    const messages = data.value || [];

    const existingCheck = db.prepare('SELECT provider_id FROM emails WHERE account_id = ? AND provider_id = ?');
    const insertEmail = db.prepare(`
      INSERT OR IGNORE INTO emails
        (id, account_id, provider_id, subject, sender_name, sender_email,
         recipient, body, date, is_read, category, has_attachment, list_unsubscribe_header)
      VALUES
        (@id, @account_id, @provider_id, @subject, @sender_name, @sender_email,
         @recipient, @body, @date, @is_read, @category, @has_attachment, @list_unsubscribe_header)
    `);

    const insertMany = db.transaction((emails) => {
      for (const e of emails) insertEmail.run(e);
    });

    const newEmails = [];

    for (const msg of messages) {
      const existing = existingCheck.get(account.id, msg.id);
      if (existing) continue;

      const senderName = msg.from?.emailAddress?.name || '';
      const senderEmail = msg.from?.emailAddress?.address || '';
      const recipient = msg.toRecipients?.[0]?.emailAddress?.address || '';
      const body = msg.body?.content || '';
      const date = new Date(msg.receivedDateTime).getTime();
      const isRead = msg.isRead ? 1 : 0;
      const hasAttachment = msg.hasAttachments ? 1 : 0;

      const headers = msg.internetMessageHeaders || [];
      const listUnsub = headers.find(h => h.name.toLowerCase() === 'list-unsubscribe')?.value || null;

      const category = applyRules(rules, { sender_email: senderEmail, subject: msg.subject });

      const email = {
        id: uuidv4(),
        account_id: account.id,
        provider_id: msg.id,
        subject: msg.subject || '',
        sender_name: senderName,
        sender_email: senderEmail,
        recipient,
        body: body.replace(/<[^>]*>/g, '').trim(),
        date,
        is_read: isRead,
        category,
        has_attachment: hasAttachment,
        list_unsubscribe_header: listUnsub,
      };

      newEmails.push(email);
    }

    if (newEmails.length > 0) {
      insertMany(newEmails);
      for (const email of newEmails) {
        if (email.category === 'important' && onNewImportant) {
          onNewImportant(email);
        }
      }
    }

    SYNC_ERRORS.delete(account.id);
    return { synced: newEmails.length };
  } catch (err) {
    SYNC_ERRORS.set(account.id, err.message);
    throw err;
  }
}

module.exports = { syncGmail, syncOutlook, applyRules, matchesRule, getSyncErrors, getValidToken };
