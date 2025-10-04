const db = require('../lib/db');
const email = process.argv[2];
if (!email) { console.error('Usage: node approve_pending_for_approver.js <approverEmail>'); process.exit(2); }
try {
  const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email);
  if (!user) { console.error('Approver not found:', email); process.exit(1); }
  const step = db.prepare("SELECT s.* FROM approval_steps s JOIN users u ON s.approver_id = u.id WHERE u.email = ? AND s.status = 'pending' ORDER BY s.rowid DESC LIMIT 1").get(email);
  if (!step) { console.log('No pending step found for', email); process.exit(0); }
  const decided_at = new Date().toISOString();
  db.prepare('UPDATE approval_steps SET status = ?, decided_by = ?, decided_at = ? WHERE id = ?').run('approved', user.id, decided_at, step.id);
  // check if any pending steps remain for same expense
  const remaining = db.prepare('SELECT COUNT(1) as c FROM approval_steps WHERE expense_id = ? AND status = ?').get(step.expense_id, 'pending');
  if (!remaining || remaining.c === 0) {
    db.prepare('UPDATE expenses SET status = ? WHERE id = ?').run('approved', step.expense_id);
    console.log('Expense', step.expense_id, 'marked approved');
  } else {
    console.log('There are', remaining.c, 'pending steps remaining for expense', step.expense_id);
  }
  console.log('Step', step.id, 'approved by', email);
} catch (e) { console.error('Error:', e && e.stack ? e.stack : e); process.exit(1); } finally { try { db.close(); } catch (e) {} }
