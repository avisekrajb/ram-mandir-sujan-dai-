// Fires every route as (a) anonymous and (b) a plain logged-in user at the ISOLATED backend and
// prints anything that is not a clean 401/403 so it can be judged by hand.
const BASE = process.env.SEC_BASE || 'http://127.0.0.1:5700';
const routes = require('./routes.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OID = '64b0f0f0f0f0f0f0f0f0f0f0';

async function call(method, url, token, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  try {
    const r = await fetch(BASE + url, { method, headers, body: ['GET', 'DELETE', 'HEAD'].includes(method) ? undefined : JSON.stringify(body || {}), redirect: 'manual', signal: AbortSignal.timeout(15000) });
    let text = ''; try { text = (await r.text()).slice(0, 160).replace(/\s+/g, ' '); } catch {}
    return { status: r.status, text };
  } catch (e) { return { status: 'ERR', text: e.message }; }
}
const fill = (p) => p
  .replace(/:id|:donationId/g, OID).replace(/:token/g, 'abc123').replace(/:date/g, '2026-10-05')
  .replace(/:collection/g, 'users').replace(/:publicId/g, 'x').replace(/:param/g, OID);

(async () => {
  // a plain user
  const email = 'plain.user@test.local', password = 'PlainUser#12345';
  let r = await call('POST', '/api/auth/signup', null, { name: 'Plain User', email, password, confirmPassword: password });
  let login = await call('POST', '/api/auth/login', null, { email, password });
  let token; try { token = JSON.parse(await (await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })).text()).token; } catch {}
  console.log('signup:', r.status, '| login:', login.status, '| have token:', !!token);
  if (!token) { console.log(r.text, login.text); process.exit(1); }

  const rows = [];
  for (const rt of routes) {
    const url = fill(rt.path);
    if (/\/db\/.*clear|\/db\/users$|backup\/create/.test(url) && false) continue;
    const a = await call(rt.method, url, null);
    await sleep(15);
    const u = await call(rt.method, url, token);
    await sleep(15);
    rows.push({ m: rt.method, p: rt.path, anon: a.status, user: u.status, aText: a.text, uText: u.text });
  }
  require('fs').writeFileSync(__dirname + '/authz-results.json', JSON.stringify(rows, null, 1));
  const bad = (s) => !(s === 401 || s === 403);
  console.log('\n== ANONYMOUS got something other than 401/403 ==');
  for (const x of rows.filter((x) => bad(x.anon))) console.log(String(x.anon).padEnd(4), x.m.padEnd(7), x.p, '=>', x.aText.slice(0, 90));
  console.log('\n== PLAIN USER got something other than 401/403 on /admin or /superadmin or admin-ish paths ==');
  for (const x of rows.filter((x) => /\/admin|\/superadmin|backup|\/stats|interested-users|\/reply|\/send-email|\/bulk/.test(x.p) && bad(x.user))) console.log(String(x.user).padEnd(4), x.m.padEnd(7), x.p, '=>', x.uText.slice(0, 90));
})().catch((e) => { console.error(e); process.exit(1); });
