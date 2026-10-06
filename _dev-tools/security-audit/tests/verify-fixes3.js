// Third suite: fixes made after the independent review of the security pass. ISOLATED backend + db only.
const BACKEND = 'C:/Users/Acer/Desktop/New folder/backend/backend';
const mongoose = require(BACKEND + '/node_modules/mongoose');
const BASE = process.env.SEC_BASE || 'http://127.0.0.1:5700';
const results = [];
const check = (id, ok, msg) => { results.push({ id, ok }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' - ' + msg); };
let ipCounter = 100;
const nextIp = () => `10.30.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}`;
async function req(method, url, { token, body, headers = {}, raw, form } = {}) {
  const h = { 'X-Forwarded-For': nextIp(), ...headers };
  if (body !== undefined && !form) h['Content-Type'] = h['Content-Type'] || 'application/json';
  if (token) h.Authorization = 'Bearer ' + token;
  try {
    const r = await fetch(BASE + url, { method, headers: h, body: form ? form : (body === undefined ? undefined : (raw ? body : JSON.stringify(body))), redirect: 'manual', signal: AbortSignal.timeout(30000) });
    const text = await r.text(); let json; try { json = JSON.parse(text); } catch {}
    return { status: r.status, json, text, headers: r.headers };
  } catch (e) { return { status: 'ERR', text: e.message, headers: new Headers() }; }
}
const mk = async (name, email, password) => { await req('POST', '/api/auth/signup', { body: { name, email, password } }); const l = await req('POST', '/api/auth/login', { body: { email, password } }); return { token: l.json && l.json.token, email, password }; };

