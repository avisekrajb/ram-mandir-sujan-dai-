// Second regression suite: fixes from the three-agent audit. Runs against the ISOLATED backend + db.
const crypto = require('crypto');
const BACKEND = 'C:/Users/Acer/Desktop/New folder/backend/backend';
const mongoose = require(BACKEND + '/node_modules/mongoose');
const BASE = process.env.SEC_BASE || 'http://127.0.0.1:5700';
const JWT_SECRET = 'sec-audit-test-secret-not-real-0123456789';
const results = [];
const check = (id, ok, msg) => { results.push({ id, ok }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' - ' + msg); };
let ipCounter = 0;
const nextIp = () => `10.20.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}`;

async function req(method, url, { token, body, headers = {}, raw } = {}) {
  const h = { 'X-Forwarded-For': nextIp(), ...headers };
  if (body !== undefined) h['Content-Type'] = h['Content-Type'] || 'application/json';
  if (token) h.Authorization = 'Bearer ' + token;
  try {
    const r = await fetch(BASE + url, { method, headers: h, body: body === undefined ? undefined : (raw ? body : JSON.stringify(body)), redirect: 'manual', signal: AbortSignal.timeout(30000) });
    const text = await r.text(); let json; try { json = JSON.parse(text); } catch {}
    return { status: r.status, json, text, headers: r.headers };
  } catch (e) { return { status: 'ERR', text: e.message, headers: new Headers() }; }
}
const signupLogin = async (name, email, password) => {
  await req('POST', '/api/auth/signup', { body: { name, email, password } });
  const l = await req('POST', '/api/auth/login', { body: { email, password } });
  return { token: l.json && l.json.token, user: l.json && l.json.user, email, password };
};

