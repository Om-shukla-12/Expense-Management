const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '..', 'data', 'app.sqlite');
console.log('Opening DB:', dbPath);
const db = new Database(dbPath);
try {
  const cols = db.prepare("PRAGMA table_info('expenses')").all();
  if (!cols.some(c => c.name === 'title')) {
    db.prepare('ALTER TABLE expenses ADD COLUMN title TEXT').run();
    console.log('Added expenses.title column');
  } else {
    console.log('expenses.title already exists');
  }
} catch (e) {
  console.error('Failed to add column:', e && e.message ? e.message : e);
  process.exitCode = 2;
} finally {
  db.close();
}
