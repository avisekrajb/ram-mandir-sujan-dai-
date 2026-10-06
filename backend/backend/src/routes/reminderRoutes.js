const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const Reminder = require('../models/Reminder');
const protect = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const { sendReminderEmail } = require('../services/reminderEmail');
const { isEmailConfigured } = require('../services/emailService');
const { unsubscribeUrlFor, siteUrl } = require('../services/reminderService');
const {
  parseYmd,
  nptNow,
  addDays,
  daysBetween,
  sendDateFor,
  eligibleOffsets,
} = require('../utils/reminderDates');

const MAX_ACTIVE_PER_USER = 100;
const MAX_DAYS_AHEAD = 400;

const testLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 6,
  message: 'Too many test emails. Please try again in a few minutes.',
});

const str = (v, max) => String(v === undefined || v === null ? '' : v).trim().slice(0, max);

// A stable key so saving the same festival twice updates one reminder.
const dedupeKeyFor = (eventDate, title) =>
  `${eventDate}|${(title.en || title.ne || '').toLowerCase().replace(/\s+/g, ' ').slice(0, 80)}`;

/** What the page needs to draw one reminder. */
const present = (r, today) => {
  const offsets = (r.offsets || []).slice().sort((a, b) => b - a);
  return {
    id: String(r._id),
    kind: r.kind,
    title: r.title,
    eventDate: r.eventDate,
    bsLabel: r.bsLabel,
    tithi: r.tithi,
    note: r.note,
    lang: r.lang,
    email: r.email,
    offsets,
    daysLeft: daysBetween(today, r.eventDate),
    schedule: offsets.map((o) => ({
      offset: o,
      sendOn: sendDateFor(r.eventDate, o),
      sent: !!(r.sent && r.sent[`d${o}`]),
    })),
    lastError: r.lastError || '',
    createdAt: r.createdAt,
  };
};

// ---------------------------------------------------------------------------
// Public: "stop this reminder" link from the email. GET only shows a confirm
// button (mail scanners open links, so a GET must not change anything); the
// POST from that button does the work.
// ---------------------------------------------------------------------------
const page = (title, body) => `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f7f5f4;color:#1c1717;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
  .card{background:#fff;border:1px solid #ece5e4;border-radius:16px;max-width:440px;width:100%;padding:28px;text-align:center}
  h1{font-size:20px;margin:0 0 8px}p{color:#5e5757;line-height:1.6;margin:8px 0}
  button,a.btn{display:inline-block;margin-top:14px;padding:11px 24px;background:#a80808;color:#fff;border:0;border-radius:8px;font-weight:600;font-size:15px;text-decoration:none;cursor:pointer}
  a.link{display:inline-block;margin-top:14px;color:#a80808;font-weight:600;text-decoration:none}
</style></head><body><div class="card">${body}</div></body></html>`;

const escapeHtml = (value) =>
  String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// These two pages are real HTML (inline <style>, a form), so they get their own policy instead of the
// API-wide "load nothing" one: styles inline, the form may post back to this address, nothing else.
const pageCsp = (req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
  // The API-wide policy is no-referrer, and with it a browser sends 'Origin: null' on a form POST, which the CORS
  // check refuses. Same-origin keeps the button working and still sends the page address to nobody else.
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
};

const findByToken = (token) =>
  /^[a-f0-9]{48}$/.test(token) ? Reminder.findOne({ unsubscribeToken: token }).lean() : null;

router.get('/unsubscribe/:token', pageCsp, async (req, res) => {
  try {
    const r = await findByToken(req.params.token);
    if (!r) {
      return res
        .status(404)
        .send(page('Reminder not found', '<h1>Reminder not found</h1><p>This reminder has already been removed.</p>'));
    }
    const title = escapeHtml(r.title.en || r.title.ne);
    res.send(
      page(
        'Stop reminder',
        `<h1>Stop this reminder?</h1><p><strong>${title}</strong><br>${escapeHtml(r.eventDate)}</p>
         <form method="post" action=""><button type="submit">Yes, stop it</button></form>
         <a class="link" href="${escapeHtml(siteUrl())}/calendar">Keep it</a>`
      )
    );
  } catch (error) {
    console.error('Unsubscribe page error:', error.message);
    res.status(500).send(page('Error', '<h1>Something went wrong</h1><p>Please try again later.</p>'));
  }
});

router.post('/unsubscribe/:token', pageCsp, async (req, res) => {
  try {
    const r = await findByToken(req.params.token);
    if (r) await Reminder.deleteOne({ _id: r._id });
    res.send(
      page(
        'Reminder stopped',
        `<h1>Reminder stopped</h1><p>You will not get any more emails about this day.</p>
         <a class="btn" href="${escapeHtml(siteUrl())}/calendar">Open the calendar</a>`
      )
    );
  } catch (error) {
    console.error('Unsubscribe error:', error.message);
    res.status(500).send(page('Error', '<h1>Something went wrong</h1><p>Please try again later.</p>'));
  }
});

// ---------------------------------------------------------------------------
// Signed-in: everything below is the person's own reminders (admins and
// visitors alike; there is no cross-user access).
// ---------------------------------------------------------------------------
router.use(protect);

