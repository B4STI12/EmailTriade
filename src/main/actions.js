const { getValidToken } = require('./sync');

async function archiveEmail(email, account, store) {
  const token = await getValidToken(account, store);

  if (account.provider === 'gmail') {
    await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${email.provider_id}/modify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ removeLabelIds: ['INBOX'] }),
    });
  } else {
    const archiveFolderId = await getOutlookFolderId(token, 'Archive');
    if (archiveFolderId) {
      await fetch(`https://graph.microsoft.com/v1.0/me/messages/${email.provider_id}/move`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinationId: archiveFolderId }),
      });
    }
  }
}

async function deleteEmail(email, account, store) {
  const token = await getValidToken(account, store);

  if (account.provider === 'gmail') {
    await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${email.provider_id}/trash`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } else {
    await fetch(`https://graph.microsoft.com/v1.0/me/messages/${email.provider_id}/move`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ destinationId: 'deleteditems' }),
    });
  }
}

async function markReadEmail(email, account, store, read) {
  const token = await getValidToken(account, store);

  if (account.provider === 'gmail') {
    await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${email.provider_id}/modify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(read
        ? { removeLabelIds: ['UNREAD'] }
        : { addLabelIds: ['UNREAD'] }
      ),
    });
  } else {
    await fetch(`https://graph.microsoft.com/v1.0/me/messages/${email.provider_id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRead: read }),
    });
  }
}

async function sendEmail(account, store, payload) {
  const token = await getValidToken(account, store);
  const { to, subject, body, cc } = payload;

  if (account.provider === 'gmail') {
    const mime = buildMimeMessage({ from: account.email, to, cc, subject, body });
    const encoded = Buffer.from(mime).toString('base64url');
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: encoded }),
    });
    if (!res.ok) throw new Error(`Gmail send failed: ${await res.text()}`);
  } else {
    const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: 'Text', content: body },
          toRecipients: to.map(addr => ({ emailAddress: { address: addr } })),
          ccRecipients: (cc || []).map(addr => ({ emailAddress: { address: addr } })),
        },
      }),
    });
    if (!res.ok) throw new Error(`Outlook send failed: ${await res.text()}`);
  }
}

async function replyEmail(email, account, store, payload) {
  const token = await getValidToken(account, store);
  const { body, to } = payload;

  if (account.provider === 'gmail') {
    const threadId = email.provider_id;
    const mime = buildMimeMessage({
      from: account.email,
      to: to || [email.sender_email],
      subject: `Re: ${email.subject}`,
      body,
      inReplyTo: email.provider_id,
    });
    const encoded = Buffer.from(mime).toString('base64url');
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: encoded, threadId }),
    });
    if (!res.ok) throw new Error(`Gmail reply failed: ${await res.text()}`);
  } else {
    const res = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${email.provider_id}/reply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment: body }),
    });
    if (!res.ok) throw new Error(`Outlook reply failed: ${await res.text()}`);
  }
}

async function forwardEmail(email, account, store, payload) {
  const token = await getValidToken(account, store);
  const { body, to } = payload;

  if (account.provider === 'gmail') {
    const mime = buildMimeMessage({
      from: account.email,
      to,
      subject: `Fwd: ${email.subject}`,
      body: body + '\n\n---------- Forwarded message ----------\nFrom: ' + email.sender_email + '\nSubject: ' + email.subject + '\n\n' + email.body,
    });
    const encoded = Buffer.from(mime).toString('base64url');
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: encoded }),
    });
    if (!res.ok) throw new Error(`Gmail forward failed: ${await res.text()}`);
  } else {
    const res = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${email.provider_id}/forward`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comment: body,
        toRecipients: to.map(addr => ({ emailAddress: { address: addr } })),
      }),
    });
    if (!res.ok) throw new Error(`Outlook forward failed: ${await res.text()}`);
  }
}

function buildMimeMessage({ from, to, cc, subject, body, inReplyTo }) {
  const lines = [
    `From: ${from}`,
    `To: ${Array.isArray(to) ? to.join(', ') : to}`,
  ];
  if (cc && cc.length) lines.push(`Cc: ${cc.join(', ')}`);
  if (inReplyTo) lines.push(`In-Reply-To: ${inReplyTo}`);
  lines.push(`Subject: ${subject}`);
  lines.push('Content-Type: text/plain; charset=UTF-8');
  lines.push('MIME-Version: 1.0');
  lines.push('');
  lines.push(body);
  return lines.join('\r\n');
}

async function getOutlookFolderId(token, folderName) {
  try {
    const res = await fetch(`https://graph.microsoft.com/v1.0/me/mailFolders?$filter=displayName eq '${folderName}'`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return data.value?.[0]?.id || null;
  } catch {
    return null;
  }
}

module.exports = { archiveEmail, deleteEmail, markReadEmail, sendEmail, replyEmail, forwardEmail };
