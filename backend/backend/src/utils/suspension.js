/**
 * Time-boxed account suspension.
 *
 * A suspension can end on its own (24 hours, 5 days, 10 days) or run until an
 * admin lifts it. The two behave differently, and the difference matters:
 *
 *   - timed  (`suspendedUntil` in the future): the account can still sign in, but
 *     is held to the home page. See middleware/restricted.js.
 *   - open-ended (`suspendedUntil` null): the account cannot sign in at all, which
 *     is what this app has always done.
 *
 * Both lift by themselves once their time passes, so nobody has to remember to
 * unban anyone.
 */

// The durations the admin panel offers, in hours. 24 / 5 days / 10 days.
const SUSPENSION_HOURS = { h24: 24, d5: 5 * 24, d10: 10 * 24 };

/** The choices offered in the UI, with the label each language shows. */
const SUSPENSION_OPTIONS = [
  { key: 'h24', hours: SUSPENSION_HOURS.h24 },
  { key: 'd5', hours: SUSPENSION_HOURS.d5 },
  { key: 'd10', hours: SUSPENSION_HOURS.d10 },
];

/**
 * Turn `{ duration }` into the date the suspension ends, or null for open-ended.
 * `duration` is one of the option keys, 'forever', or absent/null.
 */
const suspensionEnd = (duration, from = new Date()) => {
  if (duration === null || duration === undefined || duration === '' || duration === 'forever') return null;
  const key = String(duration);
  const hours = SUSPENSION_HOURS[key];
  if (!hours) return undefined; // an unknown duration, so the caller can refuse it
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
};

/** Is this account currently held to the home page? */
const isTimedSuspension = (user, now = new Date()) =>
  Boolean(user) &&
  user.active === false &&
  user.role !== 'superadmin' &&
  user.suspendedUntil instanceof Date &&
  user.suspendedUntil.getTime() > now.getTime();

/** Has a timed suspension just run out? */
const suspensionExpired = (user, now = new Date()) =>
  Boolean(user) &&
  user.active === false &&
  user.role !== 'superadmin' &&
  user.suspendedUntil instanceof Date &&
  user.suspendedUntil.getTime() <= now.getTime();

/** Human-readable "until", e.g. "in 4 days" - used by the admin panel. */
const remainingMs = (user, now = new Date()) => {
  if (!user?.suspendedUntil) return 0;
  return Math.max(0, user.suspendedUntil.getTime() - now.getTime());
};

module.exports = {
  SUSPENSION_HOURS,
  SUSPENSION_OPTIONS,
  suspensionEnd,
  isTimedSuspension,
  suspensionExpired,
  remainingMs,
};