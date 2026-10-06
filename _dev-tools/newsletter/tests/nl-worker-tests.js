// Newsletter worker / festival / backfill tests, IN PROCESS on a separate throw-away db (nl_unit).
const fs = require('fs');
const path = require('path');
const BACKEND = 'C:/Users/Acer/Desktop/New folder/backend/backend';
const MAIL = path.join(__dirname, 'mail-unit');
Object.assign(process.env, {
  JWT_SECRET: 'unit-test-secret-not-real-0123456789abcdef',
  NODE_ENV: 'production',
  FRONTEND_URL: 'https://temple.example.test',
  BACKEND_URL: 'https://api.example.test',
  EMAIL_USER: '', EMAIL_PASS: '',
  EMAIL_DEBUG_DIR: MAIL,
  NEWSLETTER_DELAY_MS: '0',
});
process.chdir(BACKEND);
const mongoose = require(BACKEND + '/node_modules/mongoose');
const Subscriber = require(BACKEND + '/src/models/Subscriber');
const Campaign = require(BACKEND + '/src/models/NewsletterCampaign');
const Settings = require(BACKEND + '/src/models/NewsletterSettings');
const svc = require(BACKEND + '/src/services/newsletterService');
const festivals = require(BACKEND + '/src/services/festivalService');

const results = [];
const check = (id, ok, msg) => { results.push({ id, ok }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' - ' + msg); };
const readMails = () => (fs.existsSync(MAIL) ? fs.readdirSync(MAIL).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(MAIL, f), 'utf8'))) : []);
const clearMail = () => { if (fs.existsSync(MAIL)) for (const f of fs.readdirSync(MAIL)) fs.unlinkSync(path.join(MAIL, f)); };
const hex = (n) => n.toString(16).padStart(48, '0');
const mk = (i, topics = ['news'], extra = {}) => ({ email: `user${i}@test.local`, status: 'active', topics, lang: 'en', unsubscribeToken: hex(i + 1000), subscribedAt: new Date(), ...extra });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// queueing a mailing also starts the worker in the background: wait until it has gone quiet
const settle = async () => { for (let i = 0; i < 8; i += 1) { await svc.processCampaigns(); await sleep(250); } };
const wipe = async () => { await Subscriber.deleteMany({}); await Campaign.deleteMany({}); await Settings.deleteMany({}); clearMail(); };
const toNpt = (ymd, h, m) => { const [y, mo, d] = ymd.split('-').map(Number); return Date.UTC(y, mo - 1, d, h, m) - (5 * 60 + 45) * 60 * 1000; };

