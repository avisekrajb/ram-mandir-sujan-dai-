import React from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, ClipboardList, LayoutDashboard, LogIn, LogOut, User, UserPlus } from 'lucide-react';
import Dropdown from './Dropdown';

export const Avatar = ({ user, className = 'h-10 w-10 text-sm' }) => (
  <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-vermilion font-bold text-white ${className}`}>
    {user.profilePhoto ? (
      <img src={user.profilePhoto} alt="" className="h-full w-full object-cover" />
    ) : (
      (user.name || '?').charAt(0).toUpperCase()
    )}
  </span>
);

/** Signed-in: profile summary + links + logout. Visitor: login / sign up. */
const AccountMenu = ({ user, isAdmin, t, onLogin, onSignup, onLogout, small = false }) => (
  <Dropdown
    align="right"
    panelClassName="min-w-[15rem]"
    trigger={({ open, toggle }) => (
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.accountMenu || 'Account menu'}
        className={user
          ? `flex items-center justify-center rounded-full ring-2 ring-transparent transition hover:ring-brand-200 ${small ? 'h-9 w-9' : 'h-11 w-11'}`
          : `icon-btn ${small ? '!h-9 !min-w-0 w-9' : 'w-11'}`}
      >
        {user ? <Avatar user={user} className={small ? 'h-8 w-8 text-xs' : undefined} /> : <User size={small ? 16 : 18} aria-hidden="true" />}
      </button>
    )}
  >
    {(close) =>
      user ? (
        <>
          <div className="flex items-center gap-3 border-b border-line px-3 pb-3 pt-2">
            <Avatar user={user} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
              <p className="truncate text-xs text-ink-soft">{user.email}</p>
              {isAdmin && (
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-vermilion">
                  <BadgeCheck size={12} aria-hidden="true" /> {t.administrator || 'Administrator'}
                </span>
              )}
            </div>
          </div>
          <div className="py-1">
            {isAdmin ? (
              <Link to="/admin" role="menuitem" onClick={close} className="menu-item">
                <LayoutDashboard size={16} className="text-vermilion" aria-hidden="true" /> {t.adminDashboard || 'Admin Dashboard'}
              </Link>
            ) : (
              <>
                <Link to="/profile" role="menuitem" onClick={close} className="menu-item">
                  <User size={16} className="text-vermilion" aria-hidden="true" /> {t.profile || 'Profile'}
                </Link>
                <Link to="/mybookings" role="menuitem" onClick={close} className="menu-item">
                  <ClipboardList size={16} className="text-vermilion" aria-hidden="true" /> {t.myBookings || 'My Bookings'}
                </Link>
              </>
            )}
          </div>
          <div className="border-t border-line pt-1">
            <button type="button" role="menuitem" onClick={() => { close(); onLogout(); }} className="menu-item text-red-600 hover:bg-red-50">
              <LogOut size={16} aria-hidden="true" /> {t.logout || 'Log Out'}
            </button>
          </div>
        </>
      ) : (
        <>
          <button type="button" role="menuitem" onClick={() => { close(); onLogin(); }} className="menu-item">
            <LogIn size={16} className="text-vermilion" aria-hidden="true" /> {t.login || 'Login'}
          </button>
          <button type="button" role="menuitem" onClick={() => { close(); onSignup(); }} className="menu-item">
            <UserPlus size={16} className="text-vermilion" aria-hidden="true" /> {t.signup || 'Sign Up'}
          </button>
        </>
      )
    }
  </Dropdown>
);

export default AccountMenu;
