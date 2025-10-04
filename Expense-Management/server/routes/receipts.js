const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../lib/db');
const { requireAuth, uuidv4 } = require('../lib/auth');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'data', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const name = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, name);
  }
});

const upload = multer({ storage });

// upload receipt for an expense
router.post('/:id', requireAuth, upload.single('receipt'), (req, res) => {
  const expenseId = req.params.id;
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'no file' });
  const id = uuidv4();
  const uploaded_at = new Date().toISOString();
  db.prepare('INSERT INTO receipts (id, expense_id, filename, path, uploaded_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, expenseId, file.originalname, file.filename, uploaded_at);
  res.json({ id, expenseId, filename: file.originalname, stored: file.filename });
});

// list receipts for an expense
router.get('/expense/:id', requireAuth, (req, res) => {
  try {
    const expenseId = req.params.id;
    const rows = db.prepare('SELECT id, filename, path, uploaded_at FROM receipts WHERE expense_id = ?').all(expenseId);
    // build public URL for each
    const result = rows.map(r => ({ id: r.id, filename: r.filename, url: `/uploads/${r.path}`, uploaded_at: r.uploaded_at }));
    res.json(result);
  } catch (e) {
    console.error('GET /api/receipts/expense/:id error', e && e.stack ? e.stack : e);
    res.status(500).json({ error: e && e.message ? e.message : String(e) });
  }
});

module.exports = router;
