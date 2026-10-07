import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, LogOut, PanelLeftClose, PanelLeftOpen, Search, Shield, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import useSiteSettings from '../../hooks/useSiteSettings';
import TempleIcon from '../common/TempleIcon';
import { getAdminSections } from './adminNav';

const sizedLogo = (url) => (url && url.includes('/upload/') ? url.replace('/upload/', '/upload/w_120,q_auto,f_auto/') : url);

/**
 * Admin sidebar: a static column on lg+ (full width, or a slim icon rail when
 * collapsed) and a slide-in drawer below lg (closes on navigation, backdrop tap
 * or Escape). Header height matches the 72px top bar. Only the pages the
 * signed-in admin may open are listed.
 *
 * The panel itself is plain and light, so the red-brown title and group headings
 * stay readable. The colour on this sidebar is the flame: each page button carries
 * a soft gas-flame glow, blue at the base warming to amber, pulsing on a 3-second
 * loop. The glow sits behind the label, never over it, and stops entirely for
 * anyone who has asked for reduced motion - see .admin-flame at the bottom of
 * this file.
 */
const AdminSidebar = ({ isOpen, onClose, rail = false, onToggleRail, onSearch }) => {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const settings = useSiteSettings();
  const [collapsed, setCollapsed] = useState({});
  const isSuperAdmin = user?.role === 'superadmin';
  const sections = getAdminSections(t, isSuperAdmin, user);
  const logoPhoto = settings?.logo?.photo || null;

  // The rail only exists on lg+; the mobile drawer is always the full sidebar.
  const slim = rail;

  // Close the mobile drawer on route change and on Escape.
  useEffect(() => {
    if (onClose) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- close only when the route changes
  }, [location.pathname]);
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && onClose) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // The page buttons carry the flame glow (see .admin-flame). Everything else on
  // the panel uses the site's own palette: ink for labels, the pale brand tint for
  // hover, and red-brown to mark where you are.
  const itemClass = ({ isActive }) =>
    `admin-flame group relative flex min-h-[42px] w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-150 ${
      slim ? 'lg:justify-center lg:px-0' : ''
    } ${isActive ? 'bg-brand-50 text-vermilion' : 'text-ink-soft hover:bg-panel hover:text-ink'}`;

  const labelCls = slim ? 'lg:hidden' : '';

  return (
    <>
      <aside
        className={`admin-sidebar fixed inset-y-0 left-0 z-50 flex h-screen w-72 flex-shrink-0 flex-col overflow-hidden border-r border-line bg-white shadow-2xl transition-[transform,width] duration-300 ease-out lg:static lg:translate-x-0 lg:shadow-none ${
          slim ? 'lg:w-[76px]' : 'lg:w-72'
        } ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label={t.adminDashboard || 'Admin navigation'}
      >
        {/* No tinted background here on purpose: the colour on this panel is the
            flame glow on the buttons below, not a red-brown fill behind the text. */}

        {/* Brand: same height as the top bar */}
        <div className={`flex h-[72px] flex-shrink-0 items-center gap-3 border-b border-line px-4 ${slim ? 'lg:justify-center lg:px-0' : ''}`}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-line">
            {logoPhoto ? (
              <img src={sizedLogo(logoPhoto)} alt="" className="h-full w-full object-cover" />
            ) : (
              <TempleIcon size={20} className="text-vermilion" />
            )}
          </span>
          <div className={`min-w-0 flex-1 ${labelCls}`}>
            <p className="truncate font-serif text-base font-bold text-maroon">{t.adminDashboard || 'Admin Dashboard'}</p>
            <p className="flex items-center gap-1 truncate text-xs text-ink-soft">
              <Shield size={12} className="shrink-0 text-vermilion" aria-hidden="true" />
              {isSuperAdmin ? (t.superAdmin || 'Super Admin') : (t.administrator || 'Administrator')}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label={t.close || 'Close'} className="icon-btn w-11 lg:hidden">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <nav className={`sidebar-scroll flex-1 space-y-3 overflow-y-auto px-3 py-4 ${slim ? 'lg:px-2' : ''}`}>
          {/* Phones have no room for the top-bar search, and no Ctrl+K: it lives here. */}
          {onSearch && (
            <button
              type="button"
              onClick={() => { onClose?.(); onSearch(); }}
              className="flex min-h-[42px] w-full items-center gap-3 rounded-lg border border-line bg-white px-3 text-sm text-mute transition-colors hover:border-brand-300 hover:text-ink md:hidden"
            >
              <Search size={17} aria-hidden="true" />
              {t.k7_searchAdminPh || 'Go to a page, or find a person…'}
            </button>
          )}
          {sections.map((section) => {
            const SectionIcon = section.icon;
            const open = !collapsed[section.id];
            return (
              <div key={section.id}>
                {section.label && (
                  <>
                    <button
                      type="button"
                      onClick={() => setCollapsed((c) => ({ ...c, [section.id]: open }))}
                      aria-expanded={open}
                      className={`flex min-h-[34px] w-full items-center justify-between rounded-lg px-3 text-xs font-bold uppercase tracking-wider text-maroon transition-colors hover:bg-panel hover:text-vermilion ${slim ? 'lg:hidden' : ''}`}
                    >
                      <span className="flex items-center gap-2">
                        <SectionIcon size={14} aria-hidden="true" /> {section.label}
                      </span>
                      <ChevronDown size={14} aria-hidden="true" className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                    </button>
                    {slim && <div className="mx-3 mb-2 hidden border-t border-line lg:block" aria-hidden="true" />}
                  </>
                )}
                {(open || slim) && (
                  /* A hairline under each heading, so the five groups are countable at a
                     glance. brand-400 rather than the usual border-line: this rule
                     carries meaning (it separates one group from the next) and
                     #ECE5E4 sits at 1.24:1 on the white sheet where 3:1 is needed.
                     It has to stay solid too - brand-400 at 60% falls to 2.26:1.
                     Skipped in the icon rail, which has its own divider already. */
                  <div
                    className={`space-y-0.5 ${
                      section.label ? (slim ? 'mt-1' : 'mt-1 border-t border-brand-400 pt-1.5') : ''
                    } ${!open && slim ? 'lg:block hidden' : ''}`}
                  >
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.key}
                          to={`/admin/${item.key}`}
                          end={item.key === 'events' || item.key === 'bookings'}
                          className={itemClass}
                          title={slim ? item.label : undefined}
                          aria-label={slim ? item.label : undefined}
                        >
                          {({ isActive }) => (
                            <>
                              {isActive && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-vermilion" aria-hidden="true" />}
                              <Icon size={18} aria-hidden="true" className={`shrink-0 ${isActive ? 'text-vermilion' : 'text-mute group-hover:text-ink'}`} />
                              <span className={`flex-1 truncate ${labelCls}`}>{item.label}</span>
                            </>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className={`flex-shrink-0 space-y-1 border-t border-line p-3 ${slim ? 'lg:px-2' : ''}`}>
          <NavLink
            to="/"
            title={slim ? (t.navGoHome || 'Back to Site') : undefined}
            aria-label={slim ? (t.navGoHome || 'Back to Site') : undefined}
            className={`flex min-h-[42px] w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-ink-soft transition-colors hover:bg-panel hover:text-ink ${slim ? 'lg:justify-center lg:px-0' : ''}`}
          >
            <ArrowLeft size={18} aria-hidden="true" /> <span className={labelCls}>{t.navGoHome || 'Back to Site'}</span>
          </NavLink>
          <button
            type="button"
            onClick={handleLogout}
            title={slim ? (t.logout || 'Log Out') : undefined}
            aria-label={slim ? (t.logout || 'Log Out') : undefined}
            className={`flex min-h-[42px] w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 ${slim ? 'lg:justify-center lg:px-0' : ''}`}
          >
            <LogOut size={18} aria-hidden="true" /> <span className={labelCls}>{t.logout || 'Log Out'}</span>
          </button>
          {onToggleRail && (
            <button
              type="button"
              onClick={onToggleRail}
              aria-pressed={slim}
              title={slim ? (t.k7_expandSidebar || 'Expand sidebar') : (t.k7_collapseSidebar || 'Collapse sidebar')}
              aria-label={slim ? (t.k7_expandSidebar || 'Expand sidebar') : (t.k7_collapseSidebar || 'Collapse sidebar')}
              className={`hidden min-h-[42px] w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-mute transition-colors hover:bg-panel hover:text-ink lg:flex ${slim ? 'lg:justify-center lg:px-0' : ''}`}
            >
              {slim ? <PanelLeftOpen size={18} aria-hidden="true" /> : <PanelLeftClose size={18} aria-hidden="true" />}
              <span className={labelCls}>{t.k7_collapseSidebar || 'Collapse sidebar'}</span>
            </button>
          )}
        </div>
      </aside>

      {/* Backdrop (mobile drawer) */}
      <div
        className={`fixed inset-0 z-40 bg-ink/40 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <style>{`
        .sidebar-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        .sidebar-scroll::-webkit-scrollbar { width: 0; display: none; }

        /* The gas-flame glow on each page button: a gas burner's blue cone at the
           base warming through to amber at the tip, blurred into a soft halo. It is
           drawn on ::before with a negative z-index inside an isolated button, so it
           sits behind the label and can never wash the text out. Peaks at 0.34 so it
           reads as a glow rather than a colour change - this panel is open all day. */
        @keyframes adminFlame {
          0%, 100% { opacity: 0; }
          50%      { opacity: 0.34; }
        }
        .admin-flame { isolation: isolate; }
        .admin-flame::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: inherit;
          background: linear-gradient(
            100deg,
            rgba(37, 99, 235, 0.55) 0%,     /* blue cone   */
            rgba(56, 189, 248, 0.45) 32%,    /* cyan        */
            rgba(245, 158, 11, 0.50) 72%,    /* amber       */
            rgba(251, 191, 36, 0.42) 100%    /* yellow tip  */
          );
          filter: blur(9px);
          opacity: 0;
          z-index: -1;
          pointer-events: none;
          will-change: opacity;
          animation: adminFlame 3s ease-in-out infinite;
        }
        /* The active page already has a tint of its own, so its flame is dimmer and
           the two do not fight. */
        .admin-flame.bg-brand-50::before { animation-name: adminFlameActive; }
        @keyframes adminFlameActive {
          0%, 100% { opacity: 0; }
          50%      { opacity: 0.18; }
        }
        /* No motion for anyone who has asked for less of it: the flame is simply
           absent, and the labels carry the colour on their own. */
        @media (prefers-reduced-motion: reduce) {
          .admin-flame::before { animation: none; opacity: 0; }
        }
      `}</style>
    </>
  );
};

export default AdminSidebar;
