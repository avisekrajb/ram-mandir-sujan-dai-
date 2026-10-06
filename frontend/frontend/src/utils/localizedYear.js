const DEVANAGARI_DIGITS = '०१२३४५६७८९';

const toDevanagariDigits = (value) =>
  String(value).replace(/[0-9]/g, (d) => DEVANAGARI_DIGITS[Number(d)]);

const toAsciiDigits = (value) =>
  String(value).replace(/[०-९]/g, (d) => String(DEVANAGARI_DIGITS.indexOf(d)));

/**
 * Returns the localized year string for the active language. A history year can
 * be a legacy scalar string, a per-language object or undefined. The helper is
 * safe to call unconditionally.
 *
 * @param {string|object} year
 * @param {string} lang
 * @returns {string}
 */
export const getLocalizedYear = (year, lang = 'en') => {
  if (!year) return '';

  if (typeof year === 'string') {
    const trimmed = year.trim();
    if (!trimmed) return '';

    // Switch digits to match the requested language so users always see the
    // most readable form. Ne/Nepali/UI can be a mixture; be conservative.
    if (lang === 'ne' || lang === 'hi' || lang === 'ta') {
      return toDevanagariDigits(trimmed);
    }
    return toAsciiDigits(trimmed);
  }

  if (typeof year === 'object') {
    const value = year[lang] ?? year.en ?? year.ne ?? '';
    return String(value ?? '').trim();
  }

  return '';
};

export default getLocalizedYear;