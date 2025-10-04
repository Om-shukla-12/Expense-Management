const express = require('express');
const db = require('../lib/db');
const { requireAuth, uuidv4 } = require('../lib/auth');

const router = express.Router();

// list pending steps for current approver
router.get('/pending', requireAuth, (req, res) => {
  const rows = db.prepare(`SELECT s.*, e.user_id, e.amount, e.currency, e.status as expense_status
    FROM approval_steps s JOIN expenses e ON s.expense_id = e.id
    WHERE s.approver_id = ? AND s.status = 'pending' ORDER BY s.step_index`).all(req.user.id);
  res.json(rows);
});

// approve/reject a step
router.post('/:stepId/decide', requireAuth, (req, res) => {
  const { stepId } = req.params;
  const { action, comment } = req.body; // action = 'approve' | 'reject'
  const step = db.prepare('SELECT * FROM approval_steps WHERE id = ?').get(stepId);
  if (!step) return res.status(404).json({ error: 'step not found' });
  if (step.approver_id !== req.user.id) return res.status(403).json({ error: 'not your step' });
  if (step.status !== 'pending') return res.status(400).json({ error: 'already decided' });

  const decided_at = new Date().toISOString();
  const status = action === 'approve' ? 'approved' : 'rejected';
  db.prepare('UPDATE approval_steps SET status = ?, decided_by = ?, decided_at = ?, comment = ? WHERE id = ?')
    .run(status, req.user.id, decided_at, comment || '', stepId);

  const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(step.expense_id);
  // if rejected -> mark expense rejected
  if (status === 'rejected') {
    db.prepare('UPDATE expenses SET status = ? WHERE id = ?').run('rejected', expense.id);
    return res.json({ ok: true, expense: { ...expense, status: 'rejected' } });
  }

  // approved: find next pending step
  // approved: evaluate conditional rules if a flow is attached
  const flowRow = db.prepare('SELECT af.id, af.approvers_meta FROM approval_flows af JOIN approvers a ON af.id = a.id JOIN expenses e ON e.company_id = af.company_id WHERE e.id = ?').get(expense.id);

  // helper to finalize approval when no more steps
  function finalizeApproved() {
    db.prepare('UPDATE expenses SET status = ? WHERE id = ?').run('approved', expense.id);
    return res.json({ ok: true, expense: { ...expense, status: 'approved' } });
  }

  // if there's an attached flow, evaluate rules
  if (flowRow) {
    let meta = null;
    try { meta = JSON.parse(flowRow.approvers_meta); } catch (e) { meta = null; }
    // compute all steps and their statuses
    const allSteps = db.prepare('SELECT * FROM approval_steps WHERE expense_id = ? ORDER BY step_index').all(expense.id);
    const total = allSteps.length;
    const approvedCount = allSteps.filter(s => s.status === 'approved').length + 1; // include current approved

    // specific approver rule check
    if (meta && meta.rules && (meta.rules.type === 'specific' || meta.rules.type === 'hybrid')) {
      const specificId = meta.rules.specific_approver_id;
      if (specificId) {
        // check if specific approver already approved
        const specApproved = db.prepare('SELECT COUNT(1) as c FROM approval_steps WHERE expense_id = ? AND approver_id = ? AND status = ?').get(expense.id, specificId, 'approved');
        if (specApproved && specApproved.c > 0) return finalizeApproved();
      }
    }

    // percentage rule
    if (meta && meta.rules && (meta.rules.type === 'percentage' || meta.rules.type === 'hybrid')) {
      const percent = meta.rules.percent || 60;
      const pct = (approvedCount / total) * 100;
      if (pct >= percent) return finalizeApproved();
    }

    // otherwise move to next pending step only if it exists
    const next = db.prepare('SELECT * FROM approval_steps WHERE expense_id = ? AND status = ? ORDER BY step_index LIMIT 1').get(expense.id, 'pending');
    if (!next) return finalizeApproved();
    return res.json({ ok: true, nextStepId: next.id });
  }

  // no flow attached: carry on with sequential steps
  const next = db.prepare('SELECT * FROM approval_steps WHERE expense_id = ? AND status = ? ORDER BY step_index LIMIT 1').get(expense.id, 'pending');
  if (!next) return finalizeApproved();
  res.json({ ok: true, nextStepId: next.id });
});

module.exports = router;
