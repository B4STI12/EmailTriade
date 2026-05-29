const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let _db = null;

function getDb() {
  if (_db) return _db;

  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'mailtriage.db');

  _db = new Database(dbPath);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  _db.exec(schema);

  try { _db.exec("ALTER TABLE emails ADD COLUMN is_sent INTEGER NOT NULL DEFAULT 0"); } catch {}
  try { _db.exec("ALTER TABLE emails ADD COLUMN is_kept INTEGER NOT NULL DEFAULT 0"); } catch {}

  return _db;
}

module.exports = { getDb };