(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27700/sec_audit_test');
  const db = mongoose.connection.db;
  const U = await signupLogin('Uma Tester', 'uma.v2@test.local', 'Temple#Lamp2026');
  const V = await signupLogin('Vivek Tester', 'vivek.v2@test.local', 'Temple#Diya2026');
  check('0 setup users', !!(U.token && V.token), 'tokens present');

  // ---- subscribe: only the account's own address
  let r = await req('POST', '/api/subscribe/', { token: U.token, body: { email: 'victim1@x.com,victim2@y.com' } });
  check('S1 comma-separated address refused', r.status === 400, `status ${r.status} ${r.json && r.json.message}`);
  r = await req('POST', '/api/subscribe/', { token: U.token, body: { email: 'someone.else@x.com' } });
  check('S2 other person\'s address refused', r.status === 400, `status ${r.status} ${r.json && r.json.message}`);
  r = await req('POST', '/api/subscribe/', { token: U.token, body: { email: ['a@b.co'] } });
  check('S3 non-string address refused', r.status === 400, `status ${r.status}`);
  r = await req('POST', '/api/subscribe/', { token: U.token, body: { email: 'UMA.V2@test.local' } });
  check('S4 own address (any letter case) accepted', r.status === 200, `status ${r.status} ${r.text.slice(0, 80)}`);
  const sub = await db.collection('subscribers').findOne({ email: 'uma.v2@test.local' });
  check('S5 stored as a single clean address', !!sub, JSON.stringify(sub && sub.email));
  let codes = [];
  for (let i = 0; i < 7; i += 1) codes.push((await req('POST', '/api/subscribe/', { token: V.token, body: {} })).status);
  check('S6 subscribe is rate limited per account', codes.includes(429), codes.join(','));

  // ---- e-mail guard (unit)
  process.env.EMAIL_USER = ''; process.env.EMAIL_PASS = '';
  const { sendEmail } = require(BACKEND + '/src/services/emailService');
  const bad = await sendEmail({ to: 'a@b.com,c@d.com', subject: 'x', html: 'y' });
  const bad2 = await sendEmail({ to: 'a@b.com\r\nBcc: z@z.com', subject: 'x', html: 'y' });
  const bad3 = await sendEmail({ to: '"x" <a@b.com>', subject: 'x', html: 'y' });
  const ok = await sendEmail({ to: 'a@b.com', subject: 'x', html: 'y' });
  check('E1 sendEmail refuses multi-recipient / header-injection / display-name recipients', bad.error && bad2.error && bad3.error && !ok.error, `${bad.error}|${bad2.error}|${bad3.error}|ok:${ok.messageId}`);

  // ---- booking input
  const settings = (await req('GET', '/api/admin/settings')).json || {};
  const puja = (settings.pujaTypes || [])[0];
  const future = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
  const book = (b) => req('POST', '/api/bookings/', { token: U.token, body: { name: 'Uma', phone: '9800000000', type: puja, date: future, description: 'x', ...b } });
  r = await book({});
  check('B1 valid booking accepted', r.status === 201, `status ${r.status} ${r.text.slice(0, 80)}`);
  for (const [label, patch] of [['slash date', { date: '10/10/2031' }], ['trailing space', { date: future + ' ' }], ['markup in date', { date: future + ' (<a href=//evil>x</a>)' }], ['impossible day', { date: '2031-02-31' }], ['unknown ceremony', { type: '<a href=//evil>Confirm</a>' }], ['long description', { description: 'x'.repeat(1001) }], ['object name', { name: { a: 1 } }]]) {
    r = await book(patch);
    check('B2 refused: ' + label, r.status === 400, `status ${r.status} ${r.json && r.json.message}`);
  }

  // ---- donation screenshot + amount
  const donate = (screenshot) => req('POST', '/api/donations/', { token: U.token, body: { amount: 500, paymentMethod: 'bank', name: 'Uma', email: 'uma.v2@test.local', transactionId: 'TX-' + Math.random(), screenshot } });
  r = await donate('javascript:alert(1)');
  check('D1 javascript: screenshot refused (also by the global guard)', r.status === 400, `status ${r.status}`);
  r = await donate('https://evil.example/p.gif');
  check('D2 non-Cloudinary screenshot refused', r.status === 400, `status ${r.status} ${r.json && r.json.message}`);
  r = await donate('https://res.cloudinary.com/demo/image/upload/v1/temple/user/x.png');
  check('D3 Cloudinary screenshot accepted', r.status === 201, `status ${r.status} ${r.text.slice(0, 80)}`);
  for (const amount of ['abc', 'NaN', -5, 0, 1e12, null]) {
    r = await req('POST', '/api/payment/esewa/initiate', { token: U.token, body: { amount } });
    check(`D4 eSewa initiate refuses amount ${JSON.stringify(amount)}`, r.status === 400, `status ${r.status}`);
  }

  // ---- visitors
  const sess = 's' + crypto.randomBytes(6).toString('hex');
  r = await req('POST', '/api/visitors/track', { headers: { 'X-Forwarded-For': '9.9.9.9, 8.8.8.8' }, body: { sessionId: sess, page: '/reset-password/abcdef0123456789secret', pageTitle: 'T', userAgent: 'UA', visitCount: 999999 } });
  const row = await db.collection('visitors').findOne({ sessionId: sess });
  check('V1 spoofed first X-Forwarded-For value is ignored (the proxy-added one is used)', row && row.ipAddress === '8.8.8.8', 'stored ip = ' + (row && row.ipAddress));
  check('V2 reset token scrubbed from stored page', row && row.page === '/reset-password/:token', 'page = ' + (row && row.page));
  check('V3 client-sent visitCount ignored', row && row.visitCount === 1, 'visitCount = ' + (row && row.visitCount));
  r = await req('POST', '/api/visitors/track', { body: { sessionId: 'x'.repeat(5000), page: '/a' } });
  const longRow = await db.collection('visitors').findOne({ page: '/a' });
  check('V4 oversized sessionId cut to 64 characters', !longRow || longRow.sessionId.length <= 64, 'len = ' + (longRow && longRow.sessionId.length));
  r = await req('POST', '/api/visitors/track', { body: { page: '/b' } });
  check('V5 track without a session id is refused', r.status === 400, `status ${r.status}`);
  codes = [];
  for (let i = 0; i < 130; i += 1) codes.push((await req('POST', '/api/visitors/time', { headers: { 'X-Forwarded-For': '203.0.113.200' }, body: { sessionId: 's1', page: '/a', timeSpent: 5 } })).status);
  check('V6 public tracking is rate limited per address', codes.includes(429), `${codes.filter((c) => c === 429).length} of 130 limited`);

  // ---- login lockout: failures only, per account
  const LOCK = 'lock.target@test.local';
  await req('POST', '/api/auth/signup', { body: { name: 'Lock Target', email: LOCK, password: 'Temple#Bell2026' } });
  codes = [];
  for (let i = 0; i < 12; i += 1) codes.push((await req('POST', '/api/auth/login', { body: { email: LOCK, password: 'wrong-guess-' + i } })).status);
  check('L1 12 wrong passwords from 12 addresses lock the account (429)', codes.slice(0, 10).every((c) => c === 401) && codes.slice(10).every((c) => c === 429), codes.join(','));
  r = await req('POST', '/api/auth/login', { body: { email: LOCK, password: 'Temple#Bell2026' } });
  check('L2 while locked even the right password waits', r.status === 429 && !!r.headers.get('retry-after'), `status ${r.status} retry-after ${r.headers.get('retry-after')}`);
  r = await req('POST', '/api/auth/login', { body: { email: U.email, password: U.password } });
  check('L3 other accounts are not affected', r.status === 200, `status ${r.status}`);
  codes = [];
  for (let i = 0; i < 12; i += 1) codes.push((await req('POST', '/api/auth/login', { body: { email: V.email, password: V.password } })).status);
  check('L4 successful logins never count toward a lock', codes.every((c) => c === 200), codes.join(','));
  codes = [];
  for (let i = 0; i < 12; i += 1) codes.push((await req('POST', '/api/auth/login', { body: { email: 'no.such.person@test.local', password: 'x'.repeat(10) + i } })).status);
  check('L5 an address with no account behaves the same (no enumeration by lock)', codes.slice(0, 10).every((c) => c === 401) && codes.slice(10).every((c) => c === 429), codes.join(','));

  // ---- reset code: 6 digits, atomic attempt cap, one-time reset token
  const hashOtp = (otp) => crypto.createHash('sha256').update(otp + JWT_SECRET).digest('hex');
  const R = await signupLogin('Rita Reset', 'rita.v2@test.local', 'Temple#Moon2026');
  await db.collection('users').updateOne({ email: R.email }, { $set: { resetPasswordToken: hashOtp('123456'), resetPasswordExpire: new Date(Date.now() + 600000), resetOtpAttempts: 0 } });
  codes = [];
  for (let i = 0; i < 4; i += 1) codes.push((await req('POST', '/api/auth/verify-otp', { body: { email: R.email, otp: '00000' + i } })).status);
  r = await req('POST', '/api/auth/verify-otp', { body: { email: R.email, otp: '123456' } });
  check('O1 correct code still works after 4 wrong guesses', codes.every((c) => c === 400) && r.status === 200 && r.json.resetToken, `wrong:${codes} right:${r.status}`);
  const resetToken = r.json && r.json.resetToken;
  r = await req('POST', '/api/auth/reset-password-otp', { body: { resetToken, password: 'Temple#Sun2026!' } });
  check('O2 reset with the token works and signs in', r.status === 200 && r.json.token, `status ${r.status} ${r.json && r.json.message}`);
  r = await req('POST', '/api/auth/reset-password-otp', { body: { resetToken, password: 'Another#Pass2026' } });
  check('O3 the same reset token cannot be used twice', r.status === 400, `status ${r.status}`);
  r = await req('POST', '/api/auth/reset-password-otp', { body: { resetToken: crypto.randomBytes(8).toString('hex'), password: '12345678' } });
  check('O4 reset refuses a common password / bad token', r.status === 400, `status ${r.status}`);
  const R2 = await signupLogin('Rohan Reset', 'rohan.v2@test.local', 'Temple#Moon2027');
  await db.collection('users').updateOne({ email: R2.email }, { $set: { resetPasswordToken: hashOtp('654321'), resetPasswordExpire: new Date(Date.now() + 600000), resetOtpAttempts: 0 } });
  const burst = await Promise.all(Array.from({ length: 8 }, (_, i) => req('POST', '/api/auth/verify-otp', { body: { email: R2.email, otp: '11111' + (i % 10) } })));
  r = await req('POST', '/api/auth/verify-otp', { body: { email: R2.email, otp: '654321' } });
  const afterBurst = await db.collection('users').findOne({ email: R2.email });
  check('O5 a burst of parallel guesses cannot exceed 5 checks; the code is then void', r.status === 400 && !afterBurst.resetPasswordToken, `burst statuses ${[...new Set(burst.map((x) => x.status))]}, right code after burst -> ${r.status}`);

  // ---- password change ends other sessions and hands back a fresh token
  const P = await signupLogin('Pia Change', 'pia.v2@test.local', 'Temple#Star2026');
  const oldToken = P.token;
  await new Promise((res) => setTimeout(res, 1300));
  r = await req('PUT', '/api/users/password', { token: oldToken, body: { currentPassword: P.password, newPassword: 'Temple#Star2027x' } });
  const freshToken = r.json && r.json.token;
  check('P1 password change returns a fresh token', r.status === 200 && !!freshToken, `status ${r.status}`);
  const withOld = await req('GET', '/api/auth/me', { token: oldToken });
  const withFresh = await req('GET', '/api/auth/me', { token: freshToken });
  check('P2 the old token (another device / stolen) is dead, the fresh one works', withOld.status === 401 && withFresh.status === 200, `old ${withOld.status}, fresh ${withFresh.status}`);

  // ---- contact form
  r = await req('POST', '/api/contact/', { body: { name: 'Carl', email: 'a@x.com,b@y.com', subject: 's', message: 'Namaste, what are the aarti times?' } });
  check('C1 contact e-mail with several addresses refused', r.status === 400, `status ${r.status} ${r.json && r.json.message}`);

  // ---- super admin database tools only see this app's collections
  const S = await req('POST', '/api/auth/login', { body: { email: 'super@test.local', password: 'Sup3r-Better-Pass!41' } });
  const sa = S.json && S.json.token;
  await db.collection('someotherapp_orders').insertOne({ secret: 'not ours' });
  r = await req('GET', '/api/superadmin/db/stats', { token: sa });
  const names = ((r.json && r.json.data && r.json.data.collections) || []).map((c) => c.name);
  check('G1 foreign collection is not listed', !names.includes('someotherapp_orders') && names.includes('users'), `listed: ${names.join(',')}`);
  r = await req('GET', '/api/superadmin/db/someotherapp_orders/records', { token: sa });
  check('G2 foreign collection cannot be read', r.status === 404, `status ${r.status}`);
  r = await req('POST', '/api/superadmin/db/someotherapp_orders/clear', { token: sa });
  const r2 = await req('DELETE', '/api/superadmin/db/someotherapp_orders', { token: sa });
  const stillThere = await db.collection('someotherapp_orders').countDocuments();
  check('G3 foreign collection cannot be cleared or dropped', r.status === 404 && r2.status === 404 && stillThere === 1, `clear ${r.status}, drop ${r2.status}, docs left ${stillThere}`);
  r = await req('GET', '/api/superadmin/db/users/records', { token: sa });
  const leaked = JSON.stringify(r.json || {}).match(/"(password|resetPasswordToken|tokensValidAfter|lastLoginIp|resetOtpAttempts)"/);
  check('G4 user records omit hashes, reset codes and IPs', r.status === 200 && !leaked, leaked ? 'leaked field ' + leaked[1] : 'clean');

  // ---- temp-password staff have no staff powers in inline-role routes
  const { hasArea } = require(BACKEND + '/src/middleware/permissions');
  check('M1 hasArea is false while the temporary password is unchanged', hasArea({ role: 'admin', mustChangePassword: true }, 'bookings') === false && hasArea({ role: 'admin' }, 'bookings') === true && hasArea({ role: 'superadmin' }, 'users') === true, 'ok');

  // ---- donation switches cannot be flipped by a plain admin
  // (needs an admin account: create one directly with a known password, no temp-password gate)
  const bcrypt = require(BACKEND + '/node_modules/bcryptjs');
  await db.collection('users').insertOne({ name: 'Plain Admin', email: 'plain.admin@test.local', password: await bcrypt.hash('Admin#Pass2026x', 4), role: 'admin', active: true, createdAt: new Date(), updatedAt: new Date() });
  const A = await req('POST', '/api/auth/login', { body: { email: 'plain.admin@test.local', password: 'Admin#Pass2026x' } });
  const at = A.json && A.json.token;
  const cur = (await req('GET', '/api/admin/settings')).json;
  const before = cur.donate || {};
  r = await req('PUT', '/api/admin/settings', { token: at, body: { donate: { ...before, esewaEnabled: !before.esewaEnabled, showBankDetails: false, qrEnabled: false, bankName: 'Changed By Admin' } } });
  const after = (await req('GET', '/api/admin/settings')).json.donate || {};
  check('W1 plain admin can edit bank text but NOT the super-admin switches', r.status === 200 && after.bankName === 'Changed By Admin' && after.esewaEnabled === before.esewaEnabled && after.showBankDetails === before.showBankDetails && after.qrEnabled === before.qrEnabled, `status ${r.status}; esewa ${before.esewaEnabled}->${after.esewaEnabled}; bank ${before.showBankDetails}->${after.showBankDetails}`);
  r = await req('PUT', '/api/admin/settings', { token: sa, body: { donate: { ...before, showBankDetails: false } } });
  const afterSuper = (await req('GET', '/api/admin/settings')).json.donate || {};
  check('W2 the super admin CAN flip a switch', r.status === 200 && afterSuper.showBankDetails === false, `showBankDetails -> ${afterSuper.showBankDetails}`);
  const legacy = (await req('GET', '/api/donations/settings')).json;
  check('W3 hidden bank details are blanked in the public legacy donation settings', legacy && legacy.data && legacy.data.bankNumber === '' && legacy.data.bankName === '', JSON.stringify(legacy && legacy.data));
  await req('PUT', '/api/admin/settings', { token: sa, body: { donate: { ...before } } });

  // ---- unsubscribe page keeps working under the strict API policy
  r = await req('GET', '/api/reminders/unsubscribe/' + 'a'.repeat(48));
  const csp = r.headers.get('content-security-policy') || '';
  check('R1 unsubscribe page allows its own inline style and form post', /style-src 'unsafe-inline'/.test(csp) && /form-action 'self'/.test(csp) && /default-src 'none'/.test(csp), csp);

  await mongoose.disconnect();
  console.log('\nFAILED:', results.filter((x) => !x.ok).length, 'of', results.length);
  require('fs').writeFileSync(__dirname + '/verify2-results.json', JSON.stringify(results, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
