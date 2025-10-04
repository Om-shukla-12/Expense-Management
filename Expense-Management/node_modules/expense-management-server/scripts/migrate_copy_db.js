const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dbDir, 'app.sqlite');
const tmpPath = path.join(dbDir, 'app.sqlite.copy');

try {
  if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
  fs.copyFileSync(dbPath, tmpPath);
  console.log('Copied DB to', tmpPath);
  const db = new Database(tmpPath);
  const cols = db.prepare("PRAGMA table_info('expenses')").all();
  if (!cols.some(c => c.name === 'title')) {
    db.prepare('ALTER TABLE expenses ADD COLUMN title TEXT').run();
    console.log('Added expenses.title to copy');
  } else {
    console.log('expenses.title already present in copy');
  }
  db.close();
  // replace original with copy (after backing up original)
  const bak = path.join(dbDir, 'app.sqlite.bak');
  if (fs.existsSync(bak)) fs.unlinkSync(bak);
  fs.renameSync(dbPath, bak);
  fs.renameSync(tmpPath, dbPath);
  console.log('Replaced original DB (backup at app.sqlite.bak)');
} catch (e) {
  console.error('Migration via copy failed:', e && e.message ? e.message : e);
  process.exitCode = 2;
}
