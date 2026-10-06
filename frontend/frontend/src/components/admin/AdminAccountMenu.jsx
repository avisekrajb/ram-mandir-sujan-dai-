import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, ExternalLink, History, LogOut, UserCog } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Avatar, RoleBadge, cx } from './kit/kit';

/** Avatar button in the top bar with the account dropdown. */
const AdminAccountMenu = () => {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const key = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', key); };
  }, [open]);

  const item = 'flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-ink transition-colors hover:bg-brand-50';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.k7_accountMenu || 'Account menu'}
        className="flex items-center gap-2 rounded-full border border-transparent py-1 pl-1 pr-2 transition-colors hover:border-line hover:bg-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vermilion/40"
      >
        <Avatar user={user} size={36} />
        <span className="hidden max-w-[140px] truncate text-sm font-medium text-ink md:block">{user?.name || 'Admin'}</span>
        <ChevronDown size={14} className={cx('hidden text-mute transition-transform md:block', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 overflow-hidden rounded-xl border border-line bg-white shadow-lg">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-semibold text-ink">{user?.name}</p>
            <p className="truncate text-xs text-ink-soft">{user?.email}</p>
            <div className="mt-2"><RoleBadge role={user?.role} t={t} /></div>
          </div>
          <div className="py-1">
            <Link role="menuitem" to="/admin/profile" onClick={() => setOpen(false)} className={item}>
              <UserCog size={16} className="text-mute" aria-hidden="true" />{t.k7_myAccount || 'My account'}
            </Link>
            <Link role="menuitem" to="/admin/audit" onClick={() => setOpen(false)} className={item}>
              <History size={16} className="text-mute" aria-hidden="true" />{t.k7_auditLog || 'Audit log'}
            </Link>
            <Link role="menuitem" to="/" onClick={() => setOpen(false)} className={item}>
              <ExternalLink size={16} className="text-mute" aria-hidden="true" />{t.k7_viewSite || 'View website'}
            </Link>
          </div>
          <div className="border-t border-line py-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); logout(); navigate('/'); }}
              className={cx(item, 'text-red-600 hover:bg-red-50')}
            >
              <LogOut size={16} aria-hidden="true" />{t.logout || 'Log Out'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAccountMenu;
