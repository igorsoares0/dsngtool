"use strict";

// SQLite persistence for the desktop build — the main-process half of the
// ProjectRepo contract defined in ../app/lib/project-repo.ts.
//
// Uses node:sqlite, which ships inside Electron's bundled Node (24.19 as of
// Electron 44). That is the whole reason for the choice: better-sqlite3 and
// sqlite3 are native modules and would need @electron/rebuild against Electron's
// headers on every version bump, which is exactly the kind of build-chain rot
// that makes universal macOS/Windows packaging painful.

const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");

// The document (pages + format) is stored as JSON in a column rather than
// normalised into element rows, on purpose. The editor loads a whole project
// into Zustand and never queries an individual element, so normalising would buy
// nothing and cost a schema migration every time app/types/editor.ts gains a
// field — which is a file that changes often. Metadata (name, timestamps) does
// get real columns, so listing projects doesn't have to parse every document.
const MIGRATIONS = [
  // v1 — initial schema.
  (db) => {
    db.exec(`
      CREATE TABLE projects (
        id         TEXT    PRIMARY KEY,
        name       TEXT    NOT NULL,
        format     TEXT    NOT NULL,  -- JSON
        pages      TEXT    NOT NULL,  -- JSON
        created_at INTEGER NOT NULL,  -- epoch ms
        updated_at INTEGER NOT NULL,  -- epoch ms
        dirty      INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX projects_updated_at ON projects (updated_at DESC);

      CREATE TABLE settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL  -- JSON
      );
    `);
  },
];

let db = null;

/**
 * Open the database and bring it up to the current schema version.
 *
 * Versioning is `PRAGMA user_version` against the MIGRATIONS array — the same
 * job Dexie's `.version(n)` chain does for the browser build. Each migration
 * runs inside a transaction so a crash mid-upgrade can't leave a half-migrated
 * file behind.
 */
function open(userDataDir) {
  const file = path.join(userDataDir, "modo.db");
  db = new DatabaseSync(file);

  // WAL is what makes the 3-second autosave loop safe: a reader never blocks on
  // the writer, and a power cut can't tear a half-written document.
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  // NORMAL is the documented companion to WAL — durable across app crashes,
  // and only at risk in an OS-level power loss, which is the right trade for an
  // autosave that fires every few seconds.
  db.exec("PRAGMA synchronous = NORMAL");

  const current = db.prepare("PRAGMA user_version").get().user_version;
  for (let v = current; v < MIGRATIONS.length; v++) {
    db.exec("BEGIN");
    try {
      MIGRATIONS[v](db);
      // Not a bound parameter: PRAGMA does not accept one. `v` is a loop index
      // over a literal array, never user input.
      db.exec(`PRAGMA user_version = ${v + 1}`);
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  }

  return file;
}

// Timestamps cross the IPC boundary as epoch ms and are rebuilt into Date
// objects on the renderer side (project-repo-sqlite.ts). Structured clone would
// carry a Date through, but keeping the wire format primitive means the
// contract is explicit and doesn't depend on that.
function toRecord(row) {
  return {
    id: row.id,
    name: row.name,
    pages: JSON.parse(row.pages),
    format: JSON.parse(row.format),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    dirty: row.dirty === 1,
  };
}

const repo = {
  get(id) {
    const row = db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
    return row ? toRecord(row) : undefined;
  },

  list() {
    return db
      .prepare("SELECT * FROM projects ORDER BY updated_at DESC")
      .all()
      .map(toRecord);
  },

  latest() {
    const row = db
      .prepare("SELECT * FROM projects ORDER BY updated_at DESC LIMIT 1")
      .get();
    return row ? toRecord(row) : undefined;
  },

  count() {
    return db.prepare("SELECT COUNT(*) AS n FROM projects").get().n;
  },

  /**
   * Write the editor's state, preserving createdAt and stamping updatedAt.
   *
   * One statement, so it is atomic by construction: ON CONFLICT simply leaves
   * created_at alone, which removes the read-modify-write the Dexie
   * implementation has to perform. That matters more here — over IPC a
   * read-then-write would be two round-trips with a race in between.
   */
  save(input) {
    const now = Date.now();
    const row = db
      .prepare(
        `INSERT INTO projects (id, name, format, pages, created_at, updated_at, dirty)
         VALUES (?, ?, ?, ?, ?, ?, 0)
         ON CONFLICT(id) DO UPDATE SET
           name       = excluded.name,
           format     = excluded.format,
           pages      = excluded.pages,
           updated_at = excluded.updated_at,
           dirty      = 0
         RETURNING *`
      )
      .get(
        input.id,
        input.name,
        JSON.stringify(input.format),
        JSON.stringify(input.pages),
        now,
        now
      );
    return toRecord(row);
  },

  /** Write a complete record verbatim, timestamps and dirty flag included. */
  put(project) {
    db.prepare(
      `INSERT OR REPLACE INTO projects
         (id, name, format, pages, created_at, updated_at, dirty)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      project.id,
      project.name,
      JSON.stringify(project.format),
      JSON.stringify(project.pages),
      project.createdAt,
      project.updatedAt,
      project.dirty ? 1 : 0
    );
  },

  delete(id) {
    db.prepare("DELETE FROM projects WHERE id = ?").run(id);
  },

  clear() {
    db.prepare("DELETE FROM projects").run();
  },

  getSetting(key) {
    const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
    return row ? JSON.parse(row.value) : undefined;
  },

  setSetting(key, value) {
    db.prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    ).run(key, JSON.stringify(value));
  },

  clearSettings() {
    db.prepare("DELETE FROM settings").run();
  },
};

function close() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { open, close, repo };
