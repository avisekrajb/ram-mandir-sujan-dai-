/**
 * Dialogs and actions shared by the Users page and the Admins & access page:
 * create / edit an account, choose access areas, suspend, reset password,
 * sign out everywhere, delete. `useAccountActions` owns the state and returns
 * the dialogs to render plus an `open(type, account)` trigger.
 */
import React, { useEffect, useState } from 'react';
import { Check, Copy, ShieldAlert } from 'lucide-react';
import api from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { Button, Field, Segmented, inputCls } from './kit';
import { ConfirmDialog, Modal } from './Overlays';
import PasswordField from './PasswordField';
import AccessEditor from './AccessEditor';

export const errorText = (error, fallback) => error?.response?.data?.message || fallback;

/** May `viewer` act on `target` (edit, suspend, reset, delete)? Mirrors the server rules. */
export const canManage = (viewer, target) => {
  if (!viewer || !target) return false;
  if (String(viewer._id || viewer.id) === String(target._id)) return false;
  if (target.role === 'superadmin') return false;
  if (target.role === 'admin') return viewer.role === 'superadmin';
  return true;
};

/* ------------------------------------------------------------------ */
/* One-time credential display                                         */
/* ------------------------------------------------------------------ */

export const CredentialModal = ({ credential, onClose, t = {} }) => {
  const [copied, setCopied] = useState(false);
  useEffect(() => setCopied(false), [credential]);
  if (!credential) return null;
  const { account, password, created } = credential;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch { /* the password is on screen */ }
  };
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={created ? (t.k7_accountCreated || 'Account created') : (t.k7_passwordReset || 'Password reset')}
      description={account?.name ? `${account.name} · ${account.email}` : account?.email}
      closeLabel={t.close || 'Close'}
      footer={<Button variant="primary" onClick={onClose}>{t.k7_done || 'Done'}</Button>}
    >
      <p className="text-sm text-ink-soft">
        {t.k7_tempPasswordIntro || 'Give this temporary password to the account holder. It is shown only once and cannot be looked up later.'}
      </p>
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-gray-50 p-3">
        <code className="min-w-0 flex-1 select-all break-all text-center font-mono text-xl font-semibold tracking-wider text-ink" data-autofocus tabIndex={0}>
          {password}
        </code>
        <Button size="sm" icon={copied ? Check : Copy} onClick={copy} aria-label={t.k7_copy || 'Copy'}>
          {copied ? (t.k7_copied || 'Copied') : (t.k7_copy || 'Copy')}
        </Button>
      </div>
      <p className="mt-3 text-xs text-mute">
        {account?.role === 'admin'
          ? (t.k7_tempPasswordAdmin || 'They will be asked to choose their own password the first time they sign in. Any older sessions have been signed out.')
          : (t.k7_tempPasswordUser || 'Ask them to change it from their profile after signing in. Any older sessions have been signed out.')}
      </p>
    </Modal>
  );
};

/* ------------------------------------------------------------------ */
/* Create / edit                                                        */
/* ------------------------------------------------------------------ */

// New admins start with no areas: access is chosen on purpose, never granted by default.
const emptyForm = { name: '', email: '', phone: '', address: '', role: 'user', permissions: [], passwordMode: 'generate', password: '' };

