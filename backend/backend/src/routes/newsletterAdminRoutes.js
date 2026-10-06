// Admin -> Subscribers & mail (area: contact). Mounted at /api/newsletter.
//
//   GET    /overview                 counts, switches, whether e-mail is set up, today's sending
//   GET    /subscribers              list (search, filter, pages)
//   GET    /subscribers.csv          export
//   DELETE /subscribers/:id          remove someone
//   PUT    /settings                 automatic event / blog mails, festival wishes on/off, daily limit
//   GET    /festivals                upcoming festivals that can be wished, with their on/off state
//   PUT    /festivals/:key           switch one on/off and/or write its wording
//   GET    /audience?topic=          how many people a mailing on this topic reaches
//   POST   /announce                 mail an event, a blog post or a message the admin wrote
//   POST   /test                     send a sample to the admin's own address first
//   GET    /campaigns                recent mailings and how far they got
//   POST   /campaigns/:id/cancel     stop a mailing that is waiting or being sent
//   POST   /campaigns/:id/retry      try a failed mailing again
const express = require('express');
const mongoose = require('mongoose');
const protect = require('../middleware/auth');
const admin = require('../middleware/admin');
const { requireArea } = require('../middleware/permissions');
const rateLimit = require('../middleware/rateLimit');
const Subscriber = require('../models/Subscriber');
const NewsletterCampaign = require('../models/NewsletterCampaign');
const NewsletterSettings = require('../models/NewsletterSettings');
const Event = require('../models/Event');
const Blog = require('../models/Blog');
const newsletter = require('../services/newsletterService');
const festivals = require('../services/festivalService');
const { buildNewsletterEmail, LANGS } = require('../services/newsletterEmail');
const { sendEmail, isEmailConfigured } = require('../services/emailService');
const { nptNow } = require('../utils/reminderDates');
const { logAdminActivity } = require('../controllers/adminController');

const router = express.Router();
router.use(protect, admin, requireArea('contact'));

const sendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Too many mailings or tests this hour. Please wait a little.',
  keyGenerator: (req) => (req.user ? `nlsend:${req.user._id}` : null),
});

