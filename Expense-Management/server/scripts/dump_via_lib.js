const db = require('../lib/db');
try {
  console.log('Using DB (via lib):');
  // try to derive filename from db object via a simple query
  try { const p = db.prepare("PRAGMA database_list").all(); console.log('Attached DBs:', p); } catch (e) {}
  const tables = ['users','companies','expenses','approval_steps','approval_flows','flow_steps','approvers','receipts'];
  const counts = {};
  for (const t of tables) {
    try { counts[t] = db.prepare(`SELECT COUNT(1) as c FROM ${t}`).get().c } catch (e) { counts[t] = 'ERR: '+e.message }
  }
  console.log('Table counts:', counts);

  console.log('\nRecent expenses (latest 10):');
  const exps = db.prepare('SELECT id, user_id, amount, currency, status, flow_id, created_at FROM expenses ORDER BY created_at DESC LIMIT 10').all();
  console.table(exps);

  console.log('\nApproval steps (all, latest 50):');
  const steps = db.prepare('SELECT s.id, s.expense_id, s.step_index, s.approver_id, s.status, s.decided_by, s.decided_at, s.comment, e.status as expense_status FROM approval_steps s LEFT JOIN expenses e ON s.expense_id = e.id ORDER BY s.rowid DESC LIMIT 50').all();
  console.table(steps);

  console.log('\nPending approval steps (for any approver):');
  const pending = db.prepare("SELECT s.id, s.expense_id, s.step_index, s.approver_id, s.status, e.amount, e.currency, e.status as expense_status FROM approval_steps s JOIN expenses e ON s.expense_id = e.id WHERE s.status = 'pending' ORDER BY s.rowid DESC").all();
  console.table(pending);

  console.log('\nUsers (latest 20):');
  const users = db.prepare('SELECT id, email, name, role, manager_id, is_manager_approver FROM users ORDER BY rowid DESC LIMIT 20').all();
  console.table(users);

} catch (e) {
  console.error('Dump failed:', e && e.stack ? e.stack : e);
} finally {
  try { db.close(); } catch (e) {}
}
