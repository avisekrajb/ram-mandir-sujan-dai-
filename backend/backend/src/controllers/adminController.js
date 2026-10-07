const mongoose = require('mongoose');
const AdminSettings = require('../models/AdminSettings');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Donation = require('../models/Donation');
const History = require('../models/History');
const Team = require('../models/Team');
const Gallery = require('../models/Gallery');
const Event = require('../models/Event');
const Contact = require('../models/Contact');
const AdminLog = require('../models/AdminLog');
const cloudinary = require('../config/cloudinary');
const { sendTeamWelcomeEmail } = require('../services/emailService');
const { clearLivePujaCache } = require('../services/livePujaService');
const { PUJA_TYPES, DEFAULT_EVENTS_PAGE_TEXT } = require('../data/templeContent');
const { DEFAULT_PROGRAM_SECTIONS } = require('../data/templePrograms');
const { DEFAULT_HISTORY } = require('../data/templeHistory');
const { DEFAULT_BOOKING_CONTENT } = require('../data/templeBooking');
const { DONATE_PAGE_TITLE, DONATE_INTRO, DEFAULT_DONATE_CONTENT } = require('../data/templeDonate');
const { MAX_LIST } = require('../utils/listLimits');
const { hasArea } = require('../middleware/permissions');
const {
  TEAM_PAGE_TITLE,
  DEFAULT_TEAM_MEMBERS,
  DEFAULT_TEAM_CONTENT,
} = require('../data/templeTeam');

// ============ ADMIN ACTIVITY LOGGING ============
//
// The AdminLog collection is the only store. An earlier version also kept a
// module-level `adminActivityLogs` array that was pushed to on every write but
// never read by any query, so it only leaked memory and made the cap
// meaningless. It has been removed; capping happens against the database.
//
// Keep only the newest ADMIN_LOG_LIMIT entries, newest first. Pruning on write
// keeps the collection bounded without needing a cron job or TTL index.
//
// ADMIN_LOG_LIMIT is how many entries are kept, and therefore also how many the
// Audit log page can show (there is no paging: the newest 50 are the whole
// history as far as this site is concerned). DEFAULT_LOG_PAGE is how many a plain
// GET /activity returns, which is what the activity widgets load on every admin
// page view.
const ADMIN_LOG_LIMIT = 50;
const DEFAULT_LOG_PAGE = 50;

/**
 * Delete everything beyond the newest ADMIN_LOG_LIMIT documents.
 * Safe to call after every write; a no-op when the collection is under the cap.
 */
const pruneAdminLogs = async () => {
  try {
    const total = await AdminLog.countDocuments();
    if (total <= ADMIN_LOG_LIMIT) return;

    // Find the _id of the oldest document we are allowed to keep, then drop
    // everything strictly older than it.
    const cutoff = await AdminLog.find({}, { _id: 1 })
      .sort({ createdAt: -1 })
      .skip(ADMIN_LOG_LIMIT - 1)
      .limit(1)
      .lean();

    const cutoffId = cutoff[0]?._id;
    if (!cutoffId) return;

    const result = await AdminLog.deleteMany({
      _id: { $lt: cutoffId },
    });

    if (result.deletedCount > 0) {
      console.log(
        `Admin logs pruned: removed ${result.deletedCount}, keeping latest ${ADMIN_LOG_LIMIT}`
      );
    }
  } catch (error) {
    // Pruning is housekeeping; never fail the admin action that triggered it.
    console.error('Admin log prune error:', error.message);
  }
};

