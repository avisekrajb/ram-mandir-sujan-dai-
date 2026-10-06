/**
 * Small building blocks shared by the account-management pages of the admin
 * panel. Flat look on purpose: thin warm border, rounded corners, the logo red
 * only as an accent (see tailwind.config.js for the palette).
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft, ChevronRight, Crown, Loader2, MoreHorizontal, Search, Shield, User, X,
} from 'lucide-react';
import { formatDate as formatLocaleDate } from '../../../utils/formatDate';
import { useLanguage } from '../../../context/LanguageContext';
import { pushOverlay, popOverlay, claimEscape } from './overlayStack';

/* ------------------------------------------------------------------ */
/* Hooks / helpers                                                     */
/* ------------------------------------------------------------------ */

export const useDebouncedValue = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
};

/** "5m ago" style text; falls back to a locale date after a week. */
export const timeAgo = (value, t = {}, lang = 'en') => {
  if (!value) return '';
  const then = new Date(value);
  if (Number.isNaN(then.getTime())) return '';
  const mins = Math.floor((Date.now() - then.getTime()) / 60000);
  if (mins < 1) return t.a1_notifJustNow || 'Just now';
  if (mins < 60) return (t.a1_notifMinutesAgo || '{n}m ago').replace('{n}', mins);
  const hours = Math.floor(mins / 60);
  if (hours < 24) return (t.a1_notifHoursAgo || '{n}h ago').replace('{n}', hours);
  const days = Math.floor(hours / 24);
  if (days < 7) return (t.a1_notifDaysAgo || '{n}d ago').replace('{n}', days);
  return formatLocaleDate(then, lang, { year: 'numeric', month: 'short', day: 'numeric' });
};

