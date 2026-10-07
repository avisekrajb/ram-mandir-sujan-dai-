/**
 * Admin panel access areas.
 *
 * A super admin can use every area. An admin can use every area too, unless a
 * super admin restricted them to a subset (User.permissions is an array). Admins
 * created before permissions existed have no array and stay unrestricted.
 *
 * Keep AREAS in sync with frontend/src/utils/permissions.js.
 */
const AREAS = ['content', 'bookings', 'donations', 'contact', 'users', 'analytics', 'system'];

const hasArea = (user, area) => {
  if (!user) return false;
  // A staff account still on its temporary password has no staff powers anywhere (the `admin`
  // middleware already enforces this on /api/admin; routes that check the role inline use this).
  if (user.mustChangePassword) return false;
  if (user.role === 'superadmin') return true;
  if (user.role !== 'admin') return false;
  if (!Array.isArray(user.permissions)) return true;
  return user.permissions.includes(area);
};

const deny = (res, area) =>
  res.status(403).json({
    message: 'You do not have access to this part of the admin panel. Ask the super administrator.',
    code: 'NO_AREA_ACCESS',
    area,
  });

const requireArea = (area) => (req, res, next) => (hasArea(req.user, area) ? next() : deny(res, area));

/**
 * Which area a protected /api/admin/* path belongs to. Returns null for paths
 * that any admin may use (activity log, notifications, own profile...) and for
 * PUT /settings, which requireSettingsAccess checks key by key.
 */
// (/accounts is not listed: accountRoutes applies its own per-route checks.)
const ADMIN_PATH_AREAS = [
  [/^\/users(\/|$)/, 'users'],
  [/^\/bookings(\/|$)/, 'bookings'],
  [/^\/donations(\/|$)/, 'donations'],
  [/^\/cloud(\/|$)/, 'system'],
  // Uploads that belong to the Bookings / Donations pages, before the generic rule.
  [/^\/upload\/booking-bg\/*$/, 'bookings'],
  [/^\/upload\/qr\/*$/, 'donations'],
  [/^\/(social|about|history|team|blogs|events|gallery|quotes|upload)(\/|$)/, 'content'],
];

// Express routes are case-insensitive (/Users reaches /users), so match case-insensitively too,
// and tolerate a trailing slash.
const areaForAdminPath = (path) => {
  const p = String(path || '').toLowerCase();
  for (const [rx, area] of ADMIN_PATH_AREAS) {
    if (rx.test(p)) return area;
  }
  return null;
};

/**
 * The site settings are one document that several admin pages write to. The
 * Bookings and Donations pages save their own keys there, so PUT /settings is
 * checked per key: a key owned by Bookings / Donations needs that area, every
 * other key needs "content".
 */
const SETTINGS_KEY_AREAS = {
  bookings: ['bookingBgPhoto', 'pujaTypes', 'dateLimits', 'bookingAvailable', 'availabilityMessage', 'bookingContent', 'bookingPage'],
  donations: ['donatePageTitle', 'donateIntro', 'donateContent', 'donate', 'donationCategories'],
};

const settingsKeyArea = (key) => {
  for (const [area, keys] of Object.entries(SETTINGS_KEY_AREAS)) {
    if (keys.includes(key)) return area;
  }
  return 'content';
};

/**
 * Settings only a super admin may write, whatever areas they hold. These are the
 * parts of the site's own chrome rather than its content: turning the header off,
 * or repointing it, is a whole-site change that no content admin should be able
 * to make on their own. The offline notice is here for the same reason, and more
 * sharply: it can start a sound on every visitor's device without asking them
 * first, which is not a decision one content admin should be able to make.
 *
 * A key on this list is dropped from an ordinary admin's save, exactly like a key
 * whose area they do not hold, so a page that sends the whole settings document
 * back is not blocked by the keys it has no business changing.
 */
const SUPERADMIN_ONLY_SETTINGS_KEYS = ['header', 'offlineNotice'];

const isSuperAdminOnlyKey = (key) => SUPERADMIN_ONLY_SETTINGS_KEYS.includes(key);

const requireSettingsAccess = (req, res, next) => {
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  const keys = Object.keys(body);
  if (!keys.length) return hasArea(req.user, 'content') ? next() : deny(res, 'content');

  const allowed = keys.filter((k) => {
    if (isSuperAdminOnlyKey(k)) return req.user?.role === 'superadmin';
    return hasArea(req.user, settingsKeyArea(k));
  });
  if (allowed.length === 0) {
    // The wording matters here: "you lack the content area" would be wrong for a
    // key that no admin area grants.
    if (keys.some(isSuperAdminOnlyKey)) {
      return res.status(403).json({ message: 'Access denied. Super administrator only.' });
    }
    return deny(res, settingsKeyArea(keys[0]));
  }

  // Some pages (Social links, Facebook video) send the whole settings document back.
  // Keys this admin has no area for are dropped rather than refusing the save; they
  // can never change them, and an unchanged copy of them must not block the page.
  if (allowed.length < keys.length) {
    req.body = Object.fromEntries(allowed.map((k) => [k, body[k]]));
  }
  return next();
};

module.exports = { AREAS, hasArea, requireArea, areaForAdminPath, requireSettingsAccess };
