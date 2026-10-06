// Stops script-carrying addresses from being SAVED. Admin pages store links (map, footer buttons,
// social profiles, live-video address, donation screenshot ...) that the public site later puts into
// href / src / iframe attributes. Browsers run `javascript:` addresses there, so one such value in
// the database is a stored XSS against every visitor, including the super admin (whose login token
// is readable by page scripts). Rejecting them at the door protects every page that renders them.
//
// Only the START of a value decides (the scheme), so existing data such as "www.facebook.com/x" (no
// scheme) or "/events" keeps saving, ordinary text such as "Data: 5 people coming" is not mistaken for
// an address, and the check costs the same for a 5 MB value as for a 5 byte one.
// Password / token style fields are skipped: they hold arbitrary text.

const DANGEROUS = /^(?:javascript|vbscript|livescript|mocha):/i;
// A real data URL has the shape  data:[<type>/<subtype>][;parameter...],<data>. Anything else that merely
// starts with the word "data:" (a sentence such as "Data: 5 people, ...") is plain text.
const DATA_URL = /^data:(?:[a-z0-9.+-]+\/[a-z0-9.+-]+)?(?:;[^,]*)?,/i;
// Pictures are harmless as data URLs (they cannot run script when shown in an <img>).
const SAFE_DATA_IMAGE = new RegExp('^data:image/(?:png|jpe?g|gif|webp|avif);base64,', 'i');
const SKIP_KEY = /pass(word)?|token|secret|otp|^code$|accesstoken|credential/i;

// How many significant characters of a value are looked at: enough for "data:image/svg+xml;base64,".
const HEAD = 40;

// Browsers ignore tabs, newlines and other control characters inside a scheme ("java<TAB>script:").
// Collects the first HEAD significant characters only.
const head = (value) => {
  let out = '';
  for (let i = 0; i < value.length && out.length < HEAD; i += 1) {
    const c = value.charCodeAt(i);
    // control characters, spaces, zero-width / bidi marks, line separators, BOM
    if (c <= 0x20 || (c >= 0x7f && c <= 0x9f) || (c >= 0x200b && c <= 0x200f) || c === 0x2028 || c === 0x2029 || c === 0xfeff) continue;
    out += value[i];
  }
  return out;
};

const isUnsafe = (value) => {
  const start = head(value);
  if (DANGEROUS.test(start)) return true;
  if (DATA_URL.test(start) && !SAFE_DATA_IMAGE.test(start)) return true;
  return false;
};

const MAX_DEPTH = 12;

// Returns the dotted path of the first offending value, or null.
const findUnsafe = (value, path = '', depth = 0) => {
  if (depth > MAX_DEPTH || value === null || value === undefined) return null;
  if (typeof value === 'string') return value.length < 4 ? null : isUnsafe(value) ? path || '(value)' : null;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const hit = findUnsafe(value[i], `${path}[${i}]`, depth + 1);
      if (hit) return hit;
    }
    return null;
  }
  if (typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (SKIP_KEY.test(key)) continue;
      const hit = findUnsafe(value[key], path ? `${path}.${key}` : key, depth + 1);
      if (hit) return hit;
    }
  }
  return null;
};

const rejectUnsafeUrls = (req, res, next) => {
  if (!['POST', 'PUT', 'PATCH'].includes(req.method) || !req.body || typeof req.body !== 'object') return next();
  const bad = findUnsafe(req.body);
  if (bad) {
    return res.status(400).json({
      success: false,
      message: `"${String(bad).slice(0, 80)}" holds an unsafe address. Only http(s), mailto, tel and site links are allowed.`,
    });
  }
  next();
};

module.exports = rejectUnsafeUrls;
module.exports.findUnsafe = findUnsafe;