// @route GET /api/reminders  -> my upcoming reminders (and last week's)
router.get('/', async (req, res) => {
  try {
    const { date: today } = nptNow();
    const rows = await Reminder.find({
      user: req.user._id,
      eventDate: { $gte: addDays(today, -7) },
    })
      .sort({ eventDate: 1 })
      .limit(MAX_ACTIVE_PER_USER + 20)
      .lean();
    res.json({
      success: true,
      emailReady: Boolean(isEmailConfigured()),
      email: req.user.email,
      reminders: rows.map((r) => present(r, today)),
    });
  } catch (error) {
    console.error('List reminders error:', error.message);
    res.status(500).json({ success: false, message: 'Could not load your reminders' });
  }
});

// @route POST /api/reminders  -> create, or update the same day+title
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const { date: today } = nptNow();

    const eventDate = str(body.eventDate, 10);
    if (!parseYmd(eventDate)) {
      return res.status(400).json({ success: false, message: 'Please choose a valid date.' });
    }
    if (eventDate < today) {
      return res.status(400).json({ success: false, message: 'That day has already passed.' });
    }
    if (daysBetween(today, eventDate) > MAX_DAYS_AHEAD) {
      return res.status(400).json({ success: false, message: 'Reminders can be set up to a year ahead.' });
    }

    const title = {
      en: str(body.title && body.title.en, 160),
      ne: str(body.title && body.title.ne, 160),
    };
    if (!title.en && !title.ne) {
      return res.status(400).json({ success: false, message: 'A title is required.' });
    }

    const wanted = Array.from(
      new Set((Array.isArray(body.offsets) ? body.offsets : [1, 0]).map(Number))
    ).filter((o) => Reminder.OFFSETS.includes(o));
    if (!wanted.length) {
      return res.status(400).json({ success: false, message: 'Choose when you want to be reminded.' });
    }
    const offsets = eligibleOffsets(eventDate, wanted, today).sort((a, b) => b - a);
    if (!offsets.length) {
      return res.status(400).json({
        success: false,
        message: 'Those reminder times have already passed. Pick a later option.',
      });
    }

    const dedupeKey = dedupeKeyFor(eventDate, title);
    const existing = await Reminder.findOne({ user: req.user._id, dedupeKey }).select('_id').lean();
    if (!existing) {
      const active = await Reminder.countDocuments({ user: req.user._id, eventDate: { $gte: today } });
      if (active >= MAX_ACTIVE_PER_USER) {
        return res.status(400).json({
          success: false,
          message: `You can keep up to ${MAX_ACTIVE_PER_USER} reminders. Remove some to add more.`,
        });
      }
    }

    const fields = {
      email: req.user.email,
      name: str(req.user.name, 80),
      kind: Reminder.KINDS.includes(body.kind) ? body.kind : 'festival',
      title,
      eventDate,
      bsLabel: str(body.bsLabel, 60),
      tithi: str(body.tithi, 60),
      note: str(body.note, 300),
      offsets,
      lang: Reminder.LANGS.includes(body.lang) ? body.lang : 'en',
    };

    const reminder = await Reminder.findOneAndUpdate(
      { user: req.user._id, dedupeKey },
      {
        $set: fields,
        // user + dedupeKey come from the filter on insert.
        $setOnInsert: { unsubscribeToken: crypto.randomBytes(24).toString('hex') },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();

    res.status(existing ? 200 : 201).json({
      success: true,
      updated: !!existing,
      dropped: wanted.filter((o) => !offsets.includes(o)),
      reminder: present(reminder, today),
    });
  } catch (error) {
    console.error('Create reminder error:', error.message);
    res.status(500).json({ success: false, message: 'Could not save the reminder' });
  }
});

const ownReminder = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ success: false, message: 'Reminder not found' });
    return null;
  }
  const r = await Reminder.findOne({ _id: req.params.id, user: req.user._id }).lean();
  if (!r) res.status(404).json({ success: false, message: 'Reminder not found' });
  return r;
};

// @route DELETE /api/reminders/:id
router.delete('/:id', async (req, res) => {
  try {
    const r = await ownReminder(req, res);
    if (!r) return;
    await Reminder.deleteOne({ _id: r._id });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete reminder error:', error.message);
    res.status(500).json({ success: false, message: 'Could not remove the reminder' });
  }
});

// @route POST /api/reminders/:id/test  -> email this reminder to its owner now
router.post('/:id/test', testLimiter, async (req, res) => {
  try {
    const r = await ownReminder(req, res);
    if (!r) return;
    if (!isEmailConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Email is not set up on this server yet, so reminders cannot be sent.',
      });
    }
    const { date: today } = nptNow();
    const outcome = await sendReminderEmail({
      reminder: r,
      daysLeft: Math.max(0, daysBetween(today, r.eventDate)),
      isTest: true,
      siteUrl: siteUrl(),
      unsubscribeUrl: unsubscribeUrlFor(r),
    });
    if (outcome && outcome.error) {
      return res.status(502).json({ success: false, message: 'The email could not be sent. Please try again.' });
    }
    res.json({ success: true, sentTo: r.email });
  } catch (error) {
    console.error('Test reminder error:', error.message);
    res.status(500).json({ success: false, message: 'Could not send the test email' });
  }
});

module.exports = router;
