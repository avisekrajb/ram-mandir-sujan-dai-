import React from 'react';
import { eventName, templeTitle } from '../../utils/calendarData';

export const FILTERS = [
  { id: 'all', labelKey: 'cal_fAll', fallback: 'All' },
  { id: 'holidays', labelKey: 'cal_fHolidays', fallback: 'Holidays' },
  { id: 'festivals', labelKey: 'cal_fFestivals', fallback: 'Festivals' },
  { id: 'temple', labelKey: 'cal_fTemple', fallback: 'Temple' },
  { id: 'tithi', labelKey: 'cal_fTithi', fallback: 'Ekadashi · Purnima · Aunsi' },
  { id: 'auspicious', labelKey: 'cal_fAuspicious', fallback: 'Auspicious days' },
];

const MARK_KEYS = {
  ekadashi: 'cal_legEkadashi',
  purnima: 'cal_legPurnima',
  amavasya: 'cal_legAmavasya',
};
const MARK_FALLBACK = { ekadashi: 'Ekadashi', purnima: 'Purnima', amavasya: 'Aunsi' };

export const markName = (mark, t) => (mark ? t[MARK_KEYS[mark]] || MARK_FALLBACK[mark] : '');

/** "Marriage · Griha pravesh" for an auspicious day. */
export const auspiciousText = (day, t) =>
  [
    day.special.bibaha && (t.cal_bibaha || 'Marriage'),
    day.special.bratabanda && (t.cal_bratabanda || 'Bratabandha'),
    day.special.grihaprabesh && (t.cal_grihaprabesh || 'Griha pravesh'),
  ]
    .filter(Boolean)
    .join(' · ');

/**
 * The labels a day shows under the active filter. Each is { text, tone } with
 * tone one of holiday | festival | temple | tithi | auspicious.
 */
export const dayItems = (day, filter, lang, t) => {
  const items = [];
  if (filter === 'all' || filter === 'holidays' || filter === 'festivals') {
    day.events.forEach((e) => {
      if (filter === 'holidays' && !e.isHoliday) return;
      const text = eventName(e, lang);
      if (text) items.push({ text, tone: e.isHoliday ? 'holiday' : 'festival' });
    });
  }
  if (filter === 'all' || filter === 'temple') {
    day.temple.forEach((tp) => {
      const text = templeTitle(tp, lang);
      if (text) items.push({ text, tone: 'temple' });
    });
  }
  if (filter === 'tithi' && day.mark) items.push({ text: markName(day.mark, t), tone: 'tithi' });
  if (filter === 'auspicious' && day.auspicious) {
    items.push({ text: auspiciousText(day, t), tone: 'auspicious' });
  }
  return items;
};

export const TONE_TEXT = {
  holiday: 'text-vermilion font-semibold',
  festival: 'text-ink-soft',
  temple: 'text-ink',
  tithi: 'text-ink-soft',
  auspicious: 'text-ink-soft',
};

export const TONE_DOT = {
  holiday: 'bg-vermilion',
  festival: 'bg-brand-300',
  temple: 'bg-white border border-vermilion',
  tithi: 'bg-brand-300',
  auspicious: 'bg-brand-300',
};

/**
 * Moon-phase glyph for the tithi days devotees keep: half for Ekadashi, an open
 * circle for Purnima, a filled one for Aunsi.
 */
export const TithiMark = ({ mark, size = 12, className = '' }) => {
  if (!mark) return null;
  const r = 4.25;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      className={`shrink-0 text-ink-soft ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="6" cy="6" r={r} fill={mark === 'amavasya' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2" />
      {mark === 'ekadashi' && <path d={`M6 ${6 - r} A${r} ${r} 0 0 1 6 ${6 + r} Z`} fill="currentColor" />}
    </svg>
  );
};

/** Replaces {name} placeholders in a translated string. */
export const fmt = (text, vars = {}) =>
  String(text).replace(/\{(\w+)\}/g, (_, k) => (vars[k] === undefined ? '' : vars[k]));
