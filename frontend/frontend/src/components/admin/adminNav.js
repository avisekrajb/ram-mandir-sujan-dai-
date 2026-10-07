import {
  Activity, Bell, BellRing, BookOpen, Briefcase, CalendarDays, ClipboardList, Clock, Cloud, Database, Facebook, FileText,
  Flame, Gift, History, Home, Image, Info, Landmark, LayoutDashboard, Mail, Megaphone, PanelBottom, PanelTop, PenLine,
  Quote, Radio, ScrollText, Send, Settings, Share2, ShieldCheck, SlidersHorizontal, Star, Stamp, UserCog, Users,
  UsersRound,
} from 'lucide-react';
import { areaForPage, hasArea, isSuperAdminOnlyPage } from '../../utils/permissions';

/**
 * Single source of truth for the admin navigation: the sidebar renders it, the
 * command palette searches it and the top bar takes the current page's title
 * from it, so all three always use the same translated label. Each item has
 * its own distinct icon.
 *
 * Pass `user` to get only what that admin may open: items in an access area the
 * super administrator took away are left out (the area of each page lives in
 * utils/permissions.js, next to the server's matching rule).
 */
/**
 * The order the sidebar sections appear in, and therefore the order of the pages
 * inside them: Overview first, then each category in turn. Written out rather than
 * left to the order of the array below, so a section that is edited or inserted
 * later cannot quietly move the whole panel around. Anything not listed sorts last.
 */
const SECTION_ORDER = ['main', 'content', 'management', 'accounts', 'settings'];

export const getAdminSections = (t, isSuperAdmin, user) => {
  const sections = [
    {
      id: 'main',
      label: t.k7_navOverview || 'Overview',
      icon: LayoutDashboard,
      items: [{ key: 'overview', label: t.overview || 'Overview', icon: LayoutDashboard }],
    },
    {
      id: 'content',
      label: t.content || 'Content',
      icon: FileText,
      items: [
        { key: 'home', label: t.navHomeSettings || 'Home Settings', icon: Home },
        { key: 'about', label: t.aboutSection || 'About', icon: Info },
        { key: 'history', label: t.manageHistory || 'History', icon: ScrollText },
        { key: 'team', label: t.manageTeam || 'Team', icon: UsersRound },
        { key: 'events', label: t.manageEvents || 'Events', icon: CalendarDays },
        { key: 'events/aarti', label: t.navDailyAarti || 'Daily Aarti & Info', icon: Flame },
        { key: 'blogs', label: t.navBlogs || 'Blogs', icon: BookOpen },
        { key: 'gallery', label: t.manageGallery || 'Gallery', icon: Image },
        { key: 'notice', label: t.navNoticeModal || 'Notice Modal', icon: Megaphone },
      ],
    },
    {
      id: 'management',
      label: t.management || 'Management',
      icon: Briefcase,
      items: [
        { key: 'bookings', label: t.manageBooking || 'Bookings', icon: ClipboardList },
        // Public bookings from the Events page, with the price list (area: bookings).
        // The separate "Booking management" screen is gone. Admin -> Bookings now
        // covers the puja list and the price list in one place, and the wording of
        // the page is on Booking Page Content below.
        // The wording of the booking page itself (area: bookings, same as the list).
        // PenLine, not FileText: that icon already belongs to the Content section
        // and every sidebar item is meant to have an icon of its own.
        { key: 'booking-content', label: t.a1_bpcNavLabel || 'Booking Page Content', icon: PenLine },
        { key: 'donations', label: t.manageDonate || 'Donations', icon: Gift },
        // Super admin only: payment features, QR and account numbers.
        ...(isSuperAdmin ? [{ key: 'account', label: t.donationAccount || 'Donation Account', icon: Landmark }] : []),
        { key: 'contact', label: t.navContactMessages || 'Contact Messages', icon: Mail },
        { key: 'newsletter', label: t.nl_adminNav || 'Subscribers & mail', icon: Send },
        { key: 'reviews', label: t.ct_adminReviews || 'Reviews', icon: Star },
        { key: 'visitors', label: t.navVisitorAnalytics || 'Visitor Analytics', icon: Activity },
        ...(isSuperAdmin ? [{ key: 'backup', label: t.navBackupRestore || 'Backup & Restore', icon: Database }] : []),
        { key: 'cloud', label: t.navCloudStorage || 'Cloud Storage', icon: Cloud },
      ],
    },
    {
      id: 'accounts',
      label: t.k7_navAccounts || 'Accounts',
      icon: ShieldCheck,
      items: [
        { key: 'users', label: t.manageUsers || 'Users', icon: Users },
        ...(isSuperAdmin ? [{ key: 'access', label: t.k7_adminsAccess || 'Admins & access', icon: UserCog }] : []),
        { key: 'audit', label: t.k7_auditLog || 'Audit log', icon: History },
        { key: 'profile', label: t.k7_myAccount || 'My account', icon: Settings },
      ],
    },
    {
      id: 'settings',
      label: t.settings || 'Settings',
      icon: SlidersHorizontal,
      items: [
        // Header, Backups and Bell sound are super-admin only (see SUPER_ONLY_PAGES
        // in AdminPage); they are dropped from an ordinary admin's sidebar here.
        ...(isSuperAdmin ? [{ key: 'header', label: t.a1_headerNavLabel || 'Header', icon: PanelTop }] : []),
        // The hero banner - photo/video plus the text over it - is part of the
        // Home page now, so there is no separate Hero entry to keep in step.
        // Live Puja: the YouTube channel and the fallback video (area: content).
        { key: 'live-puja', label: t.a1_livePujaNavLabel || 'Live Puja', icon: Radio },
        { key: 'quote', label: t.dailyQuote || 'Daily Quote', icon: Quote },
        { key: 'timings', label: t.templeTimings || 'Timings', icon: Clock },
        { key: 'logo', label: t.logoQr || 'Logo', icon: Stamp },
        { key: 'footer', label: t.navFooterSettings || 'Footer Settings', icon: PanelBottom },
        { key: 'social', label: t.navSocialLinks || 'Social Links', icon: Share2 },
        { key: 'facebook-video', label: t.navFacebookVideo || 'Facebook Video', icon: Facebook },
        // Sound played when a new notification reaches the panel (super-admin only).
        ...(isSuperAdmin ? [{ key: 'bell', label: t.a1_bellNavLabel || 'Bell Sound', icon: BellRing }] : []),
      ],
    },
  ];

  if (!user) return sections;
  return sections
    .map((s) => ({ ...s, items: s.items.filter((i) => hasArea(user, areaForPage(i.key))) }))
    .filter((s) => s.items.length > 0)
    // Ranked by SECTION_ORDER, so Overview stays first whatever happens above.
    .map((s, i) => ({ s, i }))
    .sort((a, b) => {
      const ra = SECTION_ORDER.indexOf(a.s.id);
      const rb = SECTION_ORDER.indexOf(b.s.id);
      if (ra !== -1 && rb !== -1) return ra - rb;
      if (ra !== -1) return -1;
      if (rb !== -1) return 1;
      return a.i - b.i;
    })
    .map(({ s }) => s);
};

