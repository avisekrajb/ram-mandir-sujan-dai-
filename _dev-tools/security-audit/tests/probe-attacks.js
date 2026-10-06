// Attack-style probes against the ISOLATED backend (throwaway db). Prints PASS/FAIL-style lines.
const crypto = require('crypto');
const BASE = process.env.SEC_BASE || 'http://127.0.0.1:5700';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const note = (id, ok, msg) => { results.push({ id, ok }); console.log((ok ? 'ok   ' : 'ISSUE') + ' ' + id + ' - ' + msg); };

async function req(method, url, { token, body, headers = {}, raw } = {}) {
  const h = { ...headers };
  if (body !== undefined) h['Content-Type'] = h['Content-Type'] || 'application/json';
  if (token) h.Authorization = 'Bearer ' + token;
  try {
    const r = await fetch(BASE + url, { method, headers: h, body: body === undefined ? undefined : (raw ? body : JSON.stringify(body)), redirect: 'manual', signal: AbortSignal.timeout(20000) });
    const text = await r.text(); let json; try { json = JSON.parse(text); } catch {}
    return { status: r.status, json, text, headers: r.headers };
  } catch (e) { return { status: 'ERR', text: e.message, json: undefined, headers: new Headers() }; }
}
const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
const sign = (payload, secret, alg = 'HS256') => { const h = b64({ alg, typ: 'JWT' }) + '.' + b64(payload); return h + '.' + crypto.createHmac('sha256', secret).update(h).digest('base64url'); };

async function mkUser(name, email, password) {
  await req('POST', '/api/auth/signup', { body: { name, email, password, confirmPassword: password } });
  const l = await req('POST', '/api/auth/login', { body: { email, password } });
  return { token: l.json && l.json.token, user: l.json && (l.json.user || l.json.data), email, password };
}

