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
 * The panel is glass: a translucent red-brown gradient in the temple's maroon
 * family, with a soft highlight that drifts across it on a 3-second loop. Because
 * the backdrop is dark, every label here is light. The sheen stops entirely for
 * anyone who has asked for reduced motion - see .admin-sidebar-sheen in the style
 * block at the bottom.
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

  // Every control sits on the dark glass panel, so the resting states are light
  // and hover is a white wash rather than the grey the site uses on white.
  const itemClass = ({ isActive }) =>
    `group relative flex min-h-[42px] w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-150 ${
      slim ? 'lg:justify-center lg:px-0' : ''
    } ${isActive ? 'bg-white/15 text-white shadow-sm' : 'text-white/75 hover:bg-white/10 hover:text-white'}`;

  const labelCls = slim ? 'lg:hidden' : '';

  return (
    <>
      <aside
        className={`admin-sidebar fixed inset-y-0 left-0 z-50 flex h-screen w-72 flex-shrink-0 flex-col overflow-hidden border-r border-white/10 shadow-2xl backdrop-blur-xl transition-[transform,width] duration-300 ease-out lg:static lg:translate-x-0 lg:shadow-none ${
          slim ? 'lg:w-[76px]' : 'lg:w-72'
        } ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label={t.adminDashboard || 'Admin navigation'}
      >
        {/* Red-brown glass: the gradient is the panel, and the sheen drifts over it. */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#5C0F0C] via-[#4A0605] to-[#5A3320]" aria-hidden="true" />
        <div className="admin-sidebar-sheen pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-y-0 left-0 -z-10 w-px bg-white/15" aria-hidden="true" />

        {/* Brand: same height as the top bar */}
        <div className={`flex h-[72px] flex-shrink-0 items-center gap-3 border-b border-white/10 px-4 ${slim ? 'lg:justify-center lg:px-0' : ''}`}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 ring-1 ring-white/25">
            {logoPhoto ? (
              <img src={sizedLogo(logoPhoto)} alt="" className="h-full w-full object-cover" />
            ) : (
              <TempleIcon size={20} className="text-marigold" />
            )}
          </span>
          <div className={`min-w-0 flex-1 ${labelCls}`}>
            <p className="truncate font-serif text-base font-bold text-white">{t.adminDashboard || 'Admin Dashboard'}</p>
            <p className="flex items-center gap-1 truncate text-xs text-white/70">
              <Shield size={12} className="shrink-0 text-marigold" aria-hidden="true" />
              {isSuperAdmin ? (t.superAdmin || 'Super Admin') : (t.administrator || 'Administrator')}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label={t.close || 'Close'} className="icon-btn w-11 text-white/80 hover:bg-white/10 hover:text-white lg:hidden">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <nav className={`sidebar-scroll flex-1 space-y-3 overflow-y-auto px-3 py-4 ${slim ? 'lg:px-2' : ''}`}>
          {/* Phones have no room for the top-bar search, and no Ctrl+K: it lives here. */}
          {onSearch && (
            <button
              type="button"
              onClick={() => { onClose?.(); onSearch(); }}
              className="flex min-h-[42px] w-full items-center gap-3 rounded-lg border border-white/15 bg-white/10 px-3 text-sm text-white/85 transition-colors hover:bg-white/15 hover:text-white md:hidden"
            >
              <Search size={17} aria-hidden="true" />
              {t.k7_searchAdminPh || 'Go to a page, or find a person…'}
            </button>
          )}
          {sections.map((section) => {
            const SectionIcon = section.icon;
            const open = section.flat || !collapsed[section.id];
            return (
              <div key={section.id}>
                {!section.flat && (
                  <>
                    <button
                      type="button"
                      onClick={() => setCollapsed((c) => ({ ...c, [section.id]: open }))}
                      aria-expanded={open}
                      className={`flex min-h-[34px] w-full items-center justify-between rounded-lg px-3 text-xs font-semibold uppercase tracking-wider text-white/60 transition-colors hover:bg-white/10 hover:text-white ${slim ? 'lg:hidden' : ''}`}
                    >
                      <span className="flex items-center gap-2">
                        <SectionIcon size={14} aria-hidden="true" /> {section.label}
                      </span>
                      <ChevronDown size={14} aria-hidden="true" className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                    </button>
                    {slim && <div className="mx-3 mb-2 hidden border-t border-white/10 lg:block" aria-hidden="true" />}
                  </>
                )}
                {(open || slim) && (
                  <div className={`space-y-0.5 ${section.flat ? '' : 'mt-1'} ${!open && slim ? 'lg:block hidden' : ''}`}>
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
                              {isActive && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-marigold" aria-hidden="true" />}
                              <Icon size={18} aria-hidden="true" className={`shrink-0 ${isActive ? 'text-marigold' : 'text-white/60 group-hover:text-white'}`} />
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

        <div className={`flex-shrink-0 space-y-1 border-t border-white/10 p-3 ${slim ? 'lg:px-2' : ''}`}>
          <NavLink
            to="/"
            title={slim ? (t.navGoHome || 'Back to Site') : undefined}
            aria-label={slim ? (t.navGoHome || 'Back to Site') : undefined}
            className={`flex min-h-[42px] w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-white/75 transition-colors hover:bg-white/10 hover:text-white ${slim ? 'lg:justify-center lg:px-0' : ''}`}
          >
            <ArrowLeft size={18} aria-hidden="true" /> <span className={labelCls}>{t.navGoHome || 'Back to Site'}</span>
          </NavLink>
          <button
            type="button"
            onClick={handleLogout}
            title={slim ? (t.logout || 'Log Out') : undefined}
            aria-label={slim ? (t.logout || 'Log Out') : undefined}
            className={`flex min-h-[42px] w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-red-200 transition-colors hover:bg-white/10 hover:text-red-100 ${slim ? 'lg:justify-center lg:px-0' : ''}`}
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
              className={`hidden min-h-[42px] w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white lg:flex ${slim ? 'lg:justify-center lg:px-0' : ''}`}
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

        /* The drifting highlight on the glass panel. A single soft band travels
           across the sidebar and fades in and out over a 3 second loop, so the
           panel reads as lit rather than as a looping animation. */
        @keyframes adminSidebarSheen {
          0%   { transform: translate3d(-60%, -20%, 0) rotate(12deg); opacity: 0; }
          20%  { opacity: 0.55; }
          50%  { opacity: 0.75; }
          80%  { opacity: 0.55; }
          100% { transform: translate3d(160%, 60%, 0) rotate(12deg); opacity: 0; }
        }
        .admin-sidebar-sheen {
          background: linear-gradient(
            100deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 236, 214, 0.30) 45%,
            rgba(255, 255, 255, 0) 90%
          );
          will-change: transform, opacity;
          animation: adminSidebarSheen 3s ease-in-out infinite;
        }
        /* A fixed, calm highlight for anyone who has asked for less motion: the
           panel keeps its sheen, it simply stops moving. */
        @media (prefers-reduced-motion: reduce) {
          .admin-sidebar-sheen {
            animation: none;
            opacity: 0.4;
            transform: none;
          }
        }
      `}</style>
    </>
  );
};

export default AdminSidebar;
