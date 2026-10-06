/**
 * Reading the "About the Temple" headings that admins can override.
 *
 * These headings are editable in Admin → Home / Admin → About, and the shipped
 * defaults have been renamed more than once ("About the Temple" →
 * "श्री रामचन्द्र मन्दिरको बारेमा" → "श्री रामचन्द्र मन्दिरको परिचय"). Any install
 * that saved an older default still holds that string in the database, and it
 * would keep rendering in preference to the current text.
 *
 * The backend backfills those rows on read, but that only takes effect once the
 * server is restarted. This helper makes the read resilient in the meantime: a
 * recognised placeholder is treated as "no title", so the current translation is
 * used instead. A title a human actually wrote does not match and is shown as-is.
 *
 * Mirrors LEGACY_ABOUT_TITLE_PATTERNS in
 * backend/src/controllers/adminController.js.
 */

// Kept as shapes rather than exact strings because the wording drifted between
// releases; only generic forms are listed.
const LEGACY_ABOUT_TITLE_PATTERNS = [
  /^about\s+(us|the\s+temple)$/i,
  /^introduction\s+to\s+the\s+temple$/i,
  /हाम्रो\s+बारेमा$/,
  /मन्दिरको\s+बारेमा$/,
  /मन्दिर\s+के\s+बारे\s+में$/,
  /^关于我们$/,
  /^关于神庙$/,
  /^எங்களைப்\s+பற்றி$/,
  /^கோவிலைப்\s+பற்றி$/,
];

const isPlaceholderTitle = (value) => {
  const text = String(value || '').trim();
  if (!text) return false;
  return LEGACY_ABOUT_TITLE_PATTERNS.some((re) => re.test(text));
};

/**
 * Pick the localized title from an admin-editable { en, ne, hi, zh, ta } object.
 *
 * @param {object} obj   the stored title object
 * @param {string} lang  active language code
 * @returns {string} the localized title, or '' when there is nothing usable
 */
export const getSectionTitle = (obj, lang) => {
  if (!obj) return '';
  if (typeof obj === 'string') {
    return isPlaceholderTitle(obj) ? '' : obj;
  }

  const raw = obj[lang] || obj.en || '';
  return isPlaceholderTitle(raw) ? '' : raw;
};

export default getSectionTitle;