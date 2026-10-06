import React, { useState, useEffect, useRef } from 'react';
import {
  Save,
  Trash2,
  QrCode,
  Plus,
  Pencil,
  X,
  Eye,
  EyeOff,
  Shield,
  Building2,
  Wallet,
  CreditCard,
  Smartphone,
  Landmark,
  Image as ImageIcon,
  Loader2,
  Info,
  AlertTriangle,
  Upload,
  RotateCcw,
  Hash,
  Copy,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';
import OmLoader from '../common/OmLoader';

// Cloudinary URLs are stored absolute, but older records may hold a bare
// public-id path — resolve both against the delivery host.
const getFullImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) {
    const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || 'dibusz4ag';
    return `https://res.cloudinary.com/${cloudName}/image/upload/${url}`;
  }
  return url;
};

const DEFAULT_FEATURES = {
  esewaEnabled: true,
  khaltiEnabled: true,
  ipsEnabled: true,
  qrEnabled: true,
  showBankDetails: true,
};

const ACCOUNT_TYPES = ['current', 'savings', 'fixed', 'wallet', 'other'];

const emptyAccount = () => ({
  _id: null,
  title: '',
  bankName: '',
  accountHolder: '',
  accountNumber: '',
  accountType: 'current',
  branch: '',
  instruction: '',
  note: '',
  qrPhoto: '',
  active: true,
  order: 0,
});

