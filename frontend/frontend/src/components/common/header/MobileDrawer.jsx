import React, { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { LogIn, LogOut, User, UserPlus, X, LayoutDashboard, ClipboardList } from 'lucide-react';
import { LANGUAGES } from './navConfig';
import { Avatar } from './AccountMenu';
import SiteLogo from './SiteLogo';
import TimeWeather from './TimeWeather';
import TextSizeButtons from './TextSizeMenu';
import SoundToggle from './SoundToggle';

const linkClass = ({ isActive }) =>
  `flex min-h-[48px] items-center gap-3 rounded-xl px-3 text-base font-medium transition-colors ${
    isActive ? 'bg-brand-50 text-vermilion' : 'text-ink hover:bg-panel'
  }`;

/**
 * Slide-in navigation panel for phones/tablets, and for desktop widths where
 * the full nav doesn't fit (long translated labels). Locks page
 * scroll while open, closes on Escape / backdrop tap / navigation, and moves
 * focus into the panel for keyboard and screen-reader users.
 */
const MobileDrawer = ({
  open, onClose, t, primary, more, settings, donate, lang, setLang, enabledLangs,
  user, isAdmin, onProtectedClick, onLogin, onSignup, onLogout,
}) => {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const renderLink = (item) => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        className={linkClass}
        onClick={(e) => {
          if (item.protected && !user) {
            e.preventDefault();
            onProtectedClick();
          }
          onClose();
        }}
      >
        <Icon size={20} className="shrink-0 text-vermilion" aria-hidden="true" />
        <span>{item.label}</span>
      </NavLink>
    );
  };

  return (
    <div className={open ? '' : 'pointer-events-none'} aria-hidden={!open}>
      <div
        className={`fixed inset-0 z-[60] bg-ink/40 backdrop-blur-[2px] transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={t.menu || 'Menu'}
        className={`fixed inset-y-0 left-0 z-[61] flex w-[86vw] max-w-sm flex-col bg-white shadow-2xl outline-none transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-[72px] items-center justify-between border-b border-line px-4">
          <div className="min-w-0 flex-1 pr-2">
            <SiteLogo settings={settings} lang={lang} t={t} onNavigate={onClose} />
          </div>
          <button type="button" onClick={onClose} aria-label={t.close || 'Close'} className="icon-btn w-11">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-3" aria-label={t.mainNavigation || 'Main navigation'}>
          <div className="space-y-0.5">
            {primary.map((item) =>
              item.children ? (
                <div key={item.id} className="pt-1">
                  {item.children.map(renderLink)}
                </div>
              ) : (
                renderLink(item)
              )
            )}
          </div>

          <p className="mt-4 px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">{t.a5_tools || 'Tools'}</p>
          <div className="px-1 pb-2">
            <TimeWeather t={t} lang={lang} />
          </div>
          <div className="space-y-0.5">
            {more.map(renderLink)}
            <SoundToggle t={t} variant="row" />
          </div>

          <TextSizeButtons t={t} className="mt-4 px-3" />

          {enabledLangs.length > 1 && (
            <>
              <p className="mt-4 px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">{t.language || 'Language'}</p>
              <div className="flex flex-wrap gap-2 px-3" role="radiogroup" aria-label={t.language || 'Language'}>
                {LANGUAGES.filter((l) => enabledLangs.includes(l.code)).map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    role="radio"
                    aria-checked={lang === l.code}
                    lang={l.code}
                    onClick={() => setLang(l.code)}
                    className={`min-h-[44px] rounded-full border px-4 text-sm font-medium transition-colors ${
                      lang === l.code ? 'border-vermilion bg-vermilion text-white' : 'border-line text-ink hover:border-vermilion'
                    }`}
                  >
                    {l.native}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="mt-5 border-t border-line pt-3">
            {user ? (
              <>
                <div className="flex items-center gap-3 px-3 pb-2">
                  <Avatar user={user} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
                    <p className="truncate text-xs text-ink-soft">{user.email}</p>
                  </div>
                </div>
                {isAdmin
                  ? renderLink({ to: '/admin', label: t.adminDashboard || 'Admin Dashboard', icon: LayoutDashboard })
                  : (
                    <>
                      {renderLink({ to: '/profile', label: t.profile || 'Profile', icon: User })}
                      {renderLink({ to: '/mybookings', label: t.myBookings || 'My Bookings', icon: ClipboardList })}
                    </>
                  )}
                <button type="button" onClick={() => { onClose(); onLogout(); }} className="flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 text-base font-medium text-red-600 hover:bg-red-50">
                  <LogOut size={20} aria-hidden="true" /> {t.logout || 'Log Out'}
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2 px-1">
                <button type="button" onClick={() => { onClose(); onLogin(); }} className="btn-outline">
                  <LogIn size={18} aria-hidden="true" /> {t.login || 'Login'}
                </button>
                <button type="button" onClick={() => { onClose(); onSignup(); }} className="btn-outline">
                  <UserPlus size={18} aria-hidden="true" /> {t.signup || 'Sign Up'}
                </button>
              </div>
            )}
          </div>
        </nav>

        <div className="border-t border-line p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <NavLink
            to={donate.to}
            onClick={(e) => {
              if (!user) {
                e.preventDefault();
                onProtectedClick();
              }
              onClose();
            }}
            className="btn-donate w-full"
          >
            {donate.label}
          </NavLink>
        </div>
      </aside>
    </div>
  );
};

export default MobileDrawer;
