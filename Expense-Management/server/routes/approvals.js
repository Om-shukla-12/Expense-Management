const express = require('express');
const db = require('../lib/db');
const { requireAuth, uuidv4 } = require('../lib/auth');
const fetchFn = globalThis.fetch && globalThis.fetch.bind(globalThis);

const router = express.Router();

// list pending steps for current approver
router.get('/pending', requireAuth, async (req, res) => {
  const rows = db.prepare(`SELECT s.*, e.user_id, e.amount, e.currency, e.status as expense_status
    FROM approval_steps s JOIN expenses e ON s.expense_id = e.id
    WHERE s.approver_id = ? AND s.status = 'pending' ORDER BY s.step_index`).all(req.user.id);

  const company = db.prepare('SELECT currency FROM companies WHERE id = ?').get(req.user.company_id);
  const companyCurrency = company.currency;

  const promises = rows.map(async (row) => {
    if (row.currency === companyCurrency) {
        return { ...row, convertedAmount: row.amount, companyCurrency };
    }
    try {
        const response = await (fetchFn || fetch)(`https://api.exchangerate-api.com/v4/latest/${row.currency}`);
        const data = await response.json();
        const rate = data.rates[companyCurrency];
        const convertedAmount = row.amount * rate;
        return { ...row, convertedAmount, companyCurrency };
    } catch (error) {
        console.error('Failed to fetch exchange rate', error);
        return { ...row, convertedAmount: null, companyCurrency, conversionError: 'Failed to fetch exchange rate' };
    }
  });
  const results = await Promise.all(promises);
  res.json(results);
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
  // prefer explicit flow_id stored on expense
  const flowRow = expense.flow_id ? db.prepare('SELECT id, approvers_meta FROM approval_flows WHERE id = ?').get(expense.flow_id) : null;

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
  // compute how many steps are approved (including the one we just updated)
  const approvedCount = allSteps.filter(s => s.status === 'approved').length;
  // note: the current step was already updated to 'approved' above

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
