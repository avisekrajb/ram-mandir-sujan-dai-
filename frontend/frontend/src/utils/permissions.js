/**
 * Admin panel access areas (mirror of backend/src/middleware/permissions.js).
 *
 * A super admin can use every area. An admin can use every area too, unless a
 * super admin restricted them: `user.permissions` is then an array of areas.
 * `null` / `undefined` means unrestricted (admins created before this existed).
 */
import { Briefcase, ClipboardList, FileText, Gift, Mail, Activity, Database } from 'lucide-react';

export const AREAS = [
  {
    key: 'content',
    icon: FileText,
    label: 'Website content',
    labelKey: 'k7_areaContent',
    desc: 'Home, About, History, Team, Events, Blogs, Gallery, banners, footer and social links',
    descKey: 'k7_areaContentDesc',
  },
  {
    key: 'bookings',
    icon: ClipboardList,
    label: 'Puja bookings',
    labelKey: 'k7_areaBookings',
    desc: 'View, confirm and cancel puja bookings',
    descKey: 'k7_areaBookingsDesc',
  },
  {
    key: 'donations',
    icon: Gift,
    label: 'Donations',
    labelKey: 'k7_areaDonations',
    desc: 'Review, approve and reject donations',
    descKey: 'k7_areaDonationsDesc',
  },
  {
    key: 'contact',
    icon: Mail,
    label: 'Contact messages and subscribers',
    labelKey: 'k7_areaContact',
    desc: 'Read and reply to visitor messages; see the newsletter subscribers and send mailings to them',
    descKey: 'k7_areaContactDesc',
  },
  {
    key: 'users',
    icon: Briefcase,
    label: 'User accounts',
    labelKey: 'k7_areaUsers',
    desc: 'See, suspend and manage ordinary user accounts',
    descKey: 'k7_areaUsersDesc',
  },
  {
    key: 'analytics',
    icon: Activity,
    label: 'Visitor analytics',
    labelKey: 'k7_areaAnalytics',
    desc: 'Visitor statistics and locations',
    descKey: 'k7_areaAnalyticsDesc',
  },
  {
    key: 'system',
    icon: Database,
    label: 'Backups & cloud storage',
    labelKey: 'k7_areaSystem',
    desc: 'Create and download backups, browse cloud media',
    descKey: 'k7_areaSystemDesc',
  },
];

export const AREA_KEYS = AREAS.map((a) => a.key);

/** Can this user use the given area of the admin panel? */
export const hasArea = (user, area) => {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  if (user.role !== 'admin') return false;
  if (!area) return true;
  if (!Array.isArray(user.permissions)) return true;
  return user.permissions.includes(area);
};

/** True when an admin is limited to a subset of areas. */
export const isRestricted = (user) =>
  !!user && user.role === 'admin' && Array.isArray(user.permissions);

/** Short human description of an admin's access, e.g. "Full access" / "3 of 7 areas". */
export const describeAccess = (permissions, t = {}) => {
  if (!Array.isArray(permissions)) return t.k7_fullAccess || 'Full access';
  if (permissions.length === 0) return t.k7_noAreas || 'No areas';
  if (permissions.length === AREA_KEYS.length) return t.k7_fullAccess || 'Full access';
  return (t.k7_nOfAreas || '{n} of {total} areas')
    .replace('{n}', permissions.length)
    .replace('{total}', AREA_KEYS.length);
};

/** Admin page key (route) -> access area. Keys without an entry are open to every admin. */
export const AREA_FOR_PAGE = {
  home: 'content',
  about: 'content',
  history: 'content',
  team: 'content',
  events: 'content',
  'events/aarti': 'content',
  blogs: 'content',
  gallery: 'content',
  notice: 'content',
  hero: 'content',
  'live-puja': 'content',
  'header': 'content',
  quote: 'content',
  timings: 'content',
  logo: 'content',
  footer: 'content',
  social: 'content',
  'facebook-video': 'content',
  users: 'users',
  bookings: 'bookings',
  'booking-content': 'bookings',
  donations: 'donations',
  contact: 'contact',
  newsletter: 'contact',
  reviews: 'contact',
  visitors: 'analytics',
  backup: 'system',
  cloud: 'system',
  bell: 'system',
};

/** Area required by an admin path such as "events/aarti" or "events/123"; null = any admin. */
export const areaForPage = (path) => {
  if (!path) return null;
  if (AREA_FOR_PAGE[path]) return AREA_FOR_PAGE[path];
  const parent = Object.keys(AREA_FOR_PAGE).find((k) => path.startsWith(`${k}/`));
  return parent ? AREA_FOR_PAGE[parent] : null;
};

/**
 * Pages only a super administrator may open, whatever areas they hold. The
 * server refuses these as well (see the backend's SUPERADMIN_ONLY_SETTINGS_KEYS
 * and requireSuperAdmin), so this list is about not offering a door that would
 * only fail: hiding a link is not what protects them.
 *
 * Kept here rather than in a page so the route guard and the navigation agree.
 */
export const SUPERADMIN_ONLY_PAGES = ['access', 'account', 'header', 'backup', 'bell'];

/** True when this path is one of the super-admin-only pages. */
export const isSuperAdminOnlyPage = (path) => SUPERADMIN_ONLY_PAGES.includes(path);
