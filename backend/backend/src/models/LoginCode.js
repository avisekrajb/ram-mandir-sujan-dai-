const mongoose = require('mongoose');

/**
 * A pending "sign in with an email code" request: one document per MAILBOX, replaced
 * each time a new code is sent. Kept apart from the User document (and from the
 * password-reset code on it) because the person asking may not have an account yet,
 * and so a reset code can never be used to sign in or the other way round.
 *
 * `key` is the address in a canonical form (see mailboxKey in the controller: the
 * +tag removed, and the dots in a Gmail name), so "v+1@gmail.com" and "v.2@gmail.com"
 * share one record and one set of limits instead of each getting their own. `email`
 * is the exact address the latest code went to; the code is bound to that address.
 *
 * Only a keyed hash of the code is stored. A record is never deleted by a wrong guess
 * or a used code (that would reset the resend limits): it is made unusable instead
 * (attempts used up, or expiresAt in the past), and the TTL index below removes it when
 * the hour its send counter belongs to is over.
 */
const loginCodeSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  // Guesses made against the current code, right or wrong; no more are accepted at MAX_ATTEMPTS.
  attempts: { type: Number, default: 0 },
  // When the latest code went out (resend cooldown) and how many went out in the
  // current hour (cap on how often one mailbox can be mailed).
  sentAt: { type: Date, required: true },
  windowStart: { type: Date, required: true },
  sends: { type: Number, default: 1 },
});

loginCodeSchema.index({ windowStart: 1 }, { expireAfterSeconds: 3600 });

// The Atlas database is shared with other apps: an explicit collection name keeps
// this one from ever colliding with a default-named one (see models/Review.js).
module.exports = mongoose.model('LoginCode', loginCodeSchema, 'templelogincodes');