const escapeRx = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const oid = (id) => mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// A spreadsheet runs a cell that starts with = + - @ as a formula: neutralise those.
const csvCell = (value) => {
  let s = String(value === null || value === undefined ? '' : value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// ------------------------------------------------------------------ overview ----

router.get('/overview', async (req, res) => {
  try {
    const [byStatus, topics, settings] = await Promise.all([
      Subscriber.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
      Subscriber.aggregate([{ $match: { status: 'active' } }, { $unwind: '$topics' }, { $group: { _id: '$topics', n: { $sum: 1 } } }]),
      NewsletterSettings.getSettings(),
    ]);
    const counts = { active: 0, pending: 0, unsubscribed: 0, total: 0 };
    byStatus.forEach((row) => {
      if (row._id in counts) counts[row._id] = row.n;
      counts.total += row.n;
    });
    const byTopic = { events: 0, festivals: 0, news: 0 };
    topics.forEach((row) => { if (row._id in byTopic) byTopic[row._id] = row.n; });
    const today = nptNow().date;
    res.json({
      success: true,
      data: {
        counts,
        byTopic,
        emailReady: !!isEmailConfigured(),
        linksReady: newsletter.linksReady(),
        settings: {
          autoEvents: settings.autoEvents,
          autoBlogs: settings.autoBlogs,
          festivalWishesEnabled: settings.festivalWishes.enabled,
          dailyCap: settings.dailyCap,
          // the counter belongs to one (Nepal-time) day: on any other day nothing has been sent yet
          sentToday: settings.sentToday && settings.sentToday.date === today ? settings.sentToday.count : 0,
          sentTodayDate: today,
        },
      },
    });
  } catch (error) {
    console.error('Newsletter overview error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// --------------------------------------------------------------- subscribers ----

router.get('/subscribers', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(5, parseInt(req.query.limit, 10) || 25));
    const filter = {};
    if (['pending', 'active', 'unsubscribed'].includes(req.query.status)) filter.status = req.query.status;
    if (Subscriber.TOPICS.includes(req.query.topic)) filter.topics = req.query.topic;
    const q = str(req.query.q, 100);
    if (q) filter.email = { $regex: escapeRx(q), $options: 'i' };
    const [rows, total] = await Promise.all([
      Subscriber.find(filter).sort({ subscribedAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit)
        .select('email status topics lang source subscribedAt confirmedAt unsubscribedAt lastEmailedAt').lean(),
      Subscriber.countDocuments(filter),
    ]);
    res.json({ success: true, data: rows, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (error) {
    console.error('Newsletter subscribers error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/subscribers.csv', async (req, res) => {
  try {
    const rows = await Subscriber.find({}).sort({ subscribedAt: -1 }).limit(50000)
      .select('email status topics lang source subscribedAt confirmedAt').lean();
    const head = ['Email', 'Status', 'Language', 'Topics', 'Source', 'Subscribed', 'Confirmed'];
    const lines = [head.join(',')].concat(
      rows.map((r) => [r.email, r.status, r.lang, (r.topics || []).join(' '), r.source, r.subscribedAt ? new Date(r.subscribedAt).toISOString() : '', r.confirmedAt ? new Date(r.confirmedAt).toISOString() : ''].map(csvCell).join(','))
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="subscribers.csv"');
    res.send(`﻿${lines.join('\r\n')}\r\n`);
  } catch (error) {
    console.error('Newsletter export error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/subscribers/:id', async (req, res) => {
  try {
    if (!oid(req.params.id)) return res.status(404).json({ message: 'Not found' });
    const removed = await Subscriber.findByIdAndDelete(req.params.id).select('email');
    if (!removed) return res.status(404).json({ message: 'Not found' });
    logAdminActivity(req.user.id, 'Subscriber Removed', { email: removed.email });
    res.json({ success: true });
  } catch (error) {
    console.error('Newsletter delete error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ------------------------------------------------------------------ settings ----

router.put('/settings', async (req, res) => {
  try {
    const body = req.body || {};
    const $set = {};
    if (typeof body.autoEvents === 'boolean') $set.autoEvents = body.autoEvents;
    if (typeof body.autoBlogs === 'boolean') $set.autoBlogs = body.autoBlogs;
    if (typeof body.festivalWishesEnabled === 'boolean') $set['festivalWishes.enabled'] = body.festivalWishesEnabled;
    if (body.dailyCap !== undefined) {
      const cap = Number(body.dailyCap);
      if (!Number.isInteger(cap) || cap < 1 || cap > 5000) return res.status(400).json({ message: 'Daily limit must be a whole number from 1 to 5000.' });
      $set.dailyCap = cap;
    }
    await NewsletterSettings.getSettings();
    if (Object.keys($set).length) await NewsletterSettings.updateOne({ key: 'main' }, { $set });
    logAdminActivity(req.user.id, 'Newsletter Settings Updated', $set);
    res.json({ success: true });
  } catch (error) {
    console.error('Newsletter settings error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ----------------------------------------------------------------- festivals ----

router.get('/festivals', async (req, res) => {
  try {
    const settings = await NewsletterSettings.getSettings();
    const days = Math.min(400, Math.max(7, parseInt(req.query.days, 10) || 150));
    const list = await festivals.getUpcomingFestivals(settings, { days });
    // Which of them have already been wished (a mailing exists for that day)?
    const queued = await NewsletterCampaign.find({ kind: 'festival', dedupeKey: { $in: list.map((f) => `festival:${f.date}`) } }).select('dedupeKey status stats').lean();
    const byDay = new Map(queued.map((c) => [c.dedupeKey, c]));
    res.json({
      success: true,
      data: list.map((f) => {
        const c = byDay.get(`festival:${f.date}`);
        return { ...f, rank: undefined, sent: !!c && ['sending', 'done'].includes(c.status), campaignStatus: c ? c.status : null };
      }),
    });
  } catch (error) {
    console.error('Newsletter festivals error:', error.message);
    res.status(502).json({ message: 'The festival calendar could not be reached right now. Please try again in a moment.' });
  }
});

router.put('/festivals/:key', async (req, res) => {
  try {
    const key = String(req.params.key || '');
    if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(key)) return res.status(400).json({ message: 'Unknown festival.' });
    const body = req.body || {};
    const entry = {};
    if (typeof body.enabled === 'boolean') entry.enabled = body.enabled;
    if (body.message && typeof body.message === 'object') {
      const message = {};
      for (const lang of LANGS) {
        const text = str(body.message[lang], 1500);
        if (text) message[lang] = text;
      }
      if (Object.keys(message).length) entry.message = message;
    }
    await NewsletterSettings.getSettings();
    const field = `festivalWishes.overrides.${key}`;
    if (Object.keys(entry).length) await NewsletterSettings.updateOne({ key: 'main' }, { $set: { [field]: entry } });
    else await NewsletterSettings.updateOne({ key: 'main' }, { $unset: { [field]: 1 } });
    logAdminActivity(req.user.id, 'Festival Wish Updated', { key, ...entry });
    res.json({ success: true });
  } catch (error) {
    console.error('Newsletter festival update error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ------------------------------------------------------------ audience / send ----

router.get('/audience', async (req, res) => {
  try {
    const topic = Subscriber.TOPICS.includes(req.query.topic) ? req.query.topic : 'news';
    res.json({ success: true, data: { topic, count: await newsletter.countAudience(topic) } });
  } catch (error) {
    console.error('Newsletter audience error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// What a "custom" mailing carries, validated.
const customFrom = (body) => {
  const subject = { en: str(body.subject && body.subject.en, 200), ne: str(body.subject && body.subject.ne, 200) };
  const text = { en: str(body.body && body.body.en, 5000), ne: str(body.body && body.body.ne, 5000) };
  const buttonLabel = { en: str(body.buttonLabel && body.buttonLabel.en, 60), ne: str(body.buttonLabel && body.buttonLabel.ne, 60) };
  const url = str(body.url, 500);
  return { subject, body: text, buttonLabel, url };
};
const validCustom = (c) => {
  if (!c.subject.en || !c.body.en) return 'Please write a subject and a message in English.';
  if (c.url && !/^https?:\/\//i.test(c.url)) return 'The link must start with https://';
  return '';
};

router.post('/announce', sendLimiter, async (req, res) => {
  try {
    if (!isEmailConfigured()) return res.status(409).json({ message: 'E-mail is not set up on the server (EMAIL_USER / EMAIL_PASS), so nothing can be sent.' });
    if (!newsletter.linksReady()) return res.status(409).json({ message: 'BACKEND_URL is not set on the server, so the unsubscribe links in the e-mails would not work. Set it to the public https address of this API first.' });
    const body = req.body || {};
    const resend = body.resend === true;
    let campaign = null;
    let topic = 'news';
    if (body.kind === 'event') {
      if (!oid(body.eventId)) return res.status(400).json({ message: 'Choose an event.' });
      const event = await Event.findById(body.eventId);
      if (!event) return res.status(404).json({ message: 'Event not found.' });
      topic = 'events';
      campaign = await newsletter.announceEvent(event, { force: true, resend, createdBy: req.user._id });
    } else if (body.kind === 'blog') {
      if (!oid(body.blogId)) return res.status(400).json({ message: 'Choose a blog post.' });
      const blog = await Blog.findById(body.blogId);
      if (!blog) return res.status(404).json({ message: 'Blog post not found.' });
      if (blog.published === false) return res.status(400).json({ message: 'This blog post is not published yet.' });
      topic = 'news';
      campaign = await newsletter.announceBlog(blog, { force: true, resend, createdBy: req.user._id });
    } else if (body.kind === 'custom') {
      topic = Subscriber.TOPICS.includes(body.topic) ? body.topic : 'news';
      const custom = customFrom(body);
      const problem = validCustom(custom);
      if (problem) return res.status(400).json({ message: problem });
      campaign = await newsletter.queueCustom({ ...custom, topic, createdBy: req.user._id, resend });
    } else {
      return res.status(400).json({ message: 'Unknown kind of mailing.' });
    }
    if (!campaign) return res.status(409).json({ message: 'This has already been mailed to the subscribers. Tick "send again" to mail it once more.', code: 'ALREADY_SENT' });
    logAdminActivity(req.user.id, 'Newsletter Queued', { kind: campaign.kind, label: campaign.label });
    res.status(201).json({ success: true, data: { id: campaign._id, kind: campaign.kind, topic, audience: await newsletter.countAudience(topic) } });
  } catch (error) {
    console.error('Newsletter announce error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// A sample to the admin's own address, in the language they pick, before anything goes to the subscribers.
router.post('/test', sendLimiter, async (req, res) => {
  try {
    if (!isEmailConfigured()) return res.status(409).json({ message: 'E-mail is not set up on the server (EMAIL_USER / EMAIL_PASS), so nothing can be sent.' });
    const body = req.body || {};
    const lang = LANGS.includes(body.lang) ? body.lang : 'en';
    let data = {};
    const kind = ['event', 'blog', 'festival', 'custom'].includes(body.kind) ? body.kind : null;
    if (!kind) return res.status(400).json({ message: 'Unknown kind of mailing.' });
    if (kind === 'event') {
      if (!oid(body.eventId)) return res.status(400).json({ message: 'Choose an event.' });
      const event = await Event.findById(body.eventId).lean();
      if (!event) return res.status(404).json({ message: 'Event not found.' });
      data = { title: event.title, summary: event.desc, dateText: Object.fromEntries(LANGS.map((l) => [l, (event.dateNepali && event.dateNepali[l]) || (event.greg && event.greg[l]) || (l === 'en' ? event.date : '') || ''])), photo: /^https:\/\//i.test(event.photo || '') ? event.photo : '', url: `${newsletter.siteUrl()}/events` };
    } else if (kind === 'blog') {
      if (!oid(body.blogId)) return res.status(400).json({ message: 'Choose a blog post.' });
      const blog = await Blog.findById(body.blogId).lean();
      if (!blog) return res.status(404).json({ message: 'Blog post not found.' });
      data = { title: blog.title, summary: blog.excerpt, photo: /^https:\/\//i.test(blog.image || '') ? blog.image : '', url: `${newsletter.siteUrl()}/blogs/${blog._id}` };
    } else if (kind === 'festival') {
      const nameEn = str(body.nameEn, 120);
      if (!nameEn) return res.status(400).json({ message: 'Choose a festival.' });
      const messages = body.messages && typeof body.messages === 'object' ? Object.fromEntries(LANGS.map((l) => [l, str(body.messages[l], 1500)]).filter(([, v]) => v)) : null;
      data = { key: festivals.festivalKey(nameEn), nameEn, nameNe: str(body.nameNe, 120), messages };
    } else {
      const custom = customFrom(body);
      const problem = validCustom(custom);
      if (problem) return res.status(400).json({ message: problem });
      data = custom;
    }
    const mail = buildNewsletterEmail({ kind, lang, data, siteUrl: newsletter.siteUrl(), unsubscribeUrl: `${newsletter.apiUrl()}/api/subscribe/unsubscribe/${'0'.repeat(48)}`, isTest: true });
    const result = await sendEmail({ to: req.user.email, subject: `[Test] ${mail.subject}`, html: mail.html, text: mail.text });
    if (result && result.error) return res.status(502).json({ message: 'The test e-mail could not be sent. Please check the e-mail settings.' });
    res.json({ success: true, data: { to: req.user.email } });
  } catch (error) {
    console.error('Newsletter test error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ----------------------------------------------------------------- campaigns ----

router.get('/campaigns', async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(5, parseInt(req.query.limit, 10) || 30));
    const rows = await NewsletterCampaign.find({}).sort({ createdAt: -1 }).limit(limit)
      .select('kind topic label status stats error createdAt startedAt finishedAt').lean();
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Newsletter campaigns error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/campaigns/:id/cancel', async (req, res) => {
  try {
    if (!oid(req.params.id)) return res.status(404).json({ message: 'Not found' });
    const updated = await NewsletterCampaign.findOneAndUpdate({ _id: req.params.id, status: { $in: ['queued', 'sending', 'failed'] } }, { $set: { status: 'cancelled', leaseUntil: null, finishedAt: new Date() } }, { new: true });
    if (!updated) return res.status(409).json({ message: 'This mailing cannot be stopped any more.' });
    logAdminActivity(req.user.id, 'Newsletter Cancelled', { label: updated.label });
    res.json({ success: true });
  } catch (error) {
    console.error('Newsletter cancel error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/campaigns/:id/retry', async (req, res) => {
  try {
    if (!oid(req.params.id)) return res.status(404).json({ message: 'Not found' });
    const updated = await NewsletterCampaign.findOneAndUpdate({ _id: req.params.id, status: 'failed' }, { $set: { status: 'queued', error: '', leaseUntil: null } }, { new: true });
    if (!updated) return res.status(409).json({ message: 'Only a failed mailing can be tried again.' });
    newsletter.processCampaigns().catch((e) => console.error('Newsletter worker error:', e.message));
    res.json({ success: true });
  } catch (error) {
    console.error('Newsletter retry error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
