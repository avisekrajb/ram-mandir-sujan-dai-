import React, { useEffect, useState } from 'react';
import { Building2, Plus, Trash2, Save, Pencil, X, Banknote, QrCode } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

const EMPTY_ACCOUNT = {
  title: '',
  bankName: '',
  accountHolder: '',
  accountNumber: '',
  accountType: 'current',
  branch: '',
  instruction: '',
  active: true,
  order: 0,
};

const ACCOUNT_TYPES = ['current', 'savings', 'fixed', 'wallet', 'other'];

const FIELD =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-[#A80808]';
const LABEL = 'mb-1 block text-xs font-bold text-gray-700';

/**
 * Bank Transfer Details (Admin → Donations).
 *
 * These are the records the public donate page actually lists, so editing them
 * here changes what a donor sees. They used to be reachable only from the
 * super-admin area, and the account-number fields that did sit on this page
 * wrote to a legacy settings trio the public config ignores as soon as one real
 * account exists — which is why editing them appeared to do nothing.
 */
const BankAccounts = ({ t = {}, onChanged }) => {
  const { showToast } = useToast();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null); // account object, or EMPTY_ACCOUNT for new
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const res = await api.get('/admin/donations/accounts');
      // The endpoint answers { success, count, data: [...] }; accept a bare array
      // too so the list never renders empty on a shape change.
      const list = Array.isArray(res.data) ? res.data : res.data?.data;
      setAccounts(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e.response?.data?.message || (t?.a1_donAccountsLoadFailed || 'Could not load the bank accounts'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (patch) => setEditing((prev) => ({ ...prev, ...patch }));

  const save = async () => {
    if (!editing) return;
    if (!String(editing.accountNumber || '').trim()) {
      setError(t?.a1_donAccountNumberRequired || 'Enter the account number.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (editing._id) {
        await api.put(`/admin/donations/accounts/${editing._id}`, editing);
        showToast(t?.a1_donAccountUpdated || 'Account updated', 'success');
      } else {
        await api.post('/admin/donations/accounts', editing);
        showToast(t?.a1_donAccountAdded || 'Account added', 'success');
      }
      setEditing(null);
      await load();
      onChanged?.();
    } catch (e) {
      setError(e.response?.data?.message || (t?.a1_donSaveSettingsFailed || 'Could not save the account'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (account) => {
    const label = account.title || account.bankName || account.accountNumber;
    if (!window.confirm((t?.a1_donDeleteAccountConfirm || 'Delete "{name}"?').replace('{name}', label))) return;
    setBusy(true);
    setError('');
    try {
      await api.delete(`/admin/donations/accounts/${account._id}`);
      showToast(t?.a1_donAccountDeleted || 'Account deleted', 'success');
      await load();
      onChanged?.();
    } catch (e) {
      setError(e.response?.data?.message || (t?.a1_donDeleteFailed || 'Could not delete the account'));
    } finally {
      setBusy(false);
    }
  };

  // Switch an account off without losing it: donors stop being shown it, the
  // record (and any past donation mentioning it) stays.
  const toggleActive = async (account) => {
    setBusy(true);
    setError('');
    try {
      await api.put(`/admin/donations/accounts/${account._id}`, { active: !account.active });
      await load();
      onChanged?.();
    } catch (e) {
      setError(e.response?.data?.message || (t?.a1_donSaveSettingsFailed || 'Could not update the account'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-[#A80808]/10 to-[#A80808]/5 px-6 py-4">
        <div>
          <h4 className="flex items-center gap-2 font-semibold text-gray-700">
            <Banknote size={18} className="text-[#A80808]" aria-hidden="true" />
            {t?.a1_donBankTransferDetails || 'Bank Transfer Details'}
          </h4>
          <p className="text-xs text-gray-400">
            {t?.a1_donBankAccountsHint ||
              'The accounts donors are asked to transfer to. Only switched-on accounts appear on the donate page.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setError(''); setEditing({ ...EMPTY_ACCOUNT, order: accounts.length + 1 }); }}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl bg-[#A80808] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#660505] disabled:opacity-50"
        >
          <Plus size={15} aria-hidden="true" />
          {t?.a1_donAddAccount || 'Add account'}
        </button>
      </div>

      <div className="px-6 py-5">
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        {editing && (
          <div className="mb-5 rounded-xl border border-[#A80808]/30 bg-panel p-4">
            <p className="mb-3 text-sm font-semibold text-ink">
              {editing._id
                ? (t?.a1_donEditAccount || 'Edit account')
                : (t?.a1_donAddAccount || 'Add account')}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={LABEL}>
                {t?.a1_donAccountTitle || 'Title'}
                <input
                  className={FIELD}
                  value={editing.title || ''}
                  onChange={(e) => set({ title: e.target.value })}
                  placeholder={t?.a1_donAccountTitlePlaceholder || 'e.g. Main donation account'}
                />
              </label>
              <label className={LABEL}>
                {t?.a1_donAccountType || 'Account type'}
                <select
                  className={FIELD}
                  value={editing.accountType || 'current'}
                  onChange={(e) => set({ accountType: e.target.value })}
                >
                  {ACCOUNT_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>
              <label className={LABEL}>
                {t?.bankName || 'Bank name'}
                <input
                  className={FIELD}
                  value={editing.bankName || ''}
                  onChange={(e) => set({ bankName: e.target.value })}
                />
              </label>
              <label className={LABEL}>
                {t?.a1_donAccountNumber || 'Account number'} <span className="text-red-500">*</span>
                <input
                  className={FIELD}
                  value={editing.accountNumber || ''}
                  onChange={(e) => set({ accountNumber: e.target.value })}
                />
              </label>
              <label className={LABEL}>
                {t?.accountHolder || 'Account holder'}
                <input
                  className={FIELD}
                  value={editing.accountHolder || ''}
                  onChange={(e) => set({ accountHolder: e.target.value })}
                />
              </label>
              <label className={LABEL}>
                {t?.a1_donBranch || 'Branch'}
                <input
                  className={FIELD}
                  value={editing.branch || ''}
                  onChange={(e) => set({ branch: e.target.value })}
                />
              </label>
              <label className={`${LABEL} sm:col-span-2`}>
                {t?.a1_donInstruction || 'Instruction for the donor'}
                <input
                  className={FIELD}
                  value={editing.instruction || ''}
                  onChange={(e) => set({ instruction: e.target.value })}
                  placeholder={t?.a1_donInstructionPlaceholder || 'e.g. Send the transfer receipt afterwards'}
                />
              </label>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={save}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl bg-[#A80808] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#660505] disabled:opacity-50"
              >
                <Save size={15} aria-hidden="true" />
                {busy ? (t?.a1_c_saving || 'Saving...') : (t?.save || 'Save')}
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                <X size={15} aria-hidden="true" />
                {t?.cancel || 'Cancel'}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">{t?.loading || 'Loading...'}</p>
        ) : accounts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 px-5 py-8 text-center">
            <Building2 size={32} className="mx-auto mb-2 text-gray-300" aria-hidden="true" />
            <p className="text-sm font-semibold text-gray-600">
              {t?.a1_donNoAccounts || 'No accounts yet'}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {t?.a1_donNoAccountsHint || 'Add the account donors should transfer to.'}
            </p>
          </div>
        ) : (
          <ul className="m-0 list-none space-y-3 p-0">
            {accounts.map((account) => (
              <li
                key={account._id}
                className={`rounded-xl border px-4 py-3 ${account.active !== false ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${account.active !== false ? 'text-ink' : 'text-gray-400 line-through'}`}>
                      {account.title || account.bankName || account.accountNumber}
                    </p>
                    <p className="mt-0.5 font-mono text-sm text-gray-700">{account.accountNumber}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {[account.bankName, account.accountHolder, account.branch].filter(Boolean).join(' • ')}
                    </p>
                    {account.instruction && (
                      <p className="mt-1 text-xs text-gray-400">{account.instruction}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleActive(account)}
                      disabled={busy}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                        account.active !== false
                          ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                          : 'border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {account.active !== false
                        ? (t?.a1_donShown || 'Shown')
                        : (t?.a1_donHiddenAccount || 'Hidden')}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setError(''); setEditing({ ...account }); }}
                      disabled={busy}
                      aria-label={t?.edit || 'Edit'}
                      className="rounded-lg border border-gray-200 p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-[#A80808] disabled:opacity-50"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(account)}
                      disabled={busy}
                      aria-label={t?.delete || 'Delete'}
                      className="rounded-lg border border-red-200 p-2 text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default BankAccounts;