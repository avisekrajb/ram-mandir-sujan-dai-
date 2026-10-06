/**
 * Admin → Users: every account on the site (devotees and staff) in one place.
 * Search, filter, sort, page, select several, and act on one: view, edit,
 * suspend / reactivate, reset password, sign out everywhere, make or remove an
 * admin (super admin), delete. The server enforces who may touch whom; this UI
 * only hides what would be refused.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Ban, CalendarPlus, Clock, Download, Eye, KeyRound, LogOut, Mail, MapPin, Pencil, Phone, Shield,
  ShieldCheck, Trash2, UserCheck, UserPlus, Users, UserX, History, ClipboardList, Gift,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { toCsv, downloadCsvFile, csvStamp } from '../../utils/csvExport';
import { formatDateTime } from '../../utils/formatDate';
import { describeAccess, hasArea, AREAS } from '../../utils/permissions';
import {
  Avatar, Button, Checkbox, EmptyState, PageHeader, Pagination, Panel, Pill, RoleBadge, RowMenu,
  SearchBox, SelectBox, Segmented, Skeleton, StatTile, StatusBadge, fullDate, timeAgo, useDebouncedValue,
} from './kit/kit';
import { ConfirmDialog, Drawer } from './kit/Overlays';
import { canManage, errorText, useAccountActions } from './kit/AccountDialogs';
import { actionLabel } from './kit/auditActions';

const PAGE_SIZE = 15;
const rs = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;

const AccountDetail = ({ id, viewer, t, lang, refreshKey, onAction }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    setData(null);
    setError('');
    api.get(`/admin/accounts/${id}`)
      .then((res) => { if (live) setData(res.data.data); })
      .catch((err) => { if (live) setError(errorText(err, t.k7_loadAccountFailed || 'Could not load this account')); });
    return () => { live = false; };
  }, [id, refreshKey, t.k7_loadAccountFailed]);

  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>;
  if (!data) {
    return (
      <div className="space-y-4 p-5">
        <Skeleton className="h-16 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const manageable = canManage(viewer, data);
  const isSuper = viewer?.role === 'superadmin';
  const row = (icon, label, value) => {
    const I = icon;
    return (
      <div className="flex items-start gap-3 py-2">
        <I size={15} className="mt-0.5 shrink-0 text-mute" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-mute">{label}</p>
          <p className="break-words text-sm text-ink">{value || <span className="text-mute">—</span>}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="divide-y divide-line">
      <div className="flex items-center gap-4 p-5">
        <Avatar user={data} size={64} />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-ink">{data.name || data.email}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <RoleBadge role={data.role} t={t} />
            <StatusBadge active={data.active} t={t} />
            {data.isGoogleUser && <Pill>Google</Pill>}
            {data.mustChangePassword && <Pill tone="amber">{t.k7_mustChange || 'Must change password'}</Pill>}
          </div>
        </div>
      </div>

      {!data.active && (
        <div className="bg-red-50 px-5 py-3 text-sm text-red-700">
          <p className="font-semibold">
            {t.k7_suspended || 'Suspended'}{data.suspendedAt ? ` · ${timeAgo(data.suspendedAt, t, lang)}` : ''}
          </p>
          {data.suspendedReason && <p className="mt-0.5 text-red-700/90">{data.suspendedReason}</p>}
        </div>
      )}

      <div className="px-5 py-3">
        {row(Mail, t.email || 'Email', data.email)}
        {row(Phone, t.phone || 'Phone', data.phone)}
        {row(MapPin, t.address || 'Address', data.address)}
      </div>

      <div className="px-5 py-3">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">{t.k7_account || 'Account'}</p>
        {row(CalendarPlus, t.memberSince || 'Member since', fullDate(data.createdAt, lang))}
        {row(
          Clock,
          t.k7_lastSignIn || 'Last sign-in',
          data.lastLoginAt
            ? `${fullDate(data.lastLoginAt, lang)} · ${(t.k7_signInsCount || '{n} sign-ins').replace('{n}', data.loginCount)}${isSuper && data.lastLoginIp ? ` · ${data.lastLoginIp}` : ''}`
            : (t.k7_noSignInRecorded || 'No sign-in recorded yet')
        )}
        {data.role === 'admin' && row(ShieldCheck, t.k7_access || 'Access', describeAccess(data.permissions, t))}
        {data.role === 'admin' && Array.isArray(data.permissions) && data.permissions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pb-2 pl-7">
            {AREAS.filter((a) => data.permissions.includes(a.key)).map((a) => (
              <Pill key={a.key} tone="red">{t[a.labelKey] || a.label}</Pill>
            ))}
          </div>
        )}
      </div>

      {/* The server leaves these figures out for admins without the Bookings / Donations area. */}
      {data.role !== 'superadmin' && (data.bookingCount !== undefined || data.donationCount !== undefined) && (
        <div className="px-5 py-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">{t.k7_activity || 'Activity'}</p>
          <div className="grid grid-cols-2 gap-3">
            {data.bookingCount !== undefined && (
              <div className="rounded-xl border border-line p-3">
                <p className="flex items-center gap-1.5 text-xs text-mute"><ClipboardList size={13} aria-hidden="true" />{t.k7_bookings || 'Bookings'}</p>
                <p className="mt-1 font-serif text-xl font-semibold text-ink">{data.bookingCount}</p>
              </div>
            )}
            {data.donationCount !== undefined && (
              <div className="rounded-xl border border-line p-3">
                <p className="flex items-center gap-1.5 text-xs text-mute"><Gift size={13} aria-hidden="true" />{t.k7_donations || 'Donations'}</p>
                <p className="mt-1 font-serif text-xl font-semibold text-ink">{data.donationCount}</p>
                <p className="text-xs text-mute">{rs(data.donationTotal)} {t.k7_completed || 'completed'}</p>
              </div>
            )}
          </div>
          {data.recentBookings?.length > 0 && (
            <ul className="mt-3 divide-y divide-line rounded-xl border border-line text-sm">
              {data.recentBookings.map((b) => (
                <li key={b._id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="truncate text-ink">{b.type} <span className="text-mute">· {b.date}</span></span>
                  <Pill tone={b.status === 'confirmed' || b.status === 'completed' ? 'green' : b.status === 'cancelled' ? 'danger' : 'amber'}>{b.status}</Pill>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {data.activity?.length > 0 && (
        <div className="px-5 py-4">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            <History size={13} aria-hidden="true" />{t.k7_history || 'History'}
          </p>
          <ol className="space-y-3 border-l border-line pl-4">
            {data.activity.map((a) => (
              <li key={a._id} className="relative text-sm">
                <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-brand-300" aria-hidden="true" />
                <p className="text-ink">
                  {actionLabel(a.action, t)}
                  {a.done === 'to' && <span className="text-mute"> · {(t.k7_byWho || 'by {name}').replace('{name}', a.by)}</span>}
                  {a.done === 'by' && a.details?.targetName && <span className="text-mute"> · {a.details.targetName}</span>}
                </p>
                <p className="text-xs text-mute">{timeAgo(a.at, t, lang)}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {manageable && (
        <div className="flex flex-wrap gap-2 px-5 py-4">
          <Button icon={Pencil} size="sm" onClick={() => onAction('edit', data)}>{t.edit || 'Edit'}</Button>
          {data.active
            ? <Button icon={Ban} size="sm" variant="danger" onClick={() => onAction('suspend', data)}>{t.k7_suspend || 'Suspend'}</Button>
            : <Button icon={UserCheck} size="sm" onClick={() => onAction('reactivate', data)}>{t.k7_reactivate || 'Reactivate'}</Button>}
          <Button icon={KeyRound} size="sm" onClick={() => onAction('reset', data)}>{t.k7_resetPassword || 'Reset password'}</Button>
          <Button icon={LogOut} size="sm" onClick={() => onAction('revoke', data)}>{t.k7_signOutEverywhere || 'Sign out everywhere'}</Button>
          {data.role === 'admin' && isSuper && <Button icon={ShieldCheck} size="sm" onClick={() => onAction('access', data)}>{t.k7_editAccess || 'Edit access'}</Button>}
          {data.role === 'admin' && isSuper && <Button icon={UserX} size="sm" variant="danger" onClick={() => onAction('demote', data)}>{t.k7_removeAdmin || 'Remove admin access'}</Button>}
          {data.role === 'user' && isSuper && <Button icon={Shield} size="sm" onClick={() => onAction('promote', data)}>{t.k7_makeAdmin || 'Make admin'}</Button>}
          <Button icon={Trash2} size="sm" variant="danger" onClick={() => onAction('delete', data)}>{t.delete || 'Delete'}</Button>
        </div>
      )}
      {!manageable && data.role === 'superadmin' && (
        <p className="px-5 py-4 text-xs text-mute">{t.k7_superadminLocked || 'A super administrator account cannot be changed or removed from here.'}</p>
      )}
      {!manageable && data.role === 'admin' && !isSuper && (
        <p className="px-5 py-4 text-xs text-mute">{t.k7_adminLockedForAdmins || 'Only the super administrator can manage admin accounts.'}</p>
      )}
    </div>
  );
};

const AdminAccounts = ({ t = {} }) => {
  const { user: viewer } = useAuth();
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const isSuper = viewer?.role === 'superadmin';

  const [filters, setFilters] = useState({ q: '', role: '', status: '', provider: '', joined: '', sort: 'newest' });
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, pages: 1 });
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState([]);
  const [detailId, setDetailId] = useState(null);
  const [detailKey, setDetailKey] = useState(0);
  const [bulk, setBulk] = useState(null); // { action }
  const [bulkBusy, setBulkBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const reqId = useRef(0);

  const q = useDebouncedValue(filters.q, 300);
  const serverFilters = useMemo(
    () => ({ q, role: filters.role, status: filters.status, provider: filters.provider, joined: filters.joined, sort: filters.sort }),
    [q, filters.role, filters.status, filters.provider, filters.joined, filters.sort]
  );

  // The page number belongs to the filters it was chosen under: new filters mean page 1
  // straight away, so a filter change is one request, not "old page, then page 1".
  const filterKey = JSON.stringify(serverFilters);
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = useCallback((p) => setPageState({ key: filterKey, page: p }), [filterKey]);

  const loadSummary = useCallback(() => {
    api.get('/admin/accounts/summary').then((res) => setSummary(res.data.data)).catch(() => {});
  }, []);

  const loadList = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    setError('');
    try {
      const params = { ...serverFilters, page, limit: PAGE_SIZE };
      Object.keys(params).forEach((k) => params[k] === '' && delete params[k]);
      const res = await api.get('/admin/accounts', { params });
      if (id !== reqId.current) return;
      setRows(res.data.data);
      setMeta({ total: res.data.total, pages: res.data.pages });
      // Keep only selected people who are still in this list (rows can leave it after an
      // action, a delete elsewhere or a refresh); bulk actions must never reach hidden rows.
      const present = new Set(res.data.data.filter((r) => r.role === 'user').map((r) => r._id));
      setSelected((s) => {
        const kept = s.filter((x) => present.has(x));
        return kept.length === s.length ? s : kept;
      });
      // A page that no longer exists (after deletes) falls back to the last one.
      if (page > res.data.pages) setPage(Math.max(1, res.data.pages));
    } catch (err) {
      if (id !== reqId.current) return;
      setError(errorText(err, t.k7_loadFailed || 'Could not load accounts'));
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [serverFilters, page, setPage, t.k7_loadFailed]);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { loadSummary(); }, [loadSummary]);
  // A different page or different filters starts with nothing selected.
  useEffect(() => { setSelected([]); }, [filterKey, page]);

  const setFilter = (patch) => setFilters((f) => ({ ...f, ...patch }));
  const anyFilter = filters.q || filters.role || filters.status || filters.provider || filters.joined;
  const clearFilters = () => setFilters({ q: '', role: '', status: '', provider: '', joined: '', sort: filters.sort });

  const { open: openAction, reactivate, dialogs } = useAccountActions({
    viewer,
    t,
    onChanged: ({ account, deletedId }) => {
      if (deletedId) {
        setDetailId(null);
        setSelected((s) => s.filter((x) => x !== deletedId));
      }
      if (account) setRows((rs0) => rs0.map((r) => (r._id === account._id ? { ...r, ...account } : r)));
      setDetailKey((k) => k + 1);
      loadList();
      loadSummary();
    },
  });

  const onRowAction = (type, account) => (type === 'reactivate' ? reactivate(account) : openAction(type, account));

  // Deep links from the Ctrl+K palette: /admin/users?open=<id> shows that person,
  // /admin/users?add=1 opens the new-account dialog. The query is consumed once.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const openId = searchParams.get('open');
    const add = searchParams.get('add');
    if (!openId && !add) return;
    if (openId && /^[a-f0-9]{24}$/i.test(openId)) setDetailId(openId); // only a real id may reach an API path
    if (add) openAction('create', null);
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react to the query string only
  }, [searchParams]);

  /* ----- selection (ordinary users only: the server skips anyone else) ----- */
  const selectable = rows.filter((r) => r.role === 'user');
  const allOn = selectable.length > 0 && selectable.every((r) => selected.includes(r._id));
  const toggleAll = (on) => setSelected(on ? selectable.map((r) => r._id) : []);
  const toggleOne = (id, on) => setSelected((s) => (on ? [...s, id] : s.filter((x) => x !== id)));

  const runBulk = async (reason) => {
    setBulkBusy(true);
    try {
      const res = await api.post('/admin/accounts/bulk', { ids: selected, action: bulk.action, reason });
      showToast(
        (t.k7_bulkDone || '{n} account(s) updated').replace('{n}', res.data.affected),
        'success'
      );
      setBulk(null);
      setSelected([]);
      loadList();
      loadSummary();
    } catch (err) {
      showToast(errorText(err, t.k7_actionFailed || 'That did not work. Please try again.'), 'error');
    } finally {
      setBulkBusy(false);
    }
  };

  /* ----- export (all rows matching the current filters, not just this page) ----- */
  const exportCsv = async () => {
    setExporting(true);
    try {
      const params = { ...serverFilters, limit: 'all' };
      Object.keys(params).forEach((k) => params[k] === '' && delete params[k]);
      const res = await api.get('/admin/accounts', { params });
      const columns = [
        { key: 'name', label: t.fullName || 'Full Name' },
        { key: 'email', label: t.email || 'Email' },
        { key: 'phone', label: t.phone || 'Phone' },
        { key: 'address', label: t.address || 'Address' },
        { key: 'role', label: t.role || 'Role' },
        { key: 'status', label: t.status || 'Status', value: (u) => (u.active ? 'active' : 'suspended') },
        { key: 'lastLoginAt', label: t.k7_lastSignIn || 'Last sign-in', value: (u) => formatDateTime(u.lastLoginAt) },
        // The server leaves these figures out for admins without those areas.
        hasArea(viewer, 'bookings') && { key: 'bookingCount', label: t.k7_bookings || 'Bookings' },
        hasArea(viewer, 'donations') && { key: 'donationTotal', label: t.k7_donated || 'Donated (completed)' },
        { key: 'createdAt', label: t.memberSince || 'Member since', value: (u) => formatDateTime(u.createdAt) },
      ].filter(Boolean);
      downloadCsvFile(`accounts-${csvStamp()}.csv`, toCsv(columns, res.data.data));
    } catch (err) {
      showToast(errorText(err, t.k7_actionFailed || 'That did not work. Please try again.'), 'error');
    } finally {
      setExporting(false);
    }
  };

  const menuFor = (u) => {
    const manage = canManage(viewer, u);
    return [
      { label: t.k7_viewDetails || 'View details', icon: Eye, onClick: () => setDetailId(u._id) },
      manage && { divider: true },
      manage && { label: t.edit || 'Edit', icon: Pencil, onClick: () => onRowAction('edit', u) },
      manage && (u.active
        ? { label: t.k7_suspend || 'Suspend', icon: Ban, onClick: () => onRowAction('suspend', u) }
        : { label: t.k7_reactivate || 'Reactivate', icon: UserCheck, onClick: () => onRowAction('reactivate', u) }),
      manage && { label: t.k7_resetPassword || 'Reset password', icon: KeyRound, onClick: () => onRowAction('reset', u) },
      manage && { label: t.k7_signOutEverywhere || 'Sign out everywhere', icon: LogOut, onClick: () => onRowAction('revoke', u) },
      manage && isSuper && u.role === 'user' && { label: t.k7_makeAdmin || 'Make admin', icon: Shield, onClick: () => onRowAction('promote', u) },
      manage && isSuper && u.role === 'admin' && { label: t.k7_editAccess || 'Edit access', icon: ShieldCheck, onClick: () => onRowAction('access', u) },
      manage && isSuper && u.role === 'admin' && { label: t.k7_removeAdmin || 'Remove admin access', icon: UserX, danger: true, onClick: () => onRowAction('demote', u) },
      manage && { divider: true },
      manage && { label: t.delete || 'Delete', icon: Trash2, danger: true, onClick: () => onRowAction('delete', u) },
    ];
  };

  const sub = (u) => {
    if (u.role === 'superadmin') return null;
    const parts = [];
    if (u.bookingCount) parts.push((u.bookingCount === 1 ? (t.k7_oneBooking || '1 booking') : (t.k7_nBookings || '{n} bookings')).replace('{n}', u.bookingCount));
    if (u.donationCount) parts.push(`${rs(u.donationTotal)}`);
    return parts.length ? parts.join(' · ') : <span className="text-mute">—</span>;
  };

  return (
    <div>
      <PageHeader
        title={t.manageUsers || 'Users'}
        description={t.k7_usersDesc || 'Everyone with an account on the website: devotees and temple staff. Find a person, check their activity, and keep accounts safe.'}
        actions={
          <>
            <Button icon={Download} onClick={exportCsv} loading={exporting}>{t.k7_exportCsv || 'Export CSV'}</Button>
            <Button variant="primary" icon={UserPlus} onClick={() => openAction('create', null)}>{t.k7_addAccount || 'Add account'}</Button>
          </>
        }
      />

      {/* Summary — each tile is also a quick filter */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label={t.k7_allAccounts || 'All accounts'}
          value={summary ? summary.total.toLocaleString() : '—'}
          hint={summary ? (t.k7_nGoogle || '{n} via Google').replace('{n}', summary.google) : undefined}
          icon={Users}
          active={!anyFilter}
          onClick={clearFilters}
        />
        <StatTile
          label={t.k7_staff || 'Admins & staff'}
          value={summary ? summary.byRole.admin + summary.byRole.superadmin : '—'}
          hint={summary ? (t.k7_nSuper || '{n} super admin').replace('{n}', summary.byRole.superadmin) : undefined}
          icon={ShieldCheck}
          active={filters.role === 'staff'}
          onClick={() => setFilter({ role: filters.role === 'staff' ? '' : 'staff' })}
        />
        <StatTile
          label={t.k7_suspendedPlural || 'Suspended'}
          value={summary ? summary.suspended : '—'}
          hint={t.k7_cannotSignIn || 'Cannot sign in'}
          icon={UserX}
          tone={summary?.suspended ? 'danger' : 'default'}
          active={filters.status === 'suspended'}
          onClick={() => setFilter({ status: filters.status === 'suspended' ? '' : 'suspended' })}
        />
        <StatTile
          label={t.k7_newThisWeek || 'New this week'}
          value={summary ? summary.new7 : '—'}
          hint={summary ? (t.k7_nLast30 || '{n} in the last 30 days').replace('{n}', summary.new30) : undefined}
          icon={CalendarPlus}
          tone="good"
          active={filters.joined === '7'}
          onClick={() => setFilter({ joined: filters.joined === '7' ? '' : '7' })}
        />
      </div>

      <Panel className="overflow-hidden">
        {/* Toolbar */}
        <div className="space-y-3 border-b border-line p-4">
          <div className="flex flex-wrap items-center gap-3">
            <SearchBox
              className="min-w-[220px] flex-1"
              value={filters.q}
              onChange={(v) => setFilter({ q: v })}
              placeholder={t.k7_searchAccounts || 'Search by name, email or phone'}
              aria-label={t.k7_searchAccounts || 'Search by name, email or phone'}
            />
            <Segmented
              label={t.role || 'Role'}
              value={filters.role}
              onChange={(role) => setFilter({ role })}
              options={[
                { value: '', label: t.k7_all || 'All' },
                { value: 'user', label: t.k7_usersPlural || 'Users' },
                { value: 'staff', label: t.k7_staff || 'Admins & staff' },
              ]}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SelectBox className="w-auto min-w-[140px]" aria-label={t.status || 'Status'} value={filters.status} onChange={(e) => setFilter({ status: e.target.value })}>
              <option value="">{t.k7_anyStatus || 'Any status'}</option>
              <option value="active">{t.a1_usersActive || 'Active'}</option>
              <option value="suspended">{t.k7_suspended || 'Suspended'}</option>
            </SelectBox>
            <SelectBox className="w-auto min-w-[150px]" aria-label={t.k7_signInMethod || 'Sign-in method'} value={filters.provider} onChange={(e) => setFilter({ provider: e.target.value })}>
              <option value="">{t.k7_anyMethod || 'Any sign-in method'}</option>
              <option value="password">{t.k7_emailPassword || 'Email & password'}</option>
              <option value="google">Google</option>
            </SelectBox>
            <SelectBox className="w-auto min-w-[150px]" aria-label={t.k7_sortBy || 'Sort by'} value={filters.sort} onChange={(e) => setFilter({ sort: e.target.value })}>
              <option value="newest">{t.k7_sortNewest || 'Newest first'}</option>
              <option value="oldest">{t.k7_sortOldest || 'Oldest first'}</option>
              <option value="name">{t.k7_sortName || 'Name A–Z'}</option>
              <option value="lastLogin">{t.k7_sortLastLogin || 'Last sign-in'}</option>
            </SelectBox>
            {anyFilter && (
              <button type="button" onClick={clearFilters} className="text-sm font-semibold text-vermilion hover:underline">
                {t.k7_clearFilters || 'Clear filters'}
              </button>
            )}
          </div>
        </div>

        {/* Bulk bar */}
        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-line bg-brand-50/70 px-4 py-2.5" role="status">
            <span className="text-sm font-semibold text-ink">{(t.k7_nSelected || '{n} selected').replace('{n}', selected.length)}</span>
            <Button size="sm" icon={Ban} variant="danger" onClick={() => setBulk({ action: 'suspend' })}>{t.k7_suspend || 'Suspend'}</Button>
            <Button size="sm" icon={UserCheck} onClick={() => setBulk({ action: 'activate' })}>{t.k7_reactivate || 'Reactivate'}</Button>
            <Button size="sm" icon={Trash2} variant="danger" onClick={() => setBulk({ action: 'delete' })}>{t.delete || 'Delete'}</Button>
            <button type="button" onClick={() => setSelected([])} className="ml-auto text-sm text-ink-soft hover:text-ink">{t.k7_clearSelection || 'Clear selection'}</button>
          </div>
        )}

        {/* Table (md+) */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-gray-50/60 text-left text-xs font-semibold uppercase tracking-wide text-ink-soft">
                <th className="w-10 py-3 pl-4"><Checkbox checked={allOn} indeterminate={selected.length > 0} onChange={toggleAll} label={t.k7_selectAll || 'Select all'} /></th>
                <th className="px-3 py-3">{t.k7_account || 'Account'}</th>
                <th className="px-3 py-3">{t.role || 'Role'}</th>
                <th className="px-3 py-3">{t.status || 'Status'}</th>
                <th className="hidden px-3 py-3 xl:table-cell">{t.k7_activity || 'Activity'}</th>
                <th className="px-3 py-3">{t.k7_lastSignIn || 'Last sign-in'}</th>
                <th className="hidden px-3 py-3 xl:table-cell">{t.a1_usersJoined || 'Joined'}</th>
                <th className="w-12 py-3 pr-3"><span className="sr-only">{t.actions || 'Actions'}</span></th>
              </tr>
            </thead>
            <tbody className={loading && rows.length ? 'opacity-60 transition-opacity' : ''}>
              {loading && !rows.length && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-line"><td colSpan={8} className="p-3"><Skeleton className="h-10 w-full" /></td></tr>
              ))}
              {rows.map((u) => (
                <tr
                  key={u._id}
                  className={`border-b border-line last:border-0 hover:bg-panel ${!u.active ? 'bg-red-50/30' : ''}`}
                >
                  <td className="py-3 pl-4">
                    {u.role === 'user' && (
                      <Checkbox checked={selected.includes(u._id)} onChange={(on) => toggleOne(u._id, on)} label={`${t.k7_select || 'Select'} ${u.name}`} />
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <button type="button" onClick={() => setDetailId(u._id)} className="flex items-center gap-3 text-left">
                      <Avatar user={u} size={38} />
                      <span className="min-w-0">
                        <span className="block max-w-[220px] truncate font-semibold text-ink hover:text-vermilion">{u.name || u.email}</span>
                        <span className="block max-w-[220px] truncate text-xs text-ink-soft">{u.email}</span>
                      </span>
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <RoleBadge role={u.role} t={t} />
                    {u.role === 'admin' && <p className="mt-1 text-xs text-mute">{describeAccess(u.permissions, t)}</p>}
                  </td>
                  <td className="px-3 py-3"><StatusBadge active={u.active} t={t} /></td>
                  <td className="hidden whitespace-nowrap px-3 py-3 text-xs text-ink-soft xl:table-cell">{sub(u)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-ink-soft">
                    {u.lastLoginAt ? timeAgo(u.lastLoginAt, t, lang) : <span className="text-mute">{t.k7_never || 'Never'}</span>}
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-3 text-xs text-ink-soft xl:table-cell">{timeAgo(u.createdAt, t, lang)}</td>
                  <td className="py-3 pr-3 text-right"><RowMenu items={menuFor(u)} label={`${t.actions || 'Actions'}: ${u.name}`} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cards (below md) */}
        <ul className="divide-y divide-line md:hidden">
          {rows.map((u) => (
            <li key={u._id} className={`flex items-start gap-3 p-4 ${!u.active ? 'bg-red-50/30' : ''}`}>
              {u.role === 'user' && (
                <Checkbox className="mt-3" checked={selected.includes(u._id)} onChange={(on) => toggleOne(u._id, on)} label={`${t.k7_select || 'Select'} ${u.name}`} />
              )}
              <button type="button" onClick={() => setDetailId(u._id)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                <Avatar user={u} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-ink">{u.name || u.email}</span>
                  <span className="block truncate text-xs text-ink-soft">{u.email}</span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <RoleBadge role={u.role} t={t} />
                    <StatusBadge active={u.active} t={t} />
                  </span>
                  <span className="mt-1 block text-xs text-mute">
                    {u.lastLoginAt ? `${t.k7_lastSignIn || 'Last sign-in'} ${timeAgo(u.lastLoginAt, t, lang)}` : (t.k7_neverSignedIn || 'Never signed in')}
                  </span>
                </span>
              </button>
              <RowMenu items={menuFor(u)} label={`${t.actions || 'Actions'}: ${u.name}`} />
            </li>
          ))}
        </ul>

        {error && (
          <div className="p-6 text-center text-sm text-red-600">
            {error} <button type="button" onClick={loadList} className="ml-2 font-semibold underline">{t.k7_retry || 'Retry'}</button>
          </div>
        )}
        {!loading && !error && rows.length === 0 && (
          <EmptyState
            icon={Users}
            title={anyFilter ? (t.k7_noMatch || 'No accounts match your search') : (t.noUsersYet || 'No users registered yet')}
            text={anyFilter ? (t.k7_noMatchHint || 'Try a different name, or clear the filters.') : undefined}
            action={anyFilter ? <Button onClick={clearFilters}>{t.k7_clearFilters || 'Clear filters'}</Button> : undefined}
          />
        )}

        <Pagination page={page} pages={meta.pages} total={meta.total} limit={PAGE_SIZE} onPage={setPage} t={t} />
      </Panel>

      {/* Detail drawer */}
      <Drawer
        open={!!detailId}
        onClose={() => setDetailId(null)}
        title={t.a1_usersUserDetails || 'Account details'}
        closeLabel={t.close || 'Close'}
      >
        {detailId && (
          <AccountDetail
            id={detailId}
            viewer={viewer}
            t={t}
            lang={lang}
            refreshKey={detailKey}
            onAction={onRowAction}
          />
        )}
      </Drawer>

      {/* Bulk confirmation */}
      <ConfirmDialog
        open={!!bulk}
        onClose={() => !bulkBusy && setBulk(null)}
        busy={bulkBusy}
        tone={bulk?.action === 'activate' ? 'primary' : 'danger'}
        title={
          bulk?.action === 'delete' ? (t.k7_bulkDeleteTitle || 'Delete selected accounts?')
            : bulk?.action === 'suspend' ? (t.k7_bulkSuspendTitle || 'Suspend selected accounts?')
              : (t.k7_bulkActivateTitle || 'Reactivate selected accounts?')
        }
        message={(t.k7_bulkMsg || '{n} account(s) selected. Admins and your own account are never included.').replace('{n}', selected.length)}
        reasonLabel={bulk?.action === 'suspend' ? (t.k7_suspendReason || 'Reason (optional, only admins see it)') : undefined}
        requireText={bulk?.action === 'delete' ? 'DELETE' : undefined}
        confirmLabel={bulk?.action === 'delete' ? (t.delete || 'Delete') : bulk?.action === 'suspend' ? (t.k7_suspend || 'Suspend') : (t.k7_reactivate || 'Reactivate')}
        cancelLabel={t.cancel || 'Cancel'}
        onConfirm={runBulk}
      />

      {dialogs}
    </div>
  );
};

export default AdminAccounts;
