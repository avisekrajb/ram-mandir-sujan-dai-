// Newsletter API tests against the ISOLATED backend (db nl_test, mail written to files in ./mail).
const fs = require('fs');
const path = require('path');
const BACKEND = 'C:/Users/Acer/Desktop/New folder/backend/backend';
const mongoose = require(BACKEND + '/node_modules/mongoose');
const bcrypt = require(BACKEND + '/node_modules/bcryptjs');
const BASE = process.env.SEC_BASE || 'http://127.0.0.1:5700';
const MAIL = path.join(__dirname, 'mail');
const results = [];
const check = (id, ok, msg) => { results.push({ id, ok }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' - ' + msg); };
let ip = 10;
const nextIp = () => `10.40.${Math.floor(++ip / 250)}.${ip % 250}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function req(method, url, { token, body, headers = {}, raw, form } = {}) {
  const h = { 'X-Forwarded-For': nextIp(), ...headers };
  if (body !== undefined && !form && !h['Content-Type']) h['Content-Type'] = 'application/json';
  if (token) h.Authorization = 'Bearer ' + token;
  try {
    const r = await fetch(BASE + url, { method, headers: h, body: form ? form : (body === undefined ? undefined : (raw ? body : JSON.stringify(body))), redirect: 'manual', signal: AbortSignal.timeout(30000) });
    const buf = Buffer.from(await r.arrayBuffer()); const text = buf.toString('utf8'); let json; try { json = JSON.parse(text); } catch {}
    // the confirmation e-mail is sent in the background: give it a moment after every form post
    if (method === 'POST' && url === '/api/subscribe') await sleep(250);
    return { status: r.status, json, text, buf, headers: r.headers };
  } catch (e) { return { status: 'ERR', text: e.message, headers: new Headers() }; }
}
const readMails = () => fs.existsSync(MAIL) ? fs.readdirSync(MAIL).filter((f) => f.endsWith('.json')).sort().map((f) => ({ file: f, ...JSON.parse(fs.readFileSync(path.join(MAIL, f), 'utf8')) })) : [];
const mailsTo = (email) => readMails().filter((m) => String(m.to).toLowerCase() === email.toLowerCase());
const clearMail = () => { if (fs.existsSync(MAIL)) for (const f of fs.readdirSync(MAIL)) fs.unlinkSync(path.join(MAIL, f)); };
const until = async (fn, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await fn(); if (v) return v; await sleep(150); } return null; };
const tokenFromMail = (mail, kind) => { const m = new RegExp('/api/subscribe/' + kind + '/([a-f0-9]{48})').exec(mail.text + mail.html); return m && m[1]; };

(async () => {
  clearMail();
  await mongoose.connect('mongodb://127.0.0.1:27700/nl_test');
  const db = mongoose.connection.db;
  const subs = db.collection('subscribers');
  let r;

  // ---------- accounts for the admin checks
  const login = async (email, password) => (await req('POST', '/api/auth/login', { body: { email, password } })).json;
  const sa = (await login('super@test.local', 'SuperTest#12345')).token;
  const hash = await bcrypt.hash('Admin#Pass2026z', 4);
  await db.collection('users').insertMany([
    { name: 'Content Only Admin', email: 'content.admin@test.local', password: hash, role: 'admin', permissions: ['content'], active: true, createdAt: new Date(), updatedAt: new Date() },
    { name: 'Contact Admin', email: 'contact.admin@test.local', password: hash, role: 'admin', permissions: ['contact', 'content'], active: true, createdAt: new Date(), updatedAt: new Date() },
  ]);
  const contactAdmin = (await login('contact.admin@test.local', 'Admin#Pass2026z')).token;
  const contentAdmin = (await login('content.admin@test.local', 'Admin#Pass2026z')).token;
  await req('POST', '/api/auth/signup', { body: { name: 'Plain Reader', email: 'plain.reader@test.local', password: 'Temple#Lotus2026' } });
  const plain = (await login('plain.reader@test.local', 'Temple#Lotus2026')).token;
  check('0 setup', !!(sa && contactAdmin && contentAdmin && plain), 'tokens ok');

  // ---------- A. public subscribe flow
  const A = 'devotee.one@test.local';
  r = await req('POST', '/api/subscribe', { body: { email: A, lang: 'ne', topics: ['events', 'festivals'] } });
  check('A1 form answers generically', r.status === 200 && r.json.state === 'check_inbox', `${r.status} ${r.text.slice(0, 120)}`);
  let sub = await subs.findOne({ email: A });
  check('A2 stored as pending with a confirm token and the chosen topics/language', sub && sub.status === 'pending' && /^[a-f0-9]{48}$/.test(sub.confirmToken) && sub.lang === 'ne' && sub.topics.join() === 'events,festivals', JSON.stringify(sub && { s: sub.status, l: sub.lang, t: sub.topics }));
  let mails = mailsTo(A);
  check('A3 exactly one confirmation e-mail, in Nepali, with the confirm link', mails.length === 1 && /[\u0900-\u097F]/.test(mails[0].subject) && tokenFromMail(mails[0], 'confirm') === sub.confirmToken, `${mails.length} mail(s), subject "${mails[0] && mails[0].subject}"`);
  check('A4 confirmation mail has no unsubscribe header / is not a mailing', mails[0] && !mails[0].headers['List-Unsubscribe'], JSON.stringify(mails[0] && mails[0].headers));

  r = await req('POST', '/api/subscribe', { body: { email: A, lang: 'ne' } });
  check('A5 asking again at once: same answer, no second mail', r.status === 200 && r.json.state === 'check_inbox' && mailsTo(A).length === 1, `${r.status}, mails ${mailsTo(A).length}`);

  r = await req('GET', '/api/subscribe/confirm/' + sub.confirmToken);
  sub = await subs.findOne({ email: A });
  check('A6 opening the confirm link (GET) shows a button and changes NOTHING', r.status === 200 && /<form/.test(r.text) && sub.status === 'pending', `${r.status}, status ${sub.status}`);
  check('A7 confirm page has its own CSP (inline style + form) and is not cached', /style-src 'unsafe-inline'/.test(r.headers.get('content-security-policy') || '') && /no-store/.test(r.headers.get('cache-control') || ''), r.headers.get('content-security-policy'));

  check('A7b the page lets the browser send its own Origin on the button press (not Origin: null)', r.headers.get('referrer-policy') === 'same-origin', r.headers.get('referrer-policy'));
  r = await req('POST', '/api/subscribe/confirm/' + sub.confirmToken);
  sub = await subs.findOne({ email: A });
  check('A8 pressing the button activates the subscription (page in Nepali)', r.status === 200 && sub.status === 'active' && !sub.confirmToken && /[\u0900-\u097F]/.test(r.text), `${r.status}, ${sub.status}`);
  await until(() => mailsTo(A).length >= 2, 5000);
  const welcome = mailsTo(A)[1];
  check('A9 a welcome e-mail follows, with the unsubscribe link and headers', welcome && /unsubscribe/.test(welcome.headers['List-Unsubscribe'] || '') && /One-Click/.test(welcome.headers['List-Unsubscribe-Post'] || '') && tokenFromMail(welcome, 'unsubscribe') === sub.unsubscribeToken, JSON.stringify(welcome && welcome.headers));
  r = await req('POST', '/api/subscribe/confirm/' + sub.unsubscribeToken);
  check('A10 a wrong / used token is a clean 404 page', r.status === 404, `${r.status}`);
  r = await req('POST', '/api/subscribe/confirm/not-a-token');
  check('A11 garbage token is a clean 404', r.status === 404, `${r.status}`);

  const before = mailsTo(A).length;
  r = await req('POST', '/api/subscribe', { body: { email: A.toUpperCase(), lang: 'en', topics: ['news'] } });
  sub = await subs.findOne({ email: A });
  check('A12 an ACTIVE address cannot be changed or mailed through the public form (answer identical)', r.status === 200 && r.json.state === 'check_inbox' && sub.topics.join() === 'events,festivals' && sub.lang === 'ne' && mailsTo(A).length === before, `topics ${sub.topics}, lang ${sub.lang}`);

  const unknown = await req('POST', '/api/subscribe', { body: { email: 'never.seen.before@test.local' } });
  const known = await req('POST', '/api/subscribe', { body: { email: A } });
  check('A13 answer for a known and an unknown address is identical (no enumeration)', JSON.stringify(unknown.json) === JSON.stringify(known.json), JSON.stringify(known.json));

  for (const [label, body, status] of [['not an e-mail', { email: 'nope' }, 400], ['object', { email: { $ne: null } }, 400], ['list of addresses', { email: 'a@b.co,c@d.co' }, 400], ['array', { email: ['a@b.co'] }, 400], ['missing', {}, 400]]) {
    r = await req('POST', '/api/subscribe', { body });
    check('A14 refused: ' + label, r.status === status, `${r.status}`);
  }
  const countBefore = await subs.countDocuments();
  r = await req('POST', '/api/subscribe', { body: { email: 'bot.caught@test.local', hp_field: 'http://spam' } });
  check('A15 the hidden bot field is answered OK but nothing is stored or mailed', r.status === 200 && (await subs.countDocuments()) === countBefore && mailsTo('bot.caught@test.local').length === 0, `${r.status}`);
  r = await req('POST', '/api/subscribe', { body: { email: 'topics.junk@test.local', topics: ['events', 'admin', { a: 1 }, 'news'] } });
  sub = await subs.findOne({ email: 'topics.junk@test.local' });
  check('A16 unknown topics are dropped', sub && sub.topics.join() === 'events,news', `${sub && sub.topics}`);
  r = await req('POST', '/api/subscribe', { body: { email: 'lang.junk@test.local', lang: 'xx<script>' } });
  sub = await subs.findOne({ email: 'lang.junk@test.local' });
  check('A17 an unknown language falls back to English', sub && sub.lang === 'en', `${sub && sub.lang}`);

  const fixedIp = '198.51.100.77';
  const codes = [];
  for (let i = 0; i < 12; i += 1) codes.push((await req('POST', '/api/subscribe', { headers: { 'X-Forwarded-For': fixedIp }, body: { email: `flood${i}@test.local` } })).status);
  check('A18 the form is rate limited per address (10 an hour)', codes.slice(0, 10).every((c) => c === 200) && codes.slice(10).every((c) => c === 429), codes.join(','));

  // signed-in owner of a verified address: no round trip
  await db.collection('users').updateOne({ email: 'plain.reader@test.local' }, { $set: { emailVerified: true } });
  r = await req('POST', '/api/subscribe', { token: plain, body: { email: 'plain.reader@test.local', lang: 'en', topics: ['news'] } });
  sub = await subs.findOne({ email: 'plain.reader@test.local' });
  check('A19 a signed-in owner of a VERIFIED address is subscribed at once', r.json && r.json.state === 'subscribed' && sub.status === 'active' && sub.source === 'account', `${r.status} ${r.json && r.json.state}`);
  r = await req('POST', '/api/subscribe', { token: plain, body: { email: 'someone.else@test.local' } });
  sub = await subs.findOne({ email: 'someone.else@test.local' });
  check('A20 a signed-in person typing ANOTHER address still gets the confirmation route', r.json.state === 'check_inbox' && sub && sub.status === 'pending', `${r.json && r.json.state}, ${sub && sub.status}`);

  // unsubscribe
  const unsubToken = (await subs.findOne({ email: A })).unsubscribeToken;
  r = await req('GET', '/api/subscribe/unsubscribe/' + unsubToken);
  sub = await subs.findOne({ email: A });
  check('A21 opening the unsubscribe link (GET) shows a button and changes nothing; the address is masked', r.status === 200 && sub.status === 'active' && /<form/.test(r.text) && !r.text.includes(A) && /d\*\*\*@/.test(r.text), `${r.status}`);
  r = await req('POST', '/api/subscribe/unsubscribe/' + unsubToken, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'List-Unsubscribe=One-Click', raw: true });
  sub = await subs.findOne({ email: A });
  check('A22 the one-click unsubscribe POST (mail programs) works', r.status === 200 && sub.status === 'unsubscribed' && !!sub.unsubscribedAt, `${r.status}, ${sub.status}`);
  r = await req('POST', '/api/subscribe/unsubscribe/' + 'f'.repeat(48));
  check('A23 unknown unsubscribe token: clean 404', r.status === 404, `${r.status}`);
  r = await req('POST', '/api/subscribe', { body: { email: A, lang: 'ne' } });
  sub = await subs.findOne({ email: A });
  check('A24 someone who unsubscribed must confirm again to come back', sub.status === 'pending' && /^[a-f0-9]{48}$/.test(sub.confirmToken), `${sub.status}`);

  // ---------- A2. hardening found by the independent review
  const { nptNow } = require(BACKEND + '/src/utils/reminderDates');
  const settingsCol = db.collection('templenewslettersettings');
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // parallel requests for the same waiting address: exactly one confirmation e-mail
  const R = 'race.target@test.local';
  await subs.insertOne({ email: R, status: 'pending', topics: ['news'], lang: 'en', confirmToken: 'c'.repeat(48), unsubscribeToken: 'd'.repeat(48), confirmSentAt: hourAgo, confirmSendDay: nptNow().date, confirmSendCount: 1, subscribedAt: new Date(), source: 'test' });
  const raced = await Promise.all(Array.from({ length: 8 }, () => req('POST', '/api/subscribe', { body: { email: R } })));
  await sleep(600);
  const rSub = await subs.findOne({ email: R });
  check('A25 8 parallel requests for one waiting address send exactly ONE confirmation, and count it', raced.every((x) => x.status === 200) && mailsTo(R).length === 1 && rSub.confirmSendCount === 2, `${mailsTo(R).length} mail(s), counter ${rSub.confirmSendCount}`);
  r = await req('POST', '/api/subscribe', { body: { email: R } });
  await sleep(300);
  check('A25b ...and the next ask within 10 minutes sends none', mailsTo(R).length === 1, `${mailsTo(R).length} mail(s)`);
  await subs.updateOne({ email: R }, { $set: { confirmSentAt: hourAgo, confirmSendCount: 3, confirmSendDay: nptNow().date } });
  r = await req('POST', '/api/subscribe', { body: { email: R } });
  await sleep(300);
  check('A25c ...and a fourth confirmation in one day is refused', mailsTo(R).length === 1, `${mailsTo(R).length} mail(s)`);

  // an IPv6 client cannot rotate through its own /64 to dodge the limit
  const v6 = [];
  for (let i = 0; i < 13; i += 1) v6.push((await req('POST', '/api/subscribe', { headers: { 'X-Forwarded-For': `2001:db8:77:9:${(i + 1).toString(16)}::${(i + 7).toString(16)}` }, body: { email: `v6.${i}@test.local` } })).status);
  check('A26 addresses inside one IPv6 /64 share ONE rate-limit allowance', v6.slice(0, 10).every((c) => c === 200) && v6.slice(10).every((c) => c === 429), v6.join(','));

  // a global ceiling on confirmation e-mails per day (stops the form from using up the sending account)
  await settingsCol.updateOne({ key: 'main' }, { $set: { 'confirmToday.date': nptNow().date, 'confirmToday.count': 100000 } }, { upsert: true });
  const mailsBefore = readMails().length;
  r = await req('POST', '/api/subscribe', { body: { email: 'over.budget@test.local' } });
  await sleep(300);
  check('A27 when today\'s confirmation budget is used up the answer is unchanged, nothing is stored or mailed', r.status === 200 && r.json.state === 'check_inbox' && !(await subs.findOne({ email: 'over.budget@test.local' })) && readMails().length === mailsBefore, `${r.status}`);
  await settingsCol.updateOne({ key: 'main' }, { $set: { 'confirmToday.count': 0 } });

  // a confirmation link is good for 7 days
  const L = 'old.link@test.local';
  await subs.insertOne({ email: L, status: 'pending', topics: ['news'], lang: 'en', confirmToken: 'e1'.repeat(24), unsubscribeToken: 'f1'.repeat(24), confirmSentAt: new Date(Date.now() - 8 * 24 * 3600 * 1000), confirmSendDay: '2000-01-01', confirmSendCount: 1, subscribedAt: new Date(), source: 'test' });
  r = await req('GET', '/api/subscribe/confirm/' + 'e1'.repeat(24));
  const r2b = await req('POST', '/api/subscribe/confirm/' + 'e1'.repeat(24));
  check('A28 a confirmation link older than 7 days no longer works (and activates nothing)', r.status === 404 && r2b.status === 404 && (await subs.findOne({ email: L })).status === 'pending', `${r.status}/${r2b.status}`);
  r = await req('POST', '/api/subscribe', { body: { email: L } });
  await sleep(500);
  check('A28b ...asking again sends a fresh link', mailsTo(L).length === 1, `${mailsTo(L).length} mail(s)`);

  // ---------- B. e-mail templates (all kinds x all languages)
  const { buildNewsletterEmail, LANGS } = require(BACKEND + '/src/services/newsletterEmail');
  const dataFor = {
    confirm: {},
    welcome: {},
    event: { title: { en: 'Ram Navami Puja', ne: 'राम नवमी पूजा' }, summary: { en: 'Join us for the aarti.\n\nBring flowers.' }, dateText: { en: '26 March 2026', ne: 'चैत्र १२' }, photo: 'https://res.cloudinary.com/demo/image/upload/x.jpg', url: 'https://temple.example.test/events' },
    blog: { title: { en: 'About Dashain' }, summary: { en: 'A short note.' }, url: 'https://temple.example.test/blogs/1' },
    festival: { key: 'vijaya-dashami-dashain', nameEn: 'Vijaya Dashami (Dashain)', nameNe: 'विजया दशमी', messages: null },
    custom: { subject: { en: 'Temple closed on Friday' }, body: { en: 'The temple opens at noon.' }, url: 'https://temple.example.test/', buttonLabel: { en: '' } },
  };
  let bad = [];
  for (const kind of Object.keys(dataFor)) for (const lang of LANGS) {
    const m = buildNewsletterEmail({ kind, lang, data: dataFor[kind], siteUrl: 'https://temple.example.test', confirmUrl: 'https://api.example.test/confirm/x', unsubscribeUrl: 'https://api.example.test/unsub/y', topics: ['events', 'news'] });
    const all = m.subject + m.html + m.text;
    if (!m.subject || !m.html || /undefined|\{name\}|\{temple\}|\[object/.test(all)) bad.push(`${kind}/${lang}`);
    if (kind !== 'confirm' && !/unsub\/y/.test(m.html)) bad.push(`${kind}/${lang} (no unsubscribe link)`);
  }
  check('B1 every kind x every language builds a complete e-mail (no leftovers, unsubscribe link in every mailing)', bad.length === 0, bad.join(', ') || '30 combinations');
  const evil = buildNewsletterEmail({ kind: 'event', lang: 'en', data: { title: { en: '<img src=x onerror=alert(1)>Puja' }, summary: { en: '<script>alert(1)</script>"quote"' }, dateText: { en: '<b>1 Jan</b>' }, photo: 'javascript:alert(1)', url: 'javascript:alert(2)' }, siteUrl: 'https://temple.example.test', unsubscribeUrl: 'https://x.test/u' });
  check('B2 markup typed by an admin is escaped, javascript: image / link dropped', !/<img src=x|<script|<b>1 Jan|javascript:/i.test(evil.html) && /&lt;img/.test(evil.html), 'escaped');
  const crlf = buildNewsletterEmail({ kind: 'custom', lang: 'en', data: { subject: { en: 'Hello\r\nBcc: victim@x.com' }, body: { en: 'x' } }, siteUrl: 'https://t.test', unsubscribeUrl: 'https://x.test/u' });
  check('B3 a line break in the subject cannot add a header', !/[\r\n]/.test(crlf.subject), JSON.stringify(crlf.subject));
  const fest = buildNewsletterEmail({ kind: 'festival', lang: 'ne', data: dataFor.festival, siteUrl: 'https://t.test', unsubscribeUrl: 'https://x.test/u' });
  check('B4 festival wish in Nepali uses the Nepali name and the special Vijaya Dashami wording', /विजया दशमी/.test(fest.subject) && /टीका/.test(fest.html), fest.subject);
  const festHi = buildNewsletterEmail({ kind: 'festival', lang: 'hi', data: dataFor.festival, siteUrl: 'https://t.test', unsubscribeUrl: 'https://x.test/u' });
  check('B5 festival wish in Hindi uses the standard Hindi wording', /हार्दिक/.test(festHi.html), festHi.subject);
  const festOverride = buildNewsletterEmail({ kind: 'festival', lang: 'en', data: { ...dataFor.festival, messages: { en: 'Our own words for you.' } }, siteUrl: 'https://t.test', unsubscribeUrl: 'https://x.test/u' });
  check('B6 an admin-written wish replaces the standard wording', /Our own words for you/.test(festOverride.html) && !/May the victory of good over evil/.test(festOverride.html), 'override used');

  // ---------- E. admin API access
  for (const [label, token, expected] of [['anonymous', undefined, 401], ['ordinary user', plain, 403], ['admin without the "contact" area', contentAdmin, 403], ['admin with the "contact" area', contactAdmin, 200], ['super admin', sa, 200]]) {
    r = await req('GET', '/api/newsletter/overview', { token });
    check('E1 overview as ' + label, r.status === expected, `${r.status}`);
  }
  r = await req('GET', '/api/newsletter/subscribers.csv', { token: plain });
  check('E2 the export is not available to an ordinary user', r.status === 403, `${r.status}`);
  r = await req('GET', '/api/newsletter/overview', { token: sa });
  const ov = r.json.data;
  check('E3 overview counts make sense and e-mail is ready (debug mode)', ov.counts.total >= 5 && ov.counts.active >= 1 && ov.counts.pending >= 1 && ov.emailReady === true, JSON.stringify(ov.counts));
  r = await req('GET', '/api/newsletter/subscribers?status=pending&limit=5', { token: sa });
  check('E4 list with a status filter', r.status === 200 && r.json.data.every((s) => s.status === 'pending') && !JSON.stringify(r.json).includes('confirmToken') && !JSON.stringify(r.json).includes('unsubscribeToken'), `${r.json.total} pending; no tokens exposed`);
  r = await req('GET', '/api/newsletter/subscribers?q=' + encodeURIComponent('.*'), { token: sa });
  check('E5 a regex typed into search is taken literally', r.status === 200 && r.json.total === 0, `${r.json.total} matches`);
  await subs.insertOne({ email: '=cmd@test.local', status: 'active', topics: ['news'], lang: 'en', unsubscribeToken: 'e'.repeat(48), subscribedAt: new Date(), source: 'admin' });
  r = await req('GET', '/api/newsletter/subscribers.csv', { token: sa });
  check('E6 CSV export neutralises spreadsheet formulas and carries a BOM', r.status === 200 && /'=cmd@test\.local/.test(r.text) && (r.buf[0] === 0xEF && r.buf[1] === 0xBB && r.buf[2] === 0xBF) && /text\/csv/.test(r.headers.get('content-type')), r.text.split('\n')[1]);
  const victim = await subs.findOne({ email: 'flood1@test.local' });
  r = await req('DELETE', '/api/newsletter/subscribers/' + victim._id, { token: sa });
  check('E7 deleting a subscriber', r.status === 200 && !(await subs.findOne({ _id: victim._id })), `${r.status}`);
  r = await req('DELETE', '/api/newsletter/subscribers/not-an-id', { token: sa });
  check('E8 bad id is a 404', r.status === 404, `${r.status}`);
  r = await req('PUT', '/api/newsletter/settings', { token: sa, body: { dailyCap: 0 } });
  const r2 = await req('PUT', '/api/newsletter/settings', { token: sa, body: { dailyCap: 'many' } });
  check('E9 daily limit must be a sensible whole number', r.status === 400 && r2.status === 400, `${r.status}/${r2.status}`);
  r = await req('PUT', '/api/newsletter/settings', { token: sa, body: { autoEvents: false, autoBlogs: true, festivalWishesEnabled: true, dailyCap: 500, role: 'admin' } });
  const st = await db.collection('templenewslettersettings').findOne({ key: 'main' });
  check('E10 settings saved (unknown fields ignored)', r.status === 200 && st.autoEvents === false && st.dailyCap === 500 && st.role === undefined, JSON.stringify({ a: st.autoEvents, c: st.dailyCap }));

  // ---------- F. festivals
  r = await req('GET', '/api/newsletter/festivals?days=200', { token: sa });
  const fl = r.json && r.json.data;
  if (r.status === 502) { console.log('SKIP F (festival calendar unreachable from this machine)'); }
  else {
    check('F1 upcoming festivals listed, with the major ones on by default', r.status === 200 && fl.length > 0 && fl.some((f) => f.enabled && f.defaultOn) && fl.every((f) => f.nameEn && f.key && f.date), `${fl.length} festivals, ${fl.filter((f) => f.enabled).length} on`);
    check('F2 national days / world days are never offered', !fl.some((f) => /constitution|world |international|labour|republic/i.test(f.nameEn)), 'clean');
    const dash = fl.find((f) => /vijaya dashami/i.test(f.nameEn));
    if (dash) {
      r = await req('PUT', '/api/newsletter/festivals/' + dash.key, { token: sa, body: { enabled: false, message: { en: 'Hand written wish', ne: 'हातले लेखिएको शुभकामना', xx: 'ignored', hi: 'x'.repeat(2000) } } });
      let o = (await db.collection('templenewslettersettings').findOne({ key: 'main' })).festivalWishes.overrides[dash.key];
      check('F3 switching a festival off and writing its wording', r.status === 200 && o.enabled === false && o.message.en === 'Hand written wish' && !o.message.xx && o.message.hi.length === 1500, JSON.stringify(Object.keys(o.message)));
      r = await req('GET', '/api/newsletter/festivals?days=200', { token: sa });
      const again = r.json.data.find((f) => f.key === dash.key);
      check('F4 the list reflects it', again && again.enabled === false && again.messages && again.messages.en === 'Hand written wish', 'enabled=' + (again && again.enabled));
      r = await req('PUT', '/api/newsletter/festivals/' + dash.key, { token: sa, body: {} });
      o = (await db.collection('templenewslettersettings').findOne({ key: 'main' })).festivalWishes.overrides[dash.key];
      check('F5 an empty update removes the override (back to the built-in default)', r.status === 200 && o === undefined, 'removed');
    }
    for (const bad2 of ['../x', 'A B', '__proto__', 'a', 'x'.repeat(90)]) {
      r = await req('PUT', '/api/newsletter/festivals/' + encodeURIComponent(bad2), { token: sa, body: { enabled: true } });
      check('F6 odd festival key refused: ' + bad2.slice(0, 12), r.status === 400 || r.status === 404, `${r.status}`);
    }
  }

  // ---------- G. announce / test
  await req('PUT', '/api/newsletter/settings', { token: sa, body: { autoEvents: true } });
  await db.collection('subscribers').deleteMany({});
  const mk = (email, lang, topics, status = 'active') => ({ email, status, topics, lang, unsubscribeToken: Buffer.from(email).toString('hex').padEnd(48, '0').slice(0, 48), subscribedAt: new Date(), confirmedAt: new Date(), source: 'test' });
  await subs.insertMany([
    mk('en.events@test.local', 'en', ['events', 'news']),
    mk('ne.events@test.local', 'ne', ['events']),
    mk('hi.news@test.local', 'hi', ['news']),
    mk('zh.all@test.local', 'zh', ['events', 'festivals', 'news']),
    mk('ta.fest@test.local', 'ta', ['festivals']),
    mk('gone@test.local', 'en', ['events', 'news'], 'unsubscribed'),
    mk('waiting@test.local', 'en', ['events', 'news'], 'pending'),
  ]);
  clearMail();
  r = await req('GET', '/api/newsletter/audience?topic=events', { token: sa });
  check('G1 audience counts only ACTIVE subscribers who ticked the topic', r.json.data.count === 3, `${r.json.data.count}`);

  r = await req('POST', '/api/newsletter/test', { token: contactAdmin, body: { kind: 'custom', lang: 'ne', subject: { en: 'Test subject' }, body: { en: 'Test body' } } });
  const testMail = mailsTo('contact.admin@test.local')[0];
  check('G2 a test mail goes to the admin only, marked as a test, nobody else', r.status === 200 && testMail && /^\[Test\]/.test(testMail.subject) && readMails().length === 1, `${r.status}, ${readMails().length} mail(s)`);

  const ev = (await req('POST', '/api/admin/events', { token: sa, body: { date: '2026-12-01', title: { en: 'Winter Aarti', ne: 'हिउँदे आरती' }, desc: { en: 'Evening aarti with bhajan.', ne: 'सन्ध्या आरती र भजन।' }, dateNepali: { ne: 'मंसिर १५' } } })).json;
  const evId = ev && ev.data && ev.data._id;
  const camp1 = await until(async () => { const c = await db.collection('templenewslettercampaigns').findOne({ dedupeKey: 'event:' + evId }); return c && c.status === 'done' ? c : null; });
  check('G3 creating an event queues ONE mailing and it is sent to the 3 event subscribers', !!camp1 && camp1.stats.sent === 3 && camp1.stats.failed === 0, camp1 ? JSON.stringify(camp1.stats) : 'no campaign');
  const evMails = readMails().filter((m) => /Winter Aarti|हिउँदे आरती/.test(m.subject));
  const recipients = evMails.map((m) => m.to).sort();
  check('G4 only the right people got it (not unsubscribed / pending / other topics)', recipients.join() === 'en.events@test.local,ne.events@test.local,zh.all@test.local', recipients.join());
  const neMail = evMails.find((m) => m.to === 'ne.events@test.local');
  const zhMail = evMails.find((m) => m.to === 'zh.all@test.local');
  check('G5 each in their own language (Nepali title for the Nepali subscriber, English fallback for Chinese)', neMail && /हिउँदे आरती/.test(neMail.subject) && /मंसिर १५/.test(neMail.html) && zhMail && /Winter Aarti/.test(zhMail.subject), `${neMail && neMail.subject} | ${zhMail && zhMail.subject}`);
  check('G6 every mail has its OWN unsubscribe link and the one-click headers', evMails.every((m) => { const t = tokenFromMail(m, 'unsubscribe'); return t && m.headers['List-Unsubscribe'].includes(t) && /One-Click/.test(m.headers['List-Unsubscribe-Post']); }) && new Set(evMails.map((m) => tokenFromMail(m, 'unsubscribe'))).size === 3, 'distinct tokens');
  const subCount = await db.collection('templenewslettercampaigns').countDocuments({ dedupeKey: 'event:' + evId });
  check('G7 the stored mailing remembers where it got to', camp1.lastRecipientId && camp1.startedAt && camp1.finishedAt && subCount === 1, 'cursor stored');

  clearMail();
  r = await req('POST', '/api/admin/events', { token: sa, body: { date: '2026-12-02', title: { en: 'Silent Event' }, desc: { en: 'x' }, notifySubscribers: false } });
  await sleep(1500);
  check('G8 an event can be created without mailing (notifySubscribers:false)', r.status === 201 && readMails().length === 0 && (await db.collection('templenewslettercampaigns').countDocuments({ label: 'Silent Event' })) === 0, `${readMails().length} mails`);

  await req('PUT', '/api/newsletter/settings', { token: sa, body: { autoEvents: false } });
  r = await req('POST', '/api/admin/events', { token: sa, body: { date: '2026-12-03', title: { en: 'Auto Off Event' }, desc: { en: 'x' } } });
  await sleep(1500);
  check('G9 with automatic event mails switched off nothing is sent', r.status === 201 && readMails().length === 0, `${readMails().length}`);
  await req('PUT', '/api/newsletter/settings', { token: sa, body: { autoEvents: true } });

  // manual announce of an event
  const ev2 = (await req('POST', '/api/admin/events', { token: sa, body: { date: '2026-12-04', title: { en: 'Manual Event' }, desc: { en: 'x' }, notifySubscribers: false } })).json;
  r = await req('POST', '/api/newsletter/announce', { token: contactAdmin, body: { kind: 'event', eventId: ev2.data._id } });
  check('G10 announcing an event by hand', r.status === 201 && r.json.data.audience === 3, `${r.status} ${JSON.stringify(r.json.data || r.json)}`);
  await until(async () => (await db.collection('templenewslettercampaigns').findOne({ dedupeKey: 'event:' + ev2.data._id }) || {}).status === 'done');
  r = await req('POST', '/api/newsletter/announce', { token: contactAdmin, body: { kind: 'event', eventId: ev2.data._id } });
  check('G11 the same event cannot be mailed twice by accident (409)', r.status === 409 && r.json.code === 'ALREADY_SENT', `${r.status}`);
  r = await req('POST', '/api/newsletter/announce', { token: contactAdmin, body: { kind: 'event', eventId: ev2.data._id, resend: true } });
  check('G12 ...unless "send again" is chosen', r.status === 201, `${r.status}`);

  // blog: draft -> nothing; publish -> once
  clearMail();
  await until(async () => (await db.collection('templenewslettercampaigns').countDocuments({ status: { $in: ['queued', 'sending'] } })) === 0);
  clearMail();
  const blog = (await req('POST', '/api/admin/blogs', { token: sa, body: { title: { en: 'Draft Post' }, excerpt: { en: 'Short note.' }, content: { en: 'Long text.' }, published: false } })).json;
  await sleep(1200);
  check('G13 a DRAFT blog post is never mailed', readMails().length === 0, `${readMails().length}`);
  await req('PUT', `/api/admin/blogs/${blog.data._id}/toggle`, { token: sa });
  const bc = await until(async () => { const c = await db.collection('templenewslettercampaigns').findOne({ dedupeKey: 'blog:' + blog.data._id }); return c && c.status === 'done' ? c : null; });
  check('G14 publishing it mails the "news" subscribers once', !!bc && bc.stats.sent === 3, bc ? JSON.stringify(bc.stats) : 'none');
  await req('PUT', `/api/admin/blogs/${blog.data._id}/toggle`, { token: sa });
  await req('PUT', `/api/admin/blogs/${blog.data._id}/toggle`, { token: sa });
  await sleep(1500);
  check('G15 switching it off and on again does not mail it again', (await db.collection('templenewslettercampaigns').countDocuments({ kind: 'blog', 'payload.blogId': String(blog.data._id) })) === 1, 'one mailing');

  // custom announcement
  clearMail();
  r = await req('POST', '/api/newsletter/announce', { token: contactAdmin, body: { kind: 'custom', topic: 'news', subject: { en: 'Temple closed Friday', ne: 'शुक्रबार मन्दिर बन्द' }, body: { en: 'Closed for cleaning.\n\nOpen again Saturday.', ne: 'सरसफाइका लागि बन्द।' }, url: 'https://temple.example.test/' } });
  const cc = await until(async () => { const c = await db.collection('templenewslettercampaigns').findOne({ kind: 'custom' }); return c && c.status === 'done' ? c : null; });
  check('G16 a custom announcement reaches the "news" subscribers', r.status === 201 && cc && cc.stats.sent === 3, `${r.status} ${cc && JSON.stringify(cc.stats)}`);
  for (const [label, body] of [['javascript: link', { subject: { en: 's' }, body: { en: 'b' }, url: 'javascript:alert(1)' }], ['no subject', { subject: { en: '' }, body: { en: 'b' } }], ['no body', { subject: { en: 's' }, body: { en: '' } }], ['ftp link', { subject: { en: 's' }, body: { en: 'b' }, url: 'ftp://x' }]]) {
    r = await req('POST', '/api/newsletter/announce', { token: contactAdmin, body: { kind: 'custom', ...body } });
    check('G17 refused: ' + label, r.status === 400, `${r.status}`);
  }
  r = await req('POST', '/api/newsletter/announce', { token: contentAdmin, body: { kind: 'custom', subject: { en: 's' }, body: { en: 'b' } } });
  check('G18 an admin without the contact area cannot send', r.status === 403, `${r.status}`);
  r = await req('POST', '/api/newsletter/announce', { token: contactAdmin, body: { kind: 'event', eventId: 'x' } });
  check('G19 bad event id', r.status === 400, `${r.status}`);

  // campaigns list / cancel / retry
  r = await req('GET', '/api/newsletter/campaigns', { token: sa });
  check('G20 recent mailings are listed with their counts (no recipient data)', r.status === 200 && r.json.data.length >= 4 && !JSON.stringify(r.json).includes('@test.local'), `${r.json.data.length} mailings`);
  const doneCampaign = r.json.data.find((c) => c.status === 'done');
  r = await req('POST', `/api/newsletter/campaigns/${doneCampaign._id}/cancel`, { token: sa });
  const r3 = await req('POST', `/api/newsletter/campaigns/${doneCampaign._id}/retry`, { token: sa });
  check('G21 a finished mailing can be neither stopped nor retried', r.status === 409 && r3.status === 409, `${r.status}/${r3.status}`);

  // a mailing that cannot send: it is marked failed, then retried
  const failing = await db.collection('templenewslettercampaigns').insertOne({ kind: 'custom', topic: 'news', payload: { subject: { en: 'x' }, body: { en: 'y' } }, label: 'Failing one', status: 'failed', error: 'test', stats: { total: 0, sent: 0, failed: 0, skipped: 0 }, createdAt: new Date(), updatedAt: new Date() });
  r = await req('POST', `/api/newsletter/campaigns/${failing.insertedId}/retry`, { token: sa });
  const retried = await until(async () => { const c = await db.collection('templenewslettercampaigns').findOne({ _id: failing.insertedId }); return c && c.status === 'done' ? c : null; });
  check('G22 a failed mailing can be retried and then completes', r.status === 200 && !!retried, `${r.status}`);

  // a double click on "send" must not mail everybody twice
  const dupBody = { kind: 'custom', topic: 'events', subject: { en: 'Double click test' }, body: { en: 'Same text twice.' } };
  const d1 = await req('POST', '/api/newsletter/announce', { token: contactAdmin, body: dupBody });
  const d2 = await req('POST', '/api/newsletter/announce', { token: contactAdmin, body: dupBody });
  const d3 = await req('POST', '/api/newsletter/announce', { token: contactAdmin, body: { ...dupBody, resend: true } });
  check('G23 the same announcement sent twice in a row: second is refused (409), "send again" is allowed', d1.status === 201 && d2.status === 409 && d2.json.code === 'ALREADY_SENT' && d3.status === 201, `${d1.status}/${d2.status}/${d3.status}`);
  r = await req('GET', '/api/newsletter/overview', { token: sa });
  check('G24 overview reports the sending links as ready (BACKEND_URL set) and a Nepal-time "sent today"', r.json.data.linksReady === true && r.json.data.settings.sentTodayDate === require(BACKEND + '/src/utils/reminderDates').nptNow().date, JSON.stringify(r.json.data.settings));

  await mongoose.disconnect();
  console.log('\nFAILED:', results.filter((x) => !x.ok).length, 'of', results.length);
})().catch((e) => { console.error(e); process.exit(1); });
