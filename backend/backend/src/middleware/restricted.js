/**
 * A time-boxed suspension is a restriction, not a lock-out: the account signs in
 * as normal but is held to the home page (see utils/suspension.js).
 *
 * `protect` allows the sign-in through and tags the request; this middleware then
 * refuses everything else with 403 ACCOUNT_RESTRICTED, so the browser is told the
 * truth and the client can send the visitor back to the home page with a notice
 * instead of bouncing them to a broken screen or to the login form.
 */

// Everything a restricted account may still reach: who they are, the home page's
// own data, signing out, and the translations it needs to render. This is the
// complete set of calls HomePage, Layout, Header, LanguageContext and
// useSiteSettings make - see HomePage.jsx and the routes they hit.
const ALLOWED_PATHS = [
  /^\/auth\/(me|logout)$/,
  /^\/visitors\/detect$/,      // LanguageContext: picks the visitor's language
  /^\/admin\/settings$/,        // public: language list, timings, site settings
  /^\/admin\/quotes\/today$/,   // the daily quote strip
  /^\/admin\/gallery\/all$/,    // the pictures on the home page
  /^\/events\/home$/,           // the programme strip
  /^\/events\/interested$/,     // "I'm interested" buttons on that strip
  /^\/live\/(facebook|puja)$/,  // the live panel
  /^\/collections\/resources/,  // images the page renders, served from Cloudinary
];

const allows = (path) => ALLOWED_PATHS.some((re) => re.test(path));

/**
 * @param req.user already set by `protect`.
 */
const blockRestricted = (req, res, next) => {
  const user = req.user;
  if (!user || user.active !== false || user.role === 'superadmin') return next();

  // A timed suspension that has run out lifts itself here, so the visitor is not
  // locked out by a date nobody was around to notice.
  if (user.suspendedUntil instanceof Date && user.suspendedUntil.getTime() <= Date.now()) {
    user.active = true;
    user.suspendedReason = '';
    user.suspendedAt = null;
    user.suspendedUntil = null;
    user.save().catch((e) => console.error('Auto-lift suspension failed:', e.message));
    return next();
  }

  // Open-ended: this is the original behaviour - no sign-in at all.
  if (!(user.suspendedUntil instanceof Date)) {
    return res.status(401).json({
      message: 'Account disabled. Contact the super administrator.',
      code: 'ACCOUNT_SUSPENDED',
    });
  }

  if (allows(req.originalUrl.split('?')[0])) return next();

  return res.status(403).json({
    message: 'Your account is suspended for now. Only the home page is available.',
    code: 'ACCOUNT_RESTRICTED',
    suspendedUntil: user.suspendedUntil,
  });
};

module.exports = blockRestricted;
module.exports.allows = allows;
module.exports.ALLOWED_PATHS = ALLOWED_PATHS;