/**
 * Date formatting shared by the printable documents and the CSV exports.
 *
 * These deliberately avoid the locale-aware `toLocaleDateString` for anything
 * that ends up in a file: the CSV must stay stable across machines, and the
 * print sheet is read by people who expect an unambiguous numeric date.
 */

const pad = (n) => String(n).padStart(2, '0');

export const toDate = (value) => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** `YYYY-MM-DD` */
export const formatDateOnly = (value) => {
  const d = toDate(value);
  if (!d) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** `YYYY-MM-DD HH:MM` (24h, locale independent) */
export const formatDateTime = (value) => {
  const d = toDate(value);
  if (!d) return '';
  return `${formatDateOnly(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Long form for display, e.g. `4 Oct 2026, 14:05` */
export const formatLongDate = (value) => {
  const d = toDate(value);
  if (!d) return '';
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/* ------------------------------------------------------------------ */
/* Locale-aware display formatting (UI language)                       */
/* ------------------------------------------------------------------ */

const DATE_LOCALES = { en: 'en-US', ne: 'ne-NP', hi: 'hi-IN', zh: 'zh-CN', ta: 'ta-IN' };

/** BCP-47 locale for a UI language code (en/ne/hi/zh/ta). */
export const dateLocale = (lang) => DATE_LOCALES[lang] || 'en-US';

const NE_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
const NE_MONTHS = [
  'जनवरी', 'फेब्रुअरी', 'मार्च', 'अप्रिल', 'मे', 'जुन',
  'जुलाई', 'अगस्ट', 'सेप्टेम्बर', 'अक्टोबर', 'नोभेम्बर', 'डिसेम्बर',
];
const NE_WEEKDAYS = ['आइतबार', 'सोमबार', 'मंगलबार', 'बुधबार', 'बिहीबार', 'शुक्रबार', 'शनिबार'];
const NE_WEEKDAYS_SHORT = ['आइत', 'सोम', 'मंगल', 'बुध', 'बिही', 'शुक्र', 'शनि'];

const toNeDigits = (value) => String(value).replace(/[0-9]/g, (c) => NE_DIGITS[Number(c)]);

// Test hook: force the hand-rolled Nepali output even when the runtime has ICU data for ne-NP.
let forceNeFallback = false;
export const setForceNepaliFallback = (value) => { forceNeFallback = Boolean(value); };

const needsNeFallback = () => {
  if (forceNeFallback) return true;
  try {
    return typeof Intl === 'undefined'
      || !Intl.DateTimeFormat
      || Intl.DateTimeFormat.supportedLocalesOf(['ne-NP']).length === 0;
  } catch (e) {
    return true;
  }
};

const neDatePart = (d, options) => {
  const o = options || {};
  const hasAny = o.weekday || o.year || o.month || o.day;
  const { weekday, year, month, day } = hasAny ? o : { year: 'numeric', month: 'numeric', day: 'numeric' };

  // Numeric month -> ISO-like order used by Nepali ICU data, e.g. २०२६-१०-०५
  if (month === 'numeric' || month === '2-digit') {
    const bits = [];
    if (year) bits.push(year === '2-digit' ? pad(d.getFullYear() % 100) : String(d.getFullYear()));
    bits.push(pad(d.getMonth() + 1));
    if (day) bits.push(pad(d.getDate()));
    const core = toNeDigits(bits.join('-'));
    if (!weekday) return core;
    const wd = weekday === 'long' ? NE_WEEKDAYS[d.getDay()] : NE_WEEKDAYS_SHORT[d.getDay()];
    return `${wd}, ${core}`;
  }

  const segments = [];
  if (weekday) segments.push(weekday === 'long' ? NE_WEEKDAYS[d.getDay()] : NE_WEEKDAYS_SHORT[d.getDay()]);
  const monthDay = [];
  if (month) monthDay.push(NE_MONTHS[d.getMonth()]);
  if (day) monthDay.push(toNeDigits(day === '2-digit' ? pad(d.getDate()) : d.getDate()));
  const yearText = year
    ? toNeDigits(year === '2-digit' ? pad(d.getFullYear() % 100) : d.getFullYear())
    : '';
  if (monthDay.length) {
    // "अक्टोबर ५, २०२६" when there is a day, "अक्टोबर २०२६" when there is none
    if (yearText && day) segments.push(monthDay.join(' '), yearText);
    else segments.push([...monthDay, yearText].filter(Boolean).join(' '));
  } else if (yearText) {
    segments.push(yearText);
  }
  return segments.join(', ');
};

const neTimePart = (d, options) => {
  const o = options || {};
  const h24 = d.getHours();
  const hour12 = o.hour12 !== false && o.hourCycle !== 'h23' && o.hourCycle !== 'h24';
  const h = hour12 ? (h24 % 12 || 12) : h24;
  const hourText = o.hour === '2-digit' ? pad(h) : String(h);
  let text = hourText;
  if (o.minute) text += `:${pad(d.getMinutes())}`;
  if (o.second) text += `:${pad(d.getSeconds())}`;
  text = toNeDigits(text);
  if (hour12) text += h24 < 12 ? ' पूर्वाह्न' : ' अपराह्न';
  return text;
};

/**
 * Format a date for display in the UI language. Same options as
 * Date#toLocaleDateString. Nepali falls back to built-in month/weekday names
 * and Devanagari digits when the runtime lacks ICU data for ne-NP.
 * Invalid / empty dates -> ''.
 */
export const formatDate = (value, lang = 'en', options) => {
  const d = toDate(value);
  if (!d) return '';
  if (lang === 'ne' && needsNeFallback()) {
    const o = options || {};
    const datePart = neDatePart(d, o);
    if (o.hour || o.minute) return `${datePart}, ${neTimePart(d, o)}`;
    return datePart;
  }
  return d.toLocaleDateString(dateLocale(lang), options);
};

/** Time-of-day in the UI language (Date#toLocaleTimeString options). */
export const formatTime = (value, lang = 'en', options) => {
  const d = toDate(value);
  if (!d) return '';
  if (lang === 'ne' && needsNeFallback()) {
    const o = options && (options.hour || options.minute) ? options : { hour: 'numeric', minute: '2-digit', ...(options || {}) };
    return neTimePart(d, o);
  }
  return d.toLocaleTimeString(dateLocale(lang), options);
};

/** Date + time in the UI language (Date#toLocaleString semantics). */
export const formatDateTimeLocale = (value, lang = 'en', options) => {
  const d = toDate(value);
  if (!d) return '';
  if (lang === 'ne' && needsNeFallback()) {
    if (options && (options.weekday || options.year || options.month || options.day)) {
      return formatDate(d, 'ne', options);
    }
    return `${neDatePart(d, options)}, ${formatTime(d, 'ne', options)}`;
  }
  return d.toLocaleString(dateLocale(lang), options);
};
