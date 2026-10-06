const mongoose = require('mongoose');
const validator = require('validator');

/**
 * Someone who asked to hear from the temple by e-mail ("Stay updated" on every page).
 *
 * A visitor is `pending` until they click the link in the confirmation e-mail (double opt-in:
 * nobody is mailed because somebody else typed their address). Only `active` subscribers get
 * mailings. `unsubscribed` rows are kept, so the same person is not quietly re-added, and so the
 * unsubscribe link keeps working.
 *
 * Rows from before this feature (just an address) are treated as active with every topic: see
 * services/newsletterService.js `backfillSubscribers`.
 */

const TOPICS = ['events', 'festivals', 'news'];
const LANGS = ['en', 'ne', 'hi', 'zh', 'ta'];
const STATUSES = ['pending', 'active', 'unsubscribed'];

const subscriberSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: [254, 'Email is too long'],
    // One plain address only: a comma / semicolon / angle bracket would let one "address" mail several people.
    validate: {
      validator: (v) => validator.isEmail(v) && !/[,;<>" ]/.test(v),
      message: 'Invalid email address',
    },
  },
  status: { type: String, enum: STATUSES, default: 'active', index: true },
  // What they chose to receive.
  topics: { type: [String], default: () => [...TOPICS] },
  // Language of the e-mails (the site language they were using when they subscribed).
  lang: { type: String, enum: LANGS, default: 'en' },

  // Double opt-in: random, single purpose, cleared once confirmed.
  confirmToken: { type: String, default: undefined },
  confirmSentAt: { type: Date, default: null },
  // How many confirmation e-mails went out today (stops the form being used to mail-bomb an address).
  confirmSendDay: { type: String, default: '' },
  confirmSendCount: { type: Number, default: 0 },

  // The personal "unsubscribe" link in every mail works without a login.
  unsubscribeToken: { type: String, default: undefined },

  subscribedAt: { type: Date, default: Date.now },
  confirmedAt: { type: Date, default: null },
  unsubscribedAt: { type: Date, default: null },
  lastEmailedAt: { type: Date, default: null },
  // 'website' (the form), 'account' (signed-in, address already verified), 'admin', 'legacy' (before this feature).
  source: { type: String, default: 'website' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: undefined },
});

subscriberSchema.index({ unsubscribeToken: 1 }, { unique: true, sparse: true });
subscriberSchema.index({ confirmToken: 1 }, { sparse: true });

subscriberSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    next(new Error('Already subscribed with this email'));
  } else {
    next(error);
  }
});

const Subscriber = mongoose.model('Subscriber', subscriberSchema);
Subscriber.TOPICS = TOPICS;
Subscriber.LANGS = LANGS;

module.exports = Subscriber;
