const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

function hashPassword(plain) {
  return bcrypt.hashSync(plain, 8);
}

function comparePassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'missing token' });
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'malformed token' });
  const payload = verifyToken(parts[1]);
  if (!payload) return res.status(401).json({ error: 'invalid token' });
  // attach user
  const user = db.prepare('SELECT id, email, name, role, company_id, manager_id, is_manager_approver FROM users WHERE id = ?').get(payload.id);
  if (!user) return res.status(401).json({ error: 'user not found' });
  req.user = user;
  next();
}

module.exports = { hashPassword, comparePassword, signToken, verifyToken, requireAuth, uuidv4 };
