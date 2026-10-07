import React, { useState } from 'react';
import { Save, Eye, EyeOff, Edit, X, Plus, Trash2, Image as ImageIcon, ChevronUp, ChevronDown, QrCode } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import LanguageSwitcher from '../common/LanguageSwitcher';
import api from '../../services/api';
import OmLoader from '../../components/common/OmLoader';

const LANGS = ['en', 'ne', 'hi', 'zh', 'ta'];

const emptyLocalized = () => ({
  en: '',
  ne: '',
  hi: '',
  zh: '',
  ta: '',
});

const emptyNotice = () => ({
  id: `n${Date.now()}${Math.random().toString(36).slice(2, 7)}`,
  enabled: true,
  photo: '',
  title: emptyLocalized(),
  banner: emptyLocalized(),
  body: emptyLocalized(),
  cost: emptyLocalized(),
  donors: emptyLocalized(),
  applicant: emptyLocalized(),
  committee: emptyLocalized(),
  location: emptyLocalized(),
  contactNo: emptyLocalized(),
  contactDetails: emptyLocalized(),
  qrLabel: emptyLocalized(),
  donateBtn: emptyLocalized(),
});

// Normalize a (possibly legacy/partial) notice object into the full shape
const normalizeNotice = (n) => {
  const target = { ...emptyNotice(), ...(n || {}) };
  LANGS.forEach((l) => {
    ['title', 'banner', 'body', 'cost', 'donors', 'applicant', 'committee', 'location', 'contactNo', 'contactDetails', 'qrLabel', 'donateBtn'].forEach((field) => {
      const cur = target[field];
      target[field] = { ...emptyLocalized(), ...(typeof cur === 'string' ? { en: cur } : cur || {}) };
    });
  });
  if (!target.id) target.id = `n${Date.now()}`;
  return target;
};

const getText = (obj, lang) => {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[lang] || obj.en || '';
};

const setText = (obj, lang, value) => ({
  ...obj,
  [lang]: value,
});