// Pages reachable from the top bar rather than the sidebar.
const extraPages = (t) => [
  { key: 'notifications', label: t.notifications || 'Notifications', icon: Bell },
  // The old "Admin Settings" address now opens My account.
  { key: 'settings', label: t.k7_myAccount || 'My account', icon: Settings },
];

/** Every page the current admin can open, flattened (for the command palette). */
export const getAdminPages = (t, isSuperAdmin, user) =>
  getAdminSections(t, isSuperAdmin, user).flatMap((s) =>
    s.items.map((i) => ({ ...i, section: s.flat ? null : s.label }))
  );

/**
 * Just the super-admin-only pages, flattened and in sidebar order.
 *
 * The super admin console (/super/admin) links to these and nothing else: the
 * rest of the admin panel is already one click away in its own sidebar, and
 * repeating all thirty-odd pages here would give the console a second copy to
 * keep in step. Read from getAdminSections so a label or an icon still comes
 * from the one list.
 */
export const getSuperAdminOnlyItems = (t, user) =>
  getAdminSections(t, true, user)
    .flatMap((s) => s.items)
    .filter((item) => isSuperAdminOnlyPage(item.key));

/** Translated title for an admin path such as "events/aarti". */
export const getAdminPageTitle = (t, path, isSuperAdmin) => {
  const key = path || 'overview';
  const all = [...getAdminSections(t, isSuperAdmin).flatMap((s) => s.items), ...extraPages(t)];
  const exact = all.find((item) => item.key === key);
  if (exact) return exact.label;
  // Nested routes fall back to their parent section (e.g. "events/123").
  const parent = all.find((item) => key.startsWith(`${item.key}/`));
  return parent ? parent.label : t.adminDashboard || 'Admin';
};
