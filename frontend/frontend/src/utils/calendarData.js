// Data layer for the calendar page: the patro (festivals, tithi, sunrise...) per
// Bikram Sambat month, plus the small helpers every calendar component shares.

import { adToBs } from './nepaliCalendar';
import { sunTimes } from './sunTimes';

/* Festival / holiday + panchanga data (Hamro Patro style public calendar API) */
const PATRO_API = 'https://www.usemiti.com/api/calendar';

const pad = (n) => String(n).padStart(2, '0');

/** `YYYY-MM-DD` for a Gregorian year / month (1-12) / day. */
export const adKey = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

export const keyOfDate = (date) => adKey(date.getFullYear(), date.getMonth() + 1, date.getDate());

export const dateOfKey = (key) => {
  const [y, m, d] = String(key).split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDaysToKey = (key, n) => {
  const d = dateOfKey(key);
  d.setDate(d.getDate() + n);
  return keyOfDate(d);
};

export const daysFromKey = (fromKey, toKey) =>
  Math.round((dateOfKey(toKey).getTime() - dateOfKey(fromKey).getTime()) / 86400000);

/* Month cache so paging back and forth does not refetch */
const monthCache = new Map();
const inflight = new Map();

export const fetchPatroMonth = (bsYear, bsMonth) => {
  const key = `${bsYear}-${bsMonth}`;
  if (monthCache.has(key)) return Promise.resolve(monthCache.get(key));
  if (inflight.has(key)) return inflight.get(key);

  const req = fetch(`${PATRO_API}/${bsYear}/${bsMonth}`)
    .then((res) => {
      if (!res.ok) throw new Error(`patro ${key} -> ${res.status}`);
      return res.json();
    })
    .then((json) => {
      // Each record carries the patro's own BS year/month: the bundled BS length
      // table is only a fallback (for BS 2083 it gives Ashwin 30 days, the
      // published patro says 31, so table-derived BS dates drift from Kartik on).
      const days = (Array.isArray(json?.days) ? json.days : []).map((day) => ({
        ...day,
        bsYear: json.bsYear,
        bsMonth: json.bsMonth,
      }));
      const byAd = {};
      days.forEach((day) => {
        if (!day?.ad) return;
        byAd[adKey(day.ad.year, day.ad.month, day.ad.day)] = day;
      });
      const entry = { byAd, days, raw: json };
      monthCache.set(key, entry);
      inflight.delete(key);
      return entry;
    })
    .catch((err) => {
      inflight.delete(key);
      throw err;
    });

  inflight.set(key, req);
  return req;
};

/** Ekadashi, Purnima and Aunsi (new moon) are the tithi days devotees keep. */
export const tithiMarkOf = (code) =>
  code === 11 ? 'ekadashi' : code === 15 ? 'purnima' : code === 30 ? 'amavasya' : null;

export const TITHI_NAMES = {
  ekadashi: { en: 'Ekadashi', ne: 'एकादशी' },
  purnima: { en: 'Purnima', ne: 'पूर्णिमा' },
  amavasya: { en: 'Aunsi', ne: 'औंसी' },
};

/** Name of a patro event in the reader's language (Nepali for every non-English UI). */
export const eventName = (event, lang) =>
  (lang === 'en' ? event?.en : event?.np) || event?.en || event?.np || '';

/**
 * One normalised day: everything the grid cell, the side panel and the
 * reminders need, whether or not the patro had a record for it.
 */
export const buildDay = (key, rec, temple = []) => {
  const date = dateOfKey(key);
  const sun = sunTimes(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const events = (rec?.events || []).map((e) => ({
    en: e.en || '',
    np: e.np || '',
    isHoliday: !!e.isHoliday,
  }));
  const special = {
    bibaha: !!rec?.specialDays?.bibaha,
    bratabanda: !!rec?.specialDays?.bratabanda,
    grihaprabesh: !!rec?.specialDays?.grihaprabesh,
  };
  return {
    key,
    date,
    // The patro's own BS date when we have it, the table's otherwise.
    bs: rec?.bsYear ? { year: rec.bsYear, month: rec.bsMonth, day: rec.bsDay } : adToBs(date),
    tithiEn: rec?.tithiEn || '',
    tithiNp: rec?.tithiNp || '',
    mark: tithiMarkOf(rec?.tithiCode),
    // Worked out for Kathmandu: the patro's own sunrise/sunset drift by 20-35 minutes
    // in the autumn (see utils/sunTimes.js). Its figures are only the fallback.
    sunrise: sun?.sunrise || rec?.sunrise || '',
    sunset: sun?.sunset || rec?.sunset || '',
    isHoliday: !!rec?.isHoliday || events.some((e) => e.isHoliday),
    events,
    temple,
    special,
    auspicious: special.bibaha || special.bratabanda || special.grihaprabesh,
    hasData: !!rec,
  };
};

/**
 * Temple programmes from the admin panel, grouped by day. Only dated, one-off
 * programmes are plotted: the standing programmes that ship with the site
 * (daily puja, every Saturday...) carry a placeholder date and would show up on
 * the wrong day.
 */
export const groupTempleEvents = (events) => {
  const byKey = {};
  (Array.isArray(events) ? events : []).forEach((ev) => {
    if (!ev || ev.seedKey) return;
    const key = String(ev.date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return;
    (byKey[key] = byKey[key] || []).push({
      id: ev._id,
      title: ev.title || {},
    });
  });
  return byKey;
};

export const templeTitle = (item, lang) =>
  (item?.title && (item.title[lang] || item.title.en || item.title.ne)) || '';
