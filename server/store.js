import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// A single-process SQLite store. Each document is private to its named collection.
export function openStore(filename) {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS documents (
      collection TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL,
      PRIMARY KEY(collection,id));`);
  const read = db.prepare('SELECT data FROM documents WHERE collection=? AND id=?');
  const list = db.prepare('SELECT data FROM documents WHERE collection=? ORDER BY rowid');
  const put = db.prepare('INSERT INTO documents VALUES (?,?,?) ON CONFLICT(collection,id) DO UPDATE SET data=excluded.data');
  return {
    get: (collection, id) => { const row = read.get(collection, id); return row ? JSON.parse(row.data) : null; },
    all: collection => list.all(collection).map(row => JSON.parse(row.data)),
    put: (collection, value) => { put.run(collection, value._id, JSON.stringify(value)); return value; },
    remove: (collection, id) => db.prepare('DELETE FROM documents WHERE collection=? AND id=?').run(collection, id),
    transaction(fn) {
      db.exec('BEGIN IMMEDIATE');
      try { const result = fn(); db.exec('COMMIT'); return result; }
      catch (error) { db.exec('ROLLBACK'); throw error; }
    },
    close: () => db.close(),
  };
}
