/**
 * Admin → Admins & access (super admin only): who can sign in to this panel
 * and which parts of it each admin may use.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Ban, Check, Crown, KeyRound, LogOut, Minus, Pencil, ShieldCheck, Trash2, UserCheck, UserPlus, UserX,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { AREAS, describeAccess } from '../../utils/permissions';
import {
  Avatar, Button, EmptyState, PageHeader, Panel, PanelHeader, Pill, RoleBadge, RowMenu, Skeleton, StatusBadge, timeAgo,
} from './kit/kit';
import { canManage, errorText, useAccountActions } from './kit/AccountDialogs';

const ROLE_ROWS = [
  {
    role: 'superadmin',
    title: ['k7_roleSuperTitle', 'Super administrator'],
    text: ['k7_roleSuperText', 'Everything, including admin accounts, donation payment details, languages, maintenance mode and the database. Cannot be restricted, suspended or deleted from this panel.'],
  },
  {
    role: 'admin',
    title: ['k7_roleAdminTitle', 'Admin'],
    text: ['k7_roleAdminText', 'Runs the temple website day to day. Can use the areas you give them, manage ordinary user accounts if allowed, and cannot touch other admins.'],
  },
  {
    role: 'user',
    title: ['k7_roleUserTitle', 'User'],
    text: ['k7_roleUserText', 'A devotee. Can book pujas, donate and manage their own profile. No access to this panel.'],
  },
];

const AdminAccess = ({ t = {} }) => {
  const { user: viewer } = useAuth();
  const { lang } = useLanguage();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/accounts', { params: { role: 'staff', limit: 100, sort: 'name' } });
      // Super admin first, then admins by name.
      const list = res.data.data.slice().sort((a, b) => (a.role === b.role ? 0 : a.role === 'superadmin' ? -1 : 1));
      setStaff(list);
    } catch (err) {
      setError(errorText(err, t.k7_loadFailed || 'Could not load accounts'));
    } finally {
      setLoading(false);
    }
  }, [t.k7_loadFailed]);

  useEffect(() => { load(); }, [load]);

  const { open, reactivate, dialogs } = useAccountActions({ viewer, t, onChanged: () => load() });
  const onAction = (type, account) => (type === 'reactivate' ? reactivate(account) : open(type, account));

  const menuFor = (u) => {
    if (!canManage(viewer, u)) return [];
    return [
      { label: t.k7_editAccess || 'Edit access', icon: ShieldCheck, onClick: () => onAction('access', u) },
      { label: t.edit || 'Edit details', icon: Pencil, onClick: () => onAction('edit', u) },
      u.active
        ? { label: t.k7_suspend || 'Suspend', icon: Ban, onClick: () => onAction('suspend', u) }
        : { label: t.k7_reactivate || 'Reactivate', icon: UserCheck, onClick: () => onAction('reactivate', u) },
      { label: t.k7_resetPassword || 'Reset password', icon: KeyRound, onClick: () => onAction('reset', u) },
      { label: t.k7_signOutEverywhere || 'Sign out everywhere', icon: LogOut, onClick: () => onAction('revoke', u) },
      { divider: true },
      { label: t.k7_removeAdmin || 'Remove admin access', icon: UserX, danger: true, onClick: () => onAction('demote', u) },
      { label: t.delete || 'Delete account', icon: Trash2, danger: true, onClick: () => onAction('delete', u) },
    ];
  };

  const has = (u, key) => u.role === 'superadmin' || !Array.isArray(u.permissions) || u.permissions.includes(key);

  return (
    <div>
      <PageHeader
        title={t.k7_adminsAccess || 'Admins & access'}
        description={t.k7_accessDesc || 'Choose who can sign in to this panel and which parts of it each admin can use. New admins start with the areas you pick, not everything.'}
        actions={<Button variant="primary" icon={UserPlus} onClick={() => open('create', { role: 'admin' })}>{t.k7_addAdmin || 'Add admin'}</Button>}
      />

      <Panel className="mb-6 overflow-hidden">
        <PanelHeader
          icon={ShieldCheck}
          title={t.k7_whoCanDoWhat || 'Who can use what'}
          description={t.k7_matrixDesc || 'A tick means the admin can open that area of the panel.'}
        />

        {error && <p className="p-6 text-center text-sm text-red-600">{error} <button type="button" className="ml-2 font-semibold underline" onClick={load}>{t.k7_retry || 'Retry'}</button></p>}

        {loading ? (
          <div className="space-y-3 p-5"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
        ) : staff.length === 0 && !error ? (
          <EmptyState icon={ShieldCheck} title={t.k7_noAdmins || 'No admins yet'} />
        ) : (
          <>
            {/* Matrix (lg+) */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-gray-50/60 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    <th className="px-4 py-3 text-left">{t.k7_admin || 'Admin'}</th>
                    {AREAS.map((a) => {
                      const I = a.icon;
                      return (
                        <th key={a.key} className="w-[88px] px-1 py-3 text-center" title={t[a.descKey] || a.desc}>
                          <span className="flex flex-col items-center gap-1 normal-case">
                            <I size={15} className="text-mute" aria-hidden="true" />
                            <span className="text-[11px] font-semibold leading-tight">{t[a.labelKey] || a.label}</span>
                          </span>
                        </th>
                      );
                    })}
                    <th className="w-12" />
                  </tr>
                </thead>
                <tbody>
                  {staff.map((u) => (
                    <tr key={u._id} className={`border-b border-line last:border-0 ${!u.active ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar user={u} size={38} />
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 truncate font-semibold text-ink">
                              {u.name}
                              {String(u._id) === String(viewer?._id || viewer?.id) && <Pill>{t.k7_you || 'You'}</Pill>}
                            </p>
                            <p className="truncate text-xs text-ink-soft">{u.email}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <RoleBadge role={u.role} t={t} />
                              {!u.active && <StatusBadge active={false} t={t} />}
                              {u.mustChangePassword && <Pill tone="amber">{t.k7_mustChange || 'Must change password'}</Pill>}
                            </div>
                          </div>
                        </div>
                      </td>
                      {AREAS.map((a) => (
                        <td key={a.key} className="px-1 py-3 text-center">
                          {has(u, a.key)
                            ? <Check size={17} className="mx-auto text-green-600" aria-label={t.k7_yes || 'Yes'} />
                            : <Minus size={16} className="mx-auto text-gray-300" aria-label={t.k7_no || 'No'} />}
                        </td>
                      ))}
                      <td className="py-3 pr-3 text-right"><RowMenu items={menuFor(u)} label={`${t.actions || 'Actions'}: ${u.name}`} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards (below lg) */}
            <ul className="divide-y divide-line lg:hidden">
              {staff.map((u) => (
                <li key={u._id} className={`flex items-start gap-3 p-4 ${!u.active ? 'bg-red-50/30' : ''}`}>
                  <Avatar user={u} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{u.name}</p>
                    <p className="truncate text-xs text-ink-soft">{u.email}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <RoleBadge role={u.role} t={t} />
                      {!u.active && <StatusBadge active={false} t={t} />}
                    </div>
                    <p className="mt-2 text-xs text-ink-soft">{u.role === 'superadmin' ? (t.k7_fullAccess || 'Full access') : describeAccess(u.permissions, t)}</p>
                    {u.role === 'admin' && Array.isArray(u.permissions) && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {AREAS.filter((a) => u.permissions.includes(a.key)).map((a) => <Pill key={a.key} tone="red">{t[a.labelKey] || a.label}</Pill>)}
                      </div>
                    )}
                    <p className="mt-1.5 text-xs text-mute">
                      {u.lastLoginAt ? `${t.k7_lastSignIn || 'Last sign-in'} ${timeAgo(u.lastLoginAt, t, lang)}` : (t.k7_neverSignedIn || 'Never signed in')}
                    </p>
                  </div>
                  <RowMenu items={menuFor(u)} label={`${t.actions || 'Actions'}: ${u.name}`} />
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      <Panel>
        <PanelHeader icon={Crown} title={t.k7_rolesExplained || 'The three kinds of account'} />
        <dl className="grid gap-px overflow-hidden rounded-b-xl bg-line sm:grid-cols-3">
          {ROLE_ROWS.map((r) => (
            <div key={r.role} className="bg-white p-5">
              <dt className="mb-1.5 flex items-center gap-2"><RoleBadge role={r.role} t={t} /></dt>
              <dd className="text-sm leading-relaxed text-ink-soft">{t[r.text[0]] || r.text[1]}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      {dialogs}
    </div>
  );
};

export default AdminAccess;