(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27700/sec_audit_test');
  const db = mongoose.connection.db;
  const U = await mk('Ravi Review', 'ravi.v3@test.local', 'Temple#Lotus2026');
  let r;

  // guard speed and plain text
  const big = JSON.stringify({ name: 'x', email: 'a@b.co', message: 'y'.repeat(4900000) });
  const t0 = Date.now(); r = await req('POST', '/api/contact/', { body: big, raw: true }); const ms = Date.now() - t0;
  check('V1 a 4.9 MB body is answered quickly (no ~1 s scan)', ms < 700, `${r.status} in ${ms} ms`);
  const settings = (await req('GET', '/api/admin/settings')).json || {};
  const puja = (settings.pujaTypes || [])[0];
  const future = new Date(Date.now() + 120 * 86400000).toISOString().slice(0, 10);
  r = await req('POST', '/api/bookings/', { token: U.token, body: { name: 'Ravi', phone: '9800000000', type: puja, date: future, description: 'Data: 5 people coming, Javascript is not needed' } });
  check('V2 ordinary text that starts with "Data:" is accepted', r.status === 201, `status ${r.status} ${r.text.slice(0, 90)}`);
  r = await req('POST', '/api/bookings/', { token: U.token, body: { name: 'Ravi', phone: '9800000000', type: puja, date: future, description: 'data:text/html,<script>alert(1)</script>' } });
  check('V3 a real data: URL is still refused', r.status === 400, `status ${r.status}`);

  // donate: null cannot wipe the donation section
  const S = await req('POST', '/api/auth/login', { body: { email: 'super@test.local', password: 'Sup3r-Better-Pass!41' } });
  const sa = S.json && S.json.token;
  const bcrypt = require(BACKEND + '/node_modules/bcryptjs');
  await db.collection('users').insertOne({ name: 'Plain Admin Three', email: 'plain.admin3@test.local', password: await bcrypt.hash('Admin#Pass2026y', 4), role: 'admin', active: true, createdAt: new Date(), updatedAt: new Date() });
  const A = await req('POST', '/api/auth/login', { body: { email: 'plain.admin3@test.local', password: 'Admin#Pass2026y' } });
  const at = A.json && A.json.token;
  const before = ((await req('GET', '/api/admin/settings')).json || {}).donate || {};
  r = await req('PUT', '/api/admin/settings', { token: at, body: { donate: null } });
  const after = ((await req('GET', '/api/admin/settings')).json || {}).donate || {};
  check('D1 {donate:null} from an admin leaves the donation section alone', after.baseCount === before.baseCount && after.bankName === before.bankName, `status ${r.status}; baseCount ${before.baseCount}->${after.baseCount}`);

  // multipart text fields get the guards
  const fd = new FormData(); fd.append('url', 'javascript:alert(1)'); fd.append('title', 'x');
  r = await req('POST', '/api/admin/gallery/video', { token: sa, form: fd });
  check('M1 javascript: in a multipart text field is refused', r.status === 400 && /unsafe/.test(r.text), `status ${r.status} ${r.text.slice(0, 90)}`);
  const fd2 = new FormData(); fd2.append('image', new Blob([Buffer.alloc(10)], { type: 'text/plain' }), 'x.txt');
  r = await req('POST', '/api/admin/upload/logo', { token: sa, form: fd2 });
  check('M2 a bad file type is still answered with a clean 400', r.status === 400, `status ${r.status}`);

  // screenshot must be an image of our own account
  const donate = (screenshot) => req('POST', '/api/donations/', { token: U.token, body: { amount: 500, paymentMethod: 'bank', name: 'Ravi', email: 'ravi.v3@test.local', transactionId: 'T-' + Math.random(), screenshot } });
  r = await donate('https://res.cloudinary.com/demo/raw/upload/x.html');
  check('S1 a non-image Cloudinary file is refused', r.status === 400, `status ${r.status}`);
  r = await donate('https://res.cloudinary.com@evil.example/demo/image/upload/x.png');
  check('S2 userinfo trick refused', r.status === 400, `status ${r.status}`);
  r = await donate('https://res.cloudinary.com/demo/image/upload/v1/temple/user/x.png');
  check('S3 a normal Cloudinary picture is accepted', r.status === 201, `status ${r.status}`);

  // parallel guesses are counted before the password check
  await req('POST', '/api/auth/signup', { body: { name: 'Burst Target', email: 'burst.target@test.local', password: 'Temple#River2026' } });
  const burst = await Promise.all(Array.from({ length: 40 }, (_, i) => req('POST', '/api/auth/login', { body: { email: 'burst.target@test.local', password: 'wrong-' + i } })));
  const limited = burst.filter((x) => x.status === 429).length;
  check('B1 a burst of 40 parallel wrong passwords is cut off after about 10', limited >= 25, `${limited} of 40 answered 429`);

  // sign-up limits match the schema (no 500s)
  r = await req('POST', '/api/auth/signup', { body: { name: 'N'.repeat(60), email: 'long.name@test.local', password: 'Temple#Moon2028' } });
  check('N1 a 60 character name is a 400, not a 500', r.status === 400, `status ${r.status}`);
  r = await req('POST', '/api/auth/signup', { body: { name: 'Short Mail', email: 'a@b.c', password: 'Temple#Moon2028' } });
  check('N2 an address like a@b.c is a 400, not a 500', r.status === 400, `status ${r.status}`);

  // the API's own pages may post back to the API (same origin)
  r = await req('GET', '/api/reminders/unsubscribe/' + 'a'.repeat(48), { headers: { Origin: 'http://127.0.0.1:5700' } });
  check('C1 a request whose Origin is the API own address is not blocked by CORS', r.status === 404 && /Reminder not found/.test(r.text), `status ${r.status}`);
  r = await req('GET', '/api/health', { headers: { Origin: 'https://evil.example' } });
  check('C2 another site is still refused', r.status === 403, `status ${r.status}`);

  // reset request answers the same way for known and unknown addresses
  const t = async (email) => { const s = Date.now(); const x = await req('POST', '/api/auth/forgot-password', { body: { email } }); return { ms: Date.now() - s, status: x.status, msg: x.json && x.json.message }; };
  const known = await t('ravi.v3@test.local'); const unknown = await t('nobody.at.all@test.local');
  check('F1 forgot-password: same answer for known / unknown address', known.status === unknown.status && known.msg === unknown.msg, `${known.status}/${unknown.status} (${known.ms} ms / ${unknown.ms} ms)`);

  await mongoose.disconnect();
  console.log('\nFAILED:', results.filter((x) => !x.ok).length, 'of', results.length);
})().catch((e) => { console.error(e); process.exit(1); });