export const AccountFormModal = ({ open, mode, account, viewer, defaultRole = 'user', onClose, onSaved, t = {} }) => {
  const { showToast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isSuper = viewer?.role === 'superadmin';
  const editing = mode === 'edit';

  useEffect(() => {
    if (!open) return;
    setError('');
    setBusy(false);
    if (editing && account) {
      setForm({ ...emptyForm, name: account.name || '', email: account.email || '', phone: account.phone || '', address: account.address || '', role: account.role });
    } else {
      setForm({ ...emptyForm, role: isSuper ? defaultRole : 'user' });
    }
  }, [open, editing, account, isSuper, defaultRole]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const needsAreas = !editing && form.role === 'admin' && Array.isArray(form.permissions) && form.permissions.length === 0;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (needsAreas) { setError(t.k7_chooseAreasHint || 'Choose at least one area, or turn on Full access.'); return; }
    setBusy(true);
    try {
      if (editing) {
        const body = { name: form.name, phone: form.phone, address: form.address };
        if (isSuper && !account.isGoogleUser && form.email !== account.email) body.email = form.email;
        const res = await api.patch(`/admin/accounts/${account._id}`, body);
        showToast(t.k7_accountUpdated || 'Account updated', 'success');
        onSaved({ account: res.data.data });
      } else {
        const body = {
          name: form.name, email: form.email, phone: form.phone, address: form.address, role: form.role,
          ...(form.role === 'admin' ? { permissions: form.permissions } : {}),
          ...(form.passwordMode === 'generate' ? { generatePassword: true } : { password: form.password }),
        };
        const res = await api.post('/admin/accounts', body);
        showToast(form.role === 'admin' ? (t.k7_adminCreated || 'Admin created') : (t.k7_accountCreatedToast || 'Account created'), 'success');
        onSaved({ account: res.data.data, temporaryPassword: res.data.temporaryPassword, created: true });
      }
    } catch (err) {
      setError(errorText(err, t.k7_saveFailed || 'Could not save the account'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      size="lg"
      title={editing ? (t.k7_editAccount || 'Edit account') : (form.role === 'admin' ? (t.k7_addAdmin || 'Add an admin') : (t.k7_addAccount || 'Add an account'))}
      description={editing ? account?.email : (form.role === 'admin'
        ? (t.k7_addAdminDesc || 'Create an admin sign-in and choose which parts of the panel they can use.')
        : (t.k7_addAccountDesc || 'Create a sign-in for someone, for example a devotee who asked the temple office for help.'))}
      closeLabel={t.close || 'Close'}
      footer={
        <>
          {needsAreas && (
            <span className="mr-auto text-xs text-amber-700" role="status">{t.k7_chooseAreasHint || 'Choose at least one area, or turn on Full access.'}</span>
          )}
          <Button onClick={onClose} disabled={busy}>{t.cancel || 'Cancel'}</Button>
          <Button variant="primary" type="submit" form="account-form" loading={busy} disabled={needsAreas}>
            {editing ? (t.k7_saveChanges || 'Save changes') : (t.k7_createAccount || 'Create account')}
          </Button>
        </>
      }
    >
      <form id="account-form" onSubmit={submit} className="space-y-4">
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        {!editing && isSuper && (
          <Field label={t.k7_accountType || 'Account type'}>
            <Segmented
              label={t.k7_accountType || 'Account type'}
              value={form.role}
              onChange={(role) => set({ role })}
              options={[
                { value: 'user', label: t.a1_usersUser || 'User' },
                { value: 'admin', label: t.a1_usersAdmin || 'Admin' },
              ]}
            />
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.fullName || 'Full name'} htmlFor="af-name">
            <input id="af-name" data-autofocus required minLength={2} maxLength={50} value={form.name} onChange={(e) => set({ name: e.target.value })} className={inputCls} />
          </Field>
          <Field
            label={t.email || 'Email'}
            htmlFor="af-email"
            hint={editing && !(isSuper && !account?.isGoogleUser) ? (account?.isGoogleUser ? (t.k7_googleEmailLocked || 'Signs in with Google; email cannot change.') : (t.k7_emailSuperOnly || 'Only the super administrator can change an email.')) : undefined}
          >
            <input
              id="af-email"
              type="email"
              required
              value={form.email}
              disabled={editing && !(isSuper && !account?.isGoogleUser)}
              onChange={(e) => set({ email: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label={t.phone || 'Phone'} htmlFor="af-phone">
            <input id="af-phone" type="tel" maxLength={30} value={form.phone} onChange={(e) => set({ phone: e.target.value })} className={inputCls} />
          </Field>
          <Field label={t.address || 'Address'} htmlFor="af-address">
            <input id="af-address" maxLength={200} value={form.address} onChange={(e) => set({ address: e.target.value })} className={inputCls} />
          </Field>
        </div>

        {!editing && form.role === 'admin' && (
          <div>
            <p className="mb-1.5 text-xs font-semibold text-ink">{t.k7_accessAreas || 'What can this admin use?'}</p>
            <AccessEditor value={form.permissions} onChange={(permissions) => set({ permissions })} t={t} requireOne />
          </div>
        )}

        {!editing && (
          <div className="space-y-3 rounded-xl border border-line p-4">
            <p className="text-xs font-semibold text-ink">{t.k7_signInPassword || 'Sign-in password'}</p>
            <Segmented
              label={t.k7_signInPassword || 'Sign-in password'}
              value={form.passwordMode}
              onChange={(passwordMode) => set({ passwordMode, password: '' })}
              options={[
                { value: 'generate', label: t.k7_generateForMe || 'Generate one for me' },
                { value: 'type', label: t.k7_iWillType || 'I will type one' },
              ]}
            />
            {form.passwordMode === 'generate' ? (
              <p className="text-xs text-ink-soft">
                {t.k7_generateExplain || 'A strong temporary password is created and shown once after you save.'}
              </p>
            ) : (
              <Field
                htmlFor="af-password"
                hint={t.k7_pwMin8 || 'At least 8 characters'}
              >
                <PasswordField
                  id="af-password"
                  value={form.password}
                  onChange={(password) => set({ password })}
                  required
                  minLength={form.role === 'admin' ? 8 : 6}
                  showMeter
                  generator
                  t={t}
                />
              </Field>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
};

/* ------------------------------------------------------------------ */
/* Access areas for an existing admin                                   */
/* ------------------------------------------------------------------ */

const AccessModal = ({ account, onClose, onSaved, t }) => {
  const { showToast } = useToast();
  const [value, setValue] = useState(Array.isArray(account?.permissions) ? account.permissions : null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setValue(Array.isArray(account?.permissions) ? account.permissions : null); }, [account]);
  if (!account) return null;
  const save = async () => {
    setBusy(true);
    try {
      const res = await api.put(`/admin/accounts/${account._id}/permissions`, { permissions: value });
      showToast(t.k7_accessSaved || 'Access updated', 'success');
      onSaved(res.data.data);
    } catch (err) {
      showToast(errorText(err, t.k7_saveFailed || 'Could not save the account'), 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      onClose={busy ? undefined : onClose}
      size="lg"
      title={t.k7_editAccess || 'Edit access'}
      description={`${account.name} · ${account.email}`}
      closeLabel={t.close || 'Close'}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>{t.cancel || 'Cancel'}</Button>
          <Button variant="primary" onClick={save} loading={busy}>{t.k7_saveChanges || 'Save changes'}</Button>
        </>
      }
    >
      <AccessEditor value={value} onChange={setValue} t={t} />
      <p className="mt-3 text-xs text-mute">{t.k7_accessTakesEffect || 'Takes effect on their next click; they do not need to sign in again.'}</p>
    </Modal>
  );
};

/** Promote an ordinary user to admin (choose access first). */
const PromoteModal = ({ account, onClose, onSaved, t }) => {
  const { showToast } = useToast();
  const [value, setValue] = useState([]); // no areas until chosen
  const [busy, setBusy] = useState(false);
  if (!account) return null;
  const needsAreas = Array.isArray(value) && value.length === 0;
  const save = async () => {
    if (needsAreas) return;
    setBusy(true);
    try {
      const res = await api.put(`/admin/accounts/${account._id}/role`, { role: 'admin', permissions: value });
      showToast(t.k7_nowAdmin || 'Now an admin', 'success');
      onSaved(res.data.data);
    } catch (err) {
      showToast(errorText(err, t.k7_saveFailed || 'Could not save the account'), 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      onClose={busy ? undefined : onClose}
      size="lg"
      title={t.k7_makeAdmin || 'Make admin'}
      description={`${account.name} · ${account.email}`}
      closeLabel={t.close || 'Close'}
      footer={
        <>
          {needsAreas && (
            <span className="mr-auto text-xs text-amber-700" role="status">{t.k7_chooseAreasHint || 'Choose at least one area, or turn on Full access.'}</span>
          )}
          <Button onClick={onClose} disabled={busy}>{t.cancel || 'Cancel'}</Button>
          <Button variant="primary" onClick={save} loading={busy} disabled={needsAreas}>{t.k7_makeAdmin || 'Make admin'}</Button>
        </>
      }
    >
      <p className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
        <ShieldAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        {t.k7_makeAdminWarn || 'Admins can change what visitors see on the website. Only give access to people you trust, and pick only the areas they need.'}
      </p>
      <AccessEditor value={value} onChange={setValue} t={t} requireOne />
    </Modal>
  );
};

/* ------------------------------------------------------------------ */
/* The hook                                                           */
/* ------------------------------------------------------------------ */

/**
 * @param viewer      the signed-in admin (from useAuth)
 * @param onChanged   called with { account } after an edit/role/status change, or { deletedId }
 */
export const useAccountActions = ({ viewer, onChanged, t = {} }) => {
  const { showToast } = useToast();
  const [dlg, setDlg] = useState(null); // { type, account }
  const [busy, setBusy] = useState(false);
  const [credential, setCredential] = useState(null);

  const open = (type, account) => setDlg({ type, account });
  const close = () => { if (!busy) setDlg(null); };

  const fail = (err, fallback) => showToast(errorText(err, fallback), 'error');

  const run = async (fn, okMsg, after) => {
    setBusy(true);
    try {
      const res = await fn();
      if (okMsg) showToast(okMsg, 'success');
      after?.(res);
      setDlg(null);
    } catch (err) {
      fail(err, t.k7_actionFailed || 'That did not work. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const reactivate = (account) =>
    api.put(`/admin/accounts/${account._id}/status`, { active: true })
      .then((res) => { showToast(t.k7_reactivated || 'Account reactivated', 'success'); onChanged({ account: res.data.data }); })
      .catch((err) => fail(err, t.k7_actionFailed || 'That did not work. Please try again.'));

  const a = dlg?.account;

  const dialogs = (
    <>
      <AccountFormModal
        open={dlg?.type === 'create' || dlg?.type === 'edit'}
        mode={dlg?.type === 'edit' ? 'edit' : 'create'}
        account={a}
        defaultRole={dlg?.account?.role || 'user'}
        viewer={viewer}
        onClose={close}
        t={t}
        onSaved={({ account, temporaryPassword, created }) => {
          setDlg(null);
          onChanged({ account, created });
          if (temporaryPassword) setCredential({ account, password: temporaryPassword, created: true });
        }}
      />

      {dlg?.type === 'access' && (
        <AccessModal account={a} t={t} onClose={close} onSaved={(account) => { setDlg(null); onChanged({ account }); }} />
      )}
      {dlg?.type === 'promote' && (
        <PromoteModal account={a} t={t} onClose={close} onSaved={(account) => { setDlg(null); onChanged({ account }); }} />
      )}

      <ConfirmDialog
        open={dlg?.type === 'suspend'}
        onClose={close}
        busy={busy}
        tone="danger"
        title={t.k7_suspendTitle || 'Suspend this account?'}
        message={a && (t.k7_suspendMsg || '{name} will be signed out everywhere right away and will not be able to sign in until you reactivate the account.').replace('{name}', a.name || a.email)}
        reasonLabel={t.k7_suspendReason || 'Reason (optional, only admins see it)'}
        confirmLabel={t.k7_suspend || 'Suspend'}
        cancelLabel={t.cancel || 'Cancel'}
        onConfirm={(reason) =>
          run(
            () => api.put(`/admin/accounts/${a._id}/status`, { active: false, reason }),
            t.k7_suspendedToast || 'Account suspended',
            (res) => onChanged({ account: res.data.data })
          )
        }
      />

      <ConfirmDialog
        open={dlg?.type === 'reset'}
        onClose={close}
        busy={busy}
        tone="primary"
        title={t.k7_resetTitle || 'Reset this password?'}
        message={a && (t.k7_resetMsg || 'A new temporary password is created for {name} and shown once. Their current password stops working and they are signed out everywhere.').replace('{name}', a.name || a.email)}
        confirmLabel={t.k7_resetPassword || 'Reset password'}
        cancelLabel={t.cancel || 'Cancel'}
        onConfirm={() =>
          run(
            () => api.post(`/admin/accounts/${a._id}/reset-password`),
            null,
            (res) => {
              onChanged({ account: res.data.data });
              setCredential({ account: res.data.data, password: res.data.temporaryPassword, created: false });
            }
          )
        }
      />

      <ConfirmDialog
        open={dlg?.type === 'revoke'}
        onClose={close}
        busy={busy}
        tone="primary"
        title={t.k7_revokeTitle || 'Sign out everywhere?'}
        message={a && (t.k7_revokeMsg || '{name} will have to sign in again on every phone and computer. Nothing else changes.').replace('{name}', a.name || a.email)}
        confirmLabel={t.k7_signOutEverywhere || 'Sign out everywhere'}
        cancelLabel={t.cancel || 'Cancel'}
        onConfirm={() =>
          run(
            () => api.post(`/admin/accounts/${a._id}/revoke-sessions`),
            t.k7_signedOut || 'Signed out of every device',
            (res) => onChanged({ account: res.data.data })
          )
        }
      />

      <ConfirmDialog
        open={dlg?.type === 'demote'}
        onClose={close}
        busy={busy}
        tone="danger"
        title={t.k7_demoteTitle || 'Remove admin access?'}
        message={a && (t.k7_demoteMsg || '{name} becomes an ordinary user and loses access to the admin panel immediately. Their account and history stay.').replace('{name}', a.name || a.email)}
        confirmLabel={t.k7_removeAdmin || 'Remove admin access'}
        cancelLabel={t.cancel || 'Cancel'}
        onConfirm={() =>
          run(
            () => api.put(`/admin/accounts/${a._id}/role`, { role: 'user' }),
            t.k7_adminRemoved || 'Admin access removed',
            (res) => onChanged({ account: res.data.data })
          )
        }
      />

      <ConfirmDialog
        open={dlg?.type === 'delete'}
        onClose={close}
        busy={busy}
        tone="danger"
        title={t.k7_deleteTitle || 'Delete this account?'}
        message={a && (t.k7_deleteMsg || 'This permanently deletes {name}. This cannot be undone.').replace('{name}', a.name || a.email)}
        requireText="DELETE"
        confirmLabel={t.k7_deleteAccount || 'Delete account'}
        cancelLabel={t.cancel || 'Cancel'}
        onConfirm={() =>
          run(
            () => api.delete(`/admin/accounts/${a._id}`),
            t.k7_accountDeleted || 'Account deleted',
            () => onChanged({ deletedId: a._id })
          )
        }
      >
        {a && (a.bookingCount > 0 || a.donationCount > 0) && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {(t.k7_deleteHasRecords || 'They have {b} booking(s) and {d} donation(s). Those records stay, but will no longer be linked to an account.')
              .replace('{b}', a.bookingCount || 0).replace('{d}', a.donationCount || 0)}
          </p>
        )}
      </ConfirmDialog>

      <CredentialModal credential={credential} onClose={() => setCredential(null)} t={t} />
    </>
  );

  return { open, reactivate, dialogs, busy };
};