(async () => {
  const A = await mkUser('Alice Test', 'alice@test.local', 'AlicePass#123');
  const B = await mkUser('Bob Test', 'bob@test.local', 'BobPass#12345');
  console.log('users:', !!A.token, !!B.token);
  const idOf = (u) => (u.user && (u.user._id || u.user.id));

  // ---- T1 NoSQL operator injection
  let r = await req('POST', '/api/auth/login', { body: { email: { $ne: null }, password: { $ne: null } } });
  note('T1a login with operator objects', !(r.status === 200 && r.json && r.json.token), `status ${r.status} ${(r.text || '').slice(0, 80)}`);
  r = await req('POST', '/api/auth/login', { body: { email: { $gt: '' }, password: 'x' } });
  note('T1b login email {$gt}', r.status !== 200, `status ${r.status}`);
  for (const [p, body] of [
    ['/api/auth/forgot-password', { email: { $ne: null } }],
    ['/api/auth/send-otp', { email: { $ne: null } }],
    ['/api/auth/verify-otp', { email: { $ne: null }, otp: { $ne: null } }],
    ['/api/auth/reset-password-otp', { resetToken: { $ne: null }, password: 'NewPass#12345' }],
    ['/api/auth/login-code/request', { email: { $ne: null } }],
    ['/api/auth/login-code/verify', { email: { $ne: null }, code: { $ne: null } }],
    ['/api/auth/reset-password/' + encodeURIComponent('x'), { password: 'NewPass#12345' }],
  ]) {
    r = await req('POST', p, { body });
    note('T2 operator injection ' + p, r.status >= 400 && r.status < 500 || (r.status === 200 && !(r.json && r.json.token)), `status ${r.status} ${(r.text || '').slice(0, 90)}`);
  }
  r = await req('GET', '/api/auth/../users/?email[$ne]=x');
  r = await req('GET', '/api/temple-bookings/lookup?reference[$ne]=x&phone[$ne]=y');
  note('T2b temple-bookings lookup with operator query', r.status !== 200 || !(r.json && (r.json.data || r.json.booking)), `status ${r.status} ${(r.text || '').slice(0, 100)}`);

  // ---- T3 mass assignment / privilege escalation
  r = await req('POST', '/api/auth/signup', { body: { name: 'Mallory', email: 'mallory@test.local', password: 'Mallory#12345', confirmPassword: 'Mallory#12345', role: 'superadmin', permissions: ['users'], isAdmin: true, active: true, tokensValidAfter: new Date(0) } });
  const mal = await req('POST', '/api/auth/login', { body: { email: 'mallory@test.local', password: 'Mallory#12345' } });
  const malRole = mal.json && mal.json.user && mal.json.user.role;
  note('T3a signup cannot set role', malRole === 'user' || !malRole, `role after signup = ${malRole}`);
  r = await req('PUT', '/api/users/profile', { token: A.token, body: { name: 'Alice', role: 'admin', permissions: ['users'], email: 'alice@test.local', password: 'hacked', tokensValidAfter: 0, active: true } });
  const me = await req('GET', '/api/auth/me', { token: A.token });
  const meRole = me.json && (me.json.user ? me.json.user.role : me.json.role);
  note('T3b profile update cannot set role', meRole === 'user', `role after PUT /users/profile = ${meRole}`);
  const relog = await req('POST', '/api/auth/login', { body: { email: 'alice@test.local', password: 'hacked' } });
  note('T3c profile update cannot set password', relog.status !== 200, `login with injected password -> ${relog.status}`);

  // ---- T4 JWT forging
  const secretGuess = ['secret', 'jwtsecret', 'changeme', 'your-secret-key', 'test', 'password', 'ramchandra'];
  const idA = idOf(A);
  const now = Math.floor(Date.now() / 1000);
  let forged = false;
  for (const s of secretGuess) { const t = sign({ id: idA, iat: now, exp: now + 3600 }, s); const m = await req('GET', '/api/auth/me', { token: t }); if (m.status === 200) forged = true; }
  note('T4a weak-secret forged token rejected', !forged, forged ? 'a guessable secret was accepted' : 'common secrets rejected');
  const noneTok = b64({ alg: 'none', typ: 'JWT' }) + '.' + b64({ id: idA, iat: now, exp: now + 3600 }) + '.';
  r = await req('GET', '/api/auth/me', { token: noneTok });
  note('T4b alg=none rejected', r.status === 401, `status ${r.status}`);
  const expired = sign({ id: idA, iat: now - 7200, exp: now - 3600 }, 'sec-audit-test-secret-not-real-0123456789');
  r = await req('GET', '/api/auth/me', { token: expired });
  note('T4c expired token rejected', r.status === 401, `status ${r.status}`);
  const adminEscalate = sign({ id: idA, role: 'superadmin', iat: now, exp: now + 3600 }, 'wrong-secret');
  r = await req('GET', '/api/superadmin/dashboard', { token: adminEscalate });
  note('T4d forged superadmin token rejected', r.status === 401 || r.status === 403, `status ${r.status}`);

  // ---- T5 cross-account access (IDOR)
  const idB = idOf(B);
  r = await req('GET', '/api/users/' + idB, { token: A.token });
  note('T5a user A cannot read user B profile', r.status === 403 || r.status === 404 || r.status === 401, `GET /users/:id -> ${r.status} ${(r.text || '').slice(0, 120)}`);
  // donation owned by B
  const don = await req('POST', '/api/donations/', { token: B.token, body: { amount: 500, paymentMethod: 'bank', name: 'Bob', email: 'bob@test.local', transactionId: 'TX-B-1' } });
  const donId = don.json && (don.json.data ? (don.json.data._id || don.json.data.id) : (don.json._id || don.json.donation?._id));
  console.log('   donation create ->', don.status, (don.text || '').slice(0, 100), 'id:', donId);
  if (donId) {
    r = await req('GET', '/api/donations/' + donId, { token: A.token });
    note('T5b user A cannot read user B donation', r.status === 403 || r.status === 404, `GET /donations/:id -> ${r.status}`);
    r = await req('GET', '/api/payment/status/' + donId, { token: A.token });
    note('T5c user A cannot read B payment status', r.status === 403 || r.status === 404, `GET /payment/status/:id -> ${r.status}`);
    r = await req('POST', '/api/donations/' + donId + '/email-receipt', { token: A.token, body: {} });
    note('T5d user A cannot trigger B receipt email', r.status === 403 || r.status === 404, `POST email-receipt -> ${r.status}`);
    r = await req('PUT', '/api/donations/' + donId + '/status', { token: A.token, body: { status: 'completed' } });
    note('T5e user A cannot approve a donation', r.status === 401 || r.status === 403, `PUT status -> ${r.status}`);
  }
  // reminders owned by B
  const rem = await req('POST', '/api/reminders/', { token: B.token, body: { eventDate: '2026-12-25', title: { en: 'Test festival' }, offsets: [1], kind: 'festival', lang: 'en' } });
  const remId = rem.json && (rem.json.reminder ? (rem.json.reminder.id || rem.json.reminder._id) : (rem.json.data && rem.json.data._id));
  console.log('   reminder create ->', rem.status, (rem.text || '').slice(0, 100));
  if (remId) {
    r = await req('DELETE', '/api/reminders/' + remId, { token: A.token });
    note('T5f user A cannot delete B reminder', r.status === 404 || r.status === 403, `DELETE -> ${r.status}`);
    r = await req('POST', '/api/reminders/' + remId + '/test', { token: A.token, body: {} });
    note('T5g user A cannot test-send B reminder', r.status === 404 || r.status === 403, `POST test -> ${r.status}`);
  }
  // bookings: list with plain user must be own only
  await req('POST', '/api/bookings/', { token: B.token, body: { name: 'Bob', phone: '9800000001', email: 'bob@test.local', date: '2026-12-01', type: 'Puja', description: 'x' } });
  r = await req('GET', '/api/bookings/', { token: A.token });
  const leaked = r.json && JSON.stringify(r.json).includes('bob@test.local');
  note('T5h GET /bookings does not leak other users', !leaked, `status ${r.status}, leaked=${!!leaked}`);

  // ---- T6 CORS
  r = await req('OPTIONS', '/api/auth/login', { headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'POST' } });
  note('T6a evil origin gets no CORS allow', !r.headers.get('access-control-allow-origin'), `ACAO=${r.headers.get('access-control-allow-origin')} status ${r.status}`);
  r = await req('GET', '/api/health', { headers: { Origin: 'https://evil.example' } });
  note('T6b evil origin simple GET has no ACAO', !r.headers.get('access-control-allow-origin'), `ACAO=${r.headers.get('access-control-allow-origin')} status ${r.status}`);
  r = await req('GET', '/api/health', { headers: { Origin: 'null' } });
  note('T6c Origin: null not allowed', !r.headers.get('access-control-allow-origin'), `ACAO=${r.headers.get('access-control-allow-origin')} status ${r.status}`);
  for (const o of ['https://your-frontend-url.onrender.com', 'https://rammandirlast.onrender.com', 'https://rammandirlastbackend.onrender.com', 'http://localhost:3000', 'http://localhost:5000']) {
    r = await req('GET', '/api/health', { headers: { Origin: o } });
    if (r.headers.get('access-control-allow-origin')) console.log('   (info) CORS trusted origin in production:', o);
  }

  // ---- T7 headers
  r = await req('GET', '/api/health');
  const need = ['x-content-type-options', 'strict-transport-security', 'x-frame-options', 'content-security-policy', 'referrer-policy', 'cross-origin-opener-policy'];
  const missing = need.filter((h) => !r.headers.get(h));
  note('T7a security headers present', missing.length === 0, 'missing: ' + missing.join(', '));
  note('T7b X-Powered-By hidden', !r.headers.get('x-powered-by'), 'x-powered-by=' + r.headers.get('x-powered-by'));
  note('T7c health does not leak runtime details', !(r.json && r.json.memory), 'health exposes memory/uptime/env: ' + JSON.stringify(Object.keys(r.json || {})));

  // ---- T8 body limits & parsing
  const big = JSON.stringify({ a: 'x'.repeat(6 * 1024 * 1024) });
  r = await req('POST', '/api/contact/', { body: big, raw: true });
  note('T8a 6 MB JSON rejected', r.status === 413, `status ${r.status}`);
  r = await req('POST', '/api/contact/', { body: '{"a":', raw: true });
  note('T8b malformed JSON gives 400 not 500/stack', r.status === 400 && !/at .*\.js/.test(r.text || ''), `status ${r.status} ${(r.text || '').slice(0, 100)}`);
  r = await req('GET', '/api/events/not-an-object-id');
  note('T8c bad ObjectId does not leak internals', !/Cast to ObjectId|BSONError|mongoose/i.test(r.text || ''), `status ${r.status} ${(r.text || '').slice(0, 100)}`);
  r = await req('GET', '/api/events/%');
  note('T8d malformed URL encoding handled', r.status < 500, `status ${r.status} ${(r.text || '').slice(0, 100)}`);

  // ---- T9 static / traversal
  for (const p of ['/uploads/../.env', '/uploads/..%2f.env', '/uploads/%2e%2e/%2e%2e/package.json', '/.env', '/package.json', '/src/app.js', '/uploads/', '/public/', '/err.txt', '/server.js']) {
    r = await req('GET', p);
    const leak = r.status === 200 && /JWT_SECRET|MONGODB_URI|"dependencies"|require\(/.test(r.text || '');
    note('T9 no file disclosure ' + p, !leak, `status ${r.status}`);
  }

  // ---- T10 enumeration
  const l1 = await req('POST', '/api/auth/login', { body: { email: 'nobody-here@test.local', password: 'Whatever#123' } });
  const l2 = await req('POST', '/api/auth/login', { body: { email: 'alice@test.local', password: 'Whatever#123' } });
  note('T10a login does not reveal whether email exists', l1.status === l2.status && l1.json && l2.json && l1.json.message === l2.json.message, `unknown -> ${l1.status} "${l1.json && l1.json.message}" | known -> ${l2.status} "${l2.json && l2.json.message}"`);
  const f1 = await req('POST', '/api/auth/forgot-password', { body: { email: 'nobody-here@test.local' } });
  const f2 = await req('POST', '/api/auth/forgot-password', { body: { email: 'alice@test.local' } });
  note('T10b forgot-password does not reveal whether email exists', f1.status === f2.status && (f1.json && f2.json && f1.json.message === f2.json.message), `unknown -> ${f1.status} "${f1.json && f1.json.message}" | known -> ${f2.status} "${f2.json && f2.json.message}"`);
  const s1 = await req('POST', '/api/auth/signup', { body: { name: 'Dup', email: 'alice@test.local', password: 'AlicePass#123', confirmPassword: 'AlicePass#123' } });
  console.log('   (info) duplicate signup ->', s1.status, (s1.text || '').slice(0, 100));
  const ow = await req('POST', '/api/auth/signup', { body: { name: 'Weak', email: 'weak@test.local', password: '123456', confirmPassword: '123456' } });
  note('T10c weak password "123456" refused at signup', ow.status >= 400, `signup with 123456 -> ${ow.status}`);
  const ow2 = await req('POST', '/api/auth/signup', { body: { name: 'Weak2', email: 'weak2@test.local', password: 'password', confirmPassword: 'password' } });
  note('T10d weak password "password" refused at signup', ow2.status >= 400, `signup with password -> ${ow2.status}`);

  require('fs').writeFileSync(__dirname + '/attack-results.json', JSON.stringify(results, null, 1));
  console.log('\nISSUES:', results.filter((x) => !x.ok).length, 'of', results.length);
})().catch((e) => { console.error(e); process.exit(1); });
