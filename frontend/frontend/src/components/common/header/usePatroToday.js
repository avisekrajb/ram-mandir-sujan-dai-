import { useEffect, useState } from 'react';
import { adToBs, localDigits } from '../../../utils/nepaliCalendar';
import { adKey, daysFromKey, dateOfKey, fetchPatroMonth } from '../../../utils/calendarData';
import { sunTimes } from '../../../utils/sunTimes';

/**
 * Today's patro (panchanga) for the strip above the navbar: the Bikram Sambat date,
 * tithi, sunrise and sunset (calculated, see utils/sunTimes.js), today's festivals
 * and, on a day without one, the next festival and how far away it is.
 *
 * It reads the same published patro as the calendar page, through the calendar
 * page's own cached month loader, so opening both costs one request. The BS date
 * comes from the patro itself: the bundled BS table is a day out for the newest
 * years (it gives Ashwin 2083 thirty days, the patro says thirty-one).
 *
 * Returns null until the data is in, and for good if the patro cannot be reached;
 * callers fall back to what they already show.
 */

const KTM_TZ = 'Asia/Kathmandu';
const CACHE_KEY = 'rcmt:patro-today-v3';
const CACHE_MS = 6 * 60 * 60 * 1000;

/** Today's date in Kathmandu as `YYYY-MM-DD`. */
const ktmDateKey = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: KTM_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

const monthAfter = ({ year, month }) => (month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 });
const monthBefore = ({ year, month }) => (month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 });

const readCache = (key) => {
  try {
    const hit = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
    return hit && hit.data?.key === key && Date.now() - hit.at < CACHE_MS ? hit.data : null;
  } catch {
    return null;
  }
};

const writeCache = (data) => {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* storage blocked */
  }
};

const eventsOf = (list) =>
  (list || []).map((e) => ({ en: e.en || '', np: e.np || '', isHoliday: !!e.isHoliday }));

/** The days of a loaded month that have an event and come after `key`, soonest first. */
const upcomingIn = (entry, key) =>
  (entry?.days || [])
    .filter((d) => d?.ad && (d.events || []).length > 0)
    .map((d) => ({ key: adKey(d.ad.year, d.ad.month, d.ad.day), events: eventsOf(d.events), isHoliday: !!d.isHoliday }))
    .filter((d) => d.key > key)
    .sort((a, b) => (a.key < b.key ? -1 : 1));

// The patro gives only the tithi number, and 1-14 come round twice a month, so the
// half of the lunar month (paksha) is read from the day that closes it: Purnima (15)
// ends the bright half (Shukla), Aunsi (30) the dark half (Krishna).
const PAKSHA_ENDED_BY = { 15: 'shukla', 30: 'krishna' };
const HALF_MONTH_DAYS = 16;

/**
 * 'shukla' | 'krishna' for `key`, or '' when the data cannot say. It looks at the
 * nearest closing day ahead and the nearest one behind; if they disagree (a tithi
 * the patro skipped) it shows nothing rather than a wrong half.
 */
export const pakshaOf = (key, entries) => {
  const ends = entries
    .flatMap((e) => e?.days || [])
    .filter((d) => d?.ad && PAKSHA_ENDED_BY[d.tithiCode])
    .map((d) => ({ gap: daysFromKey(key, adKey(d.ad.year, d.ad.month, d.ad.day)), paksha: PAKSHA_ENDED_BY[d.tithiCode] }));
  const ahead = ends.filter((e) => e.gap >= 0 && e.gap <= HALF_MONTH_DAYS).sort((a, b) => a.gap - b.gap)[0];
  const behind = ends.filter((e) => e.gap < 0 && e.gap >= -HALF_MONTH_DAYS).sort((a, b) => b.gap - a.gap)[0];
  const fromAhead = ahead?.paksha;
  const fromBehind = behind ? (behind.paksha === 'shukla' ? 'krishna' : 'shukla') : undefined;
  if (fromAhead && fromBehind && fromAhead !== fromBehind) return '';
  return fromAhead || fromBehind || '';
};

