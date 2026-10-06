import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LogOut, Menu } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import useEnabledLanguages from '../../hooks/useEnabledLanguages';
import useSiteSettings from '../../hooks/useSiteSettings';
import SiteLogo from './header/SiteLogo';
import Dropdown from './header/Dropdown';
import LanguageMenu from './header/LanguageMenu';
import AccountMenu from './header/AccountMenu';
import SoundToggle from './header/SoundToggle';
import MobileDrawer from './header/MobileDrawer';
import { getDonateCta, getDonateNav, getPrimaryNav, getToolsNav } from './header/navConfig';

const navLinkClass = ({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`;

// Book Puja, Calendar and Tools sit in the "More" menu so the main row stays short.
const MORE_PATHS = ['/booking', '/calendar', '/tools'];
// History and Gallery move into "More" below 1280px to leave room for the larger type.
const LAPTOP_MORE_PATHS = ['/history', '/gallery'];

/**
 * Site header: one sticky white row.
 *  - Large screens: logo + temple name (left), main navigation (centre),
 *    language and account (right).
 *  - Phones/tablets: menu button, logo + name, account; everything else is in
 *    the slide-in drawer. If the links don't fit (e.g. long Tamil labels) the
 *    menu button comes back on large screens too.
 * Nothing here scales with the reader's text-size setting (see .rt-site-header
 * in index.css): every size is in rem and the header is un-zoomed, so the
 * temple name always stays on one line.
 */
const Header = ({ onLogout, setAuthModal }) => {
  const { t, lang, setLang } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const location = useLocation();
  const settings = useSiteSettings();
  const enabledLangs = useEnabledLanguages();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [navOverflow, setNavOverflow] = useState(false);
  const navRef = useRef(null);
  const navInnerRef = useRef(null);
  const menuBtnRef = useRef(null);

  const primary = useMemo(() => getPrimaryNav(t), [t]);
  const tools = useMemo(() => getToolsNav(t), [t]);
  const donate = useMemo(() => getDonateNav(t), [t]);
  const donateCta = useMemo(() => getDonateCta(t), [t]);
  const moreItems = useMemo(() => primary.filter((item) => MORE_PATHS.includes(item.to)), [primary]);
  const laptopMoreItems = useMemo(() => primary.filter((item) => LAPTOP_MORE_PATHS.includes(item.to)), [primary]);

  /*
   * The row-overflow fallback swaps the whole navigation for the menu button.
   * Only Tamil needs it: its labels are by far the longest, and every other
   * language fits. Without this the button also appeared in English at laptop
   * widths, which reads as a phone layout on a desktop.
   *
   * Keeping the row visible in the other languages is safe because the donate
   * call to action only joins the row from 1280px (xl) up, and Gallery / History
   * move into "More" below that, so the row is no wider than it was before.
   */
  const menuFallback = navOverflow && lang === 'ta';

  /*
   * Admin → Header can hide each part of the row. Read as `!== false`, so a
   * settings document that predates these switches leaves the row untouched
   * rather than stripping it.
   */
  const part = (key) => !settings || settings.header?.[key]?.enabled !== false;
  const showLogo = part('logo');
  const showMainNav = part('mainNav');
  const showSound = part('sound');
  const showLanguage = part('language');
  const showAccount = part('account');

  // Does the link row fit? If not, fall back to the menu button. While the
  // button is showing it takes room from the row, so count that as available.
  useLayoutEffect(() => {
    const nav = navRef.current;
    const inner = navInnerRef.current;
    if (!nav || !inner || typeof ResizeObserver === 'undefined') return undefined;
    const check = () => {
      const btn = menuBtnRef.current;
      const reclaim = btn && getComputedStyle(btn).display !== 'none' && window.matchMedia('(min-width: 1024px)').matches ? btn.offsetWidth + 12 : 0;
      setNavOverflow(inner.scrollWidth > nav.clientWidth + reclaim + 1);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(nav);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [lang]);

  // Close the drawer whenever the route changes (incl. browser back/forward).
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const openLogin = useCallback(() => setAuthModal('login'), [setAuthModal]);
  const openSignup = useCallback(() => setAuthModal('signup'), [setAuthModal]);

  // Booking/Donate need an account: visitors get the login dialog instead.
  const guardProtected = (item) => (e) => {
    if (item.protected && !user) {
      e.preventDefault();
      openLogin();
    }
  };

  const isAboutActive = ['/about', '/templeteams'].includes(location.pathname);
  const isMoreActive = [...moreItems, ...laptopMoreItems].some((item) => item.to === location.pathname);

  return (
    <>
      <header className="rt-site-header sticky top-0 z-50 border-b border-t-2 border-b-line border-t-vermilion bg-white/95 backdrop-blur-md">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-[70] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-rt">
          {t.skipToContent || 'Skip to content'}
        </a>
        <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center gap-3 px-4 sm:px-6 lg:h-[5.5rem]">
          <button
            ref={menuBtnRef}
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label={t.openMenu || 'Open menu'}
            aria-expanded={drawerOpen}
            className={`icon-btn w-11 shrink-0 ${menuFallback ? '' : 'lg:hidden'}`}
          >
            <Menu size={20} aria-hidden="true" />
          </button>

          {showLogo && (
            <div className="min-w-0 flex-1 lg:flex-none">
              <SiteLogo settings={settings} lang={lang} t={t} />
            </div>
          )}

          {/* Main navigation (large screens) */}
          {showMainNav && (
          <nav
            ref={navRef}
            className={`hidden min-w-0 flex-1 justify-center lg:flex ${menuFallback ? 'invisible' : ''}`}
            aria-label={t.mainNavigation || 'Main navigation'}
            aria-hidden={menuFallback || undefined}
          >
            <div ref={navInnerRef} className="flex w-max items-center gap-0.5">
              {primary.map((item) => {
                if (item.children) {
                  return (
                    <Dropdown key={item.id} label={item.label} active={isAboutActive}>
                      {(close) =>
                        item.children.map((child) => (
                          <NavLink key={child.to} to={child.to} role="menuitem" onClick={close} className="menu-item">
                            <child.icon size={16} className="text-vermilion" aria-hidden="true" /> {child.label}
                          </NavLink>
                        ))
                      }
                    </Dropdown>
                  );
                }
                if (MORE_PATHS.includes(item.to)) return null;
                const laptopMore = LAPTOP_MORE_PATHS.includes(item.to);
                return (
                  <React.Fragment key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={guardProtected(item)}
                      className={(state) => `${navLinkClass(state)} xl:!text-base ${laptopMore ? 'hidden xl:inline-flex' : ''}`}
                    >
                      {item.label}
                    </NavLink>
                    {/*
                      The donate call to action sits immediately after Gallery.
                      It is styled as an ordinary navigation link, not a filled
                      button: the solid red-brown pill made it read as an alarm
                      against the quiet row. It only joins the row from 1280px (xl),
                      the same width at which Gallery itself appears: below that
                      Gallery is in "More" and the row has no room to spare, which
                      is what pushed the menu button onto the desktop header.

                      Hidden for English. The link stays reachable for English
                      readers through "More", the mobile drawer and the footer, so
                      nothing is taken away from them.
                    */}
                    {item.to === donateCta.after && !donateCta.hiddenIn.includes(lang) && (
                      <NavLink
                        to={donateCta.to}
                        onClick={guardProtected(donateCta)}
                        className={(state) => `${navLinkClass(state)} hidden xl:inline-flex`}
                      >
                        {donateCta.label}
                      </NavLink>
                    )}
                  </React.Fragment>
                );
              })}
              <Dropdown label={t.more || 'More'} active={isMoreActive} align="right">
                {(close) =>
                  [
                    // The donate button joins the row at 1280px, so below that
                    // it rides in "More" instead of being missing altogether.
                    { item: donateCta, laptopOnly: true },
                    ...laptopMoreItems.map((item) => ({ item, laptopOnly: true })),
                    ...moreItems.map((item) => ({ item, laptopOnly: false })),
                  ].map(({ item, laptopOnly }) => (
                    <NavLink key={`${item.to}-${laptopOnly ? 'sm' : 'all'}`} to={item.to} role="menuitem" onClick={(e) => { guardProtected(item)(e); close(); }} className={`menu-item ${laptopOnly ? 'xl:hidden' : ''}`}>
                      <item.icon size={16} className="text-vermilion" aria-hidden="true" /> {item.label}
                    </NavLink>
                  ))
                }
              </Dropdown>
            </div>
          </nav>
          )}

          <div className="flex shrink-0 items-center gap-2">
            {showSound && <SoundToggle t={t} className="hidden lg:inline-flex" />}
            {showLanguage && enabledLangs.length > 1 && (
              <div className="hidden lg:block">
                <LanguageMenu lang={lang} setLang={setLang} enabled={enabledLangs} label={t.language || 'Language'} />
              </div>
            )}
            {showAccount && (
            <AccountMenu
              user={user}
              isAdmin={isAdmin}
              t={t}
              onLogin={openLogin}
              onSignup={openSignup}
              onLogout={() => setLogoutConfirmOpen(true)}
            />
            )}
          </div>
        </div>
      </header>

      <MobileDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        t={t}
        primary={primary}
        more={tools}
        settings={settings}
        donate={donate}
        lang={lang}
        setLang={setLang}
        enabledLangs={enabledLangs}
        user={user}
        isAdmin={isAdmin}
        onProtectedClick={openLogin}
        onLogin={openLogin}
        onSignup={openSignup}
        onLogout={() => setLogoutConfirmOpen(true)}
      />

      {logoutConfirmOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="logout-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
              <LogOut size={28} className="text-red-600" aria-hidden="true" />
            </div>
            <h3 id="logout-title" className="mb-2 font-serif text-xl font-bold text-ink">{t.logout || 'Log Out'}</h3>
            <p className="mb-6 text-sm text-ink-soft">{t.logoutPromptMsg || 'Are you sure you want to logout?'}</p>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setLogoutConfirmOpen(false)} className="btn-outline flex-1">
                {t.notNow || 'Not Now'}
              </button>
              <button
                type="button"
                onClick={() => { setLogoutConfirmOpen(false); onLogout(); }}
                className="inline-flex min-h-[2.75rem] flex-1 items-center justify-center rounded-full bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              >
                {t.yesLogout || 'Yes, Log Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