const AdminNotice = ({ settings, updateSettings, t }) => {
  const { showToast } = useToast();

  // Seed notices: prefer settings.notices array, otherwise wrap the legacy single notice
  const seedNotices = () => {
    if (Array.isArray(settings?.notices) && settings.notices.length > 0) {
      return settings.notices.map(normalizeNotice);
    }
    if (settings?.notice) {
      return [normalizeNotice(settings.notice)];
    }
    return [normalizeNotice(emptyNotice())];
  };

  const [notices, setNotices] = useState(seedNotices);
  const [editingIndex, setEditingIndex] = useState(null); // null = not editing modal
  const [isNew, setIsNew] = useState(false);
  const [activeLang, setActiveLang] = useState('en');
  const [draft, setDraft] = useState(null);
  const [uploading, setUploading] = useState(false);

  // The donation QR shown at the bottom of the popup. Same picture as Admin ->
  // Donation Account; only the on/off switch lives here as well.
  const qrEnabled = settings?.donate?.qrEnabled !== false;
  const [savingQr, setSavingQr] = useState(false);

  const toggleQr = async () => {
    setSavingQr(true);
    const next = !qrEnabled;
    try {
      await updateSettings({ donate: { ...(settings?.donate || {}), qrEnabled: next } });
      showToast(
        next
          ? (t.a3_notice_qrShown || 'QR will show in the notice popup')
          : (t.a3_notice_qrHidden || 'QR hidden from the notice popup'),
        'success'
      );
    } catch (error) {
      console.error('Save notice QR error:', error);
      showToast(error.response?.data?.message || (t.a3_notice_saveFailed || 'Failed to save'), 'error');
    } finally {
      setSavingQr(false);
    }
  };

  const openAddModal = () => {
    const n = emptyNotice();
    setDraft(n);
    setEditingIndex(null);
    setIsNew(true);
  };

  const openEditModal = (index) => {
    setDraft({ ...normalizeNotice(notices[index]) });
    setEditingIndex(index);
    setIsNew(false);
  };

  const closeModal = () => {
    setDraft(null);
    setEditingIndex(null);
    setIsNew(false);
  };

  const updateDraftField = (field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const updateDraftLocalized = (field, value) => {
    setDraft((prev) => ({ ...prev, [field]: setText(prev[field] || emptyLocalized(), activeLang, value) }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast((t.uploadImageOnly || 'Please upload an image file'), 'error');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      showToast((t.a3_c_imageMaxSize || 'Image must be less than {size}MB').replace('{size}', '8'), 'error');
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);
    try {
      const response = await api.post('/admin/upload/notice', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateDraftField('photo', response.data.url);
      showToast((t.a3_notice_photoUploaded || 'Notice photo uploaded successfully'), 'success');
    } catch (error) {
      console.error('Upload error:', error);
      showToast(error.response?.data?.message || (t.a3_notice_photoFailed || 'Failed to upload notice photo'), 'error');
    } finally {
      setUploading(false);
    }
    e.target.value = '';
  };

  const saveNotices = async (next) => {
    try {
      await updateSettings({ notices: next.map(normalizeNotice) });
      setNotices(next.map(normalizeNotice));
      showToast((t.a3_notice_saved || 'Notice settings saved successfully'), 'success');
    } catch (error) {
      console.error('Save notice error:', error);
      showToast(error.response?.data?.message || (t.a3_notice_saveFailed || 'Failed to save notice settings'), 'error');
      throw error;
    }
  };

  const handleSaveModal = async () => {
    if (!draft) return;
    if (!getText(draft.title, 'en').trim()) {
      showToast((t.a3_notice_titleRequired || 'Title (English) is required'), 'error');
      return;
    }
    const normalized = normalizeNotice(draft);
    let next;
    if (editingIndex !== null) {
      next = notices.map((n, i) => (i === editingIndex ? normalized : n));
    } else {
      next = [...notices, normalized];
    }
    await saveNotices(next);
    closeModal();
  };

  const handleDelete = async (id) => {
    if (!window.confirm((t.a3_notice_deleteConfirm || 'Delete this notice?'))) return;
    const next = notices.filter((n) => n.id !== id);
    if (next.length === 0) {
      next.push(normalizeNotice(emptyNotice()));
    }
    await saveNotices(next);
  };

  const handleToggle = async (id) => {
    const next = notices.map((n) => (n.id === id ? { ...n, enabled: !n.enabled } : n));
    setNotices(next);
    try {
      await updateSettings({ notices: next.map(normalizeNotice) });
    } catch (error) {
      setNotices(notices);
      showToast((t.a3_notice_statusFailed || 'Failed to update notice status'), 'error');
    }
  };

  const moveNotice = (index, dir) => {
    const next = [...notices];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setNotices(next);
    void saveNotices(next);
  };

  const renderLocalizedInput = (field, placeholder, textarea = false, rows = 2, label = placeholder) =>
    textarea ? (
      <textarea
        rows={rows}
        aria-label={label} value={getText(draft[field], activeLang)}
        onChange={(e) => updateDraftLocalized(field, e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm resize-none"
      />
    ) : (
      <input
        type="text"
        aria-label={label} value={getText(draft[field], activeLang)}
        onChange={(e) => updateDraftLocalized(field, e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm"
      />
    );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-base font-serif font-semibold text-ink">{t.a3_notice_modal || 'Notice Modal'}</h4>
          <p className="text-xs text-ink-soft mt-0.5">{(notices.length === 1 ? (t.a3_notice_manageHintOne || 'Manage notices shown on website load ({count} notice)') : (t.a3_notice_manageHintMany || 'Manage notices shown on website load ({count} notices)')).replace('{count}', notices.length)}</p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-vermilion text-white font-semibold text-sm hover:bg-[#820606] transition-all"
        >
          <Plus size={16} /> {t.a3_notice_addNew || 'Add New Notice'}
        </button>
      </div>

      {/*
        The donation QR at the bottom of the notice popup is the one from
        Admin -> Donation Account, and the popup hides it when this is off. It is
        a single switch on purpose: two switches for one picture would let them
        disagree. The picture itself is still uploaded from Donation Account.
      */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-panel px-4 py-3">
        <div className="flex min-w-0 items-start gap-3">
          <QrCode size={18} className="mt-0.5 shrink-0 text-vermilion" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">
              {t.a3_notice_qrToggle || 'Show the donation QR in the notice popup'}
            </p>
            <p className="mt-0.5 text-xs text-ink-soft">
              {qrEnabled
                ? (t.a3_notice_qrOn || 'The QR appears at the bottom of the popup. Switch it off to hide it.')
                : (t.a3_notice_qrOff || 'The QR is hidden from the popup right now.')}
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={qrEnabled}
          aria-label={t.a3_notice_qrToggle || 'Show the donation QR in the notice popup'}
          disabled={savingQr}
          onClick={toggleQr}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
            qrEnabled ? 'bg-vermilion' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              qrEnabled ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Notices List */}
      <div className="space-y-3">
        {notices.map((item, index) => (
            <div
              key={item.id}
              className={`border rounded-xl p-4 transition-all ${
                item.enabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-75'
              }`}
            >
              <div className="flex items-start gap-4">
                {item.photo && (
                  <img
                    src={item.photo}
                    alt={getText(item.title, 'en') || (t.a3_notice_notice || 'Notice')}
                    className="w-16 h-16 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h5 className="text-sm font-semibold text-ink truncate">
                      {getText(item.title, 'en') || (t.a3_notice_untitled || 'Untitled Notice')}
                    </h5>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      item.enabled ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {item.enabled ? (t.a3_c_active || 'Active') : (t.a3_c_disabled || 'Disabled')}
                    </span>
                  </div>
                  {getText(item.banner, 'en') && (
                    <p className="text-xs text-ink-soft truncate mt-0.5">{getText(item.banner, 'en')}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => moveNotice(index, -1)}
                    disabled={index === 0}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30"
                    title={(t.a3_c_moveUp || 'Move up')}
                  >
                    <ChevronUp size={16} className="text-ink-soft" />
                  </button>
                  <button
                    onClick={() => moveNotice(index, 1)}
                    disabled={index === notices.length - 1}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30"
                    title={(t.a3_c_moveDown || 'Move down')}
                  >
                    <ChevronDown size={16} className="text-ink-soft" />
                  </button>
                  <button
                    onClick={() => handleToggle(item.id)}
                    className={`p-1.5 rounded-lg transition-all ${
                      item.enabled ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                    }`}
                    title={item.enabled ? (t.a3_c_disable || 'Disable') : (t.a3_c_enable || 'Enable')}
                  >
                    {item.enabled ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button
                    onClick={() => openEditModal(index)}
                    className="p-1.5 rounded-lg bg-brand-50 text-vermilion hover:bg-vermilion/20 transition-all"
                    title={(t.edit || 'Edit')}
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-all"
                    title={(t.delete || 'Delete')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* Add / Edit Notice Modal */}
      {draft && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white rounded-t-2xl">
              <div>
                <h3 className="text-lg font-serif font-semibold text-ink">
                  {isNew ? (t.a3_notice_addNew || 'Add New Notice') : (t.a3_notice_edit || 'Edit Notice')}
                </h3>
                <p className="text-xs text-ink-soft mt-0.5">{t.a3_notice_fillDetails || 'Fill in the notice details below'}</p>
              </div>
              <button
                onClick={closeModal}
                aria-label={(t.close || 'Close')}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Enabled + Photo */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.enabled}
                    onChange={(e) => updateDraftField('enabled', e.target.checked)}
                    className="w-4 h-4 accent-vermilion"
                  />
                  <span className="text-sm font-medium text-ink">{t.a3_notice_enableThis || 'Enable this notice'}</span>
                </label>

                <div className="flex items-center gap-2">
                  <div
                    className="relative border-2 border-dashed border-gray-300 rounded-xl overflow-hidden w-24 h-24 flex items-center justify-center cursor-pointer bg-gray-50 hover:border-vermilion transition-colors"
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      id="notice-photo-upload"
                    />
                    <label htmlFor="notice-photo-upload" className="absolute inset-0 flex items-center justify-center cursor-pointer">
                      {draft.photo ? (
                        <img src={draft.photo} alt={(t.a3_notice_notice || 'Notice')} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-ink-soft">
                          <ImageIcon size={20} />
                          <span className="text-xs font-medium">{t.a3_notice_uploadPhoto || 'Upload photo'}</span>
                        </div>
                      )}
                    </label>
                    {uploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <OmLoader size="sm" color="white" />
                      </div>
                    )}
                  </div>
                  {draft.photo && (
                    <button
                      onClick={() => updateDraftField('photo', '')}
                      className="text-xs text-red-500 hover:text-red-600 transition-colors bg-transparent border-0"
                    >
                      {t.remove || 'Remove'}
                    </button>
                  )}
                </div>
              </div>

              {/* Language Switcher */}
              <div className="flex items-center gap-4">
                <LanguageSwitcher active={activeLang} onChange={setActiveLang} t={t} />
              </div>

              <div>
                <label className="text-xs font-bold text-ink block mb-1.5">{t.heroTitleLabel || 'Title'} *</label>
                {renderLocalizedInput('title', (t.a3_notice_titlePh || 'Notice title'), false, 2, (t.heroTitleLabel || 'Title'))}
              </div>
              <div>
                <label className="text-xs font-bold text-ink block mb-1.5">{t.a3_notice_banner || 'Banner Text'}</label>
                {renderLocalizedInput('banner', (t.a3_notice_bannerPh || 'Short banner line'), false, 2, (t.a3_notice_banner || 'Banner Text'))}
              </div>
              <div>
                <label className="text-xs font-bold text-ink block mb-1.5">{t.a3_notice_body || 'Body'}</label>
                {renderLocalizedInput('body', (t.a3_notice_bodyPh || 'Full notice body'), true, 4, (t.a3_notice_body || 'Body'))}
              </div>
              <div>
                <label className="text-xs font-bold text-ink block mb-1.5">{t.a3_notice_cost || 'Cost Information'}</label>
                {renderLocalizedInput('cost', (t.a3_notice_costPh || 'Estimated cost details'), true, 2, (t.a3_notice_cost || 'Cost Information'))}
              </div>
              <div>
                <label className="text-xs font-bold text-ink block mb-1.5">{t.a3_notice_donors || 'Donor Information'}</label>
                {renderLocalizedInput('donors', (t.a3_notice_donorsPh || 'Donor plaque details'), true, 2, (t.a3_notice_donors || 'Donor Information'))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-ink block mb-1.5">{t.a3_notice_applicant || 'Applicant'}</label>
                  {renderLocalizedInput('applicant', (t.a3_notice_applicant || 'Applicant'), false)}
                </div>
                <div>
                  <label className="text-xs font-bold text-ink block mb-1.5">{t.a3_notice_committee || 'Committee'}</label>
                  {renderLocalizedInput('committee', (t.a3_notice_committeePh || 'Committee name'), false, 2, (t.a3_notice_committee || 'Committee'))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-ink block mb-1.5">{t.locationLabel || 'Location'}</label>
                  {renderLocalizedInput('location', (t.locationLabel || 'Location'), false)}
                </div>
                <div>
                  <label className="text-xs font-bold text-ink block mb-1.5">{t.a3_notice_contactDetails || 'Contact Details'}</label>
                  {renderLocalizedInput('contactDetails', (t.a3_notice_phoneNumbers || 'Phone numbers'), false, 2, (t.a3_notice_contactDetails || 'Contact Details'))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-ink block mb-1.5">{t.a3_notice_contactNoLabel || 'Contact No. Label'}</label>
                  {renderLocalizedInput('contactNo', (t.a3_notice_contactNo || 'Contact No.'), false, 2, (t.a3_notice_contactNoLabel || 'Contact No. Label'))}
                </div>
                <div>
                  <label className="text-xs font-bold text-ink block mb-1.5">{t.a3_notice_qrLabel || 'QR Label'}</label>
                  {renderLocalizedInput('qrLabel', (t.a3_notice_qrCode || 'QR Code'), false, 2, (t.a3_notice_qrLabel || 'QR Label'))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-ink block mb-1.5">{t.a3_notice_donateBtn || 'Donate Button Text'}</label>
                {renderLocalizedInput('donateBtn', (t.a3_notice_donateNow || 'Donate Now'), false, 2, (t.a3_notice_donateBtn || 'Donate Button Text'))}
              </div>

              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button
                  onClick={handleSaveModal}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-vermilion text-white font-semibold text-sm hover:bg-[#820606] transition-all"
                >
                  <Save size={15} /> {isNew ? (t.a3_notice_add || 'Add Notice') : (t.saveChanges || 'Save Changes')}
                </button>
                <button
                  onClick={closeModal}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 text-ink-soft font-semibold text-sm hover:bg-gray-50 transition-all"
                >
                  {t.cancel || 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNotice;