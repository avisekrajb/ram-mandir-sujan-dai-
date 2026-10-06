import React from 'react';
import { LogOut, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Button, Panel } from './kit/kit';
import PasswordChangeForm from './kit/PasswordChangeForm';

/**
 * Shown instead of the admin panel while an admin is still using a temporary
 * password issued by the super administrator.
 */
const ForcePasswordChange = () => {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center bg-panel px-4 py-10">
      <Panel className="w-full max-w-md p-6 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <ShieldAlert size={20} aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-serif text-xl font-semibold text-ink">{t.k7_forceTitle || 'Choose your own password'}</h1>
            <p className="mt-1 text-sm text-ink-soft">
              {(t.k7_forceText || 'Hello {name}. You signed in with a temporary password. Set a password only you know to continue.').replace('{name}', user?.name || '')}
            </p>
          </div>
        </div>
        <PasswordChangeForm t={t} requireStrong submitLabel={t.k7_forceSubmit || 'Save and continue'} />
        <div className="mt-5 border-t border-line pt-4">
          <Button variant="ghost" size="sm" icon={LogOut} onClick={() => { logout(); navigate('/'); }}>{t.logout || 'Log out'}</Button>
        </div>
      </Panel>
    </div>
  );
};

export default ForcePasswordChange;