export const fullDate = (value, lang = 'en') => {
  if (!value) return '';
  return formatLocaleDate(value, lang, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

export const cx = (...parts) => parts.filter(Boolean).join(' ');

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

// The admin top bar already shows the page title, so the title here is for screen
// readers only; the visible header is the one-line description plus the actions.
export const PageHeader = ({ title, description, actions, className = '' }) => (
  <div className={cx('mb-5 flex flex-wrap items-end justify-between gap-3', className)}>
    <div className="min-w-0">
      <h2 className="sr-only">{title}</h2>
      {description && <p className="max-w-2xl text-sm text-ink-soft">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export const Panel = ({ className = '', children, ...rest }) => (
  <div className={cx('rounded-xl border border-line bg-white', className)} {...rest}>
    {children}
  </div>
);

export const PanelHeader = ({ title, description, actions, icon: Icon }) => (
  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
    <div className="flex min-w-0 items-center gap-2.5">
      {Icon && <Icon size={18} className="shrink-0 text-vermilion" aria-hidden="true" />}
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        {description && <p className="text-xs text-ink-soft">{description}</p>}
      </div>
    </div>
    {actions}
  </div>
);

export const StatTile = ({ label, value, hint, icon: Icon, onClick, active, tone = 'default' }) => {
  const Tag = onClick ? 'button' : 'div';
  const valueTone = { default: 'text-ink', danger: 'text-red-600', good: 'text-green-700' }[tone];
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={onClick ? !!active : undefined}
      className={cx(
        'rounded-xl border bg-white p-4 text-left transition-colors',
        active ? 'border-vermilion ring-1 ring-vermilion/30' : 'border-line',
        onClick && !active && 'hover:border-brand-300'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase leading-tight tracking-wide text-ink-soft">{label}</p>
          <p className={cx('mt-1 font-serif text-2xl font-semibold', valueTone)}>{value}</p>
          {hint && <p className="mt-0.5 truncate text-xs text-mute">{hint}</p>}
        </div>
        {Icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-vermilion">
            <Icon size={17} aria-hidden="true" />
          </span>
        )}
      </div>
    </Tag>
  );
};

export const EmptyState = ({ icon: Icon, title, text, action }) => (
  <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
    {Icon && (
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-400">
        <Icon size={22} aria-hidden="true" />
      </span>
    )}
    <p className="text-sm font-semibold text-ink">{title}</p>
    {text && <p className="mt-1 max-w-sm text-sm text-ink-soft">{text}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const Skeleton = ({ className = '' }) => (
  <div className={cx('animate-pulse rounded-md bg-gray-100', className)} aria-hidden="true" />
);

/* ------------------------------------------------------------------ */
/* Badges & avatar                                                     */
/* ------------------------------------------------------------------ */

const PILL_TONES = {
  neutral: 'border-line bg-gray-50 text-ink-soft',
  red: 'border-brand-200 bg-brand-50 text-vermilion',
  green: 'border-green-200 bg-green-50 text-green-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  blue: 'border-sky-200 bg-sky-50 text-sky-700',
  danger: 'border-red-200 bg-red-50 text-red-600',
};

export const Pill = ({ tone = 'neutral', icon: Icon, children, className = '' }) => (
  <span
    className={cx(
      'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium',
      PILL_TONES[tone],
      className
    )}
  >
    {Icon && <Icon size={11} aria-hidden="true" />}
    {children}
  </span>
);

export const RoleBadge = ({ role, t = {} }) => {
  if (role === 'superadmin') return <Pill tone="red" icon={Crown}>{t.superAdmin || 'Super Admin'}</Pill>;
  if (role === 'admin') return <Pill tone="red" icon={Shield}>{t.a1_usersAdmin || 'Admin'}</Pill>;
  return <Pill icon={User}>{t.a1_usersUser || 'User'}</Pill>;
};

export const StatusBadge = ({ active, t = {} }) =>
  active ? (
    <Pill tone="green">{t.a1_usersActive || 'Active'}</Pill>
  ) : (
    <Pill tone="danger">{t.k7_suspended || 'Suspended'}</Pill>
  );

export const Avatar = ({ user, size = 36, className = '' }) => {
  const [broken, setBroken] = useState(false);
  // A new photo URL (list re-used for another person, or the photo replaced) gets a fresh try.
  useEffect(() => { setBroken(false); }, [user?.profilePhoto]);
  const initial = (user?.name || user?.email || '?').trim().charAt(0).toUpperCase();
  const dim = { width: size, height: size, fontSize: Math.max(12, Math.round(size * 0.4)) };
  return (
    <span
      style={dim}
      className={cx(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 font-semibold text-vermilion',
        className
      )}
    >
      {user?.profilePhoto && !broken ? (
        <img
          src={user.profilePhoto}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
          loading="lazy"
        />
      ) : (
        initial
      )}
    </span>
  );
};

/* ------------------------------------------------------------------ */
/* Form controls                                                       */
/* ------------------------------------------------------------------ */

export const inputCls =
  'h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink placeholder:text-mute transition-colors focus:border-vermilion focus:outline-none focus:ring-2 focus:ring-vermilion/15 disabled:bg-gray-50 disabled:text-mute';

export const Field = ({ label, hint, error, htmlFor, children, className = '' }) => (
  <div className={className}>
    {label && (
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold text-ink">
        {label}
      </label>
    )}
    {children}
    {error ? (
      <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>
    ) : (
      hint && <p className="mt-1 text-xs text-mute">{hint}</p>
    )}
  </div>
);

export const SearchBox = ({ value, onChange, placeholder, className = '', ...rest }) => {
  const { t } = useLanguage();
  return (
  <div className={cx('relative', className)}>
    <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" aria-hidden="true" />
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cx(inputCls, 'pl-9 pr-9')}
      {...rest}
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        aria-label={t.k7_clearSearch || 'Clear search'}
        className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-mute hover:bg-gray-100 hover:text-ink"
      >
        <X size={14} aria-hidden="true" />
      </button>
    )}
  </div>
  );
};

/** Row of mutually exclusive choices, e.g. All / Users / Admins. */
export const Segmented = ({ options, value, onChange, label }) => (
  <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-lg border border-line bg-gray-50 p-1">
    {options.map((o) => {
      const on = o.value === value;
      return (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={on}
          onClick={() => onChange(o.value)}
          className={cx(
            'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
            on ? 'bg-white text-vermilion shadow-sm ring-1 ring-line' : 'text-ink-soft hover:text-ink'
          )}
        >
          {o.label}
          {o.count !== undefined && <span className="ml-1.5 text-mute">{o.count}</span>}
        </button>
      );
    })}
  </div>
);

// Full width by default; a caller-supplied width class (w-auto, w-48...) replaces it
// (two width utilities on one element would be decided by stylesheet order, not by intent).
export const SelectBox = ({ className = '', children, ...rest }) => {
  const customWidth = /(^|\s)w-/.test(className);
  return (
    <select className={cx(customWidth ? inputCls.replace('w-full ', '') : inputCls, 'cursor-pointer pr-8', className)} {...rest}>
      {children}
    </select>
  );
};

export const Toggle = ({ checked, onChange, label, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={cx(
      'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vermilion/40 disabled:opacity-50',
      checked ? 'bg-vermilion' : 'bg-gray-300'
    )}
  >
    <span className={cx('inline-block h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
  </button>
);

export const Checkbox = ({ checked, indeterminate, onChange, label, className = '' }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate && !checked;
  }, [indeterminate, checked]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={!!checked}
      onChange={(e) => onChange(e.target.checked)}
      aria-label={label}
      className={cx('h-4 w-4 cursor-pointer rounded border-gray-300 accent-[#A80808]', className)}
    />
  );
};

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

const BTN = {
  primary: 'bg-vermilion text-white hover:bg-brand-700 border border-transparent',
  secondary: 'bg-white text-ink border border-line hover:border-brand-300 hover:bg-panel',
  danger: 'bg-white text-red-600 border border-red-200 hover:bg-red-50',
  dangerSolid: 'bg-red-600 text-white border border-transparent hover:bg-red-700',
  ghost: 'bg-transparent text-ink-soft border border-transparent hover:bg-brand-50 hover:text-ink',
};

export const Button = ({ variant = 'secondary', size = 'md', icon: Icon, loading, children, className = '', disabled, type = 'button', ...rest }) => (
  <button
    type={type}
    disabled={disabled || loading}
    className={cx(
      'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vermilion/40 disabled:cursor-not-allowed disabled:opacity-50',
      size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm',
      BTN[variant],
      className
    )}
    {...rest}
  >
    {loading ? <Loader2 size={size === 'sm' ? 13 : 15} className="animate-spin" aria-hidden="true" /> : Icon && <Icon size={size === 'sm' ? 13 : 15} aria-hidden="true" />}
    {children}
  </button>
);

/* ------------------------------------------------------------------ */
/* Pagination                                                          */
/* ------------------------------------------------------------------ */

export const Pagination = ({ page, pages, total, limit, onPage, t = {} }) => {
  if (!total) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const label = (t.k7_showingRange || 'Showing {from}–{to} of {total}')
    .replace('{from}', from).replace('{to}', to).replace('{total}', total);

  // Compact page list: 1 … 4 5 [6] 7 8 … 20
  const nums = [];
  const push = (n) => { if (!nums.includes(n) && n >= 1 && n <= pages) nums.push(n); };
  push(1); for (let n = page - 1; n <= page + 1; n++) push(n); push(pages);
  nums.sort((a, b) => a - b);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
      <p className="text-xs text-ink-soft">{label}</p>
      {pages > 1 && (
        <nav aria-label={t.k7_pagination || 'Pagination'} className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPage(page - 1)}
            disabled={page <= 1}
            aria-label={t.k7_prevPage || 'Previous page'}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-line text-ink-soft hover:border-brand-300 disabled:opacity-40"
          >
            <ChevronLeft size={15} aria-hidden="true" />
          </button>
          {nums.map((n, i) => (
            <React.Fragment key={n}>
              {i > 0 && n - nums[i - 1] > 1 && <span className="px-1 text-mute" aria-hidden="true">…</span>}
              <button
                type="button"
                onClick={() => onPage(n)}
                aria-current={n === page ? 'page' : undefined}
                className={cx(
                  'h-8 min-w-[2rem] rounded-md border px-2 text-xs font-semibold',
                  n === page ? 'border-vermilion bg-vermilion text-white' : 'border-line text-ink-soft hover:border-brand-300'
                )}
              >
                {n}
              </button>
            </React.Fragment>
          ))}
          <button
            type="button"
            onClick={() => onPage(page + 1)}
            disabled={page >= pages}
            aria-label={t.k7_nextPage || 'Next page'}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-line text-ink-soft hover:border-brand-300 disabled:opacity-40"
          >
            <ChevronRight size={15} aria-hidden="true" />
          </button>
        </nav>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Row action menu (portal, so tables with overflow never clip it)      */
/* ------------------------------------------------------------------ */

export const RowMenu = ({ items, label = 'Actions', align = 'right' }) => {
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const visible = items.filter(Boolean);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const menuW = 224;
    const menuH = menuRef.current?.offsetHeight || visible.length * 40 + 12;
    const left = align === 'right' ? r.right - menuW : r.left;
    const flip = r.bottom + menuH + 8 > window.innerHeight;
    setPos({
      top: flip ? Math.max(8, r.top - menuH - 4) : r.bottom + 4,
      left: Math.min(Math.max(8, left), window.innerWidth - menuW - 8),
    });
  }, [open, align, visible.length]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (menuRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    // Only the top overlay reacts to Escape: a menu inside a drawer closes the menu first.
    const overlayId = pushOverlay({ lock: false });
    const key = (e) => { if (claimEscape(e, overlayId)) { setOpen(false); btnRef.current?.focus(); } };
    // The menu is positioned once from the button, so a real scroll should close
    // it; the short grace period ignores the smooth-scroll that finishes right
    // after the button is clicked (the admin column uses scroll-behavior: smooth).
    const openedAt = Date.now();
    const dismiss = () => { if (Date.now() - openedAt > 400) setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', key);
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', dismiss, true);
    return () => {
      popOverlay(overlayId);
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', key);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('scroll', dismiss, true);
    };
  }, [open]);

  // Keyboard users land on the first item; arrows, Home and End move between items.
  useEffect(() => {
    if (open) menuRef.current?.querySelector('[role="menuitem"]:not([disabled])')?.focus();
  }, [open]);

  const onMenuKeyDown = (e) => {
    if (e.key === 'Tab') { setOpen(false); return; }
    const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(e.key)) return;
    const nodes = [...(menuRef.current?.querySelectorAll('[role="menuitem"]:not([disabled])') || [])];
    if (!nodes.length) return;
    e.preventDefault();
    const at = nodes.indexOf(document.activeElement);
    let next = 0;
    if (e.key === 'ArrowDown') next = at < 0 ? 0 : (at + 1) % nodes.length;
    else if (e.key === 'ArrowUp') next = at < 0 ? nodes.length - 1 : (at - 1 + nodes.length) % nodes.length;
    else if (e.key === 'End') next = nodes.length - 1;
    nodes[next].focus();
  };

  if (!visible.length) return null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-brand-50 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vermilion/40"
      >
        <MoreHorizontal size={17} aria-hidden="true" />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          onKeyDown={onMenuKeyDown}
          style={{ top: pos.top, left: pos.left, width: 224 }}
          className="fixed z-[10050] overflow-hidden rounded-xl border border-line bg-white py-1.5 shadow-lg"
        >
          {visible.map((it, i) =>
            it.divider ? (
              <div key={`d${i}`} className="my-1 border-t border-line" role="separator" />
            ) : (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                disabled={it.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  // Focus goes back to the button first, so a dialog opened by the action
                  // returns focus there when it closes.
                  btnRef.current?.focus();
                  it.onClick();
                }}
                className={cx(
                  'flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm outline-none transition-colors disabled:opacity-40',
                  it.danger ? 'text-red-600 hover:bg-red-50 focus-visible:bg-red-50' : 'text-ink hover:bg-brand-50 focus-visible:bg-brand-50'
                )}
              >
                {it.icon && <it.icon size={15} className={it.danger ? '' : 'text-mute'} aria-hidden="true" />}
                {it.label}
              </button>
            )
          )}
        </div>,
        document.body
      )}
    </>
  );
};
