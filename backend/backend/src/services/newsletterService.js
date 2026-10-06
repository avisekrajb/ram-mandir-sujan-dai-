// The newsletter: who is subscribed, and sending the temple's mailings to them with nodemailer.
//
//  * Subscribing is double opt-in: the "Stay updated" form only sends a confirmation e-mail; the person is
//    `active` after clicking its link. Nothing is ever changed or sent for an address that is already active
//    (so the public form cannot be used to edit or mail someone else's subscription).
//  * A mailing (NewsletterCampaign) is an event, a blog post, a festival wish or an announcement. It is created
//    once (de-duplicated by `dedupeKey`), then a background worker walks the active subscribers who ticked its
//    topic in `_id` order, one e-mail at a time at a pace Gmail accepts, each in the subscriber's language with
//    their own unsubscribe link. Progress is stored after every e-mail, so a restart or the daily limit simply
//    continues where it stopped: nobody is mailed twice or skipped.
//  * Festival wishes: every 15 minutes a sweep checks whether today (Nepal time) has a festival to wish and queues
//    one mailing for it (see services/festivalService.js).

const crypto = require('crypto');
const validator = require('validator');
const Subscriber = require('../models/Subscriber');
const NewsletterCampaign = require('../models/NewsletterCampaign');
const NewsletterSettings = require('../models/NewsletterSettings');
const { sendEmail, isEmailConfigured } = require('./emailService');
const { buildNewsletterEmail, LANGS } = require('./newsletterEmail');
const festivalService = require('./festivalService');
const { nptNow, NPT_OFFSET_MS } = require('../utils/reminderDates');

const TOPICS = Subscriber.TOPICS;

