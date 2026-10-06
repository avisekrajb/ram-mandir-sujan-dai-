import React, { useState, useEffect } from 'react';
import { 
  Save, Trash2, QrCode, CreditCard, Wallet, Smartphone, 
  Banknote, Mail, Settings, Gift, FileText,
  Check, X, Search,
  RefreshCw, ChevronDown, ChevronUp, ChevronRight,
  Plus, Hand, Info, Printer, EyeOff, AlertTriangle, ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime, formatDate as formatLocaleDate } from '../../utils/formatDate';
import api from '../../services/api';
import { shortAmount } from '../../utils/money';
import DonationReceipt from '../common/DonationReceipt';
import DownloadMenu from './DownloadMenu';
import BankAccounts from './BankAccounts';
import { PrintDonation, PrintRecordList } from './PrintRecords';
import { safeHttpUrl } from '../../utils/safeUrl';

/**
 * Column definitions shared by the CSV export and the "print all" sheet so the
 * downloaded file and the printed page always line up.
 * `Donation` stores its only date in `date` (a real Date), unlike Booking which
 * uses `createdAt`.
 */
const DONATION_CSV_COLUMNS = (t) => [
  { key: 'reference', label: t?.receiptNo || 'Receipt No.', value: (d) => `RCT-${String(d._id || '').slice(-8).toUpperCase()}` },
  { key: 'name', label: t?.fullName || 'Full Name' },
  { key: 'email', label: t?.yourEmail || 'Email' },
  { key: 'phone', label: t?.phoneNumber || 'Phone', mono: true },
  {
    key: 'amount',
    label: t?.amount || 'Amount',
    align: 'right',
    value: (d) => Number(d.amount) || 0,
  },
  {
    key: 'paymentMethod',
    label: t?.paymentMethod || 'Payment Method',
    value: (d) => d.paymentMethod || '',
  },
  { key: 'status', label: t?.status || 'Status' },
  {
    key: 'transactionId',
    label: t?.transactionId || 'Transaction ID',
    mono: true,
    value: (d) => d.transactionId || '',
  },
  {
    key: 'screenshot',
    label: t?.screenshot || 'Screenshot',
    // The URL, so an admin can re-open the exact image the donor sent.
    value: (d) => (d.screenshot ? (t?.a1_donYes || 'Yes') : (t?.a1_donNo || 'No')),
  },
  {
    key: 'screenshotUrl',
    label: t?.screenshotUrl || 'Screenshot URL',
    mono: true,
    value: (d) => d.screenshot || '',
  },
  {
    key: 'rejectionReason',
    label: t?.rejectionReason || 'Rejection Reason',
    value: (d) => d.rejectionReason || '',
  },
  {
    key: 'message',
    label: t?.message || 'Message',
    value: (d) => d.message || '',
  },
  {
    key: 'date',
    label: t?.donationDate || 'Donation Date',
    value: (d) => formatDateTime(d.date || d.createdAt),
  },
];

const EMPTY_LOC = { en: '', ne: '', hi: '', zh: '', ta: '' };
const emptyLoc = () => ({ en: '', ne: '', hi: '', zh: '', ta: '' });

const locValue = (obj, lang) => (obj ? (obj[lang] || obj.en || obj.ne || '') : '');

// paragraphs is a free-length list; older records stored a fixed { p1..p4 } object
const normalizeSection = (raw) => {
  const section = { ...(raw || {}) };
  const p = raw?.paragraphs;
  if (Array.isArray(p)) {
    section.paragraphs = p.map((x) => ({ ...(x || {}) }));
  } else if (p && typeof p === 'object') {
    section.paragraphs = Object.keys(p)
      .filter((k) => /^p\d+$/i.test(k))
      .sort((a, b) => parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10))
      .map((k) => ({ ...(p[k] || {}) }));
  } else {
    section.paragraphs = [];
  }
  section.points = Array.isArray(section.points) ? section.points : [];
  return section;
};

/**
 * The payment switches on the donate page, in the order they are shown. `label`
 * and `hint` are translation keys; the English text is the fallback.
 */
const DONATION_SWITCHES = [
  { key: 'esewaEnabled', label: 'a1_donEsewa', fallback: 'eSewa', hint: 'a1_donEsewaHint', hintFallback: 'Wallet payment through eSewa' },
  { key: 'khaltiEnabled', label: 'a1_donKhalti', fallback: 'Khalti', hint: 'a1_donKhaltiHint', hintFallback: 'Wallet payment through Khalti' },
  { key: 'ipsEnabled', label: 'a1_donIps', fallback: 'IPS (ConnectIPS)', hint: 'a1_donIpsHint', hintFallback: 'Pay through your bank via ConnectIPS' },
  { key: 'qrEnabled', label: 'a1_donQrSwitch', fallback: 'QR code', hint: 'a1_donQrSwitchHint', hintFallback: 'Show the donation QR code on the page' },
  { key: 'showBankDetails', label: 'a1_donShowBank', fallback: 'Bank details', hint: 'a1_donShowBankHint', hintFallback: 'Show the account numbers to donors' },
];

