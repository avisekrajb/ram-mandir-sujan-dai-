// Which festival is it today, and which ones come up: the data behind the morning festival wishes.
//
// Source: the same public patro the calendar page uses (https://www.usemiti.com/api/calendar/<BS year>/<BS month>),
// read here on the server and cached for 12 hours per month. Each day lists its events with an English and a
// Nepali name and a public-holiday flag.
//
// Not every event on a patro is a festival one wishes people on ("World Yoga Day", "Constitution Day"), so wishes
// follow a curated list of major festivals (DEFAULT_ON, about 17 a year); a second list (OPTIONAL) is offered in the
// admin screen switched off; anything else is never offered. The admin can switch any listed festival on or off and
// write their own wording (stored in NewsletterSettings.festivalWishes.overrides, keyed by `festivalKey`).

const { parseYmd, addDays, nptNow } = require('../utils/reminderDates');

const PATRO_API = 'https://www.usemiti.com/api/calendar';
const CACHE_MS = 12 * 60 * 60 * 1000;

// Major festivals: wished by default. Order = priority when two fall on the same day.
const DEFAULT_ON = [
  /nepali new year/i,
  /ram navami|rama navami/i,
  /vivaha panchami/i,
  /guru purnima/i,
  /janai purnima|raksha bandhan/i,
  /krishna janmashtami/i,
  /haritalika teej/i,
  /ganesh chaturthi/i,
  /ghatasthapana/i,
  /vijaya dashami/i,
  /laxmi puja/i,
  /bhai tika/i,
  /maghe sankranti/i,
  /vasanta panchami|saraswati puja/i,
  /maha shivaratri/i,
  /fagu purnima - holi \(hilly/i,
];

// Offered in the admin list, off until the admin switches them on.
const OPTIONAL = [
  /buddha jayanti/i,
  /chhath/i,
  /nag panchami/i,
  /hanuman jayanti/i,
  /akshaya tritiya/i,
  /sita jayanti/i,
  /mata tirtha aunsi|kushe aunsi/i,
  /fulpati|maha ashtami|maha navami/i,
  /kojagrat purnima/i,
  /dhanteras|govardhan puja|kukur tihar/i,
  /fagu purnima - holi/i,
  /gaijatra|indra jatra/i,
  /tamu lhosar|sonam lhosar|gyalpo lhosar|tol lhosar/i,
  /gita jayanti|shri swasthani/i,
];

const defaultOn = (nameEn) => DEFAULT_ON.some((re) => re.test(nameEn));
const isOffered = (nameEn) => defaultOn(nameEn) || OPTIONAL.some((re) => re.test(nameEn));

// A stable id for a festival from year to year ("New Year 2083 (Nepali New Year)" and "... 2084 ..." are one festival).
const festivalKey = (nameEn) =>
  String(nameEn || '')
    .toLowerCase()
    .replace(/\b(19|20)\d\d\b/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

// ---------------------------------------------------------------- fetching ----

const state = {
  fetchImpl: (url, opts) => fetch(url, opts),
  cache: new Map(), // 'y-m' -> { at, json }
};

/** Tests: replace the network call; reset the cache. */
const _setFetch = (fn) => {
  state.fetchImpl = fn;
  state.cache.clear();
};
const clearCache = () => state.cache.clear();

const fetchMonth = async (bsYear, bsMonth) => {
  const key = `${bsYear}-${bsMonth}`;
  const hit = state.cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.json;
  const res = await state.fetchImpl(`${PATRO_API}/${bsYear}/${bsMonth}`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`patro ${key} answered ${res.status}`);
  const json = await res.json();
  if (!json || !Array.isArray(json.days)) throw new Error(`patro ${key} returned no days`);
  state.cache.set(key, { at: Date.now(), json });
  return json;
};

// Bikram Sambat year / month of a Gregorian day, close enough to know which month to ask for (the patro
// answer carries the exact dates; the neighbouring months are read too).
const estimateBs = (ymd) => {
  const d = parseYmd(ymd);
  const y = d.getUTCFullYear();
  const mid = Date.UTC(y, 3, 14); // 14 April: Baisakh 1 falls on 13-15 April
  const afterNewYear = d.getTime() >= mid;
  const bsYear = y + (afterNewYear ? 57 : 56);
  const start = afterNewYear ? mid : Date.UTC(y - 1, 3, 14);
  const month = Math.min(12, Math.max(1, Math.floor((d.getTime() - start) / (30.44 * 86400000)) + 1));
  return { bsYear, bsMonth: month };
};

const nextMonth = ({ bsYear, bsMonth }) => (bsMonth === 12 ? { bsYear: bsYear + 1, bsMonth: 1 } : { bsYear, bsMonth: bsMonth + 1 });
const prevMonth = ({ bsYear, bsMonth }) => (bsMonth === 1 ? { bsYear: bsYear - 1, bsMonth: 12 } : { bsYear, bsMonth: bsMonth - 1 });

const adKey = (ad) => `${ad.year}-${String(ad.month).padStart(2, '0')}-${String(ad.day).padStart(2, '0')}`;

/** Every patro day from `fromYmd` to `toYmd` (inclusive), as { ymd, events[] } (events: { en, np, isHoliday }). */
const getDays = async (fromYmd, toYmd) => {
  let cursor = prevMonth(estimateBs(fromYmd));
  const out = new Map();
  for (let i = 0; i < 9; i += 1) {
    // eslint-disable-next-line no-await-in-loop -- months are read one after another, and cached
    const month = await fetchMonth(cursor.bsYear, cursor.bsMonth);
    for (const day of month.days) {
      if (!day || !day.ad) continue;
      const ymd = adKey(day.ad);
      if (ymd >= fromYmd && ymd <= toYmd) out.set(ymd, { ymd, events: Array.isArray(day.events) ? day.events : [] });
    }
    const last = month.days[month.days.length - 1];
    if (last && last.ad && adKey(last.ad) >= toYmd) break;
    cursor = nextMonth(cursor);
  }
  return [...out.values()].sort((a, b) => (a.ymd < b.ymd ? -1 : 1));
};

// ----------------------------------------------------------------- festivals ----

const overridesOf = (settings) => (settings && settings.festivalWishes && settings.festivalWishes.overrides) || {};

// The festivals of the given days that can be wished, with their on/off state.
const festivalsFromDays = (days, settings) => {
  const overrides = overridesOf(settings);
  const list = [];
  for (const day of days) {
    for (const event of day.events) {
      const nameEn = String(event.en || '').trim();
      if (!nameEn || !isOffered(nameEn)) continue;
      const key = festivalKey(nameEn);
      const override = overrides[key] || {};
      const on = defaultOn(nameEn);
      list.push({
        date: day.ymd,
        key,
        nameEn,
        nameNe: String(event.np || '').trim(),
        defaultOn: on,
        enabled: typeof override.enabled === 'boolean' ? override.enabled : on,
        messages: override.message && typeof override.message === 'object' ? override.message : null,
        // position in the priority list (lower = more important), for choosing between two on one day
        rank: DEFAULT_ON.findIndex((re) => re.test(nameEn)),
      });
    }
  }
  return list;
};

/** Festival wishes coming up in the next `days` days (the admin list), Nepal time. */
const getUpcomingFestivals = async (settings, { days = 120, now = Date.now() } = {}) => {
  const from = nptNow(now).date;
  const to = addDays(from, Math.min(Math.max(days, 1), 400));
  return festivalsFromDays(await getDays(from, to), settings);
};

/** The one festival to wish today, or null. At most one a day: the most important enabled one. */
const getWishForDate = async (ymd, settings) => {
  const todays = festivalsFromDays(await getDays(ymd, ymd), settings).filter((f) => f.enabled);
  if (!todays.length) return null;
  todays.sort((a, b) => (a.rank === -1 ? 99 : a.rank) - (b.rank === -1 ? 99 : b.rank));
  return todays[0];
};

module.exports = {
  DEFAULT_ON,
  OPTIONAL,
  festivalKey,
  defaultOn,
  isOffered,
  estimateBs,
  getDays,
  getUpcomingFestivals,
  getWishForDate,
  festivalsFromDays,
  clearCache,
  _setFetch,
};
