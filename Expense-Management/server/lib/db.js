const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'app.sqlite');
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

module.exports = db;
