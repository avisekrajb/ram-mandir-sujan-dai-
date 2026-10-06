/**
 * Ctrl/Cmd+K jump-to for the admin panel: type to find a page, a quick action
 * or a person. Only offers what the signed-in admin may open.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeft, History, KeyRound, Search, UserPlus, Users as UsersIcon } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { hasArea } from '../../utils/permissions';
import { getAdminPages } from './adminNav';
import { Avatar, RoleBadge, cx, useDebouncedValue } from './kit/kit';
import { pushOverlay, popOverlay, claimEscape } from './kit/overlayStack';

const norm = (s) => String(s || '').toLowerCase();

const AdminCommandPalette = ({ open, onClose }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [people, setPeople] = useState([]);
  const q = useDebouncedValue(query.trim(), 250);
  const canSearchPeople = hasArea(user, 'users');

  const pages = useMemo(
    () => getAdminPages(t, user?.role === 'superadmin', user),
    [t, user]
  );

  const actions = useMemo(
    () => [
      canSearchPeople && { id: 'a-add', label: t.k7_addAccount || 'Add account', hint: t.k7_cmdAddHint || 'Create a user sign-in', icon: UserPlus, to: '/admin/users?add=1' },
      { id: 'a-audit', label: t.k7_auditLog || 'Audit log', hint: t.k7_cmdAuditHint || 'See who changed what', icon: History, to: '/admin/audit' },
      { id: 'a-pass', label: t.a1_settingsChangePassword || 'Change password', hint: t.k7_cmdPassHint || 'In My account', icon: KeyRound, to: '/admin/profile' },
    ].filter(Boolean),
    [t, canSearchPeople]
  );

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    setPeople([]);
    const id = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(id);
  }, [open]);

  // People search (only when there is something to look for).
  useEffect(() => {
    if (!open || !canSearchPeople || q.length < 2) { setPeople([]); return undefined; }
    let live = true;
    api.get('/admin/accounts', { params: { q, limit: 5 } })
      .then((res) => { if (live) setPeople(res.data.data || []); })
      .catch(() => { if (live) setPeople([]); });
    return () => { live = false; };
  }, [q, open, canSearchPeople]);

  const items = useMemo(() => {
    const term = norm(query.trim());
    const match = (x) => !term || norm(x.label).includes(term) || norm(x.section).includes(term) || norm(x.hint).includes(term);
    const pageItems = pages.filter(match).map((p) => ({ id: `p-${p.key}`, label: p.label, hint: p.section, icon: p.icon, to: `/admin/${p.key}` }));
    const actionItems = actions.filter(match);
    const peopleItems = people.map((p) => ({
      id: `u-${p._id}`, label: p.name || p.email, hint: p.email, person: p, to: `/admin/users?open=${p._id}`,
    }));
    return [
      ...(peopleItems.length ? [{ heading: t.k7_people || 'People' }, ...peopleItems] : []),
      ...(actionItems.length ? [{ heading: t.k7_quickActions || 'Quick actions' }, ...actionItems] : []),
      ...(pageItems.length ? [{ heading: t.k7_pages || 'Pages' }, ...pageItems] : []),
    ];
  }, [query, pages, actions, people, t]);

  const selectable = items.filter((i) => !i.heading);
  useEffect(() => { setActive(0); }, [query, people.length]);

  useEffect(() => {
    const el = listRef.current?.querySelector('[aria-selected="true"]');
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [active]);

  const go = (item) => {
    if (!item) return;
    onClose();
    navigate(item.to);
  };

  // Escape goes through the shared overlay stack so it closes only this palette,
  // not a drawer or dialog that happens to be open behind it.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const id = pushOverlay({ lock: false });
    const onEsc = (e) => { if (claimEscape(e, id)) { e.preventDefault(); closeRef.current(); } };
    document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('keydown', onEsc); popOverlay(id); };
  }, [open]);

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, selectable.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(selectable[active]); }
  };

  if (!open) return null;

  let idx = -1;
  return createPortal(
    <div className="fixed inset-0 z-[10100] flex items-start justify-center px-4 pt-[12vh]" role="presentation">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.k7_searchAdmin || 'Search the admin panel'}
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-white shadow-2xl"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search size={17} className="shrink-0 text-mute" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.k7_searchAdminPh || 'Go to a page, or find a person…'}
            role="combobox"
            aria-expanded="true"
            aria-controls="cmd-list"
            aria-activedescendant={selectable[active] ? `cmd-${selectable[active].id}` : undefined}
            className="h-14 min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-mute focus:outline-none"
          />
          <kbd className="hidden rounded-md border border-line px-1.5 py-0.5 text-[11px] font-medium text-mute sm:block">Esc</kbd>
        </div>

        <div ref={listRef} id="cmd-list" role="listbox" className="max-h-[52vh] overflow-y-auto p-2">
          {selectable.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-ink-soft">{t.k7_nothingFound || 'Nothing found'}</p>
          )}
          {items.map((it) => {
            if (it.heading) {
              return <p key={`h-${it.heading}`} className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-mute">{it.heading}</p>;
            }
            idx += 1;
            const on = idx === active;
            const Icon = it.icon || UsersIcon;
            const myIdx = idx;
            return (
              <button
                key={it.id}
                id={`cmd-${it.id}`}
                type="button"
                role="option"
                aria-selected={on}
                onMouseMove={() => setActive(myIdx)}
                onClick={() => go(it)}
                className={cx('flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left', on ? 'bg-brand-50' : '')}
              >
                {it.person
                  ? <Avatar user={it.person} size={28} />
                  : <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-100 text-ink-soft"><Icon size={15} aria-hidden="true" /></span>}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{it.label}</span>
                  {it.hint && <span className="block truncate text-xs text-mute">{it.hint}</span>}
                </span>
                {it.person && <RoleBadge role={it.person.role} t={t} />}
                {on && <CornerDownLeft size={14} className="shrink-0 text-mute" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AdminCommandPalette;
