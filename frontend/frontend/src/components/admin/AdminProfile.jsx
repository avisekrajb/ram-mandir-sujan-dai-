/**
 * Admin → My account: profile, password, sign-in security and own recent
 * activity. Replaces the old "Admin Settings" page (which also mixed in admin
 * management and the activity log; those now live on their own pages).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera, Clock, History, KeyRound, LogOut, MapPin, Save, ShieldCheck, Trash2, User as UserIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { setToken } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { AREAS, describeAccess } from '../../utils/permissions';
import {
  Avatar, Button, Field, PageHeader, Panel, PanelHeader, Pill, RoleBadge, Skeleton, fullDate, inputCls, timeAgo,
} from './kit/kit';
import { ConfirmDialog } from './kit/Overlays';
import { errorText } from './kit/AccountDialogs';
import PasswordChangeForm from './kit/PasswordChangeForm';

const ACTION_TEXT = {
  'Profile Updated': 'Updated profile',
  'Password Changed': 'Changed password',
  'Signed Out Everywhere': 'Signed out of every other device',
  'Settings Updated': 'Updated site settings',
};

const AdminProfile = ({ t = {} }) => {
  const { user, setUser } = useAuth();
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/profile');
      setData(res.data);
      const u = res.data.data;
      setForm({ name: u.name || '', phone: u.phone || '', address: u.address || '' });
    } catch (err) {
      setError(errorText(err, t.k7_loadProfileFailed || 'Could not load your account'));
    }
  }, [t.k7_loadProfileFailed]);

  useEffect(() => { load(); }, [load]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/admin/profile', form);
      const u = res.data.data;
      setUser({ ...user, name: u.name, phone: u.phone, address: u.address });
      setData((d) => ({ ...d, data: { ...d.data, ...u } }));
      showToast(t.a1_settingsProfileUpdated || 'Profile updated successfully', 'success');
    } catch (err) {
      showToast(errorText(err, t.a1_settingsProfileUpdateFailed || 'Failed to update profile'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append('photo', file);
    setPhotoBusy(true);
    try {
      const res = await api.post('/admin/profile/photo', body, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = res.data?.data?.profilePhoto;
      if (url) {
        setUser({ ...user, profilePhoto: url });
        setData((d) => ({ ...d, data: { ...d.data, profilePhoto: url } }));
        showToast(t.a1_settingsPhotoUpdated || 'Profile photo updated successfully', 'success');
      }
    } catch (err) {
      showToast(errorText(err, t.a1_settingsPhotoUploadFailed || 'Failed to upload photo'), 'error');
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removePhoto = async () => {
    setPhotoBusy(true);
    try {
      await api.delete('/admin/profile/photo');
      setUser({ ...user, profilePhoto: null });
      setData((d) => ({ ...d, data: { ...d.data, profilePhoto: null } }));
      showToast(t.a1_settingsPhotoRemoved || 'Profile photo removed', 'success');
    } catch (err) {
      showToast(errorText(err, t.a1_settingsPhotoRemoveFailed || 'Failed to remove photo'), 'error');
    } finally {
      setPhotoBusy(false);
    }
  };

  const signOutOthers = async () => {
    setSigningOut(true);
    try {
      const res = await api.post('/admin/profile/revoke-sessions');
      if (res.data.token) setToken(res.data.token);
      showToast(t.k7_signedOutOthers || 'Signed out of every other device', 'success');
      setConfirmSignOut(false);
    } catch (err) {
      showToast(errorText(err, t.k7_actionFailed || 'That did not work. Please try again.'), 'error');
    } finally {
      setSigningOut(false);
    }
  };

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) {
    return <div className="grid gap-6 lg:grid-cols-2"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>;
  }

  const me = data.data;
  const sec = data.security;
  const dirty = form.name !== (me.name || '') || form.phone !== (me.phone || '') || form.address !== (me.address || '');

  return (
    <div>
      <PageHeader
        title={t.k7_myAccount || 'My account'}
        description={t.k7_myAccountDesc || 'Your details, password and sign-in security.'}
      />

      {sec.mustChangePassword && (
        <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t.k7_mustChangeBanner || 'You are using a temporary password. Please choose your own below.'}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {/* Identity */}
          <Panel>
            <PanelHeader icon={UserIcon} title={t.a1_settingsProfileSettings || 'Profile'} />
            <div className="p-5">
              <div className="mb-5 flex items-center gap-4">
                <Avatar user={me} size={72} />
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-ink">{me.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <RoleBadge role={me.role} t={t} />
                    <Pill>{me.role === 'superadmin' ? (t.k7_fullAccess || 'Full access') : describeAccess(sec.permissions, t)}</Pill>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <input ref={fileRef} type="file" accept="image/*" onChange={uploadPhoto} className="hidden" aria-label={t.uploadPhoto || 'Upload photo'} />
                    <Button size="sm" icon={Camera} onClick={() => fileRef.current?.click()} loading={photoBusy}>{t.uploadPhoto || 'Upload photo'}</Button>
                    {me.profilePhoto && <Button size="sm" variant="ghost" icon={Trash2} onClick={removePhoto} disabled={photoBusy}>{t.remove || 'Remove'}</Button>}
                  </div>
                </div>
              </div>

              <form onSubmit={saveProfile} className="space-y-4">
                <Field label={t.fullName || 'Full name'} htmlFor="pf-name">
                  <input id="pf-name" required minLength={2} maxLength={50} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
                </Field>
                <Field label={t.email || 'Email'} htmlFor="pf-email" hint={t.a1_settingsEmailLocked || 'Email cannot be changed'}>
                  <input id="pf-email" value={me.email} disabled className={inputCls} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t.phone || 'Phone'} htmlFor="pf-phone">
                    <input id="pf-phone" type="tel" maxLength={30} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label={t.address || 'Address'} htmlFor="pf-address">
                    <input id="pf-address" maxLength={200} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputCls} />
                  </Field>
                </div>
                <Button variant="primary" type="submit" icon={Save} loading={saving} disabled={!dirty}>{t.k7_saveChanges || 'Save changes'}</Button>
              </form>
            </div>
          </Panel>

          {/* Access */}
          {me.role === 'admin' && (
            <Panel>
              <PanelHeader icon={ShieldCheck} title={t.k7_yourAccess || 'Your access'} description={t.k7_yourAccessDesc || 'Set by the super administrator.'} />
              <div className="flex flex-wrap gap-2 p-5">
                {(Array.isArray(sec.permissions) ? AREAS.filter((a) => sec.permissions.includes(a.key)) : AREAS).map((a) => (
                  <Pill key={a.key} tone="red" icon={a.icon}>{t[a.labelKey] || a.label}</Pill>
                ))}
                {Array.isArray(sec.permissions) && sec.permissions.length === 0 && <p className="text-sm text-ink-soft">{t.k7_noAreas || 'No areas'}</p>}
              </div>
            </Panel>
          )}
        </div>

        <div className="space-y-6">
          {/* Password */}
          <Panel>
            <PanelHeader icon={KeyRound} title={t.a1_settingsChangePassword || 'Change password'} />
            <div className="p-5">
              {sec.isGoogleUser ? (
                <p className="text-sm text-ink-soft">{t.k7_googlePassword || 'You sign in with Google, so there is no password here to change. Manage it from your Google account.'}</p>
              ) : (
                <PasswordChangeForm t={t} onChanged={load} />
              )}
            </div>
          </Panel>

          {/* Security */}
          <Panel>
            <PanelHeader icon={Clock} title={t.k7_signInSecurity || 'Sign-in security'} />
            <div className="space-y-4 p-5 text-sm">
              <div className="flex items-start gap-3">
                <Clock size={15} className="mt-0.5 text-mute" aria-hidden="true" />
                <div>
                  <p className="text-xs text-mute">{t.k7_lastSignIn || 'Last sign-in'}</p>
                  <p className="text-ink">{sec.lastLoginAt ? fullDate(sec.lastLoginAt, lang) : (t.k7_noSignInRecorded || 'No sign-in recorded yet')}</p>
                  <p className="text-xs text-mute">{(t.k7_signInsCount || '{n} sign-ins').replace('{n}', sec.loginCount)}</p>
                </div>
              </div>
              {sec.lastLoginIp && (
                <div className="flex items-start gap-3">
                  <MapPin size={15} className="mt-0.5 text-mute" aria-hidden="true" />
                  <div>
                    <p className="text-xs text-mute">{t.k7_fromAddress || 'From address'}</p>
                    <p className="font-mono text-ink">{sec.lastLoginIp}</p>
                  </div>
                </div>
              )}
              <div className="rounded-xl border border-line p-4">
                <p className="font-semibold text-ink">{t.k7_signOutOthersTitle || 'Sign out of other devices'}</p>
                <p className="mt-1 text-xs text-ink-soft">{t.k7_signOutOthersText || 'Lost a phone or used a shared computer? This signs you out everywhere except this browser.'}</p>
                <Button className="mt-3" size="sm" icon={LogOut} onClick={() => setConfirmSignOut(true)}>{t.k7_signOutOthers || 'Sign out other devices'}</Button>
              </div>
            </div>
          </Panel>

          {/* Recent activity */}
          <Panel>
            <PanelHeader
              icon={History}
              title={t.k7_myActivity || 'My recent activity'}
              actions={<Link to="/admin/audit" className="text-xs font-semibold text-vermilion hover:underline">{t.k7_viewAudit || 'View audit log'}</Link>}
            />
            {data.recentActivity.length === 0 ? (
              <p className="p-5 text-sm text-ink-soft">{t.a1_settingsNoActivity || 'No admin activity recorded yet'}</p>
            ) : (
              <ul className="divide-y divide-line">
                {data.recentActivity.map((a) => (
                  <li key={a._id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                    <span className="min-w-0 truncate text-ink">{ACTION_TEXT[a.action] || a.action}</span>
                    <span className="shrink-0 text-xs text-mute">{timeAgo(a.at, t, lang)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <ConfirmDialog
        open={confirmSignOut}
        onClose={() => !signingOut && setConfirmSignOut(false)}
        busy={signingOut}
        tone="primary"
        title={t.k7_signOutOthersTitle || 'Sign out of other devices'}
        message={t.k7_signOutOthersConfirm || 'Every other phone and computer signed in as you will have to sign in again. This browser stays signed in.'}
        confirmLabel={t.k7_signOutOthers || 'Sign out other devices'}
        cancelLabel={t.cancel || 'Cancel'}
        onConfirm={signOutOthers}
      />
    </div>
  );
};

export default AdminProfile;