const AdminDonations = ({ donations, setDonations, settings, updateSettings, onSaved, t, lang }) => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [qrPhoto, setQrPhoto] = useState(null);
  const [baseCount, setBaseCount] = useState(1248);
  // Mirrors donate.esewaEnabled etc. An absent switch reads as on, the same rule
  // the server uses (normalizeFeatures), so the toggle never disagrees with the page.
  const [donateFeatures, setDonateFeatures] = useState({});
  const [switchBusy, setSwitchBusy] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  /*
   * Donor buckets. The ranges live in the settings so an administrator can
   * change them; the server re-files every donation on each request, so the tab
   * counts here always match what the current ranges say rather than what they
   * said when a donation arrived.
   */
  const [categories, setCategories] = useState([]);
  const [filterCategory, setFilterCategory] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  // Printing: a single donation, or every row currently visible after filtering
  const [printDonation, setPrintDonation] = useState(null);
  const [printAllDonations, setPrintAllDonations] = useState(false);

  // Full-size view of the payment screenshot the donor uploaded
  const [screenshotView, setScreenshotView] = useState(null);

  // "दान तथा सहयोग" page content
  const [donateContent, setDonateContent] = useState([]);
  const [donatePageTitle, setDonatePageTitle] = useState(EMPTY_LOC);
  const [donateIntro, setDonateIntro] = useState(EMPTY_LOC);
  const [contentLang, setContentLang] = useState('ne');
  const [savingContent, setSavingContent] = useState(false);
  const [openRows, setOpenRows] = useState(() => new Set());

  useEffect(() => {
    if (Array.isArray(settings?.donateContent)) {
      setDonateContent(settings.donateContent.map(normalizeSection));
    }
    if (settings?.donatePageTitle) setDonatePageTitle(settings.donatePageTitle);
    if (settings?.donateIntro) setDonateIntro(settings.donateIntro);
  }, [settings]);

  /*
   * The bucket tabs and their counts. Asked for on their own (limit 1) rather
   * than taken from the donations already on screen, so the totals cover every
   * donation rather than only the page being looked at. A failure here leaves
   * the list working with just the "All" tab rather than breaking the page.
   */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.get('/donations?limit=1');
        if (alive && Array.isArray(res.data?.categories)) setCategories(res.data.categories);
      } catch {
        /* the buckets are an extra; the donation list does not depend on them */
      }
    })();
    return () => { alive = false; };
  }, []);

  // Initialize from settings when available
  useEffect(() => {
    if (settings) {
      setQrPhoto(settings?.donate?.qrPhoto || null);
      setBaseCount(settings?.donate?.baseCount || 1248);
      setDonateFeatures({
        esewaEnabled: settings?.donate?.esewaEnabled !== false,
        khaltiEnabled: settings?.donate?.khaltiEnabled !== false,
        ipsEnabled: settings?.donate?.ipsEnabled !== false,
        qrEnabled: settings?.donate?.qrEnabled !== false,
        showBankDetails: settings?.donate?.showBankDetails !== false,
      });
    }
  }, [settings]);

  /*
   * Flip one payment switch and save immediately, so there is no separate "Save"
   * to forget. Only that key is sent on top of the stored `donate` block, which
   * keeps the QR image, the counter and the bank details untouched.
   */
  const handleToggleSwitch = async (key, value) => {
    setSwitchBusy(key);
    try {
      const res = await api.put('/admin/settings', {
        donate: { ...(settings?.donate || {}), [key]: value },
      });
      const saved = res.data?.donate || {};
      setDonateFeatures({
        esewaEnabled: saved.esewaEnabled !== false,
        khaltiEnabled: saved.khaltiEnabled !== false,
        ipsEnabled: saved.ipsEnabled !== false,
        qrEnabled: saved.qrEnabled !== false,
        showBankDetails: saved.showBankDetails !== false,
      });
      if (onSaved) onSaved(res.data);
      showToast(t.savedSuccess || 'Saved', 'success');
    } catch (error) {
      console.error('Toggle donation method error:', error);
      showToast(error.response?.data?.message || t?.a1_donSaveSettingsFailed || 'Could not save', 'error');
      // Put the switch back where it was: the server refused the change.
      setDonateFeatures((prev) => ({ ...prev, [key]: !value }));
    } finally {
      setSwitchBusy(null);
    }
  };

  const statusColors = {
    pending: '#F59E0B',
    completed: '#10B981',
    failed: '#EF4444',
    refunded: '#6B7280',
    rejected: '#DC2626',
  };

  const statusBadgeClasses = {
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    completed: 'bg-green-50 text-green-700 border-green-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
    refunded: 'bg-gray-50 text-gray-700 border-gray-200',
    rejected: 'bg-red-50 text-red-700 border-red-300',
  };

  // ===== Donate page content helpers =====
  const patchSection = (index, fn) =>
    setDonateContent((prev) => prev.map((s, i) => (i === index ? fn(s) : s)));

  const setSectionField = (index, field, value) =>
    patchSection(index, (s) => ({ ...s, [field]: { ...(s[field] || {}), [contentLang]: value } }));

  const setSectionParagraph = (index, pIndex, value) => {
    patchSection(index, (s) => {
      const paragraphs = normalizeSection(s).paragraphs;
      while (paragraphs.length <= pIndex) paragraphs.push(emptyLoc());
      paragraphs[pIndex] = { ...(paragraphs[pIndex] || {}), [contentLang]: value };
      return { ...s, paragraphs };
    });
  };

  const addParagraph = (index) =>
    patchSection(index, (s) => ({
      ...s,
      paragraphs: [...normalizeSection(s).paragraphs, emptyLoc()]
    }));

  const removeParagraph = (index, pIndex) =>
    patchSection(index, (s) => ({
      ...s,
      paragraphs: normalizeSection(s).paragraphs.filter((_, i) => i !== pIndex)
    }));

  const moveParagraph = (index, pIndex, dir) =>
    patchSection(index, (s) => {
      const paragraphs = normalizeSection(s).paragraphs;
      const target = pIndex + dir;
      if (target < 0 || target >= paragraphs.length) return s;
      [paragraphs[pIndex], paragraphs[target]] = [paragraphs[target], paragraphs[pIndex]];
      return { ...s, paragraphs };
    });

  const addPoint = (index) =>
    patchSection(index, (s) => ({ ...s, points: [...(s.points || []), emptyLoc()] }));

  const setPoint = (index, pIndex, value) =>
    patchSection(index, (s) => ({
      ...s,
      points: (s.points || []).map((p, i) => (i === pIndex ? { ...(p || {}), [contentLang]: value } : p))
    }));

  const removePoint = (index, pIndex) =>
    patchSection(index, (s) => ({
      ...s,
      points: (s.points || []).filter((_, i) => i !== pIndex)
    }));

  const movePoint = (index, pIndex, dir) =>
    patchSection(index, (s) => {
      const points = [...(s.points || [])];
      const target = pIndex + dir;
      if (target < 0 || target >= points.length) return s;
      [points[pIndex], points[target]] = [points[target], points[pIndex]];
      return { ...s, points };
    });

  const addSection = () =>
    setDonateContent((prev) => [
      ...prev,
      {
        key: `donate_${Date.now()}`,
        title: emptyLoc(),
        desc: emptyLoc(),
        paragraphs: [],
        listTitle: emptyLoc(),
        points: [],
        order: prev.length,
        enabled: true
      }
    ]);

  const removeSection = (index) => {
    if (!window.confirm(t?.a1_donConfirmRemoveSection || 'Remove this section?')) return;
    setDonateContent((prev) => prev.filter((_, i) => i !== index));
  };

  const moveSection = (index, dir) =>
    setDonateContent((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((s, i) => ({ ...s, order: i }));
    });

  const toggleSectionEnabled = (index) =>
    patchSection(index, (s) => ({ ...s, enabled: s.enabled === false }));

  const toggleRow = (index) =>
    setOpenRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  const saveContent = async () => {
    setSavingContent(true);
    try {
      const payload = {
        donatePageTitle,
        donateIntro,
        donateContent: donateContent.map((s, i) => ({
          ...normalizeSection(s),
          order: i
        }))
      };
      // updateSettings (from AdminPage) does the PUT, refreshes the shared
      // settings state and shows the toast; calling api.put here as well sent
      // the save twice, the second time from a stale settings snapshot.
      if (updateSettings) {
        await updateSettings(payload);
      } else {
        await api.put('/admin/settings', payload);
        showToast(t?.a1_donContentSaved || 'Donate page content saved', 'success');
      }
    } catch (error) {
      console.error('Error saving donate content:', error);
      if (!updateSettings) {
        showToast(error.response?.data?.message || t?.a1_donContentSaveFailed || 'Failed to save donate page content', 'error');
      }
    } finally {
      setSavingContent(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t?.a1_donConfirmDelete || 'Delete this donation record?')) return;
    setLoading(true);
    try {
      await api.delete(`/admin/donations/${id}`);
      setDonations(donations.filter(d => d._id !== id));
      showToast(t.donationRemoved || 'Donation deleted successfully', 'success');
    } catch (error) {
      console.error('Delete donation error:', error);
      showToast(error.response?.data?.message || t?.a1_donDeleteFailed || 'Failed to delete donation', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, status, rejectionReason = '') => {
    setLoading(true);
    try {
      const response = await api.put(`/admin/donations/${id}/status`, {
        status,
        rejectionReason,
      });
      setDonations(donations.map(d => d._id === id ? response.data.data : d));

      const statusMessages = {
        pending: t?.markedPending || 'Donation marked as pending',
        completed: t?.approvedReceiptSent || 'Donation approved! Receipt sent to donor via email',
        failed: t?.markedFailed || 'Donation marked as failed',
        refunded: t?.markedRefunded || 'Donation refunded',
        rejected: t?.rejectedEmailSent || 'Donation rejected and the donor was emailed',
      };
      showToast(
        statusMessages[status] ||
          (t?.a1_donStatusUpdated || 'Donation status updated to {status}').replace('{status}', t?.[status] || status),
        'success'
      );
    } catch (error) {
      console.error('Update status error:', error);
      showToast(error.response?.data?.message || t?.statusUpdateFailed || 'Failed to update status', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Rejecting asks for a reason first: it is emailed to the donor verbatim, and a
  // rejection with no explanation is not much use to them. `null` from the prompt
  // means the admin cancelled, `''` means confirmed with no reason given.
  const handleReject = (donation) => {
    const reason = window.prompt(
      t?.rejectionReasonPrompt ||
        'Why is this donation being rejected? This message will be emailed to the donor.',
      donation.rejectionReason || ''
    );
    if (reason === null) return;
    handleStatusChange(donation._id, 'rejected', reason);
  };

  const handleSendEmail = async (donation) => {
    if (!window.confirm((t?.a1_donConfirmSendEmail || 'Send confirmation email to {email}?').replace('{email}', donation.email))) return;
    setSendingEmail(true);
    try {
      await api.post('/donations/send-email', {
        donationId: donation._id
      });
      showToast((t?.a1_donEmailSent || 'Email sent to {email}').replace('{email}', donation.email), 'success');
    } catch (error) {
      console.error('Email error:', error);
      showToast(t?.a1_donEmailFailed || 'Failed to send email', 'error');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleViewReceipt = (donation) => {
    if (donation.status !== 'completed') {
      showToast(t?.a1_donReceiptOnlyCompleted || 'Receipt only available for completed donations', 'warning');
      return;
    }
    setSelectedDonation(donation);
    setShowReceipt(true);
  };

  const handleQrUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast(t?.uploadImageOnly || 'Please upload an image file', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast(t?.imageTooLarge || 'Image must be less than 5MB', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await api.post('/admin/upload/qr', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      const newQrUrl = response.data.url;
      setQrPhoto(newQrUrl);
      
      await updateSettings({ 
        donate: { 
          ...settings?.donate, 
          qrPhoto: newQrUrl,
          baseCount
        } 
      });
      
      showToast(t?.a1_donQrUploaded || 'QR code uploaded successfully', 'success');
    } catch (error) {
      console.error('Upload error:', error);
      showToast(error.response?.data?.message || t?.a1_donUploadFailed || 'Upload failed', 'error');
    }
    e.target.value = '';
  };

  const handleSaveSettings = async () => {
    try {
      // Only the QR image and the counter live here. The bank account numbers are
      // records of their own (see BankAccounts below) and are saved on their own,
      // so saving this no longer writes a legacy trio the donate page ignores.
      await updateSettings({
        donate: {
          // Spread the stored block so the super-admin-only feature switches
          // (managed in Admin → Donation Account) are not dropped on save.
          ...settings?.donate,
          qrPhoto,
          baseCount,
        }
      });
      showToast(t.savedSuccess || 'Donation settings saved', 'success');
    } catch (error) {
      console.error('Save donation settings error:', error);
      showToast(error.response?.data?.message || t?.a1_donSaveSettingsFailed || 'Failed to save settings', 'error');
    }
  };

  const getPaymentMethodIcon = (method) => {
    switch(method) {
      case 'esewa': return <Smartphone size={14} className="text-green-600" />;
      case 'khalti': return <Wallet size={14} className="text-brand-600" />;
      case 'ips': return <CreditCard size={14} className="text-brand-600" />;
      case 'bank': return <Banknote size={14} className="text-brand-600" />;
      default: return <Wallet size={14} className="text-gray-600" />;
    }
  };

  const getStatusBadge = (status) => {
    return statusBadgeClasses[status] || statusBadgeClasses.pending;
  };

  const realDonors = donations?.filter(d => d.status === 'completed') || [];

  // Written the way a Nepali amount is read: 1 to 100 thousand, then up to a
  // million, then everything above that. Kept beside the tab so a range and its
  // label cannot drift apart.
  const categoryRangeText = (c) => {
    const from = shortAmount(c.min ?? 0);
    const to = c.max === null || c.max === undefined ? null : shortAmount(c.max);
    return to ? `${from} – ${to}` : `${from}+`;
  };

  const filteredDonations = donations?.filter(donation => {
    const matchesSearch = donation.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          donation.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          donation.phone?.includes(searchTerm);
    const matchesStatus = filterStatus === 'all' || donation.status === filterStatus;
    // 'all' means every bucket, including a donation that falls outside all of
    // them (only possible if an administrator narrows the ranges).
    const matchesCategory = filterCategory === 'all' || donation.categoryKey === filterCategory;
    return matchesSearch && matchesStatus && matchesCategory;
  }) || [];

  const sortedDonations = [...filteredDonations].sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  );

  const formatDate = (dateString) => {
    return formatLocaleDate(dateString, lang, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Display label for a stored payment method value (eSewa/Khalti are brand names)
  const paymentMethodLabel = (method) => {
    switch (String(method || '').toLowerCase()) {
      case 'esewa': return 'eSewa';
      case 'khalti': return 'Khalti';
      case 'ips': return 'IPS';
      case 'bank': return t?.a5_payBankTransfer || 'Bank transfer';
      case 'cash': return t?.a5_payCash || 'Cash';
      default: return method;
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Helper to get full Cloudinary URL if needed
  const getFullImageUrl = (url) => {
    if (!url) return null;
    // If it's already a full URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // If it's a relative path, prepend Cloudinary base URL
    if (url.startsWith('/')) {
      // For Cloudinary URLs from your config
      const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || 'dibusz4ag';
      return `https://res.cloudinary.com/${cloudName}/image/upload/${url}`;
    }
    return url;
  };

  const displayQrPhoto = getFullImageUrl(qrPhoto);

  return (
    <div className="space-y-6">
      {/* Donation Settings */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-[#A80808]/10 to-[#A80808]/5 px-6 py-4 border-b border-gray-100">
          <h4 className="text-gray-700 font-semibold flex items-center gap-2">
            <Settings size={18} className="text-[#A80808]" />
            {t?.a1_donSettingsTitle || 'Donation Settings'}
          </h4>
          <p className="text-xs text-gray-400">{t?.a1_donSettingsSubtitle || 'QR Code & Bank Details'}</p>
        </div>

        <div className="p-6">
          {/*
            Payment methods on /donate. Turning every gateway off leaves the
            account numbers and the QR as the only way to give, which is what the
            donate page shows on its own.
          */}
          <div className="mb-5 grid gap-2 sm:grid-cols-2">
            {DONATION_SWITCHES.map((sw) => {
              const on = donateFeatures[sw.key] !== false;
              return (
                <label
                  key={sw.key}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-2.5 transition-colors hover:bg-gray-50"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">{t?.[sw.label] || sw.fallback}</span>
                    <span className="block text-xs text-gray-400">{t?.[sw.hint] || sw.hintFallback}</span>
                  </span>
                  <span className="relative inline-flex shrink-0">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={on}
                      disabled={switchBusy === sw.key}
                      onChange={(e) => handleToggleSwitch(sw.key, e.target.checked)}
                    />
                    <span className="h-6 w-11 rounded-full bg-gray-300 transition-colors peer-checked:bg-emerald-600 peer-focus-visible:ring-2 peer-focus-visible:ring-[#A80808] peer-focus-visible:ring-offset-2" />
                    <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                  </span>
                </label>
              );
            })}
          </div>

          <div className="mb-4 flex items-start gap-2 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600">
            <Info size={14} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              {donateFeatures.esewaEnabled === false &&
              donateFeatures.khaltiEnabled === false &&
              donateFeatures.ipsEnabled === false
                ? (t?.a1_donNoGatewaysNote ||
                  'Every online gateway is off, so donors see the bank transfer details only.')
                : (t?.a1_donGatewaysNote ||
                  'A donor can pay with any gateway that is switched on here.')}
            </span>
          </div>

          {user?.role === 'superadmin' && (
            <div className="mb-4 flex items-start gap-2 px-4 py-3 rounded-xl bg-brand-50 border border-brand-200 text-xs text-brand-800">
              <Info size={14} className="flex-shrink-0 mt-0.5" />
              <span>
                {t?.a1_donSuperadminNote3 ||
                  'The bank accounts are managed in Bank Transfer Details below. The donation page text is in'}{' '}
                <button
                  type="button"
                  onClick={() => navigate('/admin/account')}
                  className="font-bold underline bg-transparent border-0 p-0 text-brand-800 hover:text-vermilion"
                >
                  {t?.a1_donAccountLink || 'Admin → Donation Account'}
                </button>
                .
              </span>
            </div>
          )}

          <div className="relative border-2 border-dashed border-gray-300 rounded-xl overflow-hidden h-32 flex items-center justify-center cursor-pointer bg-gray-50 hover:border-[#A80808] transition-colors mb-4">
            <input type="file" accept="image/*" onChange={handleQrUpload} className="hidden" id="qr-upload" />
            <label htmlFor="qr-upload" className="absolute inset-0 flex items-center justify-center cursor-pointer">
              {displayQrPhoto ? (
                <img 
                  src={displayQrPhoto} 
                  alt={t?.qrCode || 'QR Code'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('QR image failed to load:', displayQrPhoto);
                    e.target.style.display = 'none';
                    // Show fallback
                    const parent = e.target.parentElement;
                    const fallback = document.createElement('div');
                    fallback.className = 'flex flex-col items-center gap-1.5 text-gray-400';
                    fallback.innerHTML = `
                      <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h-2m2 0h2M4 12v1m4 0h4m-4 0v4m0-4h-2" />
                      </svg>
                      <span class="text-xs font-semibold"></span>
                    `;
                    fallback.querySelector('span').textContent =
                      t?.a1_donClickUploadQr || 'Click to upload QR Code';
                    parent.appendChild(fallback);
                  }}
                />
              ) : null}
              {displayQrPhoto ? null : (
                <div className="flex flex-col items-center gap-1.5 text-gray-400">
                  <QrCode size={32} />
                  <span className="text-xs font-semibold">{t.uploadPhoto || 'Upload QR Code'}</span>
                </div>
              )}
            </label>

            {/* Mirror the donate page: when the super admin has switched the QR
                off, say so here too instead of silently previewing it. */}
            {displayQrPhoto && settings?.donate?.qrEnabled === false && (
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-1.5 px-2 py-1 rounded-lg bg-gray-900/70 text-white text-xs font-semibold">
                <EyeOff size={11} />
                {t.qrHiddenOnPage || 'Hidden on the donate page'}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">{t.startingCount || 'Starting Count'}</label>
              <input
                type="number"
                aria-label={t.startingCount || 'Starting Count'} value={baseCount}
                onChange={(e) => setBaseCount(Number(e.target.value) || 0)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-[#A80808] focus:outline-none transition-colors text-sm"
              />
            </div>
          </div>

          {/*
            The account numbers used to sit in three inputs here, writing to the
            legacy `donate.bankNumber / bankName / accountHolder` trio. The public
            donate page ignores those as soon as one real bank account exists, so
            editing them changed nothing a donor could see. They are replaced by
            the real account records below, which is what the page actually lists.
          */}
          <button
            onClick={handleSaveSettings}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#A80808] text-white font-semibold text-sm hover:bg-[#660505] transition-all shadow-lg shadow-[#A80808]/20"
          >
            <Save size={16} /> {t.save || 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Bank Transfer Details: the accounts a donor can transfer to */}
      <BankAccounts t={t} />

      {/* Donation Records - Same as before */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#A80808]/10 to-[#A80808]/5 px-6 py-4 border-b border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h4 className="text-gray-700 font-semibold flex items-center gap-2">
                <Gift size={18} className="text-[#A80808]" />
                {t?.donationRecords || 'Donation Records'}
              </h4>
              <p className="text-xs text-gray-400">
                {(t?.a1_donStatsSummary || 'Total: {total} • Completed: {completed} • Pending: {pending}')
                  .replace('{total}', donations?.length || 0)
                  .replace('{completed}', realDonors.length)
                  .replace('{pending}', donations?.filter(d => d.status === 'pending').length || 0)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  aria-label={t?.a1_donSearch || 'Search'} value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t?.a1_donSearchPlaceholder || 'Search donations...'}
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:border-[#A80808] focus:outline-none text-sm w-40 sm:w-48"
                />
              </div>
              <select
                aria-label={t?.a1_donFilterByStatus || 'Filter by status'} value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-xl focus:border-[#A80808] focus:outline-none text-sm bg-white"
              >
                <option value="all">{t?.a1_donAllStatus || 'All Status'}</option>
                <option value="pending">{t?.pending || 'Pending'}</option>
                <option value="completed">{t?.statusCompleted || 'Completed'}</option>
                <option value="failed">{t?.failed || 'Failed'}</option>
                <option value="refunded">{t?.refunded || 'Refunded'}</option>
              </select>
              <button
                onClick={() => { setSearchTerm(''); setFilterStatus('all'); setFilterCategory('all'); }}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                title={t?.a1_donResetFilters || 'Reset Filters'}
              >
                <RefreshCw size={16} className="text-gray-400" />
              </button>

              {categories.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFilterCategory('all')}
                    aria-pressed={filterCategory === 'all'}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      filterCategory === 'all'
                        ? 'bg-[#A80808] text-white border-[#A80808]'
                        : 'bg-white text-ink-soft border-gray-200 hover:border-[#A80808]'
                    }`}
                  >
                    {t?.a1_donCatAll || 'All amounts'}
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setFilterCategory(c.key)}
                      aria-pressed={filterCategory === c.key}
                      title={`${categoryRangeText(c)} — ${t?.a1_donCatCount || 'donations'}: ${c.count}`}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        filterCategory === c.key
                          ? 'bg-[#A80808] text-white border-[#A80808]'
                          : 'bg-white text-ink-soft border-gray-200 hover:border-[#A80808]'
                      }`}
                    >
                      {categoryRangeText(c)}
                      <span
                        className={`rounded-full px-1.5 py-px text-[10px] ${
                          filterCategory === c.key ? 'bg-white/25' : 'bg-gray-100'
                        }`}
                      >
                        {c.count}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => setPrintAllDonations(true)}
                disabled={!sortedDonations.length}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl bg-white text-sm font-semibold text-gray-700 hover:border-[#A80808] hover:text-[#A80808] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Printer size={15} className="text-[#A80808]" />
                <span className="hidden sm:inline">{t?.printAll || 'Print All'}</span>
              </button>

              <DownloadMenu
                rows={sortedDonations}
                baseName="donations"
                dateField="date"
                t={t}
                columns={DONATION_CSV_COLUMNS(t)}
              />
            </div>
          </div>
        </div>

        <div className="p-4">
          {sortedDonations.length === 0 ? (
            <p className="text-center text-gray-500 py-8">{t.noDonationsYet || 'No donations yet'}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-200">
                    <th className="pb-3 text-xs font-bold text-gray-500 uppercase tracking-wide">#</th>
                    <th className="pb-3 text-xs font-bold text-gray-500 uppercase tracking-wide">{t?.a1_donDevotee || 'Devotee'}</th>
                    <th className="pb-3 text-xs font-bold text-gray-500 uppercase tracking-wide hidden sm:table-cell">{t?.email || 'Email'}</th>
                    <th className="pb-3 text-xs font-bold text-gray-500 uppercase tracking-wide hidden md:table-cell">{t?.method || 'Method'}</th>
                    <th className="pb-3 text-xs font-bold text-gray-500 uppercase tracking-wide">{t?.amount || 'Amount'}</th>
                    <th className="pb-3 text-xs font-bold text-gray-500 uppercase tracking-wide hidden lg:table-cell">{t?.a1_donDate || 'Date'}</th>
                    <th className="pb-3 text-xs font-bold text-gray-500 uppercase tracking-wide">{t?.status || 'Status'}</th>
                    <th className="pb-3 text-xs font-bold text-gray-500 uppercase tracking-wide text-right">{t?.actions || 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDonations.map((donation, index) => (
                    <React.Fragment key={donation._id}>
                      <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-3 text-xs text-gray-400">{index + 1}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-full bg-[#A80808] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                              {donation.name?.charAt(0).toUpperCase()}
                            </span>
                            <div>
                              <p className="font-medium text-gray-800">{donation.name}</p>
                              {donation.message && (
                                <p className="text-xs text-gray-400 italic truncate max-w-[120px]">"{donation.message}"</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 hidden sm:table-cell text-gray-600 text-xs">{donation.email}</td>
                        <td className="py-3 hidden md:table-cell">
                          <span className="flex items-center gap-1 text-xs">
                            {getPaymentMethodIcon(donation.paymentMethod)}
                            <span>{paymentMethodLabel(donation.paymentMethod || 'cash')}</span>
                          </span>
                        </td>
                        <td className="py-3 font-bold text-[#A80808]">
                          Rs. {donation.amount?.toLocaleString() || 0}
                        </td>
                        <td className="py-3 hidden lg:table-cell text-gray-500 text-xs">
                          {formatDate(donation.date)}
                        </td>
                        <td className="py-3">
                          {/* Rejecting goes through handleReject so a reason can be
                              captured and emailed to the donor. */}
                          {donation.status === 'rejected' ? (
                            <button
                              type="button"
                              onClick={() => handleReject(donation)}
                              disabled={loading}
                              title={t?.editRejectionReason || 'Change rejection reason'}
                              className={`text-xs font-semibold px-3 py-1 rounded-full border-2 cursor-pointer disabled:opacity-50 ${getStatusBadge(donation.status)}`}
                              style={{ borderColor: statusColors.rejected }}
                            >
                              {t?.rejected || 'Rejected'} ✎
                            </button>
                          ) : (
                            <select
                              aria-label={(t?.a1_donStatusFor || 'Status for {name}').replace('{name}', donation.name || t?.a1_donDonationFallback || 'donation')} value={donation.status}
                              onChange={(e) => {
                                const next = e.target.value;
                                if (next === 'rejected') handleReject(donation);
                                else handleStatusChange(donation._id, next);
                              }}
                              disabled={loading}
                              className={`text-xs font-semibold px-3 py-1 rounded-full border-2 focus:outline-none disabled:opacity-50 cursor-pointer ${getStatusBadge(donation.status)}`}
                              style={{ borderColor: statusColors[donation.status] }}
                            >
                              <option value="pending">{t?.pending || 'Pending'}</option>
                              <option value="completed">{t?.accepted || 'Accepted'}</option>
                              <option value="rejected">{t?.rejected || 'Rejected'}</option>
                              <option value="failed">{t?.failed || 'Failed'}</option>
                              <option value="refunded">{t?.refunded || 'Refunded'}</option>
                            </select>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {donation.status === 'completed' && (
                              <>
                                <button 
                                  onClick={() => handleViewReceipt(donation)}
                                  className="p-1.5 rounded-lg text-brand-400 hover:text-brand-600 hover:bg-brand-50 transition-all"
                                  title={t?.a1_donViewReceipt || 'View Receipt'}
                                >
                                  <FileText size={16} />
                                </button>
                                <button
                                  onClick={() => setPrintDonation(donation)}
                                  className="p-1.5 rounded-lg text-[#A80808] hover:bg-[#A80808]/10 transition-all"
                                  title={t?.print || 'Print'}
                                >
                                  <Printer size={16} />
                                </button>
                                <button 
                                  onClick={() => handleSendEmail(donation)} 
                                  disabled={sendingEmail}
                                  className="p-1.5 rounded-lg text-brand-400 hover:text-brand-600 hover:bg-brand-50 transition-all disabled:opacity-50"
                                  title={t?.a1_donSendEmail || 'Send Email'}
                                >
                                  <Mail size={16} />
                                </button>
                              </>
                            )}
                            <button 
                              onClick={() => toggleExpand(donation._id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-[#A80808] transition-all"
                              title={t?.a1_donViewDetails || 'View Details'}
                            >
                              {expandedId === donation._id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                            <button 
                              onClick={() => handleDelete(donation._id)} 
                              className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
                              title={t?.delete || 'Delete'}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedId === donation._id && (
                        <tr>
                          <td colSpan="8" className="px-4 py-4 bg-gray-50/50 border-b border-gray-100">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-xs text-gray-400">{t?.donorInformation || 'Donor Information'}</p>
                                <p className="font-medium text-gray-800">{donation.name}</p>
                                <p className="text-gray-600 text-xs">{donation.email}</p>
                                {donation.phone && <p className="text-gray-600 text-xs">{donation.phone}</p>}
                              </div>
                              <div>
                                <p className="text-xs text-gray-400">{t?.donationDetails || 'Donation Details'}</p>
                                <p className="font-medium text-[#A80808]">
                                  Rs. {donation.amount?.toLocaleString() || 0}
                                  {/* The short form beside the full one, so a large
                                      donation can be read at a glance. */}
                                  {(donation.amount || 0) >= 100000 && (
                                    <span className="ml-1 text-[11px] font-normal text-gray-400">
                                      ({shortAmount(donation.amount)})
                                    </span>
                                  )}
                                </p>
                                <p className="text-gray-600 text-xs">
                                  {t?.method || 'Method'}: {paymentMethodLabel(donation.paymentMethod || 'bank')}
                                </p>
                                <p className="text-gray-600 text-xs">
                                  {t?.donationDate || 'Date'}: {formatDate(donation.date)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400">{t?.additionalInfo || 'Additional Info'}</p>
                                <p className="text-gray-600 text-xs">
                                  {t?.status || 'Status'}:{' '}
                                  <span className={`font-semibold px-1.5 py-0.5 rounded ${getStatusBadge(donation.status)}`}>
                                    {t?.[donation.status] || donation.status}
                                  </span>
                                </p>
                                {donation.transactionId && (
                                  <p className="text-gray-600 text-xs mt-1">
                                    {t?.transactionId || 'Transaction ID'}:{' '}
                                    <span className="font-mono font-semibold text-gray-800 break-all">
                                      {donation.transactionId}
                                    </span>
                                  </p>
                                )}
                                {donation.message && (
                                  <p className="text-gray-600 text-xs italic mt-1">"{donation.message}"</p>
                                )}
                                {/*
                                  What the donor declared about their means, and
                                  their own photograph. Shown from the same expanded
                                  row as everything else, so the committee can check
                                  a donation without opening another page.
                                */}
                                {(donation.employment || donation.businessIncome) && (
                                  <p className="text-gray-600 text-xs mt-1">
                                    {t?.a1_donEmploymentLabel || 'Employment'}:{' '}
                                    <span className="font-semibold text-gray-800">
                                      {donation.employment || '—'}
                                    </span>
                                    {' · '}
                                    {t?.a1_donBusinessLabel || 'Business income'}:{' '}
                                    <span className="font-semibold text-gray-800">
                                      {donation.businessIncome || '—'}
                                    </span>
                                  </p>
                                )}
                                {donation.photo && (
                                  <div className="mt-2">
                                    <p className="text-xs text-gray-400">
                                      {t?.a1_donPhotoDonor || 'Donor photograph'}
                                    </p>
                                    <a href={donation.photo} target="_blank" rel="noopener noreferrer">
                                      <img
                                        src={donation.photo}
                                        alt={t?.a1_donPhotoDonor || 'Donor photograph'}
                                        className="mt-1 h-24 w-24 rounded-lg border border-gray-200 object-cover"
                                      />
                                    </a>
                                    {donation.photoCapturedAt && (
                                      <p className="text-[11px] text-gray-400 mt-1">
                                        {formatDate(donation.photoCapturedAt)}
                                      </p>
                                    )}
                                  </div>
                                )}
                                {donation.reviewedAt && (
                                  <p className="text-gray-500 text-xs mt-1">
                                    {t?.reviewedOn || 'Reviewed'}: {formatDate(donation.reviewedAt)}
                                    {donation.reviewedBy ? ` — ${donation.reviewedBy}` : ''}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Rejection reason the donor was emailed */}
                            {donation.status === 'rejected' && (
                              <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5">
                                <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-xs font-bold uppercase tracking-wider text-red-700">
                                    {t?.rejectionReason || 'Rejection Reason'}
                                  </p>
                                  <p className="text-xs text-red-700 mt-0.5">
                                    {donation.rejectionReason ||
                                      t?.noRejectionReason ||
                                      'No reason was recorded.'}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Payment proof submitted by the donor */}
                            <div className="mt-4">
                              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                                {t?.paymentProof || 'Payment Proof'}
                              </p>
                              {safeHttpUrl(donation.screenshot) ? (
                                <button
                                  type="button"
                                  onClick={() => setScreenshotView({ url: safeHttpUrl(donation.screenshot), donation })}
                                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:border-[#A80808] transition-colors"
                                >
                                  <img
                                    src={safeHttpUrl(donation.screenshot)}
                                    alt={t?.paymentScreenshot || 'Payment screenshot'}
                                    className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                                  />
                                  <span className="text-xs font-semibold text-gray-700">
                                    {t?.viewScreenshot || 'View Screenshot'}
                                  </span>
                                </button>
                              ) : (
                                <p className="text-xs text-gray-400">
                                  {t?.noScreenshot || 'No screenshot uploaded'}
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Donation Receipt Modal */}
      {showReceipt && selectedDonation && (
        <DonationReceipt
          donation={selectedDonation}
          onClose={() => {
            setShowReceipt(false);
            setSelectedDonation(null);
          }}
          settings={settings}
        />
      )}

      {/* Screenshot lightbox — what the admin checks before accepting */}
      {screenshotView && (
        <div
          className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-sm flex flex-col"
          onClick={() => setScreenshotView(null)}
        >
          <div className="flex items-center justify-between gap-3 px-5 py-4 text-white flex-shrink-0">
            <div className="min-w-0">
              <h3 className="font-serif font-bold text-lg truncate">
                {t?.paymentScreenshot || 'Payment Screenshot'}
              </h3>
              {screenshotView.donation && (
                <p className="text-xs text-white/70 truncate">
                  {screenshotView.donation.name} • {t?.amount || 'Amount'}: Rs.{' '}
                  {(screenshotView.donation.amount || 0).toLocaleString()}
                  {screenshotView.donation.transactionId
                    ? ` • ${t?.transactionId || 'Transaction ID'}: ${screenshotView.donation.transactionId}`
                    : ''}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <a
                href={screenshotView.url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-colors"
              >
                <ExternalLink size={15} /> {t?.openFull || 'Open full size'}
              </a>
              <button
                type="button"
                onClick={() => setScreenshotView(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label={t?.close || 'Close'}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div
            className="flex-1 min-h-0 overflow-auto p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={screenshotView.url}
              alt={t?.paymentScreenshot || 'Payment screenshot'}
              className="mx-auto max-w-full rounded-2xl shadow-2xl bg-white"
            />
          </div>
        </div>
      )}

      {/* Printable donations */}
      {printDonation && (
        <PrintDonation
          donation={printDonation}
          settings={settings}
          onClose={() => setPrintDonation(null)}
          t={t}
        />
      )}

      {printAllDonations && (
        <PrintRecordList
          title={t?.donationsListTitle || 'All Donations'}
          columns={DONATION_CSV_COLUMNS(t)}
          rows={sortedDonations}
          settings={settings}
          onClose={() => setPrintAllDonations(false)}
          t={t}
        />
      )}

      {/* Donate Page Content — table form */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
        <div className="px-6 py-4 bg-gradient-to-r from-[#A80808]/10 to-[#A80808]/5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-gray-700 font-semibold flex items-center gap-2">
              <Hand size={18} className="text-[#A80808]" />
              {t?.a1_donContentTitle || 'Donate Page Content'}
            </h4>
            <p className="text-xs text-gray-400">
              {t?.a1_donContentSubtitle || 'Shown at the bottom of the donate page, under the donation form.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={addSection}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#A80808] text-white text-xs font-semibold hover:bg-[#660505] transition-all"
            >
              <Plus size={14} /> {t?.a1_donAddSection || 'Add Section'}
            </button>
            <button
              onClick={saveContent}
              disabled={savingContent}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#A80808] text-white text-xs font-semibold hover:bg-[#660505] transition-all disabled:opacity-50"
            >
              {savingContent ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t?.a1_donSaving || 'Saving...'}
                </>
              ) : (
                <>
                  <Save size={14} /> {t?.a1_donSaveContent || 'Save Content'}
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-ink-soft mb-1">{t?.a1_donPageTitle || 'Page Title'}</label>
              <input
                type="text"
                aria-label={t?.a1_donPageTitle || 'Page Title'} value={locValue(donatePageTitle, contentLang)}
                onChange={(e) => setDonatePageTitle({ ...donatePageTitle, [contentLang]: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-[#A80808] focus:outline-none text-sm"
                placeholder={t?.a1_donPageTitlePlaceholder || 'e.g. Donations & Support'}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-soft mb-1">{t?.a1_donPageIntro || 'Page Intro'}</label>
              <input
                type="text"
                aria-label={t?.a1_donPageIntro || 'Page Intro'} value={locValue(donateIntro, contentLang)}
                onChange={(e) => setDonateIntro({ ...donateIntro, [contentLang]: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-[#A80808] focus:outline-none text-sm"
                placeholder={t?.a1_donPageIntroPlaceholder || 'Short lead-in shown under the page title'}
              />
            </div>
          </div>

          <div className="flex gap-1.5 mt-4 mb-4 flex-wrap">
            {['ne', 'en', 'hi', 'zh', 'ta'].map((l) => (
              <button
                key={l}
                onClick={() => setContentLang(l)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                  contentLang === l
                    ? 'bg-[#A80808] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-[#A80808]/10'
                }`}
              >
                {l === 'ne' ? 'नेपाली' : l.toUpperCase()}
              </button>
            ))}
          </div>

          {donateContent.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">{t?.a1_donNoSections || 'No content sections yet.'}</p>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm table-fixed">
                <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="w-8 text-center font-bold py-2.5">#</th>
                    <th className="text-left font-bold py-2.5 px-2">{t?.a1_donTitle || 'Title'}</th>
                    <th className="hidden md:table-cell w-16 text-center font-bold py-2.5">{t?.a1_donParas || 'Paras'}</th>
                    <th className="hidden md:table-cell w-16 text-center font-bold py-2.5">{t?.a1_donPoints || 'Points'}</th>
                    <th className="w-14 text-center font-bold py-2.5">{t?.a1_donShow || 'Show'}</th>
                    <th className="w-28 text-center font-bold py-2.5">{t?.actions || 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {donateContent.map((rawSection, i) => {
                    const section = normalizeSection(rawSection);
                    const isOpen = openRows.has(i);
                    const paraCount = section.paragraphs.filter(
                      (p) => (locValue(p, contentLang) || '').trim()
                    ).length;
                    const pointCount = section.points.filter(
                      (pt) => (locValue(pt, contentLang) || '').trim()
                    ).length;

                    return (
                      <React.Fragment key={section.key || i}>
                        <tr
                          className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => toggleRow(i)}
                        >
                          <td className="py-2 text-center text-xs font-mono text-gray-400">{i + 1}</td>
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {isOpen ? (
                                <ChevronDown size={14} className="shrink-0 text-gray-400" />
                              ) : (
                                <ChevronRight size={14} className="shrink-0 text-gray-400" />
                              )}
                              <span className="font-medium text-gray-700 truncate">
                                {locValue(section.title, contentLang) || t?.a1_donUntitledSection || 'Untitled section'}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 hidden md:table-cell text-center text-xs text-gray-500">
                            {paraCount || '—'}
                          </td>
                          <td className="py-2 hidden md:table-cell text-center text-xs text-gray-500">
                            {pointCount || '—'}
                          </td>
                          <td className="py-2 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSectionEnabled(i);
                              }}
                              className={`inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
                                section.enabled === false
                                  ? 'bg-gray-100 text-gray-300 hover:bg-gray-200'
                                  : 'bg-[#A80808]/15 text-[#A80808]'
                              }`}
                              title={
                                section.enabled === false
                                  ? t?.a1_donHiddenOnPage || 'Hidden on the page'
                                  : t?.a1_donVisibleOnPage || 'Visible on the page'
                              }
                            >
                              {section.enabled === false ? <X size={14} /> : <Check size={14} />}
                            </button>
                          </td>
                          <td className="py-2">
                            <div
                              className="flex items-center justify-center gap-0.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => moveSection(i, -1)}
                                disabled={i === 0}
                                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"
                                title={t?.a1_donMoveUp || 'Move up'}
                              >
                                <ChevronUp size={14} />
                              </button>
                              <button
                                onClick={() => moveSection(i, 1)}
                                disabled={i === donateContent.length - 1}
                                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"
                                title={t?.a1_donMoveDown || 'Move down'}
                              >
                                <ChevronDown size={14} />
                              </button>
                              <button
                                onClick={() => removeSection(i)}
                                className="p-1.5 rounded hover:bg-red-100 text-red-500"
                                title={t?.remove || 'Remove'}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {isOpen && (
                          <tr className="border-t border-gray-100 bg-gray-50/60">
                            <td colSpan={6} className="px-4 py-3">
                              <div className="grid md:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-bold text-gray-500 mb-1">{t?.a1_donTitle || 'Title'}</label>
                                  <input
                                    type="text"
                                    aria-label={t?.a1_donTitle || 'Title'} value={locValue(section.title, contentLang)}
                                    onChange={(e) => setSectionField(i, 'title', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-[#A80808] focus:outline-none text-sm"
                                    placeholder={t?.a1_donSectionTitlePlaceholder || 'Section title...'}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-500 mb-1">
                                    {t?.description || 'Description'}
                                  </label>
                                  <input
                                    type="text"
                                    aria-label={t?.description || 'Description'} value={locValue(section.desc, contentLang)}
                                    onChange={(e) => setSectionField(i, 'desc', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-[#A80808] focus:outline-none text-sm"
                                    placeholder={t?.a1_donDescPlaceholder || 'Short lead paragraph under the title'}
                                  />
                                </div>
                              </div>

                              <div className="flex items-center justify-between mt-3 mb-1.5">
                                <label className="text-xs font-bold text-gray-500">
                                  {(t?.a1_donParagraphsCount || 'Paragraphs ({count})').replace('{count}', section.paragraphs.length)}
                                </label>
                                <button
                                  onClick={() => addParagraph(i)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#A80808]/10 text-[#A80808] text-xs font-semibold hover:bg-[#A80808]/20 transition-all"
                                >
                                  <Plus size={12} /> {t?.a1_donAddParagraph || 'Add Paragraph'}
                                </button>
                              </div>
                              <p className="text-xs text-gray-400 mb-2">
                                {t?.a1_donParagraphsHelp || 'Add as many as you need. Empty ones are skipped on the public page.'}
                              </p>

                              {section.paragraphs.length === 0 ? (
                                <p className="text-xs text-gray-400">{t?.a1_donNoParagraphs || 'No paragraphs yet.'}</p>
                              ) : (
                                section.paragraphs.map((para, pi) => (
                                  <div key={pi} className="mb-2">
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <span className="text-xs font-mono text-gray-400 w-4 shrink-0">
                                        {pi + 1}
                                      </span>
                                      <span className="text-xs text-gray-500 flex-1">
                                        {(t?.a1_donParagraphN || 'Paragraph {n}').replace('{n}', pi + 1)}
                                      </span>
                                      <button
                                        onClick={() => moveParagraph(i, pi, -1)}
                                        disabled={pi === 0}
                                        className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30"
                                        title={t?.a1_donMoveUp || 'Move up'}
                                      >
                                        <ChevronUp size={13} />
                                      </button>
                                      <button
                                        onClick={() => moveParagraph(i, pi, 1)}
                                        disabled={pi === section.paragraphs.length - 1}
                                        className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30"
                                        title={t?.a1_donMoveDown || 'Move down'}
                                      >
                                        <ChevronDown size={13} />
                                      </button>
                                      <button
                                        onClick={() => removeParagraph(i, pi)}
                                        className="p-1.5 rounded hover:bg-red-100 text-red-500"
                                        title={t?.remove || 'Remove'}
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                    <textarea
                                      rows={2}
                                      aria-label={(t?.a1_donParagraphN || 'Paragraph {n}').replace('{n}', pi + 1)} value={locValue(para, contentLang)}
                                      onChange={(e) => setSectionParagraph(i, pi, e.target.value)}
                                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-[#A80808] focus:outline-none text-sm resize-none"
                                      placeholder={(t?.a1_donParagraphN || 'Paragraph {n}').replace('{n}', pi + 1)}
                                    />
                                  </div>
                                ))
                              )}

                              <div className="grid md:grid-cols-2 gap-3 mt-3">
                                <div>
                                  <label className="block text-xs font-bold text-gray-500 mb-1">
                                    {t?.a1_donListHeading || 'List Heading'}
                                  </label>
                                  <input
                                    type="text"
                                    aria-label={t?.a1_donListHeading || 'List Heading'} value={locValue(section.listTitle, contentLang)}
                                    onChange={(e) => setSectionField(i, 'listTitle', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-[#A80808] focus:outline-none text-sm"
                                    placeholder={t?.a1_donOptional || 'Optional'}
                                  />
                                </div>
                                <div className="flex items-end">
                                  <button
                                    onClick={() => addPoint(i)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#A80808]/10 text-[#A80808] text-xs font-semibold hover:bg-[#A80808]/20 transition-all"
                                  >
                                    <Plus size={12} /> {t?.a1_donAddPoint || 'Add Point'}
                                  </button>
                                </div>
                              </div>

                              {section.points.length > 0 && (
                                <div className="mt-2">
                                  {section.points.map((point, pi) => (
                                    <div key={pi} className="flex items-center gap-1.5 mb-1.5">
                                      <span className="text-xs font-mono text-gray-400 w-4 shrink-0">
                                        {pi + 1}
                                      </span>
                                      <input
                                        type="text"
                                        aria-label={(t?.a1_donPointN || 'Point {n}').replace('{n}', pi + 1)} value={locValue(point, contentLang)}
                                        onChange={(e) => setPoint(i, pi, e.target.value)}
                                        className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-lg focus:border-[#A80808] focus:outline-none text-sm"
                                        placeholder={(t?.a1_donPointN || 'Point {n}').replace('{n}', pi + 1)}
                                      />
                                      <button
                                        onClick={() => movePoint(i, pi, -1)}
                                        disabled={pi === 0}
                                        className="p-2 rounded hover:bg-gray-200 disabled:opacity-30"
                                        title={t?.a1_donMoveUp || 'Move up'}
                                      >
                                        <ChevronUp size={13} />
                                      </button>
                                      <button
                                        onClick={() => movePoint(i, pi, 1)}
                                        disabled={pi === section.points.length - 1}
                                        className="p-2 rounded hover:bg-gray-200 disabled:opacity-30"
                                        title={t?.a1_donMoveDown || 'Move down'}
                                      >
                                        <ChevronDown size={13} />
                                      </button>
                                      <button
                                        onClick={() => removePoint(i, pi)}
                                        className="p-2 rounded hover:bg-red-100 text-red-500"
                                        title={t?.remove || 'Remove'}
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDonations;