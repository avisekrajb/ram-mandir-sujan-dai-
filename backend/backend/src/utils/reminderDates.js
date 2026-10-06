// Date rules for calendar reminders. Pure functions (no database, no clock of
// their own) so the scheduling logic can be tested directly.
//
// Every date is a Gregorian `YYYY-MM-DD` string and "today" is the day in Nepal
// (UTC+5:45), because that is when a devotee in Kathmandu wakes up and expects
// the morning's reminder, whatever time zone the server runs in.

const NPT_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;

// Reminders go out from this hour (Nepal time) on their send day.
const SEND_HOUR_NPT = 6;

const pad = (n) => String(n).padStart(2, '0');

const toYmd = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

/** Parse `YYYY-MM-DD` to a UTC-midnight Date, or null if it is not a real date. */
const parseYmd = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(Date.UTC(y, mo - 1, d));
  const real =
    date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
  return real ? date : null;
};

/** The date and hour in Nepal at the given instant. */
const nptNow = (now = Date.now()) => {
  const shifted = new Date(now + NPT_OFFSET_MS);
  return { date: toYmd(shifted), hour: shifted.getUTCHours() };
};

const addDays = (ymd, n) => {
  const d = parseYmd(ymd);
  d.setUTCDate(d.getUTCDate() + n);
  return toYmd(d);
};

/** Whole days from `a` to `b` (positive when b is later). */
const daysBetween = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 86400000);

/** The day a reminder with this offset is sent. */
const sendDateFor = (eventDate, offset) => addDays(eventDate, -offset);

/**
 * Offsets that can still be honoured when a reminder is saved: the send day must
 * be strictly after today. An offset whose day is today or earlier would either
 * never fire or fire the instant the person pressed Save, so it is dropped.
 */
const eligibleOffsets = (eventDate, offsets, today) =>
  offsets.filter((o) => sendDateFor(eventDate, o) > today);

/**
 * Offsets that should be emailed right now. A send day that has already passed
 * (the server was down) is still sent once, late, as long as the day itself has
 * not gone by; the email states the real number of days left.
 */
const dueOffsets = ({ eventDate, offsets, sent }, now = Date.now()) => {
  const { date: today, hour } = nptNow(now);
  if (today > eventDate) return [];
  return (offsets || []).filter((o) => {
    if (sent && sent[`d${o}`]) return false;
    const sendDate = sendDateFor(eventDate, o);
    if (today < sendDate) return false;
    if (today === sendDate && hour < SEND_HOUR_NPT) return false;
    return true;
  });
};

module.exports = {
  NPT_OFFSET_MS,
  SEND_HOUR_NPT,
  toYmd,
  parseYmd,
  nptNow,
  addDays,
  daysBetween,
  sendDateFor,
  eligibleOffsets,
  dueOffsets,
};
