CREATE TABLE IF NOT EXISTS accounts (
  id            TEXT PRIMARY KEY,
  provider      TEXT NOT NULL CHECK(provider IN ('gmail','outlook')),
  email         TEXT NOT NULL,
  display_name  TEXT,
  color         TEXT NOT NULL,
  access_token  TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS emails (
  id                      TEXT PRIMARY KEY,
  account_id              TEXT NOT NULL REFERENCES accounts(id),
  provider_id             TEXT NOT NULL,
  subject                 TEXT,
  sender_name             TEXT,
  sender_email            TEXT,
  recipient               TEXT,
  body                    TEXT,
  date                    INTEGER NOT NULL,
  is_read                 INTEGER NOT NULL DEFAULT 0,
  is_starred              INTEGER NOT NULL DEFAULT 0,
  is_archived             INTEGER NOT NULL DEFAULT 0,
  is_deleted              INTEGER NOT NULL DEFAULT 0,
  category                TEXT NOT NULL DEFAULT 'other',
  snoozed_until           INTEGER,
  has_attachment          INTEGER NOT NULL DEFAULT 0,
  list_unsubscribe_header TEXT,
  UNIQUE(account_id, provider_id)
);

CREATE INDEX IF NOT EXISTS emails_inbox_idx ON emails(date DESC)
  WHERE is_archived = 0 AND is_deleted = 0;

CREATE TABLE IF NOT EXISTS rules (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern  TEXT NOT NULL,
  category TEXT NOT NULL,
  position INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS templates (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  body TEXT NOT NULL
);

CREATE VIRTUAL TABLE IF NOT EXISTS emails_fts USING fts5(
  subject, sender_name, sender_email, body,
  content='emails', content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS emails_ai AFTER INSERT ON emails BEGIN
  INSERT INTO emails_fts(rowid, subject, sender_name, sender_email, body)
  VALUES (new.rowid, new.subject, new.sender_name, new.sender_email, new.body);
END;

CREATE TRIGGER IF NOT EXISTS emails_ad AFTER DELETE ON emails BEGIN
  INSERT INTO emails_fts(emails_fts, rowid, subject, sender_name, sender_email, body)
  VALUES('delete', old.rowid, old.subject, old.sender_name, old.sender_email, old.body);
END;

CREATE TRIGGER IF NOT EXISTS emails_au AFTER UPDATE ON emails BEGIN
  INSERT INTO emails_fts(emails_fts, rowid, subject, sender_name, sender_email, body)
  VALUES('delete', old.rowid, old.subject, old.sender_name, old.sender_email, old.body);
  INSERT INTO emails_fts(rowid, subject, sender_name, sender_email, body)
  VALUES (new.rowid, new.subject, new.sender_name, new.sender_email, new.body);
END;