// @desc    Get admin activity logs (latest only, newest first)
// @route   GET /api/admin/activity
// @access  Private/Admin
exports.getAdminActivity = async (req, res) => {
  try {
    // `limit` is honoured but can never exceed the retention cap.
    const requested = parseInt(req.query.limit, 10);
    const limit = Math.min(
      Number.isFinite(requested) && requested > 0 ? requested : DEFAULT_LOG_PAGE,
      ADMIN_LOG_LIMIT
    );

    const q = {};
    const search = String(req.query.search || '').replace(/\0/g, '').trim();
    if (search) {
      // Escape the input before building the regex, otherwise a search for
      // "c++" or "(" throws and the whole log list fails to load.
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(escaped, 'i');
      q.$or = [
        { action: rx },
        { 'user.name': rx },
        { 'user.email': rx },
        { 'details.targetName': rx },
        { 'details.targetEmail': rx },
      ];
    }
    // Account actions (who was suspended, whose password was reset, emails, reasons)
    // are only for admins who can open the Users area.
    if (!hasArea(req.user, 'users')) {
      q['details.targetId'] = { $exists: false };
      q['details.targetEmail'] = { $exists: false };
    }
    // Optional filters used by the Audit log page.
    if (req.query.admin && mongoose.Types.ObjectId.isValid(req.query.admin)) {
      q.adminId = req.query.admin;
    }
    if (req.query.from || req.query.to) {
      q.createdAt = {};
      const from = new Date(req.query.from);
      const to = new Date(req.query.to);
      if (!Number.isNaN(from.getTime())) q.createdAt.$gte = from;
      if (!Number.isNaN(to.getTime())) q.createdAt.$lte = to;
      if (Object.keys(q.createdAt).length === 0) delete q.createdAt;
    }

    const logs = await AdminLog.find(q)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Self-heal rows written before the cap existed.
    if (!search) pruneAdminLogs();

    res.json(logs.map(toFrontendLog));
  } catch (error) {
    console.error('Get admin activity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add admin activity log
// @route   POST /api/admin/activity/log
// @access  Private/Admin
exports.addAdminLog = async (req, res) => {
  try {
    const { action, details } = req.body;
    if (action !== undefined && typeof action !== 'string') {
      return res.status(400).json({ message: 'action must be text' });
    }
    const log = await AdminLog.create({
      action: (action || 'Admin action').slice(0, 100),
      details: capDetails(details || {}),
      user: {
        name: req.user.name || 'Admin',
        email: req.user.email || 'admin@temple.com',
        id: req.user.id,
      },
      adminId: req.user.id,
    });

    // Drop the oldest entries so the collection never exceeds the cap.
    await pruneAdminLogs();

    res.json({ success: true, data: toFrontendLog(log.toObject()) });
  } catch (error) {
    console.error('Add admin log error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Clear admin activity logs
// @route   DELETE /api/admin/activity
// @access  Private/Admin
exports.clearAdminLogs = async (req, res) => {
  try {
    await AdminLog.deleteMany({});
    res.json({ success: true, message: 'Logs cleared' });
  } catch (error) {
    console.error('Clear logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a single admin activity log
// @route   DELETE /api/admin/activity/:id
// @access  Private/Admin
exports.deleteAdminLog = async (req, res) => {
  try {
    const deleted = await AdminLog.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Log not found' });
    }
    res.json({ success: true, message: 'Log deleted' });
  } catch (error) {
    console.error('Delete log error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get admin activity stats
// @route   GET /api/admin/activity/stats
// @access  Private/Admin
exports.getAdminLogStats = async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const [total, todayCount, thisWeek, thisMonth] = await Promise.all([
      AdminLog.countDocuments(),
      AdminLog.countDocuments({ createdAt: { $gte: today } }),
      AdminLog.countDocuments({ createdAt: { $gte: weekAgo } }),
      AdminLog.countDocuments({ createdAt: { $gte: monthAgo } }),
    ]);

    /*
     * `total` is capped at the retention limit because older entries are
     * pruned. Without this the panel would show "Total 400" next to a list of
     * 50 rows, which reads as missing data rather than retention.
     */
    res.json({
      success: true,
      data: {
        total: Math.min(total, DEFAULT_LOG_PAGE),
        today: todayCount,
        thisWeek,
        thisMonth,
        retained: Math.min(total, DEFAULT_LOG_PAGE),
        limit: DEFAULT_LOG_PAGE,
        // Everything the Audit log page can browse.
        retention: ADMIN_LOG_LIMIT,
        stored: total,
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Map a persisted log doc to the shape the frontend expects
const toFrontendLog = (log) => ({
  _id: log._id,
  action: log.action,
  details: log.details || {},
  timestamp: (log.createdAt || new Date()).toISOString(),
  user: log.user || { name: 'Admin', email: '', id: log.adminId },
  adminId: log.adminId,
});

/**
 * Helper to record admin activity.
 *
 * Fire-and-forget on purpose: this is called from the middle of settings and
 * content updates, so a logging failure must never abort the admin's change.
 * Pruning runs after the insert to hold the collection at the retention cap.
 */
// Log details are for people to read: whole request bodies (a full settings save is
// ~70 KB) would fill the collection and the activity responses.
const MAX_DETAILS_CHARS = 4000;
const capDetails = (details) => {
  try {
    const json = JSON.stringify(details === undefined ? {} : details);
    if (json.length <= MAX_DETAILS_CHARS) return details === undefined ? {} : details;
    return { truncated: true, keys: Object.keys(details || {}).slice(0, 40) };
  } catch (e) {
    return {};
  }
};

const logAdminActivity = (adminId, action, details = {}) => {
  User.findById(adminId)
    .select('name email')
    .lean()
    .then((u) =>
      AdminLog.create({
        adminId,
        action: String(action).slice(0, 100),
        details: capDetails(details),
        user: { id: adminId, name: u?.name || 'Admin', email: u?.email || '' },
      })
    )
    .then(() => pruneAdminLogs())
    .catch((e) => console.error('AdminLog persist error:', e.message));
};

// ============ HELPER FUNCTIONS ============

// ============ ABOUT SECTION TITLES ============
//
// Shown in two places: Admin → Home (aboutPreview, the homepage teaser) and
// the About section on the homepage (about). Both carry the same heading, so
// they share one constant.

const DEFAULT_ABOUT_TITLE = {
  en: 'Introduction to the Temple',
  ne: 'श्री रामचन्द्र मन्दिरको संक्षिप्त परिचय',
  hi: 'श्री रामचन्द्र मन्दिर का परिचय',
  zh: '什里·拉姆钱德拉神庙简介',
  ta: 'ஸ்ரீ ராமச்சந்திர கோயில் அறிமுகம்',
};

// The invocation and stuti printed over the home page hero banner, in the five
// languages the site supports. Backfilled into installs that predate the
// Admin → Hero shloka fields; an invocation, heading or verse an admin has
// since typed is never overwritten.
const DEFAULT_HERO_SHLOKA = {
  invocation: {
    en: 'Salutations to Lord Shri Ramachandra.',
    ne: 'श्रीरामचन्द्राय नमः',
    hi: 'श्रीरामचन्द्राय नमः',
    zh: '向 श्री罗摩旃陀罗致敬。',
    ta: 'ஸ்ரீ ராமச்சந்திராய நமः',
  },
  stutiLabel: {
    en: 'Hymn to Shri Rama:',
    ne: 'श्रीरामस्तुति:',
    hi: 'श्रीराम स्तुति:',
    zh: 'श्री罗摩赞颂：',
    ta: 'ஸ்ரீ ராம ஸ்துதி:',
  },
  verse: {
    en: 'I seek refuge in Lord Shri Ramachandra, who is beloved of all, courageous on the battlefield, lotus-eyed, and the Lord of the Raghu dynasty; who embodies compassion and is the bestower of mercy.',
    ne: 'लोकाभिरामं रणरङ्गधीरं राजीवनेत्रं रघुवंशनाथम्।\nकारुण्यरूपं करुणाकरं तं श्रीरामचन्द्रं शरणं प्रपद्ये॥',
    hi: 'लोकाभिरामं रणरङ्गधीरं राजीवनेत्रं रघुवंशनाथम्।\nकारुण्यरूपं करुणाकरं तं श्रीरामचन्द्रं शरणं प्रपद्ये॥',
    zh: '我皈依于 श्री罗摩旃陀罗，他令人世间喜爱，战场上英勇无畏，拥有如莲花般的双眼，是拉古王朝之主；他是慈悲的化身，是施予慈悲与恩典之主。',
    ta: 'உலகத்தாரால் நேசிக்கப்படுபவரும், போர்க்களத்தில் வீரமும் துணிவும் கொண்டவரும், தாமரை போன்ற கண்களையுடையவரும், ரகு வம்சத்தின் தலைவருமான ஸ்ரீ ராமச்சந்திரரை நான் சரணடைகிறேன். அவர் கருணையின் வடிவமாகவும், அருளை வழங்குபவராகவும் விளங்குகிறார்.',
  },
};

// The heading used to be called `label` before it was renamed `stutiLabel`.
const legacyShlokaKey = (part) => (part === 'stutiLabel' ? 'label' : undefined);

/*
 * Records written by an older build hold a localized text group as a one-element
 * array (`verse: [{ en, ne, ... }]`). Unwrap it so Mongoose emits a plain
 * `$set` for the object instead of dotted paths MongoDB rejects on an array.
 * Returns the group itself when it is already an object, so nothing is lost.
 */
const unwrapLocalizedGroup = (value) => {
  if (Array.isArray(value)) {
    return value.find((entry) => entry && typeof entry === 'object' && !Array.isArray(entry)) || {};
  }
  return value && typeof value === 'object' ? value : {};
};

// Titles that shipped before the rename. Matched loosely because the wording
// drifted across releases ("About the Temple" → "श्री रामचन्द्र मन्दिरको
// बारेमा" → the current wording); an exact list kept missing whichever
// variant an install happened to save. Only generic shapes are listed, so a
// custom title a human wrote will not match.
const LEGACY_ABOUT_TITLE_PATTERNS = [
  /^about\s+(us|the\s+temple)$/i,
  /^introduction\s+to\s+the\s+temple$/i,
  /हाम्रो\s+बारेमा$/,
  /मन्दिरको\s+बारेमा$/,
  /मन्दिर\s+के\s+बारे\s+में$/,
  /^关于我们$/,
  /^关于神庙$/,
  /^எங்களைப்\s+பற்றி$/,
  /^கோவிலைப்\s+பற்றி$/,
];

const isLegacyAboutTitle = (value) => {
  const text = String(value || '').trim();
  if (!text) return false;
  return LEGACY_ABOUT_TITLE_PATTERNS.some((re) => re.test(text));
};

// Helper: Get date key in YYYY-MM-DD format
const getDateKey = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ============ SETTINGS ============
exports.getSettings = async (req, res) => {
  try {
    const settings = await AdminSettings.getSettings();
    // Batched into one save at the end, so a read does not write on every call.
    let touched = false;

    /*
     * Keep the booking form in sync with the ceremonies the temple complex can
     * host ("मन्दिर परिसरमा आयोजना गर्न सकिने कार्यक्रम"). Only types that have
     * never been offered are appended.
     *
     * The seeded list is compared against `pujaTypesSeeded`, not against
     * `pujaTypes`, because a type the administrator deleted is missing from
     * `pujaTypes` on purpose. Checking the current list meant every deleted type
     * came back on the next page load - the delete appeared not to work.
     */
    const alreadyOffered = new Set(settings.pujaTypesSeeded || []);
    const current = new Set(settings.pujaTypes || []);
    const unseen = PUJA_TYPES.filter((t) => !alreadyOffered.has(t) && !current.has(t));

    if (unseen.length > 0) {
      settings.pujaTypes = [...(settings.pujaTypes || []), ...unseen];
      await settings.save();
      console.log(`Settings: added ${unseen.length} puja type(s)`);
    }

    // Everything currently offered counts as offered from now on, so a deletion
    // is a decision rather than an absence.
    const toRecord = PUJA_TYPES.filter((t) => current.has(t) || unseen.includes(t));
    const recorded = new Set(settings.pujaTypesSeeded || []);
    const newlyRecorded = toRecord.filter((t) => !recorded.has(t));
    if (newlyRecorded.length > 0) {
      settings.pujaTypesSeeded = [...(settings.pujaTypesSeeded || []), ...newlyRecorded];
      await settings.save();
    }

    // Publish the "पूजा तथा धार्मिक कार्यक्रम बुकिङ" content once. Any section the
    // admin has since added or edited is kept.
    if (!settings.bookingContent || settings.bookingContent.length === 0) {
      settings.bookingContent = DEFAULT_BOOKING_CONTENT;
      await settings.save();
      console.log(`Settings: published ${DEFAULT_BOOKING_CONTENT.length} booking content section(s)`);
    }

    // Publish the "कार्यसमिति तथा सदस्यहरू" content once.
    if (!settings.teamContent || settings.teamContent.length === 0) {
      settings.teamContent = DEFAULT_TEAM_CONTENT;
      await settings.save();
      console.log(`Settings: published ${DEFAULT_TEAM_CONTENT.length} team content section(s)`);
    }
    if (!settings.teamPageTitle || (!settings.teamPageTitle.ne && !settings.teamPageTitle.en)) {
      settings.teamPageTitle = TEAM_PAGE_TITLE;
      await settings.save();
      console.log('Settings: published team page title');
    }

    // Publish the "दान तथा सहयोग" content once.
    if (!settings.donateContent || settings.donateContent.length === 0) {
      settings.donateContent = DEFAULT_DONATE_CONTENT;
      await settings.save();
      console.log(`Settings: published ${DEFAULT_DONATE_CONTENT.length} donate content section(s)`);
    }
    if (!settings.donatePageTitle || (!settings.donatePageTitle.ne && !settings.donatePageTitle.en)) {
      settings.donatePageTitle = DONATE_PAGE_TITLE;
      await settings.save();
      console.log('Settings: published donate page title');
    }
    if (!settings.donateIntro || (!settings.donateIntro.ne && !settings.donateIntro.en)) {
      settings.donateIntro = DONATE_INTRO;
      await settings.save();
      console.log('Settings: published donate page intro');
    }

    // Publish the /events page headings once.
    if (!settings.eventsPageText || settings.eventsPageText.length === 0) {
      settings.eventsPageText = DEFAULT_EVENTS_PAGE_TEXT;
      await settings.save();
      console.log(`Settings: published ${DEFAULT_EVENTS_PAGE_TEXT.length} events page text row(s)`);
    }

    // Publish the "आयोजन गरिने कार्यक्रमहरू" sections once. Anything the admin has
    // since added or edited in Admin -> Events is kept.
    if (!settings.programSections || settings.programSections.length === 0) {
      settings.programSections = DEFAULT_PROGRAM_SECTIONS;
      await settings.save();
      console.log(`Settings: published ${DEFAULT_PROGRAM_SECTIONS.length} program section(s)`);
    }

    /*
     * The "About" headings were renamed from "About the Temple" /
     * "मन्दिरको बारेमा" to "…को परिचय" (an introduction). Rows still holding a
     * placeholder are backfilled; a title the admin typed by hand is left
     * alone. This runs on read so existing installs pick the change up without
     * a migration script.
     */
    for (const field of ['about', 'aboutPreview']) {
      const group = settings[field];
      if (!group?.title) continue;

      const values = Object.values(group.title).filter(Boolean).map((v) => String(v).trim());
      const isPlaceholder =
        values.length === 0 || values.every(isLegacyAboutTitle);

      if (isPlaceholder) {
        group.title = { ...DEFAULT_ABOUT_TITLE };
        touched = true;
      }
    }

    /*
     * The hero banner's invocation / stuti heading / verse are editable from
     * Admin → Hero. Installations that predate those fields get the defaults
     * row by row, so one missing language is filled in without disturbing what
     * an admin has already written. The group is reassigned rather than
     * mutated in place, otherwise Mongoose would not mark it as changed.
     *
     * Older records stored each part wrapped in a one-element array
     * (`verse: [{ en, ne, ... }]`) and named the heading `label`. Saving settings
     * then failed with MongoServerError 28 "Cannot create field 'en' in element":
     * Mongoose turns the replacement object into dotted `$set` paths such as
     * `heroShloka.verse.en`, which MongoDB cannot apply to an array. Unwrapping
     * here repairs those records on the next read, with no migration script.
     */
    const shloka = settings.heroShloka;
    if (shloka) {
      const filled = { enabled: shloka.enabled !== false };
      let shlokaChanged = false;

      for (const part of ['invocation', 'stutiLabel', 'verse']) {
        const stored = unwrapLocalizedGroup(shloka[part]) || shloka[legacyShlokaKey(part)] || {};
        filled[part] = {};

        for (const [code, fallback] of Object.entries(DEFAULT_HERO_SHLOKA[part])) {
          const kept = String(stored[code] ?? '').trim();
          filled[part][code] = kept || fallback;
          if (!kept) shlokaChanged = true;
        }
      }

      if (shlokaChanged) {
        settings.set('heroShloka', filled);
        touched = true;
      }
    }

    if (touched) {
      await settings.save();
      console.log('Settings: republished seeded content');
    }

    res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const settings = await AdminSettings.getSettings();
    // Internal fields are never client-writable, and the superadmin-only
    // switches have their own endpoints; admin pages often post the whole
    // settings object back, so those keys are dropped rather than rejected.
    const SUPERADMIN_ONLY_KEYS = ['maintenanceMode', 'enabledLanguages'];
    const body = { ...(req.body || {}) };
    delete body._id;
    delete body.__v;
    delete body.createdAt;
    if (req.user?.role !== 'superadmin') {
      for (const key of SUPERADMIN_ONLY_KEYS) delete body[key];
    }

    // `donate` must be an object when it is sent at all: null / text / a list would replace (and wipe)
    // the whole donation section, switches and counter included.
    //
    // The payment feature switches (eSewa / Khalti / IPS / QR / bank details) used to be frozen here
    // for everyone below super admin, so the toggles on Admin → Donations silently did nothing. They
    // are ordinary settings now: any admin holding the `donations` area can switch a gateway on or
    // off, because that area already grants access to every donation record.
    if (Object.prototype.hasOwnProperty.call(body, 'donate') && (body.donate === null || typeof body.donate !== 'object' || Array.isArray(body.donate))) {
      delete body.donate;
    }

    // The hero's translated groups are objects in the schema. An old admin bundle (still in a
    // browser cache) posts them wrapped in a one-element array, which would store the legacy
    // shape again and break every later save, so it is unwrapped on the way in.
    if (Array.isArray(body.heroShloka)) {
      body.heroShloka = unwrapLocalizedGroup(body.heroShloka);
    }
    if (body.heroShloka && typeof body.heroShloka === 'object') {
      for (const part of ['invocation', 'stutiLabel', 'verse']) {
        if (Array.isArray(body.heroShloka[part])) {
          body.heroShloka[part] = unwrapLocalizedGroup(body.heroShloka[part]);
        }
      }
    }

    Object.assign(settings, body);

    // The Live Puja answer is cached for a minute; a change here (new channel,
    // manual "I am live", a different fallback video) must show up at once.
    if (Object.prototype.hasOwnProperty.call(body, 'livePuja')) {
      clearLivePujaCache();
    }

    settings.updatedAt = Date.now();
    await settings.save();
    logAdminActivity(req.user.id, 'Settings Updated', req.body);
    res.json(settings);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============ SOCIAL LINKS MANAGEMENT ============

// @desc    Resolve a Facebook share/short URL to its canonical embeddable URL
// @route   POST /api/admin/facebook/resolve
// @access  Public (used by frontend to build embeddable video URLs)
// Facebook share links (/share/v/, /share/r/, fb.watch) 302-redirect to the
// canonical reel/video URL, and the plugins/video.php embed cannot follow that
// redirect, so we resolve it server-side first.
exports.resolveFacebookUrl = async (req, res) => {
  try {
    const rawInput = req.body?.url;
    if (!rawInput || typeof rawInput !== 'string') {
      return res.status(400).json({ success: false, message: 'url is required' });
    }

    // If a full embed <iframe> code was pasted, extract its src/href.
    let value = rawInput.trim();
    if (/<iframe/i.test(value)) {
      const srcMatch = value.match(/src=["']([^"']+)["']/i);
      const src = srcMatch ? srcMatch[1] : value;
      const hrefMatch = src.match(/[?&]href=([^&]+)/i);
      if (hrefMatch) {
        try { value = decodeURIComponent(hrefMatch[1]); }
        catch (e) { value = hrefMatch[1]; }
      } else if (!src.includes('plugins/video.php')) {
        value = src;
      }
    }

    // Only follow redirects for Facebook share/short links; leave direct
    // canonical URLs (facebook.com/.../videos/..., /reel/..., /watch) untouched.
    const isShareLike = /facebook\.com\/share\//i.test(value) || /(^|\.)fb\.watch\/|facebook\.com\/reel\/|facebook\.com\/reels\//i.test(value) || /facebook\.com\/watch\//i.test(value);
    let canonical = value;

    // This endpoint is public, so only ever fetch genuine Facebook hosts over
    // https (the patterns above are unanchored and would match e.g.
    // http://169.254.169.254/?facebook.com/share/).
    const FACEBOOK_HOSTS = ['facebook.com', 'www.facebook.com', 'm.facebook.com', 'web.facebook.com', 'fb.watch', 'www.fb.watch'];
    let isFacebookHost = false;
    try {
      const parsed = new URL(value);
      isFacebookHost = parsed.protocol === 'https:' && FACEBOOK_HOSTS.includes(parsed.hostname.toLowerCase());
    } catch (e) {
      isFacebookHost = false;
    }

    if (isShareLike && isFacebookHost) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        const res = await fetch(value, {
          redirect: 'follow',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          },
        });
        clearTimeout(timeout);
        if (res.url) {
          canonical = res.url;
          // Strip tracking params that make the URL non-canonical
          try {
            const u = new URL(canonical);
            u.hash = '';
            for (const key of ['rdid', 'share_url', 'mibextid', 'ref', 'utm_source', 'utm_medium', 'utm_campaign']) {
              u.searchParams.delete(key);
            }
            canonical = u.toString();
          } catch (e) { /* keep as-is */ }
        }
      } catch (err) {
        console.error('Resolve facebook url error:', err.message);
        // fall through — keep original value
      }
    }

    res.json({ success: true, url: canonical });
  } catch (error) {
    console.error('Resolve facebook url error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get social links (public)
// @route   GET /api/admin/social
// @access  Public
exports.getSocialLinks = async (req, res) => {
  try {
    const settings = await AdminSettings.getSettings();
    const socialLinks = settings.socialLinks || [];
    res.json({ 
      success: true, 
      data: socialLinks 
    });
  } catch (error) {
    console.error('Get social links error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching social links',
      error: error.message 
    });
  }
};

// @desc    Update social links (admin only)
// @route   PUT /api/admin/social
// @access  Private/Admin
exports.updateSocialLinks = async (req, res) => {
  try {
    const { socialLinks } = req.body;
    
    // Validate socialLinks is an array
    if (!Array.isArray(socialLinks)) {
      return res.status(400).json({ 
        success: false, 
        message: 'socialLinks must be an array' 
      });
    }
    
    // Validate each link
    for (const link of socialLinks) {
      if (!link.platform || !link.url) {
        return res.status(400).json({ 
          success: false, 
          message: 'Each social link must have platform and url' 
        });
      }
      
      // Validate platform
      const validPlatforms = ['facebook', 'instagram', 'youtube', 'twitter', 'linkedin', 'whatsapp', 'email', 'phone', 'tiktok', 'pinterest', 'snapchat', 'telegram', 'discord', 'reddit', 'tumblr'];
      if (!validPlatforms.includes(link.platform.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: `Invalid platform: ${link.platform}. Must be one of: ${validPlatforms.join(', ')}`
        });
      }
    }
    
    // Find and update settings
    const settings = await AdminSettings.getSettings();
    settings.socialLinks = socialLinks;
    settings.updatedAt = Date.now();
    await settings.save();
    
    logAdminActivity(req.user.id, 'Social Links Updated', { 
      count: socialLinks.length,
      platforms: socialLinks.map(l => l.platform)
    });
    
    res.json({ 
      success: true, 
      message: 'Social links updated successfully',
      data: settings.socialLinks 
    });
  } catch (error) {
    console.error('Error updating social links:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating social links',
      error: error.message 
    });
  }
};

// ============ HISTORY BANNER UPLOAD ============
exports.uploadHistoryBanner = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No image uploaded' 
      });
    }
    
    const settings = await AdminSettings.getSettings();
    
    if (settings.historyBanner) {
      try {
        const publicId = settings.historyBanner.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`temple/history/banner/${publicId}`);
      } catch (error) {
        console.log('Old banner deletion skipped:', error.message);
      }
    }
    
    settings.historyBanner = req.file.path;
    await settings.save();
    logAdminActivity(req.user.id, 'History Banner Uploaded', { url: req.file.path });
    
    res.json({ 
      success: true, 
      url: req.file.path,
      message: 'History banner uploaded successfully'
    });
  } catch (error) {
    console.error('Upload history banner error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
};

// ============ SEPARATE UPLOAD FUNCTIONS ============

/*
 * Cloudinary public id of an uploaded file, taken from the URL itself: the part
 * after `/upload/` without its extension, folder included. Hardcoding a folder
 * here looks right but silently fails whenever the multer storage puts the file
 * somewhere else (it uses `temple/`), leaving orphans in the bucket.
 */
const cloudinaryPublicId = (url) => {
  if (typeof url !== 'string' || !url.includes('/upload/')) return null;
  return url.split('/upload/')[1].split('?')[0].replace(/\.[a-z0-9]+$/i, '');
};

const destroyCloudinary = async (url, resourceType = 'image') => {
  const publicId = cloudinaryPublicId(url);
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, resourceType === 'video' ? { resource_type: 'video' } : undefined);
  } catch (error) {
    console.log('Old hero file deletion skipped:', error.message);
  }
};

exports.uploadHeroVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No video uploaded' });
    }
    
    const settings = await AdminSettings.getSettings();
    
    if (settings.heroVideo) {
      await destroyCloudinary(settings.heroVideo, 'video');
    }
    
    settings.heroVideo = req.file.path;
    // The banner shows one or the other, so a new video retires the photo.
    settings.heroImage = null;
    await settings.save();
    logAdminActivity(req.user.id, 'Hero Video Uploaded', { url: req.file.path });
    res.json({ url: req.file.path, heroImage: null });
  } catch (error) {
    console.error('Upload hero video error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/*
 * Banner photo for the home page hero. Uploading one retires the video (and the
 * other way round) so the banner only ever has one source and the admin does not
 * have to remember to clear the previous one.
 */
exports.uploadHeroImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    const settings = await AdminSettings.getSettings();

    await destroyCloudinary(settings.heroImage, 'image');
    await destroyCloudinary(settings.heroVideo, 'video');

    settings.heroImage = req.file.path;
    settings.heroVideo = null;
    await settings.save();
    logAdminActivity(req.user.id, 'Hero Photo Uploaded', { url: req.file.path });
    res.json({ url: req.file.path, heroVideo: null });
  } catch (error) {
    console.error('Upload hero photo error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============ OFFLINE MUSIC (super-admin only) ============

// Ten minutes, as offered in the admin panel. Cloudinary is asked to clip at
// this point so the stored file cannot outlast the advertised length.
const OFFLINE_MUSIC_MAX_SECONDS = 600;

/*
 * The MP3 played while a visitor is offline.
 *
 * Ten minutes is the limit the admin is offered. As with the bell sound it is
 * measured in the browser, from the file header, before anything is uploaded:
 * the server would have to download the whole file to know its length, and
 * rejecting a 10 MB upload as a way of learning a clip is too long is a poor
 * trade. The declared duration is stored, and Cloudinary is asked to clip
 * anything over the limit so the stored file cannot be longer than advertised
 * even if the browser's reading was wrong.
 *
 * Replacing an existing track destroys the old file from Cloudinary first, so
 * uploads do not pile up. The reference is cleared from the settings first: if
 * the delete somehow failed, the settings would still point at a live file that
 * nothing is using, which is recoverable - whereas keeping a pointer to a file
 * that is already gone is not.
 */
exports.uploadOfflineMusic = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No MP3 uploaded' });
    }

    // Sent by the admin panel, from the browser's own reading of the file.
    const declared = Number(req.body?.duration);
    const duration = Number.isFinite(declared) && declared > 0
      ? Math.round(Math.min(declared, OFFLINE_MUSIC_MAX_SECONDS))
      : 0;

    const settings = await AdminSettings.getSettings();

    // Drop the file being replaced, and clear the pointer to it first.
    const previousUrl = settings.offlineNotice?.track?.url || null;
    if (previousUrl) {
      settings.offlineNotice.track.url = null;
      await settings.save();
      await destroyCloudinary(previousUrl, 'video');
    }

    settings.offlineNotice.track = {
      url: req.file.path,
      name: String(req.file.originalname || '').slice(0, 120) || '',
      // Seconds, so the admin panel can show the length without downloading it.
      duration,
      bytes: req.file.size || 0,
      uploadedAt: new Date(),
    };
    await settings.save();

    logAdminActivity(req.user.id, 'Offline Music Uploaded', { url: req.file.path });
    res.json({ success: true, data: settings.offlineNotice.track });
  } catch (error) {
    console.error('Upload offline music error:', error);
    const message = String(error?.message || '');
    if (/unknown file format|not allowed|Invalid image or video/i.test(message)) {
      return res.status(400).json({ message: 'That file could not be read as an MP3. Please upload a valid MP3 file.' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

/*
 * Delete the offline music permanently: the file is destroyed on Cloudinary and
 * every reference to it is cleared, so nothing is left pointing at it and nothing
 * is left to play.
 *
 * Only the music is touched. The notice's wording, its enabled switch, the volume
 * and the repeat settings are left exactly as they are, so deleting a track does
 * not silently reset the rest of the page.
 *
 * The clear happens before the destroy: if Cloudinary is unreachable, the pointer
 * is already gone and no visitor will be sent to a file that may not exist. A
 * leftover file on the CDN is far cheaper to tidy than a live reference to a
 * missing one.
 */
exports.deleteOfflineMusic = async (req, res) => {
  try {
    const settings = await AdminSettings.getSettings();
    const url = settings.offlineNotice?.track?.url || null;

    settings.offlineNotice.track = { url: null, name: '', duration: 0, bytes: 0, uploadedAt: null };
    await settings.save();

    if (url) await destroyCloudinary(url, 'video');

    logAdminActivity(req.user.id, 'Offline Music Removed', {});
    res.json({ success: true, data: settings.offlineNotice.track });
  } catch (error) {
    console.error('Delete offline music error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============ NOTIFICATION BELL SOUND ============

/*
 * Upload the MP3 played when a new notification reaches the admin panel.
 * The one-minute limit is checked in the browser before the file is sent (an
 * <audio> element reads the duration without uploading anything); here the type
 * and size are enforced again, because the check in the browser proves nothing.
 */
exports.uploadBellSound = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No MP3 uploaded' });
    }

    const settings = await AdminSettings.getSettings();
    if (settings.bellSound?.url) {
      await destroyCloudinary(settings.bellSound.url, 'video');
    }

    settings.bellSound = {
      url: req.file.path,
      // A newly uploaded sound is on by default: the point of uploading it is to hear it.
      enabled: true,
      label: String(req.body?.label || '').slice(0, 80) || req.file.originalname?.slice(0, 80) || '',
    };
    await settings.save();
    logAdminActivity(req.user.id, 'Bell Sound Uploaded', { url: req.file.path });
    res.json({ success: true, data: settings.bellSound });
  } catch (error) {
    console.error('Upload bell sound error:', error);
    // Cloudinary rejects a file it cannot read before any settings change is
    // made, so this is the visitor's file rather than a server fault: say so
    // instead of a bare 500.
    const message = String(error?.message || '');
    if (/unknown file format|not allowed|Invalid image or video/i.test(message)) {
      return res.status(400).json({ message: 'That file could not be read as an MP3. Please upload a valid MP3 file.' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Remove the bell sound and drop the file from Cloudinary.
exports.deleteBellSound = async (req, res) => {
  try {
    const settings = await AdminSettings.getSettings();
    if (settings.bellSound?.url) {
      await destroyCloudinary(settings.bellSound.url, 'video');
    }
    settings.bellSound = { url: null, enabled: false, label: '' };
    await settings.save();
    logAdminActivity(req.user.id, 'Bell Sound Removed', {});
    res.json({ success: true, data: settings.bellSound });
  } catch (error) {
    console.error('Delete bell sound error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }
    const settings = await AdminSettings.getSettings();
    
    if (settings.logo.photo) {
      try {
        const publicId = settings.logo.photo.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`temple/logo/${publicId}`);
      } catch (error) {
        console.log('Old logo deletion skipped:', error.message);
      }
    }
    
    settings.logo.photo = req.file.path;
    await settings.save();
    logAdminActivity(req.user.id, 'Logo Updated', { url: req.file.path });
    res.json({ url: req.file.path });
  } catch (error) {
    console.error('Upload logo error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.uploadAboutPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }
    const settings = await AdminSettings.getSettings();
    
    if (settings.about.photo) {
      try {
        const publicId = settings.about.photo.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`temple/about/${publicId}`);
      } catch (error) {
        console.log('Old about photo deletion skipped:', error.message);
      }
    }
    
    settings.about.photo = req.file.path;
    await settings.save();
    logAdminActivity(req.user.id, 'About Photo Updated', { url: req.file.path });
    res.json({ url: req.file.path });
  } catch (error) {
    console.error('Upload about photo error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.uploadQRPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }
    const settings = await AdminSettings.getSettings();
    
    if (settings.donate.qrPhoto) {
      try {
        const publicId = settings.donate.qrPhoto.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`temple/qr/${publicId}`);
      } catch (error) {
        console.log('Old QR photo deletion skipped:', error.message);
      }
    }
    
    settings.donate.qrPhoto = req.file.path;
    await settings.save();
    logAdminActivity(req.user.id, 'QR Photo Updated', { url: req.file.path });
    res.json({ url: req.file.path });
  } catch (error) {
    console.error('Upload QR photo error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Upload notice modal photo
// @route   POST /api/admin/upload/notice
// @access  Private/Admin
exports.uploadNoticePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }
    const settings = await AdminSettings.getSettings();

    if (settings.notice.photo) {
      try {
        const publicId = settings.notice.photo.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`temple/notice/${publicId}`);
      } catch (error) {
        console.log('Old notice photo deletion skipped:', error.message);
      }
    }

    settings.notice.photo = req.file.path;
    await settings.save();
    logAdminActivity(req.user.id, 'Notice Photo Updated', { url: req.file.path });
    res.json({ url: req.file.path });
  } catch (error) {
    console.error('Upload notice photo error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.uploadTeamPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }
    
    const { teamId } = req.body;
    if (!teamId || teamId === 'new') {
      return res.json({ url: req.file.path });
    }
    
    const teamMember = await Team.findById(teamId);
    if (!teamMember) {
      return res.status(404).json({ message: 'Team member not found' });
    }
    
    if (teamMember.photo) {
      try {
        const publicId = teamMember.photo.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`temple/team/${publicId}`);
      } catch (error) {
        console.log('Old team photo deletion skipped:', error.message);
      }
    }
    
    teamMember.photo = req.file.path;
    await teamMember.save();
    
    res.json({ url: req.file.path, teamMember });
  } catch (error) {
    console.error('Upload team photo error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.uploadHistoryPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No image uploaded' 
      });
    }
    
    const { historyId } = req.body;
    
    // A brand new history entry has no _id yet, so the photo cannot be attached
    // to a record at this point. Return the uploaded URL and let the create call
    // persist it with the rest of the entry, instead of rejecting the upload.
    if (!mongoose.isValidObjectId(historyId)) {
      return res.json({
        success: true,
        url: req.file.path,
        attached: false,
        message: 'Photo uploaded. It will be saved with the history entry.',
      });
    }
    
    const historyItem = await History.findById(historyId);
    if (!historyItem) {
      return res.status(404).json({ 
        success: false, 
        message: 'History item not found' 
      });
    }
    
    if (historyItem.photo) {
      try {
        const publicId = historyItem.photo.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`temple/history/${publicId}`);
      } catch (error) {
        console.log('Old history photo deletion skipped:', error.message);
      }
    }
    
    historyItem.photo = req.file.path;
    await historyItem.save();
    logAdminActivity(req.user.id, 'History Photo Updated', { historyId, url: req.file.path });
    
    res.json({ 
      success: true, 
      url: req.file.path, 
      historyItem,
      message: 'History photo uploaded successfully'
    });
  } catch (error) {
    console.error('Upload history photo error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
};

exports.uploadEventPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No image uploaded' 
      });
    }
    
    const { eventId } = req.body;
    
    // A brand new event has no _id yet, so there is no record to attach the
    // photo to. The admin form simply omits eventId in that case. Return the
    // uploaded URL and let the create call persist it with the rest of the
    // event. Guarding on isValidObjectId also stops the literal string 'new'
    // (sent by older admin builds) from reaching findById and throwing BSONError.
    if (!mongoose.isValidObjectId(eventId)) {
      return res.json({
        success: true,
        url: req.file.path,
        attached: false,
        message: 'Photo uploaded. It will be saved with the event.',
      });
    }
    
    const eventItem = await Event.findById(eventId);
    if (!eventItem) {
      return res.status(404).json({ 
        success: false, 
        message: 'Event not found' 
      });
    }
    
    if (eventItem.photo) {
      try {
        const publicId = eventItem.photo.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`temple/event/${publicId}`);
      } catch (error) {
        console.log('Old event photo deletion skipped:', error.message);
      }
    }
    
    eventItem.photo = req.file.path;
    await eventItem.save();
    logAdminActivity(req.user.id, 'Event Photo Updated', { eventId, url: req.file.path });
    
    res.json({ 
      success: true, 
      url: req.file.path, 
      eventItem,
      message: 'Event photo uploaded successfully'
    });
  } catch (error) {
    console.error('Upload event photo error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
};

exports.uploadGalleryPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }
    
    const { cap, hue } = req.body;
    // Same rule as the Gallery page uploads: a picture needs a title and a description.
    const title = toLocalized(req.body.title || cap);
    const description = toLocalized(req.body.description);
    if (!hasText(title) || !hasText(description)) {
      await discardUpload(req.file);
      return res.status(400).json({ message: 'A title and a description are required' });
    }
    const galleryItem = await Gallery.create({
      photo: req.file.path,
      cap: title,
      title,
      description,
      type: 'photo',
      hue: hue || '#7A1F2B',
    });
    logAdminActivity(req.user.id, 'Gallery Photo Added', { 
      galleryId: galleryItem._id, 
      url: req.file.path 
    });
    
    res.status(201).json({ url: req.file.path, galleryItem });
  } catch (error) {
    console.error('Upload gallery photo error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.uploadFooterImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }
    
    const settings = await AdminSettings.getSettings();
    
    if (!settings.footer) settings.footer = {};
    settings.footer.bgImage = req.file.path;
    settings.footer.bgType = 'image';
    await settings.save();
    
    res.json({ url: req.file.path });
  } catch (error) {
    console.error('Upload footer image error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.uploadFooterVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No video uploaded' });
    }
    
    const settings = await AdminSettings.getSettings();
    
    if (!settings.footer) settings.footer = {};
    settings.footer.bgVideo = req.file.path;
    settings.footer.bgType = 'video';
    await settings.save();
    
    res.json({ url: req.file.path });
  } catch (error) {
    console.error('Upload footer video error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============ USERS ============
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 }).limit(MAX_LIST);
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// (Role changes and account deletion live in accountController; the old handlers here
// had weaker rules and were removed.)

// ============ BOOKINGS ============
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 }).limit(MAX_LIST);
    res.json(bookings);
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const booking = await Booking.findByIdAndUpdate(id, { status }, { new: true });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    logAdminActivity(req.user.id, 'Booking Status Updated', { 
      bookingId: id, 
      newStatus: status,
      bookingType: booking.type 
    });
    res.json(booking);
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete one booking
// @route   DELETE /api/admin/bookings/:id
// @access  Private/Admin
exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    logAdminActivity(req.user.id, 'Booking Deleted', {
      bookingId: req.params.id,
      bookingType: booking.type,
      name: booking.name,
      date: booking.date,
    });
    res.json({ success: true, message: 'Booking deleted' });
  } catch (error) {
    console.error('Delete booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete several bookings in one request
// @route   DELETE /api/admin/bookings  (body: { ids: [...] })
// @access  Private/Admin
exports.deleteBookingsBulk = async (req, res) => {
  try {
    const { ids } = req.body || {};

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No bookings selected' });
    }

    // A runaway selection should not be able to wipe the whole table; this is
    // a UI convenience for picking rows, not a bulk wipe tool.
    const MAX_BULK_DELETE = 200;
    if (ids.length > MAX_BULK_DELETE) {
      return res.status(400).json({
        message: `Please delete at most ${MAX_BULK_DELETE} bookings at a time`,
      });
    }

    const result = await Booking.deleteMany({ _id: { $in: ids } });

    logAdminActivity(req.user.id, 'Bookings Deleted', {
      count: result.deletedCount,
      ids,
    });

    res.json({
      success: true,
      deletedCount: result.deletedCount,
      message: `${result.deletedCount} booking(s) deleted`,
    });
  } catch (error) {
    console.error('Bulk delete bookings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============ DONATIONS ============
exports.getAllDonations = async (req, res) => {
  try {
    const donations = await Donation.find().sort({ date: -1 }).limit(MAX_LIST);
    res.json(donations);
  } catch (error) {
    console.error('Get donations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateDonationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    // Shared with the super admin and /api/donations/:id/status so the counter
    // bump and the donor email happen exactly once per real status change.
    const { updateDonationStatusById } = require('../services/donationStatusService');
    const { donation, previousStatus, changed, emailSent } = await updateDonationStatusById({
      id,
      status,
      rejectionReason,
      adminUser: req.user,
    });

    logAdminActivity(req.user.id, 'Donation Status Updated', {
      donationId: id,
      oldStatus: previousStatus,
      newStatus: status,
      donorName: donation.name,
      amount: donation.amount,
      rejectionReason: donation.rejectionReason || '',
      changed,
    });

    res.json({
      success: true,
      data: donation,
      message: changed
        ? `Donation status updated to ${status}${emailSent ? ' and the donor was notified' : ''}`
        : `Donation was already marked "${status}" — no change made`,
    });
  } catch (error) {
    console.error('Update donation status error:', error);
    res.status(error.statusCode || 500).json({ message: error.message || 'Server error' });
  }
};

exports.deleteDonation = async (req, res) => {
  try {
    const { id } = req.params;
    const donation = await Donation.findByIdAndDelete(id);
    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }
    logAdminActivity(req.user.id, 'Donation Deleted', { 
      donationId: id, 
      donorName: donation.name,
      amount: donation.amount 
    });
    res.json({ success: true, message: 'Donation deleted' });
  } catch (error) {
    console.error('Delete donation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============ HISTORY ============
/**
 * Publishes the recorded temple history once. Existing entries are hidden
 * (never deleted, so their photos stay available) and can be re-enabled from
 * Admin → History at any time.
 */

// ---- Shared year normalisation for History ----
const DEVANAGARI_DIGITS = '०१२३४५६७८९';

const toDevanagariYear = (v) =>
  String(v).replace(/[0-9]/g, (d) => DEVANAGARI_DIGITS[parseInt(d, 10)]);

const toAsciiYear = (v) =>
  String(v).replace(/[०-९]/g, (d) => String(DEVANAGARI_DIGITS.indexOf(d)));

const normalizeYearLocalized = (y) => {
  if (!y) return {};
  if (typeof y === 'string') {
    const t = y.trim();
    const en = toAsciiYear(t);
    const ne = toDevanagariYear(t);
    return { en, ne, hi: toDevanagariYear(t), zh: en, ta: en };
  }
  if (typeof y === 'object') {
    const out = { en: '', ne: '', hi: '', zh: '', ta: '' };
    for (const k of ['en', 'ne', 'hi', 'zh', 'ta']) {
      out[k] = String(y[k] ?? '').trim();
    }
    return out;
  }
  return {};
};

let historySeedPromise = null;

const ensureSeedHistory = async () => {
  if (!historySeedPromise) {
    historySeedPromise = (async () => {
      try {
        const already = await History.findOne({ seedKey: 'history-01' });
        if (already) return;

        const legacy = await History.find({ seedKey: { $in: ['', null] } });
        for (const item of DEFAULT_HISTORY) {
          const exists = await History.findOne({ seedKey: item.seedKey });
          if (!exists) await History.create(item);
        }
        if (legacy.length > 0) {
          await History.updateMany(
            { _id: { $in: legacy.map((d) => d._id) } },
            { $set: { enabled: false } }
          );
          console.log(`History: hid ${legacy.length} previous entry/entries`);
        }
        console.log(`History: published ${DEFAULT_HISTORY.length} sections`);
      } catch (error) {
        console.error('Seed history error:', error.message);
        historySeedPromise = null; // allow a retry
      }
    })();
  }
  return historySeedPromise;
};

exports.getHistory = async (req, res) => {
  try {
    await ensureSeedHistory();
    const docs = await History.find().sort({ order: 1, createdAt: 1 });
    const history = docs.map((doc) => {
      const obj = doc.toObject();
      if (obj.year) obj.year = normalizeYearLocalized(obj.year);
      if (Array.isArray(obj.entries)) {
        obj.entries = obj.entries.map((e) => ({
          year: normalizeYearLocalized(e.year),
          text: e.text || {},
        }));
      }
      return obj;
    });
    res.json(history);
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.addHistory = async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.year) body.year = normalizeYearLocalized(body.year);
    if (Array.isArray(body.entries)) {
      body.entries = body.entries.map((e) => ({
        ...e,
        year: normalizeYearLocalized(e.year),
      }));
    }
    const history = await History.create(body);
    logAdminActivity(req.user.id, 'History Entry Added', {
      historyId: history._id,
      title: history.title,
    });
    res.status(201).json(history);
  } catch (error) {
    console.error('Add history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const body = { ...req.body };
    if (body.year) body.year = normalizeYearLocalized(body.year);
    if (Array.isArray(body.entries)) {
      body.entries = body.entries.map((e) => ({
        ...e,
        year: normalizeYearLocalized(e.year),
      }));
    }
    const history = await History.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });
    if (!history) {
      return res.status(404).json({ message: 'History entry not found' });
    }
    logAdminActivity(req.user.id, 'History Entry Updated', {
      historyId: id,
      title: history.title,
    });
    res.json(history);
  } catch (error) {
    console.error('Update history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const history = await History.findByIdAndDelete(id);
    if (!history) {
      return res.status(404).json({ message: 'History entry not found' });
    }
    logAdminActivity(req.user.id, 'History Entry Deleted', {
      historyId: id,
      title: history.title,
    });
    res.json({ success: true, message: 'History entry deleted' });
  } catch (error) {
    console.error('Delete history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============ TEAM ============

/**
 * Publishes the committee members once, identified by `seedKey`. Any member
 * already added from the admin panel is left untouched.
 */
let teamSeedPromise = null;

const ensureSeedTeam = async () => {
  if (!teamSeedPromise) {
    teamSeedPromise = (async () => {
      try {
        let created = 0;
        for (const member of DEFAULT_TEAM_MEMBERS) {
          const exists = await Team.findOne({ seedKey: member.seedKey });
          if (exists) continue;
          await Team.create({ ...member, photo: null, bio: E_LOCALIZED, email: '', phone: '' });
          created += 1;
        }
        if (created > 0) console.log(`Team: seeded ${created} committee member(s)`);
      } catch (error) {
        console.error('Seed team error:', error.message);
        teamSeedPromise = null; // allow a retry
      }
    })();
  }
  return teamSeedPromise;
};

const E_LOCALIZED = { en: '', ne: '', hi: '', zh: '', ta: '' };

exports.getTeam = async (req, res) => {
  try {
    await ensureSeedTeam();
    const team = await Team.find().sort({ order: 1, createdAt: 1 });
    res.json(team);
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get team roles
// @route   GET /api/admin/team/roles
// @access  Public
exports.getTeamRoles = async (req, res) => {
  try {
    const labels = Team.getRoleLabels();
    const hierarchy = Team.getRoleHierarchy();
    res.json({ 
      success: true, 
      labels, 
      hierarchy 
    });
  } catch (error) {
    console.error('Get team roles error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single team member by ID
// @route   GET /api/admin/team/:id
// @access  Public
exports.getTeamById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid team member ID' });
    }
    
    const member = await Team.findById(id);
    if (!member) {
      return res.status(404).json({ message: 'Team member not found' });
    }
    
    res.json(member);
  } catch (error) {
    console.error('Get team member by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.addTeam = async (req, res) => {
  try {
    const teamMember = await Team.create(req.body);
    
    if (teamMember.email) {
      try {
        await sendTeamWelcomeEmail(teamMember);
        console.log(`✅ Welcome email sent to ${teamMember.email}`);
      } catch (emailError) {
        console.error('Email sending error:', emailError);
      }
    }
    
    logAdminActivity(req.user.id, 'Team Member Added', { 
      memberId: teamMember._id,
      name: teamMember.name 
    });
    
    res.status(201).json(teamMember);
  } catch (error) {
    console.error('Add team error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const teamMember = await Team.findByIdAndUpdate(id, req.body, { 
      new: true, 
      runValidators: true 
    });
    if (!teamMember) {
      return res.status(404).json({ message: 'Team member not found' });
    }
    
    logAdminActivity(req.user.id, 'Team Member Updated', { 
      memberId: id,
      name: teamMember.name 
    });
    
    res.json(teamMember);
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const teamMember = await Team.findByIdAndDelete(id);
    if (!teamMember) {
      return res.status(404).json({ message: 'Team member not found' });
    }
    
    if (teamMember.photo) {
      try {
        const publicId = teamMember.photo.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`temple/team/${publicId}`);
      } catch (error) {
        console.log('Cloudinary deletion skipped:', error.message);
      }
    }
    
    logAdminActivity(req.user.id, 'Team Member Deleted', { 
      memberId: id,
      name: teamMember.name 
    });
    
    res.json({ success: true, message: 'Team member deleted' });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============ TEAM - FOLLOW / UNFOLLOW / VIEWS ============

// @desc    Follow a team member
// @route   POST /api/admin/team/:id/follow
// @access  Private
exports.followTeamMember = async (req, res) => {
  try {
    const member = await Team.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ message: 'Team member not found' });
    }
    
    if (!member.followersBy) member.followersBy = [];
    
    if (member.followersBy.some(id => id.toString() === req.user.id)) {
      return res.status(400).json({ message: 'Already following this member' });
    }
    
    member.followersBy.push(req.user.id);
    member.followers = (member.followers || 0) + 1;
    await member.save();
    
    logAdminActivity(req.user.id, 'Followed Team Member', { 
      memberId: member._id,
      memberName: member.name?.en || 'Unknown'
    });
    
    res.json({ 
      success: true, 
      followers: member.followers,
      message: 'Followed successfully' 
    });
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Unfollow a team member
// @route   POST /api/admin/team/:id/unfollow
// @access  Private
exports.unfollowTeamMember = async (req, res) => {
  try {
    const member = await Team.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ message: 'Team member not found' });
    }
    
    if (!member.followersBy) {
      member.followersBy = [];
    }
    
    member.followersBy = member.followersBy.filter(id => id.toString() !== req.user.id);
    member.followers = Math.max(0, (member.followers || 0) - 1);
    await member.save();
    
    logAdminActivity(req.user.id, 'Unfollowed Team Member', { 
      memberId: member._id,
      memberName: member.name?.en || 'Unknown'
    });
    
    res.json({ 
      success: true, 
      followers: member.followers,
      message: 'Unfollowed successfully' 
    });
  } catch (error) {
    console.error('Unfollow error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get team member followers
// @route   GET /api/admin/team/:id/followers
// @access  Public
exports.getTeamFollowers = async (req, res) => {
  try {
    const member = await Team.findById(req.params.id)
      .populate('followersBy', 'name email profilePhoto');
    
    if (!member) {
      return res.status(404).json({ message: 'Team member not found' });
    }
    
    res.json({
      success: true,
      count: member.followers || 0,
      followers: member.followersBy || [],
    });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Increment team member views
// @route   POST /api/admin/team/:id/view
// @access  Public
exports.incrementTeamViews = async (req, res) => {
  try {
    const member = await Team.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ message: 'Team member not found' });
    }
    
    member.views = (member.views || 0) + 1;
    await member.save();
    
    res.json({ 
      success: true, 
      views: member.views 
    });
  } catch (error) {
    console.error('Increment views error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============ GALLERY ============
exports.getGallery = async (req, res) => {
  try {
    const photos = await Gallery.find({ type: 'photo' }).sort({ createdAt: -1 }).limit(MAX_LIST);
    res.json(photos);
  } catch (error) {
    console.error('Get gallery error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ---- Gallery text -----------------------------------------------------------
// Every picture and video needs a title and a description, in at least one language.
const GALLERY_LANGS = ['en', 'ne', 'hi', 'zh', 'ta'];

// Accepts { en, ne, ... }, a JSON string of that, or a plain string (taken as English), and returns
// every language key as a trimmed string so a save never leaves half an object behind.
const toLocalized = (value) => {
  let v = value;
  if (typeof v === 'string') {
    const s = v.trim();
    if (s.startsWith('{')) {
      try { v = JSON.parse(s); } catch (e) { v = { en: s }; }
    } else {
      v = { en: s };
    }
  }
  const out = {};
  GALLERY_LANGS.forEach((l) => { out[l] = v && typeof v[l] === 'string' ? v[l].trim() : ''; });
  return out;
};
const hasText = (localized) => GALLERY_LANGS.some((l) => localized[l]);

// A file is already on Cloudinary by the time the controller runs; if the details are rejected, remove it.
const discardUpload = async (file, resourceType = 'image') => {
  if (!file || !file.filename) return;
  try {
    await cloudinary.uploader.destroy(file.filename, { resource_type: resourceType });
  } catch (error) {
    console.log('Cloudinary cleanup skipped:', error.message);
  }
};

exports.addGalleryPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No photo uploaded' });
    }

    let data = {};
    try {
      data = req.body.data ? JSON.parse(req.body.data) : {};
    } catch (e) {
      data = {};
    }

    const title = toLocalized(data.title);
    const description = toLocalized(data.description);
    if (!hasText(title) || !hasText(description)) {
      await discardUpload(req.file);
      return res.status(400).json({ success: false, message: 'A title and a description are required' });
    }

    const galleryItem = await Gallery.create({
      photo: req.file.path,
      cap: title,
      title,
      description,
      type: 'photo',
      hue: data.hue || '#7A1F2B',
      category: data.category || 'general',
    });

    logAdminActivity(req.user.id, 'Gallery Photo Added', { 
      galleryId: galleryItem._id,
      category: data.category || 'general' 
    });

    res.status(201).json({
      success: true,
      data: galleryItem,
      message: 'Photo added successfully',
    });
  } catch (error) {
    console.error('Add gallery photo error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
};

/**
 * Several photos in one request (Admin -> Gallery). One title, description and
 * category are written once and applied to every file, unless the form sends a
 * per-photo title, which wins for that file alone.
 *
 * Photos are added one after another rather than all at once: if one file is
 * rejected the ones already stored stay, and the response says which file failed
 * so the admin can retry just that one.
 */
exports.addGalleryPhotosBulk = async (req, res) => {
  const files = Array.isArray(req.files) ? req.files : [];
  const uploaded = [];

  try {
    if (files.length === 0) {
      return res.status(400).json({ success: false, message: 'No photos uploaded' });
    }
    if (files.length > GALLERY_BATCH_MAX) {
      // multer already refuses the request, but the cap is repeated here so the
      // rule holds for any caller that reaches this controller.
      return res.status(400).json({ success: false, message: `Upload up to ${GALLERY_BATCH_MAX} photos at a time` });
    }

    let data = {};
    try {
      data = req.body.data ? JSON.parse(req.body.data) : {};
    } catch (e) {
      data = {};
    }

    const sharedTitle = toLocalized(data.title);
    const sharedDescription = toLocalized(data.description);
    const category = data.category || 'general';

    // Optional per-file titles, keyed by the file name sent in the form.
    const perFile = new Map();
    if (Array.isArray(data.titles)) {
      data.titles.forEach((row) => {
        if (row && row.file && row.title) perFile.set(row.file, toLocalized(row.title));
      });
    }

    if (!hasText(sharedTitle) && perFile.size === 0) {
      for (const file of files) await discardUpload(file);
      return res.status(400).json({ success: false, message: 'A title is required' });
    }

    const failed = [];
    for (const file of files) {
      const title = perFile.get(file.originalname) || sharedTitle;
      if (!hasText(title)) {
        // This one has no title of its own and no usable shared one: leave it out
        // and say so, rather than publishing a photo with no title at all.
        failed.push({ file: file.originalname, message: 'No title' });
        await discardUpload(file);
        continue;
      }
      try {
        const item = await Gallery.create({
          photo: file.path,
          cap: title,
          title,
          description: sharedDescription,
          type: 'photo',
          hue: data.hue || '#7A1F2B',
          category,
        });
        uploaded.push(item);
      } catch (error) {
        console.error(`Add gallery photo "${file.originalname}" error:`, error.message);
        await discardUpload(file);
        failed.push({ file: file.originalname, message: error.message || 'Server error' });
      }
    }

    if (uploaded.length > 0) {
      logAdminActivity(req.user.id, 'Gallery Photos Added', {
        count: uploaded.length,
        category,
      });
    }

    if (uploaded.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'None of the photos could be added',
        failed,
      });
    }

    res.status(201).json({
      success: true,
      data: uploaded,
      count: uploaded.length,
      failed,
      message: `${uploaded.length} photo(s) added`,
    });
  } catch (error) {
    // Nothing was stored before the failure, so nothing is left on Cloudinary.
    for (const file of files) await discardUpload(file);
    console.error('Add gallery photos bulk error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

exports.deleteGalleryPhoto = async (req, res) => {
  try {
    const { id } = req.params;
    const photo = await Gallery.findByIdAndDelete(id);
    
    if (!photo) {
      return res.status(404).json({ message: 'Photo not found' });
    }

    if (photo.photo) {
      try {
        const publicId = photo.photo.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`temple/gallery/${publicId}`);
      } catch (error) {
        console.log('Cloudinary deletion skipped:', error.message);
      }
    }

    logAdminActivity(req.user.id, 'Gallery Photo Deleted', { 
      galleryId: id,
      caption: photo.cap 
    });

    res.json({
      success: true,
      message: 'Photo deleted successfully',
    });
  } catch (error) {
    console.error('Delete gallery photo error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
};

exports.getGalleryVideos = async (req, res) => {
  try {
    const videos = await Gallery.find({ type: 'video' }).sort({ createdAt: -1 }).limit(MAX_LIST);
    res.json(videos || []);
  } catch (error) {
    console.error('Get gallery videos error:', error);
    res.json([]);
  }
};

exports.addGalleryVideo = async (req, res) => {
  try {
    let videoData = {};
    
    if (req.file) {
      videoData.url = req.file.path;
      videoData.type = 'video';
      videoData.photo = req.file.path;
    } else if (req.body.url) {
      videoData.url = req.body.url;
      videoData.type = 'video';
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Video file or URL is required' 
      });
    }
    
    // The title is also the caption (search and the chat assistant read `cap`).
    const title = toLocalized(req.body.title || req.body.cap);
    const description = toLocalized(req.body.description);
    if (!hasText(title) || !hasText(description)) {
      await discardUpload(req.file, 'video');
      return res.status(400).json({ success: false, message: 'A title and a description are required' });
    }

    const video = await Gallery.create({
      ...videoData,
      cap: title,
      title,
      description,
      type: 'video',
      hue: req.body.hue || '#1a1a2e',
      category: req.body.category || 'videos',
    });

    logAdminActivity(req.user.id, 'Gallery Video Added', { 
      videoId: video._id,
      category: req.body.category || 'videos' 
    });
    
    res.status(201).json({
      success: true,
      data: video,
      message: 'Video added successfully',
    });
  } catch (error) {
    console.error('Add gallery video error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
};

exports.deleteGalleryVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const video = await Gallery.findByIdAndDelete(id);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }
    
    if (video.photo) {
      try {
        const publicId = video.photo.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`temple/gallery/${publicId}`);
      } catch (error) {
        console.log('Cloudinary deletion skipped:', error.message);
      }
    }
    
    logAdminActivity(req.user.id, 'Gallery Video Deleted', { videoId: id });
    res.json({ success: true, message: 'Video deleted' });
  } catch (error) {
    console.error('Delete gallery video error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============ GALLERY MANAGEMENT (Complete) ============

exports.getAllGalleryItems = async (req, res) => {
  try {
    const { type, category, search } = req.query;
    let filter = {};
    
    if (type && type !== 'all') {
      filter.type = type;
    }
    if (category && category !== 'all') {
      filter.category = category;
    }
    if (search) {
      // Public endpoint: treat the search text literally so it can't be used
      // as a catastrophic-backtracking regex or crash on an invalid pattern.
      const safeSearch = String(search).slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = ['cap', 'title', 'description'].flatMap((field) => (
        ['en', 'ne', 'hi'].map((l) => ({ [`${field}.${l}`]: { $regex: safeSearch, $options: 'i' } }))
      ));
    }
    
    const items = await Gallery.find(filter).sort({ createdAt: -1 }).limit(MAX_LIST);
    
    res.json({
      success: true,
      data: items,
      total: items.length,
    });
  } catch (error) {
    console.error('Get all gallery items error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
};

exports.getGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Gallery.findById(id);
    
    if (!item) {
      return res.status(404).json({ 
        success: false, 
        message: 'Gallery item not found' 
      });
    }
    
    res.json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error('Get gallery item error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
};

exports.updateGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { cap, category, hue, url, title, description, featured } = req.body;
    
    const item = await Gallery.findById(id);
    if (!item) {
      return res.status(404).json({ 
        success: false, 
        message: 'Gallery item not found' 
      });
    }
    
    if (category) item.category = category;
    if (hue) item.hue = hue;
    if (url) item.url = url;
    if (typeof featured === 'boolean') item.featured = featured;

    // Editing the text must leave a title and a description behind.
    if (title !== undefined || description !== undefined || cap) {
      const nextTitle = title !== undefined ? toLocalized(title) : toLocalized(item.title);
      const nextDescription = description !== undefined ? toLocalized(description) : toLocalized(item.description);
      if (title !== undefined && !hasText(nextTitle)) {
        return res.status(400).json({ success: false, message: 'A title is required' });
      }
      if (description !== undefined && !hasText(nextDescription)) {
        return res.status(400).json({ success: false, message: 'A description is required' });
      }
      if (title !== undefined) {
        item.title = nextTitle;
        item.cap = nextTitle;
      } else if (cap) {
        item.cap = toLocalized(cap);
      }
      if (description !== undefined) item.description = nextDescription;
    }
    
    await item.save();
    logAdminActivity(req.user.id, 'Gallery Item Updated', { 
      galleryId: id,
      category: category || item.category 
    });
    
    res.json({
      success: true,
      data: item,
      message: 'Gallery item updated successfully',
    });
  } catch (error) {
    console.error('Update gallery item error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
};

exports.deleteGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Gallery.findById(id);
    
    if (!item) {
      return res.status(404).json({ 
        success: false, 
        message: 'Gallery item not found' 
      });
    }
    
    if (item.photo) {
      try {
        const publicId = item.photo.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`temple/gallery/${publicId}`);
      } catch (error) {
        console.log('Cloudinary deletion skipped:', error.message);
      }
    }
    
    await item.deleteOne();
    logAdminActivity(req.user.id, 'Gallery Item Deleted', { 
      galleryId: id,
      type: item.type,
      category: item.category 
    });
    
    res.json({
      success: true,
      message: 'Gallery item deleted successfully',
    });
  } catch (error) {
    console.error('Delete gallery item error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
};

exports.bulkDeleteGalleryItems = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide an array of IDs' 
      });
    }
    
    const results = [];
    const deletedIds = [];
    for (const id of ids) {
      try {
        const item = await Gallery.findById(id);
        if (item) {
          if (item.photo) {
            try {
              const publicId = item.photo.split('/').pop().split('.')[0];
              await cloudinary.uploader.destroy(`temple/gallery/${publicId}`);
            } catch (error) {
              console.log('Cloudinary deletion skipped:', error.message);
            }
          }
          await item.deleteOne();
          results.push({ id, success: true });
          deletedIds.push(id);
        } else {
          results.push({ id, success: false, message: 'Not found' });
        }
      } catch (error) {
        results.push({ id, success: false, message: error.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    
    if (deletedIds.length > 0) {
      logAdminActivity(req.user.id, 'Gallery Items Bulk Deleted', { 
        deletedIds,
        count: deletedIds.length 
      });
    }
    
    res.json({
      success: true,
      results,
      total: results.length,
      successCount,
      failedCount: results.length - successCount,
    });
  } catch (error) {
    console.error('Bulk delete gallery items error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
};

// ============ DAILY QUOTES CONTROLLERS ============

// @desc    Get all daily quotes
// @route   GET /api/admin/quotes
// @access  Private/Admin
exports.getDailyQuotes = async (req, res) => {
  try {
    const settings = await AdminSettings.getSettings();
    const dailyQuotes = settings.dailyQuotes || new Map();
    
    // Convert Map to plain object for response
    const quotesObj = {};
    dailyQuotes.forEach((value, key) => {
      quotesObj[key] = value;
    });
    
    res.json({
      success: true,
      data: quotesObj,
      total: Object.keys(quotesObj).length,
    });
  } catch (error) {
    console.error('Get daily quotes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update daily quotes (bulk)
// @route   PUT /api/admin/quotes
// @access  Private/Admin
exports.updateDailyQuotes = async (req, res) => {
  try {
    const { dailyQuotes } = req.body;
    
    if (!dailyQuotes || typeof dailyQuotes !== 'object') {
      return res.status(400).json({ message: 'Invalid quotes data' });
    }
    
    const settings = await AdminSettings.getSettings();
    
    // Create new Map from object
    const quotesMap = new Map();
    Object.keys(dailyQuotes).forEach(key => {
      quotesMap.set(key, dailyQuotes[key]);
    });
    
    settings.dailyQuotes = quotesMap;
    await settings.save();
    
    logAdminActivity(req.user.id, 'Daily Quotes Updated', { 
      count: Object.keys(dailyQuotes).length 
    });
    
    res.json({
      success: true,
      data: dailyQuotes,
      message: 'Quotes updated successfully',
    });
  } catch (error) {
    console.error('Update daily quotes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get quote for specific date
// @route   GET /api/admin/quotes/:date
// @access  Private/Admin
exports.getQuoteByDate = async (req, res) => {
  try {
    const { date } = req.params;
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid date format. Use YYYY-MM-DD' 
      });
    }
    
    const settings = await AdminSettings.getSettings();
    const dailyQuotes = settings.dailyQuotes || new Map();
    
    const quote = dailyQuotes.get(date);
    
    if (!quote) {
      return res.status(404).json({ 
        success: false, 
        message: 'No quote found for this date' 
      });
    }
    
    res.json({
      success: true,
      data: {
        date,
        quote,
      },
    });
  } catch (error) {
    console.error('Get quote by date error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update quote for specific date
// @route   PUT /api/admin/quotes/:date
// @access  Private/Admin
exports.updateQuoteByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const { quote } = req.body;
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid date format. Use YYYY-MM-DD' 
      });
    }
    
    if (!quote || typeof quote !== 'object') {
      return res.status(400).json({ message: 'Invalid quote data' });
    }
    
    // Validate language fields
    const languages = ['en', 'ne', 'hi', 'zh', 'ta'];
    for (const lang of languages) {
      if (quote[lang] && typeof quote[lang] !== 'string') {
        return res.status(400).json({ message: `Invalid value for language: ${lang}` });
      }
    }
    
    const settings = await AdminSettings.getSettings();
    const dailyQuotes = settings.dailyQuotes || new Map();
    
    dailyQuotes.set(date, quote);
    settings.dailyQuotes = dailyQuotes;
    await settings.save();
    
    logAdminActivity(req.user.id, 'Quote Updated for Date', { 
      date,
      languages: Object.keys(quote).filter(k => quote[k]),
    });
    
    res.json({
      success: true,
      data: { date, quote },
      message: 'Quote saved successfully',
    });
  } catch (error) {
    console.error('Update quote by date error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete quote for specific date
// @route   DELETE /api/admin/quotes/:date
// @access  Private/Admin
exports.deleteQuoteByDate = async (req, res) => {
  try {
    const { date } = req.params;
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid date format. Use YYYY-MM-DD' 
      });
    }
    
    const settings = await AdminSettings.getSettings();
    const dailyQuotes = settings.dailyQuotes || new Map();
    
    if (!dailyQuotes.has(date)) {
      return res.status(404).json({ 
        success: false, 
        message: 'No quote found for this date' 
      });
    }
    
    const deletedQuote = dailyQuotes.get(date);
    dailyQuotes.delete(date);
    settings.dailyQuotes = dailyQuotes;
    await settings.save();
    
    logAdminActivity(req.user.id, 'Quote Deleted for Date', { date });
    
    res.json({
      success: true,
      data: { date, quote: deletedQuote },
      message: 'Quote deleted successfully',
    });
  } catch (error) {
    console.error('Delete quote by date error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Generate quotes for next 365 days
// @route   POST /api/admin/quotes/generate
// @access  Private/Admin
exports.generateDailyQuotes = async (req, res) => {
  try {
    const { baseQuote } = req.body;
    
    const settings = await AdminSettings.getSettings();
    const dailyQuotes = settings.dailyQuotes || new Map();
    
    const startDate = new Date();
    let generated = 0;
    let skipped = 0;
    
    // Default quote in multiple languages
    const defaultQuote = {
      en: baseQuote?.en || 'Where there is righteousness in the heart, there is beauty in the character.',
      ne: baseQuote?.ne || 'जहाँ हृदयमा धार्मिकता हुन्छ, त्यहाँ चरित्रमा सुन्दरता हुन्छ।',
      hi: baseQuote?.hi || 'जहाँ हृदय में धार्मिकता है, वहाँ चरित्र में सुंदरता है।',
      zh: baseQuote?.zh || '心中有正义，性格便有美。',
      ta: baseQuote?.ta || 'இதயத்தில் நேர்மை இருந்தால், குணத்தில் அழகு இருக்கும்।',
    };
    
    for (let i = 0; i < 365; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateKey = getDateKey(date);
      
      if (!dailyQuotes.has(dateKey)) {
        // Add day number to quote
        const dayQuote = {};
        for (const [lang, text] of Object.entries(defaultQuote)) {
          dayQuote[lang] = `Day ${i + 1}: ${text}`;
        }
        dailyQuotes.set(dateKey, dayQuote);
        generated++;
      } else {
        skipped++;
      }
    }
    
    settings.dailyQuotes = dailyQuotes;
    await settings.save();
    
    logAdminActivity(req.user.id, 'Daily Quotes Generated', { 
      generated, 
      skipped,
      total: dailyQuotes.size,
    });
    
    res.json({
      success: true,
      data: {
        generated,
        skipped,
        total: dailyQuotes.size,
      },
      message: `Generated ${generated} new quotes, skipped ${skipped} existing`,
    });
  } catch (error) {
    console.error('Generate daily quotes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get today's quote (public)
// @route   GET /api/admin/quotes/today
// @access  Public
exports.getTodayQuote = async (req, res) => {
  try {
    const todayKey = getDateKey(new Date());
    const settings = await AdminSettings.getSettings();
    const dailyQuotes = settings.dailyQuotes || new Map();
    
    const quote = dailyQuotes.get(todayKey);
    
    // If no quote for today, return default
    if (!quote) {
      return res.json({
        success: true,
        data: {
          date: todayKey,
          quote: {
            en: 'Where there is righteousness in the heart, there is beauty in the character.',
            ne: 'जहाँ हृदयमा धार्मिकता हुन्छ, त्यहाँ चरित्रमा सुन्दरता हुन्छ।',
            hi: 'जहाँ हृदय में धार्मिकता है, वहाँ चरित्र में सुंदरता है।',
            zh: '心中有正义，性格便有美。',
            ta: 'இதயத்தில் நேர்மை இருந்தால், குணத்தில் அழகு இருக்கும்।',
          },
          isDefault: true,
        },
      });
    }
    
    res.json({
      success: true,
      data: {
        date: todayKey,
        quote,
        isDefault: false,
      },
    });
  } catch (error) {
    console.error('Get today quote error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get quote for any date (public)
// @route   GET /api/admin/quotes/public/:date
// @access  Public
exports.getPublicQuoteByDate = async (req, res) => {
  try {
    const { date } = req.params;
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid date format. Use YYYY-MM-DD' 
      });
    }
    
    const settings = await AdminSettings.getSettings();
    const dailyQuotes = settings.dailyQuotes || new Map();
    const quote = dailyQuotes.get(date);
    
    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'No quote found for this date',
      });
    }
    
    res.json({
      success: true,
      data: {
        date,
        quote,
      },
    });
  } catch (error) {
    console.error('Get public quote by date error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============ DASHBOARD STATS ============
exports.getDashboardStats = async (req, res) => {
  try {
    const [users, events, bookings, donations, settings] = await Promise.all([
      User.countDocuments(),
      Event.countDocuments(),
      Booking.countDocuments(),
      Donation.countDocuments(),
      AdminSettings.getSettings(),
    ]);

    logAdminActivity(req.user.id, 'Dashboard Stats Accessed');

    res.json({
      success: true,
      data: {
        totalUsers: users,
        totalEvents: events,
        totalBookings: bookings,
        totalDonations: donations,
        totalDonors: settings.donate.baseCount + donations,
      },
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============ RECENT ACTIVITY ============
exports.getRecentActivity = async (req, res) => {
  try {
    const [recentBookings, recentDonations, recentUsers] = await Promise.all([
      Booking.find().sort({ createdAt: -1 }).limit(5),
      Donation.find().sort({ date: -1 }).limit(5),
      User.find().sort({ createdAt: -1 }).limit(5).select('-password'),
    ]);

    const activities = [
      ...recentBookings.map(b => ({
        type: 'booking',
        message: `New booking: ${b.name} - ${b.type}`,
        date: b.createdAt,
        data: b,
      })),
      ...recentDonations.map(d => ({
        type: 'donation',
        message: `New donation from ${d.name}`,
        date: d.date,
        data: d,
      })),
      ...recentUsers.map(u => ({
        type: 'user',
        message: `New user registered: ${u.name}`,
        date: u.createdAt,
        data: u,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      data: activities,
    });
  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};  
// Shared with accountController so account actions land in the same audit log.
exports.logAdminActivity = logAdminActivity;
exports.pruneAdminLogs = pruneAdminLogs;
