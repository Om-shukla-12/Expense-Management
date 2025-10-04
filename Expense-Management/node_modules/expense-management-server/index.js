const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const expensesRouter = require('./routes/expenses');
const approvalsRouter = require('./routes/approvals');
const flowsRouter = require('./routes/flows');
const receiptsRouter = require('./routes/receipts');
const ocrRouter = require('./routes/ocr');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const db = require('./lib/db');

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/approvals', approvalsRouter);
app.use('/api/flows', flowsRouter);
app.get('/api/debug', (req, res) => {
	try {
		const tables = ['users','companies','expenses','approval_steps','approval_flows','flow_steps','approvers','receipts'];
		const counts = {};
		for (const t of tables) {
			try { counts[t] = db.prepare(`SELECT COUNT(1) as c FROM ${t}`).get().c } catch (e) { counts[t] = `ERR: ${e.message}` }
		}
		res.json({ ok: true, counts });
	} catch (e) {
		res.status(500).json({ error: e && e.message ? e.message : String(e) });
	}
});
app.use('/api/receipts', receiptsRouter);
app.use('/api/ocr', ocrRouter);

// serve uploads
app.use('/uploads', express.static(__dirname + '/data/uploads'));

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));

