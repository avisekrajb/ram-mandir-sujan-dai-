import { localized } from './chatData';

/**
 * What the assistant knows about the moment: the time in Kathmandu (the temple's
 * clock, wherever the visitor is), the next aarti from the saved schedule, and
 * the page the visitor is looking at. Nothing here is invented: a missing
 * schedule simply means there is nothing to say.
 */

/** Hour and minute in Kathmandu. */
export const ktmNow = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kathmandu', hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value) % 24;
  const minute = Number(parts.find((p) => p.type === 'minute')?.value) || 0;
  return { hour, minute, minutes: hour * 60 + minute };
};

/** Which greeting fits the hour. Late at night a plain "Namaste" is kinder than "good night". */
export const dayPart = (hour) => {
  if (hour >= 5 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 17) return 'Afternoon';
  if (hour >= 17 && hour < 21) return 'Evening';
  return 'Night';
};

/** "05:30 AM", "6:30 pm" or "18:30" -> minutes after midnight, or null. */
const parseClock = (value) => {
  const m = String(value || '').trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m?\.?$/i)
    || String(value || '').trim().match(/^(\d{1,2}):(\d{2})()$/);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = Number(m[2] || 0);
  const ap = (m[3] || '').toLowerCase();
  if (ap === 'p' && hour < 12) hour += 12;
  if (ap === 'a' && hour === 12) hour = 0;
  return hour > 23 || minute > 59 ? null : hour * 60 + minute;
};

/** The next aarti in the saved schedule: { name, label, inMinutes, tomorrow } or null. */
export const nextAarti = (settings, lang, now = ktmNow()) => {
  const list = settings?.dailyAarti?.enabled === false ? [] : (settings?.dailyAarti?.aartis || []);
  const items = list
    .map((a) => ({ name: localized(a.name, lang), label: String(a.time || '').trim(), at: parseClock(a.time) }))
    .filter((a) => a.name && a.at !== null);
  if (!items.length) return null;
  return items.reduce((best, a) => {
    const wait = (a.at - now.minutes + 1440) % 1440;
    return !best || wait < best.inMinutes ? { name: a.name, label: a.label, inMinutes: wait, tomorrow: a.at < now.minutes } : best;
  }, null);
};

/** 200 -> "3 h 20 min", 45 -> "45 min". */
export const formatWait = (minutes, c1) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hu = c1('c2_h', 'h');
  const mu = c1('c2_min', 'min');
  if (h === 0) return `${m} ${mu}`;
  return m === 0 ? `${h} ${hu}` : `${h} ${hu} ${m} ${mu}`;
};

// ---------------------------------------------------------------------------
// the page the visitor is on
// ---------------------------------------------------------------------------

const DEFAULT_CHIPS = ['Events', 'Timings', 'Booking', 'Contact', 'Gallery', 'Calendar'];

// route prefix -> { key (for the context line), chips (shown first) }
const PAGES = [
  ['/events', 'events', ['Events', 'Calendar', 'Booking', 'Aarti', 'Gallery', 'Contact']],
  ['/gallery', 'gallery', ['Gallery', 'Events', 'Team', 'History', 'Booking', 'Contact']],
  ['/booking', 'booking', ['Booking', 'Timings', 'Donate', 'Contact', 'Events', 'Calendar']],
  ['/mybookings', 'booking', ['Booking', 'Timings', 'Contact', 'Events', 'Donate', 'Calendar']],
  ['/donate', 'donate', ['Donate', 'Booking', 'Contact', 'Events', 'Timings', 'History']],
  ['/calendar', 'calendar', ['Calendar', 'Events', 'Aarti', 'Booking', 'Converter', 'Contact']],
  ['/tools', 'tools', ['Converter', 'Calendar', 'Events', 'Contact', 'Timings', 'Booking']],
  ['/contact', 'contact', ['Contact', 'Timings', 'Booking', 'Events', 'Aarti', 'Donate']],
  ['/history', 'history', ['History', 'Team', 'Gallery', 'Events', 'Timings', 'Contact']],
  ['/about', 'history', ['History', 'Team', 'Gallery', 'Events', 'Timings', 'Contact']],
  ['/templeteams', 'team', ['Team', 'History', 'Contact', 'Events', 'Gallery', 'Booking']],
  ['/blogs', 'blogs', ['Blogs', 'Events', 'Gallery', 'History', 'Contact', 'Booking']],
];

/** { key, chips } for a route; key is '' on the home page and anywhere unlisted. */
export const pageContext = (pathname) => {
  const path = String(pathname || '/');
  const hit = PAGES.find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`));
  return hit ? { key: hit[1], chips: hit[2] } : { key: '', chips: DEFAULT_CHIPS };
};

/** The first word of a display name ("Abhishek Rajbanshi" -> "Abhishek"); "User" is the app's placeholder. */
export const firstName = (name) => {
  const first = String(name || '').trim().split(/\s+/)[0] || '';
  return /^user$/i.test(first) ? '' : first;
};
