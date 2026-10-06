const mongoose = require('mongoose');

/**
 * A festival / holiday / temple-event reminder that a signed-in person asked
 * for from the calendar. The scheduler (services/reminderService.js) emails the
 * account's address the chosen number of days before `eventDate`.
 *
 * Dates are stored as Gregorian `YYYY-MM-DD` strings: the calendar page works
 * from a Bikram Sambat patro, but a reminder only needs the day it falls on and
 * a string compares and shifts without any time-zone surprises.
 */

// How many days before the day a reminder can be sent. 0 = on the day itself.
const OFFSETS = [0, 1, 2, 3, 7, 14];
const KINDS = ['festival', 'holiday', 'event', 'tithi', 'day'];
const LANGS = ['en', 'ne', 'hi', 'zh', 'ta'];

const reminderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // The account's own address at the time the reminder was made. Never taken
    // from the request, so nobody can aim reminders at someone else's inbox.
    email: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, default: '', trim: true, maxlength: 80 },

    kind: { type: String, enum: KINDS, default: 'festival' },
    title: {
      en: { type: String, default: '', trim: true, maxlength: 160 },
      ne: { type: String, default: '', trim: true, maxlength: 160 },
    },
    eventDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/, index: true },
    bsLabel: { type: String, default: '', trim: true, maxlength: 60 },
    tithi: { type: String, default: '', trim: true, maxlength: 60 },
    note: { type: String, default: '', trim: true, maxlength: 300 },

    offsets: { type: [Number], default: [1, 0] },
    // Language of the email.
    lang: { type: String, enum: LANGS, default: 'en' },

    // One entry per offset already emailed: { d1: Date, d0: Date }. Claimed
    // atomically before sending, so a restart or a second instance cannot send
    // the same reminder twice.
    sent: { type: mongoose.Schema.Types.Mixed, default: {} },
    lastError: { type: String, default: '' },

    // One person has at most one reminder per (day, title).
    dedupeKey: { type: String, required: true },
    // Lets the "stop these reminders" link in the email work without a login.
    unsubscribeToken: { type: String, required: true, unique: true },
  },
  // Explicit collection name: this Atlas database is shared with unrelated apps, and
  // the default name (`reminders`) could collide with one of theirs (the unique
  // indexes below would then break their inserts).
  { timestamps: true, minimize: false, collection: 'templecalendarreminders' }
);

reminderSchema.index({ user: 1, dedupeKey: 1 }, { unique: true });

reminderSchema.statics.OFFSETS = OFFSETS;
reminderSchema.statics.KINDS = KINDS;
reminderSchema.statics.LANGS = LANGS;

module.exports = mongoose.model('Reminder', reminderSchema);
