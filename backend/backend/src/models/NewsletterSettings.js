const mongoose = require('mongoose');

/**
 * The newsletter's switches (one document). Edited in Admin -> Subscribers & mail.
 *
 * Explicit collection name: the Atlas database is shared with other applications.
 */
const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true },

    // Mail the subscribers automatically when a new event is added / a blog post is published.
    autoEvents: { type: Boolean, default: true },
    autoBlogs: { type: Boolean, default: true },

    festivalWishes: {
      // Master switch for the morning festival wishes.
      enabled: { type: Boolean, default: true },
      // Per festival (key = slug of its English name): { enabled: Boolean, message: { en, ne, hi, zh, ta } }.
      // A festival without an entry follows the built-in list of major festivals.
      overrides: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    },

    // Safety net for the sending account (Gmail allows roughly 500 a day): the rest of a mailing
    // continues the next day.
    // The same account also sends sign-in codes, bookings and reminders, so the default stays well below that.
    dailyCap: { type: Number, default: 300, min: 1, max: 100000 },
    sentToday: {
      date: { type: String, default: '' },
      count: { type: Number, default: 0 },
    },
    // Confirmation e-mails sent today (the public form is the only thing that triggers them): a global ceiling so
    // nobody can use the form to use up the sending account.
    confirmToday: {
      date: { type: String, default: '' },
      count: { type: Number, default: 0 },
    },
  },
  { timestamps: true, minimize: false, collection: 'templenewslettersettings' }
);

settingsSchema.statics.getSettings = async function getSettings() {
  return this.findOneAndUpdate({ key: 'main' }, { $setOnInsert: { key: 'main' } }, { upsert: true, new: true, setDefaultsOnInsert: true });
};

module.exports = mongoose.model('NewsletterSettings', settingsSchema);
