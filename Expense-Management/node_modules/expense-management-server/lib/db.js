const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
// prefer a migrated copy if it's present (created by migration helper) to avoid locked-file replace issues
const defaultDbPath = path.join(dataDir, 'app.sqlite');
const copyDbPath = path.join(dataDir, 'app.sqlite.copy');
const dbPath = process.env.DB_PATH || (fs.existsSync(copyDbPath) ? copyDbPath : defaultDbPath);
if (dbPath !== defaultDbPath) console.log('Using DB path:', dbPath);
const db = new Database(dbPath);

// Initialize schema
db.exec(`
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  currency TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role TEXT NOT NULL,
  password TEXT,
  manager_id TEXT,
  is_manager_approver INTEGER DEFAULT 0,
  FOREIGN KEY(company_id) REFERENCES companies(id),
  FOREIGN KEY(manager_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL,
  category TEXT,
  description TEXT,
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  flow_id TEXT,
  FOREIGN KEY(company_id) REFERENCES companies(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS approvers (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT,
  role TEXT,
  FOREIGN KEY(company_id) REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS approval_steps (
  id TEXT PRIMARY KEY,
  expense_id TEXT NOT NULL,
  step_index INTEGER NOT NULL,
  approver_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  decided_by TEXT,
  decided_at TEXT,
  comment TEXT,
  FOREIGN KEY(expense_id) REFERENCES expenses(id),
  FOREIGN KEY(approver_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS approval_flows (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  approvers_meta TEXT,
  name TEXT,
  FOREIGN KEY(company_id) REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS flow_steps (
  id TEXT PRIMARY KEY,
  flow_id TEXT NOT NULL,
  step_index INTEGER NOT NULL,
  approver_id TEXT,
  FOREIGN KEY(flow_id) REFERENCES approval_flows(id),
  FOREIGN KEY(approver_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY,
  expense_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  path TEXT NOT NULL,
  uploaded_at TEXT NOT NULL,
  FOREIGN KEY(expense_id) REFERENCES expenses(id)
);

`);

// lightweight migrations: add columns if DB was created before schema changes
(function runMigrations() {
  try {
    const afCols = db.prepare("PRAGMA table_info('approval_flows')").all();
    const afHasName = afCols.some(c => c.name === 'name');
    if (!afHasName) {
      try { db.prepare('ALTER TABLE approval_flows ADD COLUMN name TEXT').run(); console.log('Migrated: added approval_flows.name'); } catch (e) { console.warn('Could not add approval_flows.name:', e.message); }
    }

    const expCols = db.prepare("PRAGMA table_info('expenses')").all();
    const expHasFlow = expCols.some(c => c.name === 'flow_id');
    if (!expHasFlow) {
      try { db.prepare('ALTER TABLE expenses ADD COLUMN flow_id TEXT').run(); console.log('Migrated: added expenses.flow_id'); } catch (e) { console.warn('Could not add expenses.flow_id:', e.message); }
    }
    const expHasTitle = expCols.some(c => c.name === 'title');
    if (!expHasTitle) {
      try { db.prepare('ALTER TABLE expenses ADD COLUMN title TEXT').run(); console.log('Migrated: added expenses.title'); } catch (e) { console.warn('Could not add expenses.title:', e.message); }
    }
  } catch (e) {
    console.warn('Migration check failed:', e && e.message ? e.message : String(e));
  }
})()

module.exports = db;
