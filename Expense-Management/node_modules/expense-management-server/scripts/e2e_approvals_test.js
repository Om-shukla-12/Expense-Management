const axios = require('axios');
(async function(){
  const base = 'http://localhost:4000/api';
  try {
    console.log('Signing up admin...');
    let adminToken;
    try {
      const signup = await axios.post(base + '/auth/signup', { companyName: 'TestCo-Auto', email: 'admin_auto@example.test', password: 'AdminPass123!', country: 'United States' });
      adminToken = signup.data.token;
    } catch (e) {
      if (e.response && e.response.status === 409) {
        console.log('Admin already exists, logging in...');
        const login = await axios.post(base + '/auth/login', { email: 'admin_auto@example.test', password: 'AdminPass123!' });
        adminToken = login.data.token;
      } else throw e;
    }
    console.log('Admin token:', adminToken.slice(0,20) + '...');

  const h = { headers: { Authorization: `Bearer ${adminToken}` } };
  const ts = Date.now();
  console.log('Creating approver...');
  const approver = await axios.post(base + '/users', { email: `approver_auto+${ts}@example.test`, name: 'Auto Approver', role: 'employee' }, h);
    console.log('Approver created:', approver.data);

  console.log('Creating employee...');
  const employee = await axios.post(base + '/users', { email: `employee_auto+${ts}@example.test`, name: 'Auto Employee', role: 'employee' }, h);
    console.log('Employee created:', employee.data);

    console.log('Creating flow...');
    const flow = await axios.post(base + '/flows', { name: 'Auto Flow', steps: [{ approver_id: approver.data.id, sequence: 1 }], rules: null }, h);
    console.log('Flow created:', flow.data);

    console.log('Logging in as employee...');
    const empLogin = await axios.post(base + '/auth/login', { email: employee.data.email, password: employee.data.generatedPassword });
    const empToken = empLogin.data.token;
    console.log('Employee token:', empToken.slice(0,20) + '...');

    console.log('Submitting expense...');
    const exp = await axios.post(base + '/expenses', { title: 'Auto Test Expense', amount: 42.5, currency: 'USD', date: new Date().toISOString().split('T')[0], description: 'Auto-created expense', flow_id: flow.data.id }, { headers: { Authorization: `Bearer ${empToken}` } });
    console.log('Expense created:', exp.data);

    console.log('Logging in as approver...');
    const aprLogin = await axios.post(base + '/auth/login', { email: approver.data.email, password: approver.data.generatedPassword });
    const aprToken = aprLogin.data.token;

    console.log('Fetching pending approvals...');
    const pending = await axios.get(base + '/approvals/pending', { headers: { Authorization: `Bearer ${aprToken}` } });
    console.log('Pending:', pending.data);

  } catch (e) {
    console.error('E2E test failed:', e.response ? (e.response.status + ' ' + JSON.stringify(e.response.data)) : e.message);
    process.exit(1);
  }
})();
