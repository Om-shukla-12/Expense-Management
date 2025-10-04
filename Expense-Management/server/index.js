const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const expensesRouter = require('./routes/expenses');
const approvalsRouter = require('./routes/approvals');
const flowsRouter = require('./routes/flows');
const receiptsRouter = require('./routes/receipts');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/approvals', approvalsRouter);
app.use('/api/flows', flowsRouter);
app.use('/api/receipts', receiptsRouter);

// serve uploads
app.use('/uploads', express.static(__dirname + '/data/uploads'));

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));

