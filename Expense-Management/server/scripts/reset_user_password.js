const db = require('../lib/db');
const { hashPassword } = require('../lib/auth');

const email = process.argv[2];
const newPass = process.argv[3] || 'TestPass123!';
if (!email) {
  console.error('Usage: node reset_user_password.js <email> [newPassword]');
  process.exit(2);
}
try {
  const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email);
  if (!user) {
    console.error('User not found:', email);
    process.exit(1);
  }
  const hashed = hashPassword(newPass);
  db.prepare('UPDATE users SET password = ? WHERE email = ?').run(hashed, email);
  console.log('Password updated for', email, 'to', newPass);
} catch (e) {
  console.error('Failed to update password:', e && e.stack ? e.stack : e);
  process.exit(1);
} finally {
  try { db.close(); } catch (e) {}
}
