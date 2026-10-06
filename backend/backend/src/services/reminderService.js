// Sends calendar reminders on schedule.
//
// A sweep runs every 15 minutes. It looks at the reminders whose day is within
// the next two weeks and emails the ones that are due (see utils/reminderDates).
// Each send is claimed in the database BEFORE the email goes out, so a restart,
// an overlapping sweep or a second server instance can never send twice; if the
// send fails the claim is released and the next sweep tries again.

const Reminder = require('../models/Reminder');
const { isEmailConfigured } = require('./emailService');
const { sendReminderEmail } = require('./reminderEmail');
const { nptNow, addDays, daysBetween, dueOffsets } = require('../utils/reminderDates');

const SWEEP_EVERY_MS = 15 * 60 * 1000;
const MAX_OFFSET = 14;
const KEEP_PAST_DAYS = 7;
const MAX_ATTEMPTS_PER_DAY = 3;
const GAP_BETWEEN_EMAILS_MS = 400;

let sweeping = false;
let warnedNoEmail = 0;

const siteUrl = () => (process.env.FRONTEND_URL || 'http://localhost:4000').replace(/\/+$/, '');
const apiUrl = () => (process.env.BACKEND_URL || process.env.FRONTEND_URL || 'http://localhost:4000').replace(/\/+$/, '');

/** Link in the email that opens the one-click "stop this reminder" page. */
const unsubscribeUrlFor = (reminder) => `${apiUrl()}/api/reminders/unsubscribe/${reminder.unsubscribeToken}`;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One pass. `send` and `now` are injectable so the logic can be tested without
 * real email or a real clock.
 */
const sweep = async ({ now = Date.now(), send = sendReminderEmail } = {}) => {
  const result = { checked: 0, sent: 0, failed: 0, skipped: false };
  if (sweeping) return { ...result, skipped: true };
  sweeping = true;

  try {
    if (!isEmailConfigured()) {
      // Say so once an hour instead of on every sweep.
      if (now - warnedNoEmail > 60 * 60 * 1000) {
        console.warn('⏰ Reminders: email is not configured (EMAIL_USER / EMAIL_PASS), nothing will be sent.');
        warnedNoEmail = now;
      }
      return { ...result, skipped: true };
    }

    const { date: today } = nptNow(now);

    // Anything older than a week is history: drop it so the collection stays small.
    await Reminder.deleteMany({ eventDate: { $lt: addDays(today, -KEEP_PAST_DAYS) } });

    const candidates = await Reminder.find({
      eventDate: { $gte: today, $lte: addDays(today, MAX_OFFSET) },
    }).lean();

    for (const reminder of candidates) {
      result.checked += 1;
      const due = dueOffsets(reminder, now);
      if (!due.length) continue;

      // Claim every due offset in one atomic step; whoever loses the race skips.
      const claim = {};
      const stillFree = [];
      due.forEach((o) => {
        claim[`sent.d${o}`] = new Date(now);
        stillFree.push({ [`sent.d${o}`]: { $exists: false } });
      });
      const claimed = await Reminder.findOneAndUpdate(
        { _id: reminder._id, $and: stillFree },
        { $set: claim },
        { new: true }
      ).lean();
      if (!claimed) continue;

      const outcome = await send({
        reminder: claimed,
        daysLeft: Math.max(0, daysBetween(today, claimed.eventDate)),
        siteUrl: siteUrl(),
        unsubscribeUrl: unsubscribeUrlFor(claimed),
      });

      if (outcome && outcome.error) {
        // Release the claim so the next sweep retries, but give up on a day
        // that keeps failing rather than retrying every 15 minutes forever.
        const release = {};
        due.forEach((o) => {
          release[`sent.d${o}`] = '';
        });
        const tries = Number((claimed.sent && claimed.sent.tries && claimed.sent.tries[today]) || 0) + 1;
        const update =
          tries >= MAX_ATTEMPTS_PER_DAY
            ? { $set: { lastError: outcome.error, [`sent.tries.${today}`]: tries } }
            : { $unset: release, $set: { lastError: outcome.error, [`sent.tries.${today}`]: tries } };
        await Reminder.updateOne({ _id: reminder._id }, update);
        result.failed += 1;
        console.error(`⏰ Reminder ${reminder._id} failed: ${outcome.error}`);
      } else {
        result.sent += 1;
        if (claimed.lastError) await Reminder.updateOne({ _id: reminder._id }, { $set: { lastError: '' } });
      }

      await wait(GAP_BETWEEN_EMAILS_MS);
    }

    if (result.sent || result.failed) {
      console.log(`⏰ Reminders: ${result.sent} sent, ${result.failed} failed (${result.checked} checked)`);
    }
    return result;
  } catch (error) {
    console.error('⏰ Reminder sweep error:', error.message);
    return { ...result, error: error.message };
  } finally {
    sweeping = false;
  }
};

let timer = null;

/** Start the background sweeps (call once, after the database is connected). */
const startReminderScheduler = () => {
  if (timer) return;
  setTimeout(() => sweep(), 30 * 1000).unref();
  timer = setInterval(() => sweep(), SWEEP_EVERY_MS);
  timer.unref();
  console.log('⏰ Reminder scheduler started (every 15 minutes)');
};

module.exports = { sweep, startReminderScheduler, unsubscribeUrlFor, siteUrl };