const siteUrl = () => (process.env.FRONTEND_URL || 'http://localhost:4000').replace(/\/+$/, '');
const apiUrl = () => (process.env.BACKEND_URL || process.env.FRONTEND_URL || 'http://localhost:4000').replace(/\/+$/, '');
const newToken = () => crypto.randomBytes(24).toString('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const confirmUrlFor = (sub) => `${apiUrl()}/api/subscribe/confirm/${sub.confirmToken}`;
const unsubscribeUrlFor = (sub) => `${apiUrl()}/api/subscribe/unsubscribe/${sub.unsubscribeToken}`;

const cleanEmail = (value) => {
  const email = String(value || '').trim().toLowerCase();
  if (!email || email.length > 254 || !validator.isEmail(email) || /[,;<>" ]/.test(email)) return '';
  return email;
};
const cleanTopics = (topics) => {
  const list = Array.isArray(topics) ? [...new Set(topics.filter((t) => TOPICS.includes(t)))] : [];
  return list.length ? list : [...TOPICS];
};
const cleanLang = (lang) => (LANGS.includes(lang) ? lang : 'en');

// ------------------------------------------------------------------ one-off mails ----

const sendConfirmation = async (sub) => {
  const mail = buildNewsletterEmail({
    kind: 'confirm',
    lang: sub.lang,
    topics: sub.topics,
    siteUrl: siteUrl(),
    confirmUrl: confirmUrlFor(sub),
  });
  return sendEmail({ to: sub.email, subject: mail.subject, html: mail.html, text: mail.text });
};

const sendWelcome = async (sub) => {
  const mail = buildNewsletterEmail({
    kind: 'welcome',
    lang: sub.lang,
    topics: sub.topics,
    siteUrl: siteUrl(),
    unsubscribeUrl: unsubscribeUrlFor(sub),
  });
  return sendEmail({ to: sub.email, subject: mail.subject, html: mail.html, text: mail.text, headers: mail.headers });
};

// ------------------------------------------------------------------- subscribing ----

const CONFIRM_LINK_DAYS = 7;
// Confirmation e-mails the public form may cause per day, all addresses together.
const confirmDailyMax = () => {
  const n = parseInt(process.env.NEWSLETTER_CONFIRM_DAILY_MAX, 10);
  return Number.isInteger(n) && n > 0 ? n : 300;
};
const reserveConfirm = async () => {
  const today = nptNow().date;
  await NewsletterSettings.getSettings();
  await NewsletterSettings.updateOne({ key: 'main', 'confirmToday.date': { $ne: today } }, { $set: { 'confirmToday.date': today, 'confirmToday.count': 0 } });
  const updated = await NewsletterSettings.findOneAndUpdate(
    { key: 'main', 'confirmToday.date': today, 'confirmToday.count': { $lt: confirmDailyMax() } },
    { $inc: { 'confirmToday.count': 1 } }
  );
  return !!updated;
};

/**
 * Handle the "Stay updated" form. Returns { state } where state is one of
 * 'invalid' | 'confirmation_sent' | 'subscribed' | 'already' | 'throttled'. The public route answers the same
 * way for every state except 'invalid' (and 'subscribed', which only a signed-in owner of the address can reach).
 *
 * @param {object} p
 * @param {boolean} [p.verifiedAccount] the caller is signed in with this very address, already verified: no e-mail round trip
 */
const subscribe = async ({ email, lang, topics, source = 'website', verifiedAccount = false, userId }) => {
  const address = cleanEmail(email);
  if (!address) return { state: 'invalid' };
  const language = cleanLang(lang);
  const chosen = cleanTopics(topics);
  const today = nptNow().date;

  let sub = await Subscriber.findOne({ email: address });

  if (!sub) {
    // Not mailing more confirmations than the sending account can spare today (the form is public).
    if (!verifiedAccount && !(await reserveConfirm())) return { state: 'throttled' };
    const doc = {
      email: address,
      status: verifiedAccount ? 'active' : 'pending',
      topics: chosen,
      lang: language,
      source: verifiedAccount ? 'account' : source,
      unsubscribeToken: newToken(),
      userId: userId || undefined,
    };
    if (verifiedAccount) doc.confirmedAt = new Date();
    else Object.assign(doc, { confirmToken: newToken(), confirmSentAt: new Date(), confirmSendDay: today, confirmSendCount: 1 });
    try {
      sub = await Subscriber.create(doc);
    } catch (error) {
      if (error && (error.code === 11000 || /Already subscribed/.test(error.message))) return { state: 'already' }; // a parallel request created it first
      throw error;
    }
    if (verifiedAccount) {
      sendWelcome(sub).catch((e) => console.error('Newsletter welcome error:', e.message));
      return { state: 'subscribed', subscriber: sub };
    }
    // Sent in the background: the answer must take the same time whether or not an e-mail is sent (otherwise the
    // response time would tell an outsider which addresses are already subscribed).
    sendConfirmation(sub).then((result) => { if (result && result.error) console.error('Newsletter confirmation error:', result.error); }).catch((e) => console.error('Newsletter confirmation error:', e.message));
    return { state: 'confirmation_sent', subscriber: sub };
  }

  if (sub.status === 'active') {
    if (!verifiedAccount) return { state: 'already' }; // nothing is changed, nothing is sent
    sub.topics = chosen;
    sub.lang = language;
    await sub.save();
    return { state: 'subscribed', subscriber: sub };
  }

  // pending or unsubscribed
  if (verifiedAccount) {
    sub.status = 'active';
    sub.confirmedAt = new Date();
    sub.unsubscribedAt = null;
    sub.confirmToken = undefined;
    sub.topics = chosen;
    sub.lang = language;
    if (!sub.unsubscribeToken) sub.unsubscribeToken = newToken();
    await sub.save();
    sendWelcome(sub).catch((e) => console.error('Newsletter welcome error:', e.message));
    return { state: 'subscribed', subscriber: sub };
  }

  // Asking again for the same address: at most one confirmation e-mail every 10 minutes and three a day, so
  // the form cannot be used to flood somebody's inbox.
  const sameDay = sub.confirmSendDay === today;
  const sentToday = sameDay ? sub.confirmSendCount || 0 : 0;
  const recent = sub.confirmSentAt && Date.now() - new Date(sub.confirmSentAt).getTime() < 10 * 60 * 1000;
  if (recent || sentToday >= 3) return { state: 'throttled' };
  if (!(await reserveConfirm())) return { state: 'throttled' };

  // The right to send is taken in ONE atomic update that only matches while the last confirmation is older than 10
  // minutes and fewer than 3 went out today: of several parallel requests exactly one gets it.
  const claim = await Subscriber.findOneAndUpdate(
    {
      _id: sub._id,
      status: { $in: ['pending', 'unsubscribed'] },
      confirmSentAt: { $not: { $gte: new Date(Date.now() - 10 * 60 * 1000) } },
      ...(sameDay ? { confirmSendDay: today, confirmSendCount: { $lt: 3 } } : { confirmSendDay: { $ne: today } }),
    },
    {
      $set: {
        status: 'pending',
        topics: chosen,
        lang: language,
        confirmToken: newToken(),
        confirmSentAt: new Date(),
        confirmSendDay: today,
        ...(sameDay ? {} : { confirmSendCount: 1 }),
        ...(sub.unsubscribeToken ? {} : { unsubscribeToken: newToken() }),
      },
      ...(sameDay ? { $inc: { confirmSendCount: 1 } } : {}),
    },
    { new: true }
  );
  if (!claim) return { state: 'throttled' };
  sendConfirmation(claim).then((result) => { if (result && result.error) console.error('Newsletter confirmation error:', result.error); }).catch((e) => console.error('Newsletter confirmation error:', e.message));
  return { state: 'confirmation_sent', subscriber: claim };
};

const TOKEN_RE = /^[a-f0-9]{48}$/;

/** A pending subscription for the confirm link (no change made: opening a link must not change anything). */
const confirmFresh = () => ({ $gte: new Date(Date.now() - CONFIRM_LINK_DAYS * 24 * 60 * 60 * 1000) });
const findPendingByToken = (token) => (TOKEN_RE.test(String(token)) ? Subscriber.findOne({ confirmToken: token, status: 'pending', confirmSentAt: confirmFresh() }).lean() : null);

/** The click on the confirm button. Returns the subscriber, or null when the link is not (or no longer) valid. */
const confirmByToken = async (token) => {
  if (!TOKEN_RE.test(String(token))) return null;
  const sub = await Subscriber.findOneAndUpdate(
    { confirmToken: token, status: 'pending', confirmSentAt: confirmFresh() },
    { $set: { status: 'active', confirmedAt: new Date(), unsubscribedAt: null }, $unset: { confirmToken: 1, confirmSentAt: 1 } },
    { new: true }
  );
  if (sub) sendWelcome(sub).catch((e) => console.error('Newsletter welcome error:', e.message));
  return sub;
};

const findByUnsubscribeToken = (token) => (TOKEN_RE.test(String(token)) ? Subscriber.findOne({ unsubscribeToken: token }).lean() : null);

/** The click on "Unsubscribe" (or a mail program's one-click unsubscribe). */
const unsubscribeByToken = async (token) => {
  if (!TOKEN_RE.test(String(token))) return null;
  return Subscriber.findOneAndUpdate(
    { unsubscribeToken: token },
    { $set: { status: 'unsubscribed', unsubscribedAt: new Date() }, $unset: { confirmToken: 1, confirmSentAt: 1 } },
    { new: true }
  );
};

/** Start-up: people who subscribed before this feature get a status, topics and an unsubscribe link. */
const backfillSubscribers = async () => {
  const old = await Subscriber.find({ $or: [{ status: { $exists: false } }, { unsubscribeToken: { $exists: false } }] }).select('_id email status unsubscribeToken').lean(); // lean: the model's defaults must not hide what is really missing
  let n = 0;
  for (const sub of old) {
    const $set = {};
    // They signed up when the form promised "updates about events and temple news": that is what they get. Festival wishes
    // are a newer offer, so they stay off for them until they tick it themselves. An old row that is not a usable address
    // (the old form accepted anything with an @) is parked as unsubscribed instead of failing in every mailing.
    if (!sub.status) {
      if (cleanEmail(sub.email)) Object.assign($set, { status: 'active', source: 'legacy', lang: 'en', topics: ['events', 'news'], confirmedAt: new Date() });
      else Object.assign($set, { status: 'unsubscribed', source: 'legacy-invalid', lang: 'en', topics: [], unsubscribedAt: new Date() });
    }
    // eslint-disable-next-line no-await-in-loop -- one small update each, once
    await Subscriber.updateOne(
      { _id: sub._id },
      { $set: { ...$set, ...(sub.unsubscribeToken ? {} : { unsubscribeToken: newToken() }) } }
    );
    n += 1;
  }
  return n;
};

/** Housekeeping: addresses that never confirmed (the link is dead after 7 days) are forgotten after 30 days. */
const purgeStalePending = async () => {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const result = await Subscriber.deleteMany({ status: 'pending', confirmSentAt: { $lt: cutoff } });
  return result.deletedCount || 0;
};

// ------------------------------------------------------------------- campaigns ----

const kick = () => setImmediate(() => processCampaigns().catch((e) => console.error('Newsletter worker error:', e.message)));

/** Create a mailing. Returns null when the same one (dedupeKey) already exists. */
const queueCampaign = async ({ kind, topic, dedupeKey, payload, label, createdBy, priority = 0, expiresAt = null }) => {
  try {
    const campaign = await NewsletterCampaign.create({ kind, topic, dedupeKey, payload, label: String(label || '').slice(0, 200), createdBy, priority, expiresAt });
    kick();
    return campaign;
  } catch (error) {
    if (error && error.code === 11000) return null;
    throw error;
  }
};

const trim = (text, max = 420) => {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 40))}…`;
};
const perLang = (obj, fn = (v) => v) => {
  const out = {};
  for (const lang of LANGS) out[lang] = fn((obj && obj[lang]) || '');
  return out;
};

/** A new event. Skipped when the admin switched automatic event mails off (unless `force`) or the event is not upcoming. */
const announceEvent = async (event, { force = false, resend = false, createdBy } = {}) => {
  const settings = await NewsletterSettings.getSettings();
  if (!force && !settings.autoEvents) return null;
  const e = event && typeof event.toObject === 'function' ? event.toObject() : event;
  if (!e || (!force && e.upcoming === false)) return null;
  const payload = {
    eventId: String(e._id),
    title: perLang(e.title),
    summary: perLang(e.desc, (v) => trim(v)),
    // The date as the temple wrote it for each language (Nepali date, Gregorian text), else the raw date.
    dateText: Object.fromEntries(LANGS.map((l) => [l, (e.dateNepali && e.dateNepali[l]) || (e.greg && e.greg[l]) || (l === 'en' ? e.date : '') || ''])),
    photo: typeof e.photo === 'string' && /^https:\/\//i.test(e.photo) ? e.photo : '',
    url: `${siteUrl()}/events`,
  };
  const key = `event:${e._id}${resend ? `:r${Date.now()}` : ''}`;
  return queueCampaign({ kind: 'event', topic: 'events', dedupeKey: key, payload, label: (e.title && e.title.en) || 'Event', createdBy });
};

/** A published blog post (each post is mailed once, even if it is switched off and on again). */
const announceBlog = async (blog, { force = false, resend = false, createdBy } = {}) => {
  const settings = await NewsletterSettings.getSettings();
  if (!force && !settings.autoBlogs) return null;
  const b = blog && typeof blog.toObject === 'function' ? blog.toObject() : blog;
  if (!b || b.published === false) return null;
  const payload = {
    blogId: String(b._id),
    title: perLang(b.title),
    summary: perLang(b.excerpt, (v) => trim(v)),
    photo: typeof b.image === 'string' && /^https:\/\//i.test(b.image) ? b.image : '',
    url: `${siteUrl()}/blogs/${b._id}`,
  };
  const key = `blog:${b._id}${resend ? `:r${Date.now()}` : ''}`;
  return queueCampaign({ kind: 'blog', topic: 'news', dedupeKey: key, payload, label: (b.title && b.title.en) || 'Blog post', createdBy });
};

/** The end of a Nepal-time day (a festival wish is only worth sending on its own day). */
const endOfNptDay = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 23, 59, 59) - NPT_OFFSET_MS);
};

/** A festival wish for one day (one per day). It goes ahead of other mailings and is dropped, not sent late, after that day. */
const queueFestival = async (festival, ymd) =>
  queueCampaign({
    kind: 'festival',
    topic: 'festivals',
    dedupeKey: `festival:${ymd}`,
    payload: { key: festival.key, nameEn: festival.nameEn, nameNe: festival.nameNe, messages: festival.messages || null, date: ymd },
    label: festival.nameEn,
    priority: 10,
    expiresAt: endOfNptDay(ymd),
  });

/** An announcement the admin wrote (English, optionally Nepali). */
const queueCustom = async ({ subject, body, url, buttonLabel, topic = 'news', createdBy, resend = false }) => {
  const payload = {
    subject: { en: String(subject.en || '').slice(0, 200), ne: String(subject.ne || '').slice(0, 200) },
    body: { en: String(body.en || '').slice(0, 5000), ne: String(body.ne || '').slice(0, 5000) },
    url: url || '',
    buttonLabel: { en: String((buttonLabel && buttonLabel.en) || '').slice(0, 60), ne: String((buttonLabel && buttonLabel.ne) || '').slice(0, 60) },
  };
  // The same text to the same people twice within ten minutes is a double click, not two mailings ("send again" overrides it).
  const hash = crypto.createHash('sha256').update(JSON.stringify([topic, payload])).digest('hex').slice(0, 24);
  const slot = resend ? `r${Date.now()}` : Math.floor(Date.now() / (10 * 60 * 1000));
  return queueCampaign({ kind: 'custom', topic, dedupeKey: `custom:${hash}:${slot}`, payload, label: payload.subject.en, createdBy });
};

const countAudience = (topic) => Subscriber.countDocuments({ status: 'active', topics: topic });

// ---------------------------------------------------------------- the worker ----

const LEASE_MS = 3 * 60 * 1000;
const BATCH = 25;
const MAX_FAILURES_IN_A_ROW = 10;
let working = false;

/** Mailings carry unsubscribe links that point at the API: in production that address must be set explicitly. */
const linksReady = () => process.env.NODE_ENV !== 'production' || !!process.env.BACKEND_URL;

// Count one e-mail against today's limit. Returns false when the limit is reached. A festival wish may use a little
// more than the limit (10%), so that it still goes out on its day when a long announcement has used the day up.
const reserveSend = async (festival = false) => {
  const today = nptNow().date;
  const settings = await NewsletterSettings.getSettings();
  const limit = settings.dailyCap + (festival ? Math.ceil(settings.dailyCap * 0.1) : 0);
  await NewsletterSettings.updateOne({ key: 'main', 'sentToday.date': { $ne: today } }, { $set: { 'sentToday.date': today, 'sentToday.count': 0 } });
  const updated = await NewsletterSettings.findOneAndUpdate(
    { key: 'main', 'sentToday.date': today, 'sentToday.count': { $lt: limit } },
    { $inc: { 'sentToday.count': 1 } },
    { new: true }
  );
  return !!updated;
};

const runCampaign = async (campaign, owner) => {
  const delay = Number(process.env.NEWSLETTER_DELAY_MS === undefined ? 1200 : process.env.NEWSLETTER_DELAY_MS);
  // Everything this worker changes is conditional on it still HOLDING the mailing (same owner, still "sending"): if the
  // admin stopped it, or the lease ran out and another worker took over, nothing here can overwrite that.
  const mine = { _id: campaign._id, leaseOwner: owner, status: 'sending' };
  const update = (fields) => NewsletterCampaign.updateOne(mine, fields);
  const finish = (fields) => update({ $set: { leaseUntil: null, ...fields } });

  if (!isEmailConfigured()) {
    await finish({ status: 'failed', error: 'E-mail is not set up on the server (EMAIL_USER / EMAIL_PASS), nothing was sent.' });
    return;
  }
  if (!linksReady()) {
    await finish({ status: 'failed', error: 'BACKEND_URL is not set on the server, so the unsubscribe links in the e-mails would not work. Nothing was sent.' });
    return;
  }
  if (!campaign.startedAt) {
    await update({ $set: { startedAt: new Date(), 'stats.total': await countAudience(campaign.topic) } });
  }
  const festival = campaign.kind === 'festival';
  let cursor = campaign.lastRecipientId || null;
  let goodCursor = cursor; // the last person who was not a failure: where a retry starts after a run of failures
  let failuresInARow = 0;

  for (;;) {
    // eslint-disable-next-line no-await-in-loop -- a mailing is sent one e-mail after another
    const batch = await Subscriber.find({ status: 'active', topics: campaign.topic, ...(cursor ? { _id: { $gt: cursor } } : {}) })
      .sort({ _id: 1 })
      .limit(BATCH);
    if (!batch.length) {
      // eslint-disable-next-line no-await-in-loop
      await finish({ status: 'done', finishedAt: new Date(), error: '' });
      return;
    }

    for (const sub of batch) {
      // Before EVERY e-mail: still ours, not stopped, not out of date; and the lease is renewed.
      // eslint-disable-next-line no-await-in-loop
      const live = await NewsletterCampaign.findOneAndUpdate(mine, { $set: { leaseUntil: new Date(Date.now() + LEASE_MS) } }, { new: true, projection: { expiresAt: 1 } });
      if (!live) return;
      if (live.expiresAt && live.expiresAt.getTime() < Date.now()) {
        // eslint-disable-next-line no-await-in-loop
        await finish({ status: 'expired', finishedAt: new Date(), error: 'Not sent to everyone: the day of the festival was over before the rest could go out.' });
        return;
      }

      // The person may have unsubscribed since this batch was read: look again right before sending.
      // eslint-disable-next-line no-await-in-loop
      const current = await Subscriber.findOne({ _id: sub._id, status: 'active', topics: campaign.topic });
      if (!current) {
        cursor = sub._id;
        if (!failuresInARow) goodCursor = cursor;
        // eslint-disable-next-line no-await-in-loop
        if (!(await update({ $set: { lastRecipientId: cursor } })).matchedCount) return;
        continue; // eslint-disable-line no-continue
      }

      // eslint-disable-next-line no-await-in-loop
      if (!(await reserveSend(festival))) {
        // Today's limit is used up: carry on tomorrow from the same place.
        // eslint-disable-next-line no-await-in-loop
        await update({ $set: { leaseUntil: new Date(Date.now() + 30 * 60 * 1000), error: 'Daily sending limit reached: the rest continues tomorrow.' } });
        return;
      }
      // eslint-disable-next-line no-await-in-loop
      const withToken = current.unsubscribeToken
        ? current
        : await Subscriber.findOneAndUpdate({ _id: current._id }, { $set: { unsubscribeToken: newToken() } }, { new: true });
      const mail = buildNewsletterEmail({
        kind: campaign.kind,
        lang: withToken.lang,
        data: campaign.payload,
        siteUrl: siteUrl(),
        unsubscribeUrl: unsubscribeUrlFor(withToken),
      });
      // eslint-disable-next-line no-await-in-loop
      const result = await sendEmail({ to: withToken.email, subject: mail.subject, html: mail.html, text: mail.text, headers: mail.headers });

      const inc = {};
      if (result && result.error) {
        inc['stats.failed'] = 1;
        failuresInARow += 1;
      } else if (result && result.messageId === 'skipped') {
        inc['stats.skipped'] = 1;
        failuresInARow = 0;
      } else {
        inc['stats.sent'] = 1;
        failuresInARow = 0;
      }
      cursor = sub._id;
      if (!failuresInARow) goodCursor = cursor;
      // eslint-disable-next-line no-await-in-loop
      if (!(await update({ $set: { lastRecipientId: cursor }, $inc: inc })).matchedCount) return;
      if (!inc['stats.failed']) {
        // eslint-disable-next-line no-await-in-loop
        await Subscriber.updateOne({ _id: sub._id }, { $set: { lastEmailedAt: new Date() } });
      }
      if (failuresInARow >= MAX_FAILURES_IN_A_ROW) {
        // Those people were not reached: put them back, so "try again" starts with them rather than after them.
        // eslint-disable-next-line no-await-in-loop
        await update({ $set: { lastRecipientId: goodCursor }, $inc: { 'stats.failed': -failuresInARow } });
        // eslint-disable-next-line no-await-in-loop
        await finish({ status: 'failed', error: `The mail server refused ${MAX_FAILURES_IN_A_ROW} messages in a row: ${String(result.error).slice(0, 150)}` });
        return;
      }
      // eslint-disable-next-line no-await-in-loop
      if (delay > 0) await sleep(delay);
    }
  }
};

const claimNext = (owner) =>
  NewsletterCampaign.findOneAndUpdate(
    { status: { $in: ['queued', 'sending'] }, $or: [{ leaseUntil: null }, { leaseUntil: { $lt: new Date() } }] },
    { $set: { status: 'sending', leaseOwner: owner, leaseUntil: new Date(Date.now() + LEASE_MS) } },
    { sort: { priority: -1, createdAt: 1 }, new: true }
  );

/** Send whatever is waiting. Safe to call at any time and from several places: one worker runs at once. */
const processCampaigns = async () => {
  if (working) return;
  working = true;
  const owner = crypto.randomBytes(8).toString('hex');
  try {
    for (;;) {
      // eslint-disable-next-line no-await-in-loop
      const campaign = await claimNext(owner);
      if (!campaign) break;
      // eslint-disable-next-line no-await-in-loop
      await runCampaign(campaign, owner);
      // A mailing that is waiting for tomorrow's limit keeps its lease, so the loop moves on or ends.
    }
  } finally {
    working = false;
  }
};

// ------------------------------------------------------------- festival wishes ----

const FIRST_HOUR = 6; // wishes go out from 06:00 Nepal time ...
const LAST_HOUR = 19; // ... and not at all after 19:59 (a wish at night would be odd)

/** Queue today's festival wish, if there is one. Returns the campaign or null. */
const festivalSweep = async ({ now = Date.now() } = {}) => {
  const settings = await NewsletterSettings.getSettings();
  if (!settings.festivalWishes || settings.festivalWishes.enabled === false) return null;
  const { date, hour } = nptNow(now);
  if (hour < FIRST_HOUR || hour > LAST_HOUR) return null;
  try {
    const wish = await festivalService.getWishForDate(date, settings);
    if (!wish) return null;
    return await queueFestival(wish, date); // null when today's wish was already queued
  } catch (error) {
    console.error('Festival wish sweep error:', error.message);
    return null;
  }
};

let timers = null;
const startNewsletterScheduler = () => {
  if (timers) return;
  const first = setTimeout(() => {
    festivalSweep().catch((e) => console.error('Festival sweep error:', e.message));
    processCampaigns().catch((e) => console.error('Newsletter worker error:', e.message));
  }, 45 * 1000);
  first.unref();
  const worker = setInterval(() => processCampaigns().catch((e) => console.error('Newsletter worker error:', e.message)), 60 * 1000);
  const sweeper = setInterval(() => {
    festivalSweep().catch((e) => console.error('Festival sweep error:', e.message));
    purgeStalePending().catch((e) => console.error('Subscriber clean-up error:', e.message));
  }, 15 * 60 * 1000);
  worker.unref();
  sweeper.unref();
  timers = { first, worker, sweeper };
  console.log('✉️  Newsletter scheduler started (festival wishes checked every 15 minutes)');
};

module.exports = {
  TOPICS,
  subscribe,
  findPendingByToken,
  confirmByToken,
  findByUnsubscribeToken,
  unsubscribeByToken,
  backfillSubscribers,
  purgeStalePending,
  linksReady,
  announceEvent,
  announceBlog,
  queueFestival,
  queueCustom,
  queueCampaign,
  countAudience,
  processCampaigns,
  festivalSweep,
  startNewsletterScheduler,
  sendConfirmation,
  sendWelcome,
  unsubscribeUrlFor,
  confirmUrlFor,
  siteUrl,
  apiUrl,
  cleanEmail,
  cleanTopics,
  cleanLang,
};
