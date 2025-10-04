const express = require('express');
const db = require('../lib/db');
const { requireAuth, uuidv4 } = require('../lib/auth');

const router = express.Router();

// list expenses for current user (employee) or company (admin/manager)
router.get('/', requireAuth, (req, res) => {
  try {
    if (req.user.role === 'employee') {
      const rows = db.prepare('SELECT * FROM expenses WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
      return res.json(rows);
    }
    const rows = db.prepare('SELECT * FROM expenses WHERE company_id = ? ORDER BY created_at DESC').all(req.user.company_id);
    res.json(rows);
  } catch (e) {
    console.error('GET /api/expenses error:', e && e.stack ? e.stack : e);
    res.status(500).json({ error: e && e.message ? e.message : String(e) });
  }
});

// submit expense
router.post('/', requireAuth, (req, res) => {
  try {
    if (req.user.role !== 'employee' && req.user.role !== 'admin' && req.user.role !== 'manager') return res.status(403).json({ error: 'not allowed' });
  const { amount, currency = 'USD', category = '', description = '', date, flow_id = null } = req.body;
    if (!amount || !date) return res.status(400).json({ error: 'amount and date required' });
    const id = uuidv4();
    const created_at = new Date().toISOString();
    db.prepare('INSERT INTO expenses (id, company_id, user_id, amount, currency, category, description, date, status, created_at, flow_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, req.user.company_id, req.user.id, amount, currency, category, description, date, 'pending', created_at, flow_id);

  // create approval steps based on provided flow_id or default manager approver
  if (flow_id) {
      // load flow steps
      const steps = db.prepare('SELECT * FROM flow_steps WHERE flow_id = ? ORDER BY step_index').all(flow_id);
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        const stepId = uuidv4();
        const idx = typeof s.step_index === 'number' ? s.step_index : (i + 1);
        db.prepare('INSERT INTO approval_steps (id, expense_id, step_index, approver_id, status) VALUES (?, ?, ?, ?, ?)')
          .run(stepId, id, idx, s.approver_id || null, 'pending');
      }
    } else {
      // create initial approval step: manager if exists and is_manager_approver
      if (req.user.manager_id) {
        const manager = db.prepare('SELECT id, is_manager_approver FROM users WHERE id = ?').get(req.user.manager_id);
        if (manager && manager.is_manager_approver) {
          const stepId = uuidv4();
          db.prepare('INSERT INTO approval_steps (id, expense_id, step_index, approver_id, status) VALUES (?, ?, ?, ?, ?)')
            .run(stepId, id, 1, manager.id, 'pending');
        }
      }
    }

    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    res.status(201).json(expense);
  } catch (e) {
    console.error('POST /api/expenses error:', e && e.stack ? e.stack : e);
    res.status(500).json({ error: e && e.message ? e.message : String(e) });
  }
});

// get single expense
router.get('/:id', requireAuth, (req, res) => {
  try {
    const id = req.params.id;
    const row = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ error: 'not found' });
    res.json(row);
  } catch (e) {
    console.error('GET /api/expenses/:id error:', e && e.stack ? e.stack : e);
    res.status(500).json({ error: e && e.message ? e.message : String(e) });
  }
});

module.exports = router;