const Toggle = ({ enabled, onChange, disabled, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={enabled}
    aria-label={label}
    disabled={disabled}
    onClick={() => !disabled && onChange(!enabled)}
    className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
      enabled ? 'bg-vermilion' : 'bg-gray-300'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
        enabled ? 'translate-x-6' : 'translate-x-0'
      }`}
    />
  </button>
);

const AdminAccount = () => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();

  const isSuperAdmin = user?.role === 'superadmin';

  // Translated copy. Every string falls back to English so the page is never
  // blank if a key is missing.
  const L = {
    title: t?.donationAccount || 'Donation Account',
    intro:
      t?.donationAccountIntro ||
      'Turn payment features on or off, manage the QR code, and add the account numbers donors should transfer to.',
    superAdminOnly: t?.onlySuperAdminCanChange || 'Super admin only',
    whatDonorsSee: t?.whatDonorsSee || 'What donors will see on /donate',
    accountOnlyMode:
      t?.accountOnlyModeLabel || 'Account-number-only mode. All online gateways are off, so the donate page shows only the account number',
    accountOnlyQr: t?.andQrCode || 'and QR code',
    noAmountForm: t?.noAmountForm || 'no amount form.',
    nothingShowing:
      t?.nothingShowing || 'Nothing is showing. All gateways are off and account numbers are hidden.',
    enableOneGateway:
      t?.enableOneGateway || 'Enable at least one gateway or add an account number.',
    gatewaysEnabled: t?.gatewaysEnabled || 'payment gateways enabled.',
    donorsCanDonateOnline: t?.donorsCanDonateOnline || 'Donors can donate online',
    numbersShownBelowForm:
      t?.numbersShownBelowForm || 'the account numbers are shown below the form',
    withQrCode: t?.withQrCode || 'with the QR code',

    features: t?.paymentFeatures || 'Payment Features',
    featuresSub:
      t?.paymentFeaturesSub || 'Switch off a gateway to hide it from donors',
    on: t?.on || 'ON',
    off: t?.off || 'OFF',
    esewaDesc: t?.esewaFeatureDesc || 'Show the eSewa gateway option on the donate page',
    khaltiDesc: t?.khaltiFeatureDesc || 'Show the Khalti gateway option on the donate page',
    ipsDesc: t?.ipsFeatureDesc || 'Show the IPS gateway option on the donate page',
    qrDesc:
      t?.qrFeatureDesc ||
      'Show the QR image. Off = QR is hidden everywhere on the donate page',
    accountsDesc:
      t?.accountsFeatureDesc || 'Show the bank / account numbers listed below to donors',

    startingCount: t?.startingDonorCount || 'Starting Donor Count',
    startingCountHint:
      t?.startingDonorCountHint || 'Base number used by the public donor counter.',
    saveFeatures: t?.saveFeatureSettings || 'Save Feature Settings',
    canOnlyChange: t?.onlySuperAdminCanChange || 'Only a super admin can change these',

    qrCode: t?.donationQrCode || 'Donation QR Code',
    qrCodeSub:
      t?.donationQrCodeSub ||
      'Upload the QR shown on the donate page (eSewa / Khalti / FonePay)',
    noQr: t?.noQrUploaded || 'No QR code uploaded',
    fileHint: t?.fileHint || 'JPG / PNG / WEBP • max 5MB',
    replaceQr: t?.replaceQr || 'Replace QR',
    uploadQr: t?.uploadQr || 'Upload QR',
    viewQr: t?.viewQr || 'View',
    removeQr: t?.remove || 'Remove',
    dropHere: t?.dropImageHere || 'Drop the image here',
    orClick: t?.orClickToUpload || 'or click to choose a file',
    qrHidden: t?.qrSwitchedOffNote || 'QR is switched OFF — donors will not see it.',
    qrShown: t?.qrSwitchedOnNote || 'QR is switched ON and will be shown.',
    turnOn: t?.turnQrBackOn || 'Turn QR back ON',
    turnOff: t?.turnQrOff || 'Turn QR OFF',
    qrTip: t?.uploadTip || 'Square images work best. Uploading a new QR replaces the previous one.',
    qrHiddenOnPage: t?.qrHiddenOnPage || 'Hidden on the donate page',

    accNums: t?.accountNumbers || 'Account Numbers',
    accNumsSub: t?.accountNumbersSub || 'add, update or delete',
    addAccount: t?.addAccount || 'Add Account',
    addFirst: t?.addFirstAccount || 'Add First Account',
    noAccounts: t?.noAccountsYet || 'No accounts added yet',
    noAccountsHint:
      t?.noAccountsYetHint ||
      'Add the temple’s bank account so donors can transfer directly.',
    hiddenWarning:
      t?.accountsHiddenWarning ||
      'Account numbers are currently hidden from donors. Turn on “Account Numbers” above to show them.',
    visible: t?.showToDonors || 'Visible',
    hidden: t?.hideFromDonors || 'Hidden',

    modalTitleAdd: t?.addAccount || 'Add Account',
    modalTitleEdit: t?.a1_acctEditAccount || 'Edit Account',
    showThisAccount:
      t?.showThisAccount || 'Show this account to donors',
    bankProvider: t?.bankName || 'Bank / Provider',
    accountNumber: t?.accountNumber || 'Account Number',
    accountName: t?.accountName || 'Account Name',
    accountType: t?.accountTypeLabel || 'Account Type',
    accountHolder: t?.accountHolder || 'Account Holder',
    branch: t?.branchLabel || 'Branch',
    instruction: t?.instruction || 'Instruction',
    qrForAccount: t?.qrForThisAccount || 'QR for this account',
    qrForAccountHint:
      t?.qrForThisAccountHint ||
      'Optional. Shown on the donate page next to this account.',
    removeQrSmall: t?.remove || 'Remove',
    replace: t?.replaceQr || 'Replace',
    save: t?.saveChanges || 'Save Changes',
    cancel: t?.cancel || 'Cancel',
    required: t?.required || 'required',
  };

  const typeLabels = {
    current: t?.accTypeCurrent || 'Current Account',
    savings: t?.accTypeSavings || 'Savings Account',
    fixed: t?.accTypeFixed || 'Fixed Deposit',
    wallet: t?.accTypeWallet || 'Wallet',
    other: t?.accTypeOther || 'Account',
  };

  const FEATURE_ROWS = [
    {
      key: 'esewaEnabled',
      label: 'eSewa',
      description: L.esewaDesc,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
      Icon: Smartphone,
    },
    {
      key: 'khaltiEnabled',
      label: 'Khalti',
      description: L.khaltiDesc,
      color: 'text-brand-600',
      bg: 'bg-brand-50',
      border: 'border-brand-200',
      Icon: Wallet,
    },
    {
      key: 'ipsEnabled',
      label: 'IPS (ConnectIPS)',
      description: L.ipsDesc,
      color: 'text-brand-600',
      bg: 'bg-brand-50',
      border: 'border-brand-200',
      Icon: CreditCard,
    },
    {
      key: 'qrEnabled',
      label: L.qrCode,
      description: L.qrDesc,
      color: 'text-ink-soft',
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      Icon: QrCode,
    },
    {
      key: 'showBankDetails',
      label: L.accNums,
      description: L.accountsDesc,
      color: 'text-marigold',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      Icon: Landmark,
    },
  ];

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [savingFeatures, setSavingFeatures] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [features, setFeatures] = useState(DEFAULT_FEATURES);
  const [baseCount, setBaseCount] = useState(0);
  const [qrPhoto, setQrPhoto] = useState(null);
  const [qrUploading, setQrUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const [draft, setDraft] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountQrUploading, setAccountQrUploading] = useState(false);

  const mainQrInputRef = useRef(null);
  const accountQrInputRef = useRef(null);

  // ---------- loading ----------
  const loadAll = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await api.get('/superadmin/donation-config');
      const data = res.data?.data || {};
      setFeatures({ ...DEFAULT_FEATURES, ...(data.features || {}) });
      setAccounts(Array.isArray(data.allAccounts) ? data.allAccounts : []);
      setQrPhoto(getFullImageUrl(data.qrPhotoRaw || data.qrPhoto));
      setBaseCount(data.baseCount || 0);
    } catch (error) {
      console.error('Error loading donation config:', error);
      setLoadError(
        error.response?.status === 403
          ? t?.permissionDenied || 'You do not have permission to manage donation settings.'
          : error.response?.data?.message || t?.a1_acctLoadFailed || 'Failed to load donation settings'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gatewayCount = [
    features.esewaEnabled,
    features.khaltiEnabled,
    features.ipsEnabled,
  ].filter(Boolean).length;

  const hasBankNumbers =
    features.showBankDetails && accounts.some((a) => a.active !== false);
  const accountOnly = gatewayCount === 0;

  // ---------- feature toggles ----------
  const toggleFeature = (key, value) =>
    setFeatures((prev) => ({ ...prev, [key]: value }));

  const saveFeatures = async () => {
    setSavingFeatures(true);
    try {
      const res = await api.put('/superadmin/donation-features', {
        esewaEnabled: features.esewaEnabled,
        khaltiEnabled: features.khaltiEnabled,
        ipsEnabled: features.ipsEnabled,
        qrEnabled: features.qrEnabled,
        showBankDetails: features.showBankDetails,
        baseCount: Number(baseCount) || 0,
      });
      setFeatures((prev) => ({ ...prev, ...(res.data?.data || {}) }));
      showToast(t?.donationSettingsSaved || 'Donation settings saved', 'success');
    } catch (error) {
      console.error('Error saving donation features:', error);
      showToast(error.response?.data?.message || t?.a1_acctSaveFailed || 'Failed to save', 'error');
    } finally {
      setSavingFeatures(false);
    }
  };

  // ---------- main QR ----------
  // Shared by the file input and the drag & drop zone.
  const uploadQrFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast(t?.uploadImageOnly || 'Please upload an image file', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast(t?.imageTooLarge || 'Image must be less than 5MB', 'error');
      return;
    }

    setQrUploading(true);
    setDragOver(false);
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await api.post('/superadmin/donation/qr', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setQrPhoto(getFullImageUrl(res.data?.url));
      showToast(t?.qrCodeUploaded || 'QR code uploaded', 'success');
    } catch (error) {
      console.error('QR upload error:', error);
      showToast(error.response?.data?.message || t?.a1_acctQrUploadFailed || 'Failed to upload QR code', 'error');
    } finally {
      setQrUploading(false);
    }
  };

  const handleQrUpload = (e) => {
    uploadQrFile(e.target.files[0]);
    e.target.value = '';
  };

  const handleQrDrop = (e) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    uploadQrFile(e.dataTransfer?.files?.[0]);
  };

  const handleQrRemove = async () => {
    if (!window.confirm(t?.a1_acctRemoveQrConfirm || 'Remove the QR code from the donate page?')) return;
    try {
      await api.delete('/superadmin/donation/qr');
      setQrPhoto(null);
      showToast(t?.qrCodeRemoved || 'QR code removed', 'success');
    } catch (error) {
      console.error('QR remove error:', error);
      showToast(error.response?.data?.message || t?.a1_acctQrRemoveFailed || 'Failed to remove QR code', 'error');
    }
  };

  // ---------- account CRUD ----------
  const openAddModal = () => {
    setDraft(emptyAccount());
    setIsNew(true);
  };

  const openEditModal = (account) => {
    setDraft({
      ...emptyAccount(),
      ...account,
      qrPhoto: getFullImageUrl(account.qrPhoto) || '',
      // Older records only stored `note`.
      instruction: account.instruction || account.note || '',
    });
    setIsNew(false);
  };

  const closeModal = () => {
    setDraft(null);
    setIsNew(false);
  };

  const updateDraftField = (field, value) =>
    setDraft((prev) => ({ ...prev, [field]: value }));

  const handleAccountQrUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast(t?.uploadImageOnly || 'Please upload an image file', 'error');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast(t?.imageTooLarge || 'Image must be less than 5MB', 'error');
      e.target.value = '';
      return;
    }

    setAccountQrUploading(true);
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await api.post('/admin/upload/qr', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateDraftField('qrPhoto', getFullImageUrl(res.data?.url) || '');
      showToast(t?.accountQrUploaded || 'Account QR uploaded', 'success');
    } catch (error) {
      console.error('Account QR upload error:', error);
      showToast(error.response?.data?.message || t?.a1_acctAccountQrUploadFailed || 'Failed to upload QR', 'error');
    } finally {
      setAccountQrUploading(false);
    }
    e.target.value = '';
  };

  const handleSaveAccount = async () => {
    if (!draft) return;
    if (!String(draft.accountNumber).trim()) {
      showToast(t?.accountNumberRequired || 'Account number is required', 'error');
      return;
    }
    if (!String(draft.bankName).trim()) {
      showToast(t?.bankProviderRequired || 'Bank / provider name is required', 'error');
      return;
    }

    setSavingAccount(true);
    try {
      const payload = {
        title: draft.title,
        bankName: draft.bankName,
        accountHolder: draft.accountHolder,
        accountNumber: draft.accountNumber,
        accountType: draft.accountType,
        branch: draft.branch,
        instruction: draft.instruction || '',
        qrPhoto: draft.qrPhoto || null,
        active: draft.active,
      };

      if (isNew) {
        const res = await api.post('/superadmin/donation/accounts', payload);
        setAccounts((prev) => [...prev, res.data.data]);
        showToast(t?.accountAdded || 'Account added', 'success');
      } else {
        const res = await api.put(`/superadmin/donation/accounts/${draft._id}`, payload);
        setAccounts((prev) =>
          prev.map((a) => (a._id === draft._id ? { ...a, ...res.data.data } : a))
        );
        showToast(t?.accountUpdated || 'Account updated', 'success');
      }
      closeModal();
    } catch (error) {
      console.error('Save account error:', error);
      showToast(error.response?.data?.message || t?.a1_acctSaveAccountFailed || 'Failed to save account', 'error');
    } finally {
      setSavingAccount(false);
    }
  };

  const handleDeleteAccount = async (account) => {
    const label = account.bankName || account.title || t?.a1_acctThisAccount || 'this account';
    if (
      !window.confirm(
        (t?.a1_acctDeleteConfirm || 'Delete {name}? This cannot be undone.').replace('{name}', label)
      )
    )
      return;
    try {
      await api.delete(`/superadmin/donation/accounts/${account._id}`);
      setAccounts((prev) => prev.filter((a) => a._id !== account._id));
      showToast(t?.accountDeleted || 'Account deleted', 'success');
    } catch (error) {
      console.error('Delete account error:', error);
      showToast(error.response?.data?.message || t?.a1_acctDeleteFailed || 'Failed to delete account', 'error');
    }
  };

  const handleToggleAccount = async (account) => {
    const nextActive = account.active === false;
    setAccounts((prev) =>
      prev.map((a) => (a._id === account._id ? { ...a, active: nextActive } : a))
    );
    try {
      await api.put(`/superadmin/donation/accounts/${account._id}`, { active: nextActive });
    } catch (error) {
      console.error('Toggle account error:', error);
      setAccounts((prev) =>
        prev.map((a) => (a._id === account._id ? { ...a, active: !nextActive } : a))
      );
      showToast(t?.a1_acctStatusUpdateFailed || 'Failed to update account status', 'error');
    }
  };

  const copyToClipboard = async (text) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(String(text));
      } else {
        const el = document.createElement('textarea');
        el.value = String(text);
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      showToast(t?.copied || 'Copied', 'success');
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <OmLoader size="lg" color="vermilion" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 grid place-items-center mx-auto mb-4">
          <Shield size={24} />
        </div>
        <h3 className="font-serif text-lg text-ink">{L.title}</h3>
        <p className="text-sm text-ink-soft mt-2 max-w-md mx-auto">{loadError}</p>
        <p className="text-xs text-mute mt-3">
          {t?.superAdminOnlyPage ||
            'Payment features, the QR code and the account numbers can only be managed by a super admin.'}
        </p>
      </div>
    );
  }

  const inputClass =
    'w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-vermilion focus:outline-none transition-colors text-sm bg-white';
  const labelClass = 'text-xs font-bold text-gray-700 block mb-1.5';

  return (
    <div className="space-y-6">
      {/* ============ Header ============ */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-vermilion to-maroon-deep text-white flex items-center justify-center shadow-lg shadow-black/10 flex-shrink-0">
            <Landmark size={22} />
          </div>
          <div className="flex-1 min-w-[240px]">
            <h2 className="text-lg font-serif font-semibold text-ink">{L.title}</h2>
            <p className="text-xs text-ink-soft mt-1">{L.intro}</p>
          </div>
          {!isSuperAdmin && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
              <Shield size={14} /> {L.superAdminOnly}
            </div>
          )}
        </div>
      </div>

      {/* ============ Live preview of what donors will see ============ */}
      <div
        className={`rounded-2xl border p-5 flex items-start gap-3 ${
          accountOnly && hasBankNumbers
            ? 'bg-marigold/10 border-marigold/40'
            : 'bg-brand-50 border-brand-200'
        }`}
      >
        <Info size={18} className="text-brand-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-gray-700">
          <p className="font-semibold mb-1">{L.whatDonorsSee}</p>
          {accountOnly ? (
            hasBankNumbers ? (
              <p>
                <span className="font-semibold text-maroon">{L.accountOnlyMode}</span>
                {features.qrEnabled ? ` ${L.accountOnlyQr}` : ''} — {L.noAmountForm}
              </p>
            ) : (
              <p>
                <span className="font-semibold text-red-600">{L.nothingShowing}</span>{' '}
                {L.enableOneGateway}
              </p>
            )
          ) : (
            <p>
              <span className="font-semibold text-leaf">
                {gatewayCount} {L.gatewaysEnabled}
              </span>{' '}
              {L.donorsCanDonateOnline}
              {hasBankNumbers ? `, ${L.numbersShownBelowForm}` : ''}
              {features.qrEnabled ? `, ${L.withQrCode}` : ''}.
            </p>
          )}
        </div>
      </div>

      {/* ============ Feature switches ============ */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-vermilion/10 to-marigold/5 px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Shield size={18} className="text-vermilion" />
          <div>
            <h3 className="text-gray-800 font-semibold">{L.features}</h3>
            <p className="text-xs text-gray-400">{L.featuresSub}</p>
          </div>
        </div>

        <div className="p-6 space-y-3">
          {FEATURE_ROWS.map((row) => {
            const enabled = features[row.key] !== false;
            return (
              <div
                key={row.key}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                  enabled ? `${row.bg} ${row.border}` : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="w-11 h-11 rounded-xl bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                  <row.Icon size={20} className={enabled ? row.color : 'text-gray-400'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-800">{row.label}</span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        enabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {enabled ? L.on : L.off}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{row.description}</p>
                </div>
                <Toggle
                  enabled={enabled}
                  onChange={(v) => toggleFeature(row.key, v)}
                  disabled={!isSuperAdmin}
                  label={row.label}
                />
              </div>
            );
          })}

          <div className="grid sm:grid-cols-2 gap-4 pt-3 border-t border-gray-100">
            <div>
              <label className={labelClass}>{L.startingCount}</label>
              <input
                type="number"
                min={0}
                aria-label={L.startingCount} value={baseCount}
                disabled={!isSuperAdmin}
                onChange={(e) =>
                  setBaseCount(e.target.value === '' ? '' : Number(e.target.value))
                }
                className={inputClass}
              />
              <p className="text-xs text-gray-400 mt-1">{L.startingCountHint}</p>
            </div>
          </div>

          <div className="pt-3 flex items-center gap-3 flex-wrap">
            <button
              onClick={saveFeatures}
              disabled={savingFeatures || !isSuperAdmin}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-vermilion text-white font-semibold text-sm hover:bg-[#820606] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingFeatures ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}
              {L.saveFeatures}
            </button>
            {!isSuperAdmin && (
              <span className="text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle size={12} /> {L.canOnlyChange}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ============ QR upload screen ============ */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-vermilion/10 to-marigold/5 px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <QrCode size={18} className="text-vermilion" />
          <div>
            <h3 className="text-gray-800 font-semibold">{L.qrCode}</h3>
            <p className="text-xs text-gray-400">{L.qrCodeSub}</p>
          </div>
        </div>

        <div className="p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* ----- Upload screen ----- */}
            <div className="flex-1 min-w-0">
              <div
                role="button"
                tabIndex={0}
                onClick={() => isSuperAdmin && mainQrInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (isSuperAdmin) mainQrInputRef.current?.click();
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (isSuperAdmin) setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleQrDrop}
                className={`relative rounded-2xl border-2 border-dashed grid place-items-center text-center transition-all min-h-[300px] p-6 ${
                  dragOver
                    ? 'border-vermilion bg-vermilion/[0.06] scale-[1.01]'
                    : qrPhoto
                      ? 'border-gray-200 bg-gray-50'
                      : 'border-gray-300 bg-gray-50 hover:border-vermilion'
                } ${isSuperAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
              >
                <input
                  ref={mainQrInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleQrUpload}
                  className="hidden"
                />

                {qrUploading ? (
                  <div className="flex flex-col items-center gap-3">
                    <OmLoader size="lg" color="vermilion" />
                    <p className="text-sm font-semibold text-gray-600">{t?.uploading || 'Uploading...'}</p>
                  </div>
                ) : qrPhoto ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-3 bg-white rounded-2xl border border-gray-200 shadow-sm">
                      <img
                        src={qrPhoto}
                        alt={L.qrCode}
                        className="w-44 h-44 sm:w-52 sm:h-52 object-contain"
                      />
                    </div>
                    <p className="text-xs font-semibold text-gray-500">{L.replaceQr}</p>
                    <p className="text-xs text-gray-400 break-all max-w-[260px]">{qrPhoto}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-gray-400">
                    <div className="w-20 h-20 rounded-2xl bg-white border-2 border-dashed border-gray-300 grid place-items-center">
                      <QrCode size={34} className="text-gray-300" />
                    </div>
                    <p className="text-sm font-bold text-gray-600">{L.noQr}</p>
                    <p className="text-xs">{L.dropHere}</p>
                    <p className="text-xs">{L.orClick}</p>
                    <p className="text-xs text-gray-300 mt-1">{L.fileHint}</p>
                  </div>
                )}

                {/* Overlay notice while the QR switch is off */}
                {features.qrEnabled === false && !qrUploading && (
                  <div className="absolute inset-0 rounded-2xl bg-gray-900/70 grid place-items-center p-4">
                    <div className="text-center">
                      <EyeOff size={30} className="mx-auto text-white mb-2" />
                      <p className="text-sm font-bold text-white">{L.qrHiddenOnPage}</p>
                      <p className="text-xs text-white/70 mt-1 max-w-[240px]">{L.qrHidden}</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFeature('qrEnabled', true);
                        }}
                        disabled={!isSuperAdmin}
                        className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-gray-800 text-xs font-bold hover:bg-gray-100 transition-colors disabled:opacity-50"
                      >
                        <Eye size={13} /> {L.turnOn}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mt-4 flex-wrap">
                <button
                  onClick={() => mainQrInputRef.current?.click()}
                  disabled={qrUploading || !isSuperAdmin}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-vermilion text-white font-semibold text-sm hover:bg-[#820606] transition-all disabled:opacity-50"
                >
                  {qrUploading ? (
                    <OmLoader size="sm" color="white" />
                  ) : (
                    <Upload size={15} />
                  )}
                  {qrPhoto ? L.replaceQr : L.uploadQr}
                </button>

                {qrPhoto && (
                  <>
                    <button
                      onClick={handleQrRemove}
                      disabled={!isSuperAdmin}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-red-200 text-red-500 font-semibold text-sm hover:bg-red-50 transition-all disabled:opacity-50"
                    >
                      <Trash2 size={15} /> {L.removeQr}
                    </button>
                    <a
                      href={qrPhoto}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-gray-200 text-ink-soft font-semibold text-sm hover:bg-gray-50 transition-all"
                    >
                      <Eye size={15} /> {L.viewQr}
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* ----- Side panel ----- */}
            <div className="lg:w-72 flex-shrink-0 space-y-4">
              <div
                className={`rounded-xl border p-4 ${
                  features.qrEnabled === false
                    ? 'bg-gray-50 border-gray-200'
                    : 'bg-brand-50 border-brand-200'
                }`}
              >
                <p className="text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                  {features.qrEnabled === false ? <EyeOff size={13} /> : <Eye size={13} />}
                  {t?.qrVisibility || 'QR visibility'}
                </p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {features.qrEnabled === false ? L.qrHidden : L.qrShown}
                </p>
                <button
                  onClick={() => toggleFeature('qrEnabled', features.qrEnabled === false)}
                  disabled={!isSuperAdmin}
                  className="mt-3 text-xs font-semibold text-vermilion hover:underline bg-transparent border-0 p-0 disabled:opacity-50"
                >
                  {features.qrEnabled === false ? L.turnOn : L.turnOff}
                </button>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs font-bold text-gray-700 mb-1">{t?.tip || 'Tip'}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{L.qrTip}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============ Account numbers ============ */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-vermilion/10 to-marigold/5 px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-vermilion" />
            <div>
              <h3 className="text-gray-800 font-semibold">
                {L.accNums} ({accounts.length})
              </h3>
              <p className="text-xs text-gray-400">{L.accNumsSub}</p>
            </div>
          </div>
          <button
            onClick={openAddModal}
            disabled={!isSuperAdmin}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-vermilion text-white font-semibold text-sm hover:bg-[#820606] transition-all disabled:opacity-50"
          >
            <Plus size={16} /> {L.addAccount}
          </button>
        </div>

        <div className="p-6">
          {features.showBankDetails === false && (
            <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs">
              <AlertTriangle size={14} /> {L.hiddenWarning}
            </div>
          )}

          {accounts.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
              <Landmark size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm font-semibold text-gray-600">{L.noAccounts}</p>
              <p className="text-xs text-gray-400 mt-1 mb-4">{L.noAccountsHint}</p>
              <button
                onClick={openAddModal}
                disabled={!isSuperAdmin}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-vermilion text-white font-semibold text-sm hover:bg-[#820606] transition-all disabled:opacity-50"
              >
                <Plus size={15} /> {L.addFirst}
              </button>
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-4">
              {accounts.map((account) => {
                const isActive = account.active !== false;
                const instruction = account.instruction || account.note || '';
                return (
                  <div
                    key={account._id}
                    className={`relative rounded-2xl border p-5 transition-all ${
                      isActive
                        ? 'border-gray-200 bg-gradient-to-br from-white to-gray-50/60'
                        : 'border-gray-100 bg-gray-50 opacity-75'
                    }`}
                  >
                    {/* type badge + status */}
                    <div className="flex items-start gap-3 mb-3">
                      {account.qrPhoto ? (
                        <img
                          src={getFullImageUrl(account.qrPhoto)}
                          alt={account.bankName || t?.a1_acctAccountQr || 'Account QR'}
                          className="w-16 h-16 rounded-lg object-contain bg-white border border-gray-200 p-1 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-gray-50 border border-gray-200 grid place-items-center flex-shrink-0">
                          <Hash size={20} className="text-gray-300" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold uppercase tracking-widest text-vermilion">
                          {typeLabels[account.accountType] || typeLabels.other}
                        </p>
                        <p className="font-serif text-base text-gray-900 break-words leading-tight">
                          {account.title || account.bankName || '—'}
                        </p>
                        {account.bankName && account.bankName !== account.title && (
                          <p className="text-xs text-gray-500 break-words">{account.bankName}</p>
                        )}
                      </div>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                          isActive
                            ? 'bg-green-50 text-green-600'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {isActive ? L.visible : L.hidden}
                      </span>
                    </div>

                    {/* bold account number + copy */}
                    <div className="rounded-xl bg-white border-2 border-vermilion/15 px-4 py-3 mb-3">
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">
                        {L.accountNumber}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold tracking-[0.12em] text-lg text-vermilion break-all flex-1">
                          {account.accountNumber || '—'}
                        </span>
                        {account.accountNumber && (
                          <button
                            onClick={() => copyToClipboard(account.accountNumber)}
                            className="shrink-0 w-7 h-7 rounded-lg bg-brand-50 text-vermilion hover:bg-vermilion/20 transition-colors grid place-items-center"
                            aria-label={t?.copy || 'Copy'}
                          >
                            <Copy size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* details */}
                    <dl className="space-y-1.5 text-xs">
                      {account.bankName && (
                        <div className="flex gap-2">
                          <dt className="text-gray-400 w-24 flex-shrink-0">{L.bankProvider}</dt>
                          <dd className="font-semibold text-gray-800 break-words">
                            {account.bankName}
                          </dd>
                        </div>
                      )}
                      {account.accountHolder && (
                        <div className="flex gap-2">
                          <dt className="text-gray-400 w-24 flex-shrink-0">{L.accountHolder}</dt>
                          <dd className="font-semibold text-gray-800 break-words">
                            {account.accountHolder}
                          </dd>
                        </div>
                      )}
                      {account.branch && (
                        <div className="flex gap-2">
                          <dt className="text-gray-400 w-24 flex-shrink-0">{L.branch}</dt>
                          <dd className="font-semibold text-gray-800 break-words">
                            {account.branch}
                          </dd>
                        </div>
                      )}
                    </dl>

                    {instruction && (
                      <div className="mt-3 rounded-lg bg-marigold/10 border border-marigold/25 px-3 py-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-[#8A6410]">
                          {L.instruction}
                        </p>
                        <p className="text-xs text-gray-700 leading-relaxed mt-0.5">
                          {instruction}
                        </p>
                      </div>
                    )}

                    {/* actions */}
                    <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => handleToggleAccount(account)}
                        disabled={!isSuperAdmin}
                        title={isActive ? L.hidden : L.visible}
                        className={`p-2 rounded-lg transition-all disabled:opacity-40 ${
                          isActive
                            ? 'bg-green-50 text-green-600 hover:bg-green-100'
                            : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        {isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      <button
                        onClick={() => openEditModal(account)}
                        disabled={!isSuperAdmin}
                        title={t?.edit || 'Edit'}
                        className="p-2 rounded-lg bg-brand-50 text-vermilion hover:bg-vermilion/20 transition-all disabled:opacity-40"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteAccount(account)}
                        disabled={!isSuperAdmin}
                        title={t?.delete || 'Delete'}
                        className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-all disabled:opacity-40"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ============ Add / Edit account modal ============ */}
      {draft && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white rounded-t-2xl">
              <div>
                <h3 className="text-lg font-serif font-semibold text-ink">
                  {isNew ? L.modalTitleAdd : L.modalTitleEdit}
                </h3>
                <p className="text-xs text-ink-soft mt-0.5">{L.intro}</p>
              </div>
              <button
                onClick={closeModal}
                aria-label={t?.close || 'Close'}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors bg-transparent border-0"
              >
                <X size={20} className="text-ink-soft" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.active !== false}
                  onChange={(e) => updateDraftField('active', e.target.checked)}
                  className="w-4 h-4 accent-vermilion"
                />
                <span className="text-sm font-medium text-ink">{L.showThisAccount}</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>
                    {L.bankProvider} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    aria-label={L.bankProvider} value={draft.bankName}
                    onChange={(e) => updateDraftField('bankName', e.target.value)}
                    placeholder={t?.bankNamePlaceholder || 'e.g. Nepal Investment Bank'}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    {L.accountNumber} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    aria-label={L.accountNumber} value={draft.accountNumber}
                    onChange={(e) => updateDraftField('accountNumber', e.target.value)}
                    placeholder={t?.accountNumberPlaceholder || 'e.g. 0123456789'}
                    className={`${inputClass} font-mono tracking-wider font-bold`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>{L.accountName}</label>
                  <input
                    type="text"
                    aria-label={L.accountName} value={draft.title}
                    onChange={(e) => updateDraftField('title', e.target.value)}
                    placeholder={t?.accountNamePlaceholder || 'e.g. Temple Trust Fund'}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>{L.accountType}</label>
                  <select
                    aria-label={L.accountType} value={draft.accountType}
                    onChange={(e) => updateDraftField('accountType', e.target.value)}
                    className={inputClass}
                  >
                    {ACCOUNT_TYPES.map((opt) => (
                      <option key={opt} value={opt}>
                        {typeLabels[opt]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>{L.accountHolder}</label>
                  <input
                    type="text"
                    aria-label={L.accountHolder} value={draft.accountHolder}
                    onChange={(e) => updateDraftField('accountHolder', e.target.value)}
                    placeholder={t?.accountHolderPlaceholder || 'e.g. Shree Ramchandra Temple'}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>{L.branch}</label>
                  <input
                    type="text"
                    aria-label={L.branch} value={draft.branch}
                    onChange={(e) => updateDraftField('branch', e.target.value)}
                    placeholder={t?.branchPlaceholder || 'e.g. Battisputali, Kathmandu'}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  {L.instruction}{' '}
                  <span className="text-gray-400 font-normal">({t?.optional || 'optional'})</span>
                </label>
                <textarea
                  rows={2}
                  aria-label={L.instruction} value={draft.instruction || ''}
                  onChange={(e) => updateDraftField('instruction', e.target.value)}
                  placeholder={
                    t?.instructionPlaceholder ||
                    'e.g. Send the donor name in the transfer remark'
                  }
                  className={`${inputClass} resize-none`}
                />
              </div>

              {/* Per-account QR */}
              <div className="flex items-start gap-4 flex-wrap">
                <div className="relative border-2 border-dashed border-gray-300 rounded-xl overflow-hidden w-28 h-28 flex items-center justify-center cursor-pointer bg-gray-50 hover:border-vermilion transition-colors flex-shrink-0">
                  <input
                    ref={accountQrInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAccountQrUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="account-qr-upload"
                    className="absolute inset-0 flex items-center justify-center cursor-pointer"
                  >
                    {draft.qrPhoto ? (
                      <img
                        src={getFullImageUrl(draft.qrPhoto)}
                        alt={t?.a1_acctAccountQr || 'Account QR'}
                        className="w-full h-full object-contain p-1 bg-white"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-ink-soft">
                        <ImageIcon size={20} />
                        <span className="text-xs font-medium">
                          {t?.uploadQrHere || 'Upload QR'}
                        </span>
                      </div>
                    )}
                  </label>
                  {accountQrUploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <OmLoader size="sm" color="white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-[180px]">
                  <p className="text-xs font-bold text-gray-700">{L.qrForAccount}</p>
                  <p className="text-xs text-gray-500 leading-relaxed mt-1">
                    {L.qrForAccountHint}
                  </p>
                  {draft.qrPhoto && (
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={() => updateDraftField('qrPhoto', '')}
                        className="text-xs font-semibold text-red-500 hover:text-red-600 bg-transparent border-0 p-0"
                      >
                        {L.removeQrSmall}
                      </button>
                      <button
                        onClick={() => accountQrInputRef.current?.click()}
                        className="text-xs font-semibold text-vermilion hover:underline bg-transparent border-0 p-0 flex items-center gap-1"
                      >
                        <RotateCcw size={11} /> {L.replace}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  onClick={handleSaveAccount}
                  disabled={savingAccount}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-vermilion text-white font-semibold text-sm hover:bg-[#820606] transition-all disabled:opacity-50"
                >
                  {savingAccount ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Save size={15} />
                  )}
                  {isNew ? L.addAccount : L.save}
                </button>
                <button
                  onClick={closeModal}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 text-ink-soft font-semibold text-sm hover:bg-gray-50 transition-all"
                >
                  {L.cancel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAccount;