const loadToday = async (key) => {
  const bs = adToBs(dateOfKey(key));
  if (!bs) return null;

  // The bundled table can be a day out at a month's edge, so if today is not in the
  // month it names, look in the one after and the one before.
  const guess = { year: bs.year, month: bs.month };
  let found = null;
  let entry = null;
  for (const m of [guess, monthAfter(guess), monthBefore(guess)]) {
    try {
      const e = await fetchPatroMonth(m.year, m.month);
      if (e.byAd[key]) {
        found = m;
        entry = e;
        break;
      }
    } catch {
      /* try the next month */
    }
  }
  if (!entry) return null;

  const rec = entry.byAd[key];
  // Sunrise and sunset are worked out for Kathmandu; the patro's own figures are
  // 20-35 minutes out in the autumn, so they are only the fallback.
  const day = dateOfKey(key);
  const sun = sunTimes(day.getFullYear(), day.getMonth() + 1, day.getDate());

  // The months either side: the next festival and the paksha can both lie past the
  // month's edge. They are the same cached loads the calendar page makes, and the
  // strip works without them (a failed fetch just leaves that part out).
  const [after, before] = await Promise.all(
    [monthAfter(found), monthBefore(found)].map((m) => fetchPatroMonth(m.year, m.month).catch(() => null)),
  );
  const next = upcomingIn(entry, key)[0] || upcomingIn(after, key)[0];
  // Purnima and Aunsi name themselves; every other tithi gets its half.
  const paksha = PAKSHA_ENDED_BY[rec.tithiCode] ? '' : pakshaOf(key, [before, entry, after]);

  return {
    key,
    bs: { year: rec.bsYear, month: rec.bsMonth, day: rec.bsDay },
    tithiEn: rec.tithiEn || '',
    tithiNp: rec.tithiNp || '',
    paksha,
    sunrise: sun?.sunrise || rec.sunrise || '',
    sunset: sun?.sunset || rec.sunset || '',
    isHoliday: !!rec.isHoliday,
    events: eventsOf(rec.events),
    next: next ? { events: next.events, isHoliday: next.isHoliday, daysAway: daysFromKey(key, next.key) } : null,
  };
};

const usePatroToday = () => {
  const [key, setKey] = useState(ktmDateKey);
  const [data, setData] = useState(() => readCache(ktmDateKey()));

  // Roll over at midnight in Kathmandu.
  useEffect(() => {
    const id = setInterval(() => setKey((prev) => {
      const now = ktmDateKey();
      return now === prev ? prev : now;
    }), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let alive = true;
    const hit = readCache(key);
    if (hit) {
      setData(hit);
      return undefined;
    }
    loadToday(key)
      .then((d) => {
        if (!alive || !d) return;
        writeCache(d);
        setData(d);
      })
      .catch(() => { /* leave the strip as it was */ });
    return () => { alive = false; };
  }, [key]);

  return data && data.key === key ? data : null;
};

// ---------------------------------------------------------------------------
// text helpers, shared by the strip
// ---------------------------------------------------------------------------

// Nepali and Hindi say the part of the day before the hour ("बिहान ५:३८"), as the clock does.
const PART_OF_DAY = {
  ne: ['राति', 'बिहान', 'दिउँसो', 'साँझ'],
  hi: ['रात', 'सुबह', 'दोपहर', 'शाम'],
};
const partOfDay = (hour) => (hour < 4 ? 0 : hour < 12 ? 1 : hour < 16 ? 2 : hour < 19 ? 3 : 0);

/** "05:38" -> "5:38 AM", or "बिहान ५:३८" for Nepali and Hindi. */
export const formatPatroClock = (hhmm, lang) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ''));
  if (!m) return '';
  const hour24 = Number(m[1]) % 24;
  const hour12 = hour24 % 12 || 12;
  if (PART_OF_DAY[lang]) {
    return `${PART_OF_DAY[lang][partOfDay(hour24)]} ${localDigits(hour12, lang)}:${localDigits(m[2], lang)}`;
  }
  return `${hour12}:${m[2]} ${hour24 >= 12 ? 'PM' : 'AM'}`;
};

/** Nepali for Nepali and Hindi readers; English for everyone else (a Chinese or Tamil reader can use the transliteration). */
export const patroName = (item, lang) =>
  (lang === 'ne' || lang === 'hi' ? item?.np || item?.en : item?.en || item?.np) || '';

export default usePatroToday;
