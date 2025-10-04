const express = require('express');
const db = require('../lib/db');
const { requireAuth, uuidv4, hashPassword } = require('../lib/auth');

const router = express.Router();

// list users in company (admin/manager)
router.get('/', requireAuth, (req, res) => {
  try {
    const rows = db.prepare('SELECT id, email, name, role, manager_id, is_manager_approver FROM users WHERE company_id = ?').all(req.user.company_id);
    res.json(rows);
  } catch (e) {
    console.error('GET /api/users error:', e && e.stack ? e.stack : e);
    res.status(500).json({ error: e && e.message ? e.message : String(e) });
  }
});

// create user (admin only)
router.post('/', requireAuth, (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'only admin' });
    const { email, name, role = 'employee', manager_id, password } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });

    // duplicate email check
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (exists) return res.status(409).json({ error: 'email already exists' });

    const id = uuidv4();
    // if password not provided, generate a random one and return it to the admin
    const crypto = require('crypto');
    let plainPassword = password;
    if (!plainPassword) {
      plainPassword = crypto.randomBytes(6).toString('hex'); // 12-char hex
    }
    const pw = plainPassword ? hashPassword(plainPassword) : null;

    db.prepare('INSERT INTO users (id, company_id, email, name, role, manager_id, password) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, req.user.company_id, email, name || '', role, manager_id || null, pw);

    const resp = { id, email, name, role, manager_id };
    if (!password) resp.generatedPassword = plainPassword;
    res.status(201).json(resp);
  } catch (e) {
    console.error('POST /api/users error:', e && e.stack ? e.stack : e);
    res.status(500).json({ error: e && e.message ? e.message : String(e) });
  }
});

// update user role/manager
router.put('/:id', requireAuth, (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'only admin' });
    const id = req.params.id;
    const { role, manager_id, is_manager_approver } = req.body;
    db.prepare('UPDATE users SET role = COALESCE(?, role), manager_id = COALESCE(?, manager_id), is_manager_approver = COALESCE(?, is_manager_approver) WHERE id = ? AND company_id = ?')
      .run(role, manager_id, is_manager_approver != null ? (is_manager_approver ? 1 : 0) : null, id, req.user.company_id);
    const row = db.prepare('SELECT id, email, name, role, manager_id, is_manager_approver FROM users WHERE id = ?').get(id);
    res.json(row);
  } catch (e) {
    console.error('PUT /api/users/:id error:', e && e.stack ? e.stack : e);
    res.status(500).json({ error: e && e.message ? e.message : String(e) });
  }
});

module.exports = router;
