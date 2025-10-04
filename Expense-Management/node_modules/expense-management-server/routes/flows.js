const express = require('express');
const db = require('../lib/db');
const { requireAuth, uuidv4 } = require('../lib/auth');

const router = express.Router();

// create a flow (admin only)
// body: { name, steps: [ { approver_id, role (optional), sequence } ], rules: { type: 'percentage'|'specific'|'hybrid', percent: 60, specific_approver_id }
router.post('/', requireAuth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'only admin' });
  const { name, steps = [], rules = null } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO approvers (id, company_id, name, role) VALUES (?, ?, ?, ?)').run(id, req.user.company_id, name || '', 'flow');

  // store steps in approval_steps template table? Simpler: reuse approvers table and a flow_steps table
  db.exec(`CREATE TABLE IF NOT EXISTS flow_steps (id TEXT PRIMARY KEY, flow_id TEXT, step_index INTEGER, approver_id TEXT, FOREIGN KEY(flow_id) REFERENCES approvers(id))`);

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const sid = uuidv4();
    db.prepare('INSERT INTO flow_steps (id, flow_id, step_index, approver_id) VALUES (?, ?, ?, ?)').run(sid, id, s.sequence || (i + 1), s.approver_id || null);
  }

  db.prepare('INSERT INTO approval_flows (id, company_id, approvers_meta) VALUES (?, ?, ?)').run(id, req.user.company_id, JSON.stringify({ rules }));

  res.status(201).json({ id, name });
});

// list flows
// list flows
router.get('/', requireAuth, (req, res) => {
  try {
    // approval flows are stored in approval_flows; some code stores names in approvers with same id
    const rows = db.prepare(`SELECT af.id, IFNULL(ap.name, af.id) as name, af.approvers_meta
      FROM approval_flows af
      LEFT JOIN approvers ap ON ap.id = af.id
      WHERE af.company_id = ?`).all(req.user.company_id);
    res.json(rows);
  } catch (e) {
    console.error('GET /api/flows error:', e && e.stack ? e.stack : e);
    res.status(500).json({ error: e && e.message ? e.message : String(e) });
  }
});

module.exports = router;