(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27700/nl_unit');
  await mongoose.connection.dropDatabase();
  await Subscriber.init(); await Campaign.init();

  // ---------- W: daily limit, resume, no duplicates, unsubscribed meanwhile excluded
  await wipe();
  await Subscriber.insertMany(Array.from({ length: 7 }, (_, i) => mk(i)));
  await Settings.getSettings();
  await Settings.updateOne({ key: 'main' }, { $set: { dailyCap: 3 } });
  const c = await svc.queueCustom({ subject: { en: 'Cap test' }, body: { en: 'Body' }, topic: 'news' });
  await settle();
  let cur = await Campaign.findById(c._id);
  check('W1 the daily limit stops a mailing part-way, status "sending", cursor kept', cur.status === 'sending' && cur.stats.sent === 3 && !!cur.lastRecipientId && /tomorrow/.test(cur.error) && readMails().length === 3, `${cur.status}, sent ${cur.stats.sent}, ${readMails().length} mails`);
  await settle();
  cur = await Campaign.findById(c._id);
  check('W2 running again the same day sends nothing more (lease + limit)', cur.stats.sent === 3 && readMails().length === 3, `sent ${cur.stats.sent}`);

  // "next day": the date marker is old and the lease is over
  await Settings.updateOne({ key: 'main' }, { $set: { 'sentToday.date': '2000-01-01', 'sentToday.count': 3 } });
  await Campaign.updateOne({ _id: c._id }, { $set: { leaseUntil: new Date(Date.now() - 1000) } });
  const all = await Subscriber.find({}).sort({ _id: 1 });
  await Subscriber.updateOne({ _id: all[4]._id }, { $set: { status: 'unsubscribed' } }); // leaves between the two days
  await settle();
  cur = await Campaign.findById(c._id);
  check('W3 the next day it carries on from where it stopped and finishes', cur.stats.sent === 6 && cur.status === 'done', `${cur.status}, sent ${cur.stats.sent}`);
  await Settings.updateOne({ key: 'main' }, { $set: { 'sentToday.date': '2000-01-01', 'sentToday.count': 3 } });
  await Campaign.updateOne({ _id: c._id }, { $set: { leaseUntil: new Date(Date.now() - 1000) } });
  await settle();
  cur = await Campaign.findById(c._id);
  const mailsAll = readMails();
  const to = mailsAll.map((m) => m.to);
  check('W4 finished: everybody once, nobody twice, the one who left in between not mailed', cur.status === 'done' && new Set(to).size === to.length && !to.includes(all[4].email) && to.length === 6, `${cur.status}, ${to.length} mails, ${new Set(to).size} distinct`);

  // ---------- W: two workers at once (the lease)
  await wipe();
  await Subscriber.insertMany(Array.from({ length: 30 }, (_, i) => mk(i)));
  await svc.queueCustom({ subject: { en: 'Parallel' }, body: { en: 'Body' }, topic: 'news' });
  await Promise.all([svc.processCampaigns(), svc.processCampaigns(), svc.processCampaigns()]);
  await settle();
  await new Promise((r) => setTimeout(r, 1500));
  await settle();
  const par = readMails().map((m) => m.to);
  check('W5 concurrent workers never double-send', par.length === 30 && new Set(par).size === 30, `${par.length} mails, ${new Set(par).size} distinct`);

  // ---------- W: failures abort the run, retry picks the same people up
  await wipe();
  await Subscriber.insertMany(Array.from({ length: 14 }, (_, i) => mk(i)));
  const badDir = path.join(__dirname, 'not-a-folder.txt');
  fs.writeFileSync(badDir, 'x');
  process.env.EMAIL_DEBUG_DIR = path.join(badDir, 'sub'); // cannot be created: every send fails
  const fc = await svc.queueCustom({ subject: { en: 'Failing' }, body: { en: 'Body' }, topic: 'news' });
  await settle();
  cur = await Campaign.findById(fc._id);
  check('W6 ten refusals in a row stop the mailing as "failed" (not an endless loop)', cur.status === 'failed' && /10 messages in a row/.test(cur.error), `${cur.status}: ${cur.error}`);
  check('W7 the people it could not reach are put back (not counted as done)', cur.stats.sent === 0 && cur.stats.failed === 0 && !cur.lastRecipientId, JSON.stringify(cur.stats) + ' cursor=' + cur.lastRecipientId);
  process.env.EMAIL_DEBUG_DIR = MAIL;
  await Campaign.updateOne({ _id: fc._id }, { $set: { status: 'queued', error: '', leaseUntil: null } }); // what "retry" does
  await settle();
  cur = await Campaign.findById(fc._id);
  check('W8 after the problem is fixed, "retry" reaches everybody', cur.status === 'done' && cur.stats.sent === 14 && readMails().length === 14, `${cur.status}, sent ${cur.stats.sent}`);
  fs.unlinkSync(badDir);

  // ---------- W: a cancelled mailing stops
  await wipe();
  await Subscriber.insertMany(Array.from({ length: 5 }, (_, i) => mk(i)));
  const cc = await Campaign.create({ kind: 'custom', topic: 'news', payload: { subject: { en: 'Cancelled' }, body: { en: 'x' } }, label: 'Cancelled', status: 'cancelled' });
  await settle();
  check('W9 a cancelled mailing sends nothing', readMails().length === 0 && (await Campaign.findById(cc._id)).status === 'cancelled', 'nothing sent');

  // ---------- W: mail not configured -> failed with a clear reason, nothing lost
  await wipe();
  await Subscriber.insertMany([mk(1)]);
  process.env.EMAIL_DEBUG_DIR = '';
  const nc = await svc.queueCustom({ subject: { en: 'No mail setup' }, body: { en: 'x' }, topic: 'news' });
  await settle();
  cur = await Campaign.findById(nc._id);
  check('W10 with no mail account set up the mailing is marked failed with the reason', cur.status === 'failed' && /EMAIL_USER/.test(cur.error), cur.error);
  process.env.EMAIL_DEBUG_DIR = MAIL;

  // ---------- W: topic filtering for festivals
  await wipe();
  await Subscriber.insertMany([mk(1, ['festivals']), mk(2, ['events']), mk(3, ['festivals', 'events'], { status: 'pending' }), mk(4, ['festivals'], { lang: 'ne' })]);
  await svc.queueFestival({ key: 'vijaya-dashami-dashain', nameEn: 'Vijaya Dashami (Dashain)', nameNe: 'विजया दशमी', messages: null }, '2026-10-21');
  await settle();
  const fm = readMails();
  check('W11 festival wish goes only to active "festivals" subscribers, each in their language', fm.length === 2 && fm.some((m) => m.to === 'user1@test.local' && /Vijaya Dashami/.test(m.subject)) && fm.some((m) => m.to === 'user4@test.local' && /विजया दशमी/.test(m.subject)), fm.map((m) => m.to + ': ' + m.subject).join(' | '));
  const dup = await svc.queueFestival({ key: 'x', nameEn: 'Vijaya Dashami (Dashain)', nameNe: '', messages: null }, '2026-10-21');
  check('W12 the same day cannot be queued twice', dup === null, 'null');

  // ---------- F: festival sweep with a pretend patro and pretend clocks
  await wipe();
  festivals.clearCache();
  const day = (ymd, events = []) => { const [y, m, d] = ymd.split('-').map(Number); return { ad: { year: y, month: m, day: d }, events }; };
  const days = [];
  for (let i = 1; i <= 30; i += 1) days.push(day(`2026-10-${String(i).padStart(2, '0')}`));
  for (let i = 1; i <= 30; i += 1) days.push(day(`2026-11-${String(i).padStart(2, '0')}`));
  const setEvents = (ymd, events) => { const d = days.find((x) => `${x.ad.year}-${String(x.ad.month).padStart(2, '0')}-${String(x.ad.day).padStart(2, '0')}` === ymd); d.events = events; };
  setEvents('2026-10-21', [{ en: 'Vijaya Dashami (Dashain)', np: 'विजया दशमी', isHoliday: true }]);
  setEvents('2026-10-17', [{ en: 'Fulpati', np: 'फूलपाती', isHoliday: false }]);
  setEvents('2026-10-12', [{ en: 'Constitution Day', np: 'संविधान दिवस', isHoliday: true }]);
  setEvents('2026-11-08', [{ en: 'Laxmi Puja', np: 'लक्ष्मी पूजा', isHoliday: true }, { en: 'Kukur Tihar', np: 'कुकुर तिहार', isHoliday: false }]);
  let fetchCalls = 0; let failFetch = false;
  festivals._setFetch(async () => { fetchCalls += 1; if (failFetch) throw new Error('network down'); return { ok: true, json: async () => ({ days }) }; });

  let q = await svc.festivalSweep({ now: toNpt('2026-10-21', 5, 0) });
  check('F1 before 06:00 Nepal time no wish is queued', q === null && (await Campaign.countDocuments({})) === 0, 'null');
  q = await svc.festivalSweep({ now: toNpt('2026-10-21', 21, 0) });
  check('F2 after 20:00 Nepal time no wish is queued', q === null && (await Campaign.countDocuments({})) === 0, 'null');
  q = await svc.festivalSweep({ now: toNpt('2026-10-21', 6, 30) });
  check('F3 at 06:30 on Dashami the wish is queued once', q && q.dedupeKey === 'festival:2026-10-21' && q.kind === 'festival' && q.payload.nameEn.startsWith('Vijaya Dashami'), q && q.dedupeKey);
  q = await svc.festivalSweep({ now: toNpt('2026-10-21', 6, 45) });
  check('F4 the next sweep the same day does not queue a second', q === null && (await Campaign.countDocuments({ kind: 'festival' })) === 1, 'still 1');
  q = await svc.festivalSweep({ now: toNpt('2026-10-17', 8, 0) });
  check('F5 a minor festival (Fulpati) is not wished by default', q === null, 'null');
  q = await svc.festivalSweep({ now: toNpt('2026-10-12', 8, 0) });
  check('F6 a national day is never wished', q === null, 'null');
  q = await svc.festivalSweep({ now: toNpt('2026-10-09', 8, 0) });
  check('F7 an ordinary day queues nothing', q === null, 'null');
  await Settings.updateOne({ key: 'main' }, { $set: { 'festivalWishes.overrides.fulpati': { enabled: true, message: { en: 'Fulpati blessings' } } } });
  q = await svc.festivalSweep({ now: toNpt('2026-10-17', 8, 0) });
  check('F8 the admin can switch an optional festival on and write its wording', q && q.payload.messages && q.payload.messages.en === 'Fulpati blessings', q && JSON.stringify(q.payload.messages));
  await Settings.updateOne({ key: 'main' }, { $set: { 'festivalWishes.overrides.laxmi-puja': { enabled: false } } });
  q = await svc.festivalSweep({ now: toNpt('2026-11-08', 8, 0) });
  check('F9 ...and switch a default festival off (Laxmi Puja: Tihar day with an optional one beside it)', q === null, 'null');
  await Settings.updateOne({ key: 'main' }, { $set: { 'festivalWishes.overrides.laxmi-puja': { enabled: true }, 'festivalWishes.overrides.kukur-tihar': { enabled: true } } });
  q = await svc.festivalSweep({ now: toNpt('2026-11-08', 8, 0) });
  check('F10 two festivals on one day: only the more important one is wished', q && /Laxmi Puja/.test(q.payload.nameEn), q && q.payload.nameEn);
  await Settings.updateOne({ key: 'main' }, { $set: { 'festivalWishes.enabled': false } });
  await Campaign.deleteMany({});
  q = await svc.festivalSweep({ now: toNpt('2026-10-21', 7, 0) });
  check('F11 the master switch turns every festival wish off', q === null, 'null');
  await Settings.updateOne({ key: 'main' }, { $set: { 'festivalWishes.enabled': true } });
  festivals.clearCache(); failFetch = true;
  q = await svc.festivalSweep({ now: toNpt('2026-10-21', 7, 0) });
  check('F12 if the calendar cannot be reached the sweep quietly does nothing (no crash)', q === null, 'null');
  failFetch = false; festivals.clearCache();
  q = await svc.festivalSweep({ now: toNpt('2026-10-21', 19, 59) });
  check('F13 19:59 is still inside the sending window, and it recovers when the calendar is back', q && q.dedupeKey === 'festival:2026-10-21', q && q.dedupeKey);
  const before = fetchCalls;
  festivals.clearCache();
  const up = await festivals.getUpcomingFestivals(await Settings.getSettings(), { days: 60, now: toNpt('2026-10-01', 9, 0) });
  check('F14 the admin list shows festivals with on/off state and omits unknown days', up.map((f) => f.nameEn).join('|').includes('Vijaya Dashami') && !up.some((f) => /Constitution/.test(f.nameEn)), up.map((f) => `${f.date} ${f.nameEn} ${f.enabled ? 'on' : 'off'}`).join('; '));
  check('F15 the calendar is cached (the second read costs no extra downloads)', (await festivals.getUpcomingFestivals(await Settings.getSettings(), { days: 60, now: toNpt('2026-10-01', 9, 0) })) && fetchCalls - before <= 4, `${fetchCalls - before} downloads for two reads`);

  // ---------- R: hardening found by the independent review
  const slowDelay = async (ms, fn) => { const before = process.env.NEWSLETTER_DELAY_MS; process.env.NEWSLETTER_DELAY_MS = String(ms); try { return await fn(); } finally { process.env.NEWSLETTER_DELAY_MS = before; } };

  // someone who unsubscribes while a mailing is under way is not mailed afterwards
  await wipe();
  await Subscriber.insertMany(Array.from({ length: 8 }, (_, i) => mk(i)));
  await slowDelay(120, async () => {
    const c1 = await svc.queueCustom({ subject: { en: 'Mid-run unsubscribe' }, body: { en: 'x' }, topic: 'news' });
    await sleep(350);
    await Subscriber.updateOne({ email: 'user6@test.local' }, { $set: { status: 'unsubscribed' } });
    await Subscriber.updateOne({ email: 'user7@test.local' }, { $set: { status: 'unsubscribed' } });
    for (let i = 0; i < 30 && (await Campaign.findById(c1._id)).status !== 'done'; i += 1) await sleep(200);
    const got = readMails().map((m) => m.to);
    check('R1 people who unsubscribe while a mailing is being sent are not mailed afterwards', !got.includes('user6@test.local') && !got.includes('user7@test.local') && got.length === 6, `${got.length} mails, to: ${got.sort().join(' ')}`);
  });

  // stopping a mailing is honoured at once (one e-mail at most) and is never undone, also when the daily limit is hit
  await wipe();
  await Subscriber.insertMany(Array.from({ length: 12 }, (_, i) => mk(i)));
  await Settings.getSettings();
  await Settings.updateOne({ key: 'main' }, { $set: { dailyCap: 4 } });
  await slowDelay(150, async () => {
    const c2 = await svc.queueCustom({ subject: { en: 'Stop me' }, body: { en: 'x' }, topic: 'news' });
    await sleep(250);
    await Campaign.updateOne({ _id: c2._id }, { $set: { status: 'cancelled', leaseUntil: null, finishedAt: new Date() } });
    const sentAtStop = readMails().length;
    await sleep(1200); // the cap (4) would be reached in this window: it must not bring the mailing back to life
    const after = await Campaign.findById(c2._id);
    check('R2 a stopped mailing stops within one e-mail and stays stopped (not revived by the daily limit)', after.status === 'cancelled' && readMails().length <= sentAtStop + 1, `${after.status}, ${sentAtStop} -> ${readMails().length} mails`);
  });

  // a worker that lost the mailing (lease taken over) stops instead of mailing alongside the new holder
  await wipe();
  await Subscriber.insertMany(Array.from({ length: 10 }, (_, i) => mk(i)));
  await slowDelay(150, async () => {
    const c3 = await svc.queueCustom({ subject: { en: 'Lease' }, body: { en: 'x' }, topic: 'news' });
    await sleep(300);
    await Campaign.updateOne({ _id: c3._id }, { $set: { leaseOwner: 'somebody-else' } });
    const atTakeover = readMails().length;
    await sleep(1000);
    check('R3 a worker whose lease was taken over stops sending', readMails().length <= atTakeover + 1, `${atTakeover} -> ${readMails().length} mails`);
    await Campaign.updateOne({ _id: c3._id }, { $set: { status: 'cancelled' } });
  });

  // festival wishes go first and are dropped, not sent late
  await wipe();
  await Subscriber.insertMany(Array.from({ length: 4 }, (_, i) => mk(i, ['festivals', 'news'])));
  await Settings.getSettings();
  await Settings.updateOne({ key: 'main' }, { $set: { dailyCap: 4 } });
  const lateCustom = await Campaign.create({ kind: 'custom', topic: 'news', payload: { subject: { en: 'Long announcement' }, body: { en: 'x' } }, label: 'Long announcement', status: 'queued' });
  await sleep(20);
  const wishToday = await svc.queueFestival({ key: 'ram-navami', nameEn: 'Ram Navami', nameNe: 'राम नवमी', messages: null }, new Date(Date.now() + 5.75 * 3600 * 1000).toISOString().slice(0, 10));
  await settle();
  const first = readMails()[0];
  const wishDone = await Campaign.findById(wishToday._id);
  check('R4 a festival wish goes ahead of an older announcement and gets through even when the daily limit is nearly used', wishDone.status === 'done' && wishDone.stats.sent === 4 && first && /Ram Navami/.test(first.subject), `${wishDone.status}, sent ${wishDone.stats.sent}, first mail: ${first && first.subject}`);
  void lateCustom;
  await wipe();
  await Subscriber.insertMany(Array.from({ length: 3 }, (_, i) => mk(i, ['festivals'])));
  const stale = await svc.queueFestival({ key: 'ram-navami', nameEn: 'Ram Navami', nameNe: 'राम नवमी', messages: null }, '2020-03-02');
  await settle();
  const staleNow = await Campaign.findById(stale._id);
  check('R5 a festival wish whose day has passed is dropped (status "expired"), not sent days late', staleNow.status === 'expired' && readMails().length === 0, `${staleNow.status}, ${readMails().length} mails`);

  // old rows
  await wipe();
  await Subscriber.collection.insertMany([{ email: 'x@a.com,y@b.com', subscribedAt: new Date() }, { email: 'fine@test.local', subscribedAt: new Date() }, { email: 'two words@test.local', subscribedAt: new Date() }]);
  await svc.backfillSubscribers();
  const bad1 = await Subscriber.findOne({ email: 'x@a.com,y@b.com' }).lean();
  const bad2 = await Subscriber.findOne({ email: 'two words@test.local' }).lean();
  const ok1 = await Subscriber.findOne({ email: 'fine@test.local' }).lean();
  check('R6 old rows that are not a usable address are parked (not "active"), usable ones are upgraded', bad1.status === 'unsubscribed' && bad2.status === 'unsubscribed' && ok1.status === 'active', `${bad1.status}/${bad2.status}/${ok1.status}`);

  // housekeeping
  await wipe();
  const dayMs = 24 * 3600 * 1000;
  await Subscriber.collection.insertMany([
    { email: 'stale@test.local', status: 'pending', topics: ['news'], lang: 'en', confirmToken: hex(1), unsubscribeToken: hex(2), confirmSentAt: new Date(Date.now() - 31 * dayMs), subscribedAt: new Date() },
    { email: 'recent@test.local', status: 'pending', topics: ['news'], lang: 'en', confirmToken: hex(3), unsubscribeToken: hex(4), confirmSentAt: new Date(Date.now() - 5 * dayMs), subscribedAt: new Date() },
    { email: 'active@test.local', status: 'active', topics: ['news'], lang: 'en', unsubscribeToken: hex(5), subscribedAt: new Date(Date.now() - 90 * dayMs) },
  ]);
  const purged = await svc.purgeStalePending();
  check('R7 addresses that never confirmed are forgotten after 30 days, nobody else is touched', purged === 1 && !!(await Subscriber.findOne({ email: 'recent@test.local' })) && !!(await Subscriber.findOne({ email: 'active@test.local' })) && !(await Subscriber.findOne({ email: 'stale@test.local' })), `${purged} removed`);

  // production without BACKEND_URL: bulk mail refuses to go out with dead links
  await wipe();
  await Subscriber.insertMany([mk(1)]);
  const keepUrl = process.env.BACKEND_URL; const keepMode = process.env.NODE_ENV;
  delete process.env.BACKEND_URL; process.env.NODE_ENV = 'production';
  const noLinks = await svc.queueCustom({ subject: { en: 'No links' }, body: { en: 'x' }, topic: 'news' });
  await settle();
  const noLinksNow = await Campaign.findById(noLinks._id);
  check('R8 in production without BACKEND_URL a mailing is not sent (failed with a clear reason)', noLinksNow.status === 'failed' && /BACKEND_URL/.test(noLinksNow.error) && readMails().length === 0 && svc.linksReady() === false, noLinksNow.error);
  process.env.BACKEND_URL = keepUrl; process.env.NODE_ENV = keepMode;
  check('R9 ...and it is ready again once BACKEND_URL is set', svc.linksReady() === true, 'ready');

  // ---------- L: legacy subscribers (before this feature) are upgraded
  await wipe();
  await Subscriber.collection.insertMany([
    { email: 'old.one@test.local', subscribedAt: new Date('2024-01-01') },
    { email: 'old.two@test.local', subscribedAt: new Date('2024-02-01'), userId: undefined },
    { email: 'new.pending@test.local', status: 'pending', topics: ['events'], lang: 'en', confirmToken: hex(1), subscribedAt: new Date() },
  ]);
  const upgraded = await svc.backfillSubscribers();
  const o1 = await Subscriber.findOne({ email: 'old.one@test.local' }).lean();
  const o2 = await Subscriber.findOne({ email: 'old.two@test.local' }).lean();
  const np = await Subscriber.findOne({ email: 'new.pending@test.local' }).lean();
  check('L1 old subscribers become active for events + news (not festival wishes), English, and their own unsubscribe link', upgraded >= 2 && o1.status === 'active' && o1.topics.join() === 'events,news' && /^[a-f0-9]{48}$/.test(o1.unsubscribeToken) && o1.unsubscribeToken !== o2.unsubscribeToken && o1.source === 'legacy', JSON.stringify({ s: o1.status, t: o1.topics, src: o1.source }));
  check('L2 a pending one is never promoted by the upgrade', np.status === 'pending' && !!np.unsubscribeToken, np.status);
  check('L3 running the upgrade again changes nothing', (await svc.backfillSubscribers()) === 0, '0');

  await mongoose.disconnect();
  console.log('\nFAILED:', results.filter((x) => !x.ok).length, 'of', results.length);
})().catch((e) => { console.error(e); process.exit(1); });
