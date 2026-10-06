import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import api from '../../../services/api';
import { setToken } from '../../../services/auth';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Button, Field } from './kit';
import PasswordField, { passwordStrength } from './PasswordField';
import { errorText } from './AccountDialogs';

/**
 * Change the signed-in admin's password. The server signs every other device
 * out and returns a fresh token, which replaces the stored one so this browser
 * stays signed in.
 */
const PasswordChangeForm = ({ t = {}, onChanged, submitLabel, requireStrong }) => {
  const { user, setUser } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const mismatch = form.confirm && form.next !== form.confirm;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.next !== form.confirm) { setError(t.a1_settingsPasswordMismatch || 'New passwords do not match'); return; }
    if (form.next.length < 8) { setError(t.k7_pwMin8Msg || 'Use at least 8 characters'); return; }
    if (requireStrong && passwordStrength(form.next) < 2) { setError(t.k7_pwTooWeak || 'Choose a stronger password'); return; }
    setBusy(true);
    try {
      const res = await api.put('/admin/profile/password', { currentPassword: form.current, newPassword: form.next });
      if (res.data.token) setToken(res.data.token);
      setUser({ ...user, mustChangePassword: false });
      showToast(t.a1_settingsPasswordChanged || 'Password changed successfully', 'success');
      setForm({ current: '', next: '', confirm: '' });
      onChanged?.();
    } catch (err) {
      setError(errorText(err, t.a1_settingsPasswordChangeFailed || 'Failed to change password'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <Field label={t.a1_settingsCurrentPassword || 'Current password'} htmlFor="pc-current">
        <PasswordField id="pc-current" value={form.current} onChange={(v) => set({ current: v })} autoComplete="current-password" required t={t} />
      </Field>
      <Field label={t.a1_settingsNewPassword || 'New password'} htmlFor="pc-next" hint={t.k7_pwMin8 || 'At least 8 characters'}>
        <PasswordField id="pc-next" value={form.next} onChange={(v) => set({ next: v })} required minLength={8} showMeter generator t={t} />
      </Field>
      <Field label={t.a1_settingsConfirmNewPassword || 'Confirm new password'} htmlFor="pc-confirm" error={mismatch ? (t.a1_settingsPasswordMismatch || 'New passwords do not match') : undefined}>
        <PasswordField id="pc-confirm" value={form.confirm} onChange={(v) => set({ confirm: v })} required t={t} />
      </Field>
      <p className="text-xs text-mute">{t.k7_pwChangeNote || 'Changing your password signs you out of every other phone and computer.'}</p>
      <Button variant="primary" type="submit" icon={KeyRound} loading={busy} disabled={!form.current || !form.next || !form.confirm}>
        {submitLabel || t.a1_settingsChangePassword || 'Change password'}
      </Button>
    </form>
  );
};

export default PasswordChangeForm;
