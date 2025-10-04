const express = require('express');
const db = require('../lib/db');
const { hashPassword, comparePassword, signToken, uuidv4 } = require('../lib/auth');

// prefer global fetch (Node 18+); fallback to dynamic import
let fetchFn = globalThis.fetch && globalThis.fetch.bind(globalThis);
async function safeFetch(url, opts) {
  if (fetchFn) return fetchFn(url, opts);
  const mod = await import('node-fetch');
  fetchFn = mod.default || mod;
  return fetchFn(url, opts);
}

const router = express.Router();

// Signup: create company + admin user on first signup
router.post('/signup', async (req, res) => {
  try {
    const { companyName, email, password, name, country } = req.body;
    if (!companyName || !email || !password) return res.status(400).json({ error: 'companyName, email and password required' });

    // check duplicate email
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ error: 'email already in use' });

    // create company id
    const companyId = uuidv4();

    // pick currency from country using restcountries API if provided
    let currency = 'USD';
    try {
      if (country) {
        const r = await safeFetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(country)}?fields=currencies`);
        const j = await r.json();
        if (Array.isArray(j) && j[0] && j[0].currencies) {
          const keys = Object.keys(j[0].currencies);
          if (keys.length) currency = keys[0];
        }
      }
    } catch (e) {
      console.warn('Country->currency lookup failed, defaulting to USD', e && e.message ? e.message : e);
    }

    db.prepare('INSERT INTO companies (id, name, currency) VALUES (?, ?, ?)').run(companyId, companyName, currency);

    const userId = uuidv4();
    const passHash = hashPassword(password);
    db.prepare('INSERT INTO users (id, company_id, email, name, role, password) VALUES (?, ?, ?, ?, ?, ?)')
      .run(userId, companyId, email, name || '', 'admin', passHash);

    const token = signToken({ id: userId });
    res.json({ token, user: { id: userId, email, name: name || '', role: 'admin', company_id: companyId } });
  } catch (e) {
    console.error('POST /api/auth/signup error:', e && e.stack ? e.stack : e);
    res.status(500).json({ error: e && e.message ? e.message : String(e) });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!row) return res.status(401).json({ error: 'invalid credentials' });
    if (!comparePassword(password, row.password)) return res.status(401).json({ error: 'invalid credentials' });
    const token = signToken({ id: row.id });
    res.json({ token, user: { id: row.id, email: row.email, name: row.name, role: row.role, company_id: row.company_id } });
  } catch (e) {
    console.error('POST /api/auth/login error:', e && e.stack ? e.stack : e);
    res.status(500).json({ error: e && e.message ? e.message : String(e) });
  }
});

module.exports = router;
