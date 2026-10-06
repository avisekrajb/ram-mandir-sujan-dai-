// Regression checks for the public-site account flows against the ISOLATED backend.
const BASE = 'http://localhost:5600/api';
let pass = 0, failN = 0;
const ok = (c, l, x) => { if (c) { pass++; console.log('  ok   ' + l); } else { failN++; console.log('  FAIL ' + l + (x !== undefined ? '  -> ' + JSON.stringify(x).slice(0, 250) : '')); } };
const call = async (token, method, path, body) => {
  const r = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let json = null; try { json = await r.json(); } catch { /* */ }
  return { status: r.status, json };
};
(async () => {
  const email = `regress${Date.now()}@test.local`;
  let r = await call(null, 'POST', '/auth/signup', { name: 'Regress User', email, password: 'first-pass-1', phone: '9800000001' });
  ok(r.status === 201 && r.json.token, 'signup works', r.json);
  const tok = r.json.token;
  ok(!('password' in r.json.user) && !('tokensValidAfter' in r.json.user) && !('resetPasswordToken' in r.json.user), 'signup payload has no secrets');
  r = await call(tok, 'GET', '/auth/me');
  ok(r.status === 200 && r.json.user.role === 'user', 'me works');
  r = await call(tok, 'PUT', '/users/profile', { name: 'Regress Renamed', phone: '9800000002' });
  ok(r.status === 200, 'profile update works', r.json);
  r = await call(tok, 'PUT', '/users/password', { currentPassword: 'first-pass-1', newPassword: 'second-pass-2' });
  ok(r.status === 200, 'self password change works', r.json);
  r = await call(tok, 'GET', '/auth/me');
  ok(r.status === 200, 'session stays valid after a self password change (public Profile page unaffected)', r.status);
  r = await call(null, 'POST', '/auth/login', { email, password: 'second-pass-2' });
  ok(r.status === 200 && r.json.user.loginCount === 1, 'login with new password; sign-in recorded', r.json?.user);
  r = await call(null, 'POST', '/auth/login', { email, password: 'first-pass-1' });
  ok(r.status === 401, 'old password rejected');
  r = await call(tok, 'GET', '/admin/accounts');
  ok(r.status === 403, 'normal user cannot reach /admin/accounts', r.status);
  r = await call(tok, 'GET', '/admin/users');
  ok(r.status === 403, 'normal user cannot reach /admin/users', r.status);
  r = await call(tok, 'GET', '/users');
  ok(r.status === 403, 'normal user cannot list /users', r.status);
  r = await call(null, 'GET', '/admin/settings');
  ok(r.status === 200, 'public settings still public', r.status);
  r = await call(null, 'GET', '/events');
  ok(r.status === 200, 'public events still public', r.status);
  r = await call(tok, 'POST', '/auth/forgot-password', { email });
  ok(r.status === 200 || r.status === 500, 'forgot-password endpoint responds (no mail configured here)', r.status);
  console.log(`\n${pass} passed, ${failN} failed`);
  process.exit(failN ? 1 : 0);
})();
