import {
  Home, Info, ScrollText, CalendarDays, ImageIcon, Hand, Gift, Phone, Users, Languages, ArrowLeftRight, Coins, Wrench, Clock,
} from 'lucide-react';

/**
 * Single source of truth for the site navigation (desktop bar, mobile drawer
 * and footer quick links). `protected` items need a signed-in user; visitors
 * get the login dialog instead. Labels come from translations with an English
 * fallback.
 */
export const getPrimaryNav = (t) => [
  { to: '/', label: t.navHome || 'Home', icon: Home, end: true },
  {
    id: 'about',
    label: t.navAbout || 'About Us',
    icon: Info,
    children: [
      { to: '/about', label: t.navAbout || 'About Us', icon: Info },
      { to: '/templeteams', label: t.navTeam || t.teamMembers || 'Team Members', icon: Users },
    ],
  },
  { to: '/history', label: t.navHistory || 'History', icon: ScrollText },
  { to: '/events', label: t.navEvents || 'Events', icon: CalendarDays },
  { to: '/gallery', label: t.navGallery || 'Gallery', icon: ImageIcon },
  { to: '/booking', label: t.navBooking || 'Book Puja', icon: Hand, protected: true },
  { to: '/calendar', label: t.navCalendar || 'Calendar', icon: CalendarDays },
  { to: '/tools', label: t.a5_toolsTitle || 'Tools', icon: Wrench },
  { to: '/contact', label: t.navContact || 'Contact', icon: Phone },
];

/** Shortcuts into the single Tools page (each opens its own tab). */
export const getToolsNav = (t) => [
  { to: '/tools#date', label: t.a5_toolDate || 'Date Converter', icon: ArrowLeftRight },
  { to: '/tools#text', label: t.a5_toolText || 'Unicode / Preeti Converter', icon: Languages },
  { to: '/tools#currency', label: t.a5_toolCurrency || 'Currency Exchange', icon: Coins },
  { to: '/tools#time', label: t.a5_toolTime || 'Time & Weather', icon: Clock },
];
// The footer links to the main navigation only (Calendar and Tools are in it).
export const getMoreNav = () => [];

export const getDonateNav = (t) => ({
  to: '/donate',
  label: t.navDonate || 'Donate',
  icon: Gift,
  protected: true,
});

/**
 * The donate link in the desktop navigation, placed directly after the Gallery
 * link (`after` names that link). It has its own key, `navSupport`:
 * "सहयोग गर्नुहोस्" asks for support in the temple's own words, while the shorter
 * `navDonate` label stays in the menus and the footer.
 *
 * It is rendered as a plain navigation link, not a filled button, and it is left
 * out of the row for the languages named in `hiddenIn` (English). Those readers
 * still reach the page through "More", the mobile drawer and the footer.
 */
export const getDonateCta = (t) => ({
  to: '/donate',
  label: t.navSupport || t.navDonate || 'Support Us',
  icon: Gift,
  after: '/gallery',
  protected: true,
  hiddenIn: ['en'],
});

export const LANGUAGES = [
  { code: 'en', native: 'English', short: 'EN' },
  { code: 'ne', native: 'नेपाली', short: 'ने' },
  { code: 'hi', native: 'हिन्दी', short: 'हि' },
  { code: 'zh', native: '中文', short: '中' },
  { code: 'ta', native: 'தமிழ்', short: 'த' },
];
