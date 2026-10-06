import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image as ImageIcon, Video as VideoIcon, Loader2, X } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { isGenericTitle } from '../../utils/galleryPlaceholders';

// Title and description are written in English and Nepali. At least one of the two is required for
// each; visitors see their own language and fall back to English (then Nepali) when it is empty.
export const DETAIL_LANGS = ['en', 'ne'];
const MAX_IMAGE_MB = 10;
const MAX_VIDEO_MB = 50;

const CATEGORY_KEYS = [
  ['general', 'a2_galleryCatGeneral', 'General'],
  ['temple', 'a2_galleryCatTemple', 'Temple'],
  ['deity', 'a2_galleryCatDeity', 'Deity'],
  ['festival', 'a2_galleryCatFestival', 'Festival'],
  ['devotion', 'a2_galleryCatDevotion', 'Devotion'],
  ['ceremony', 'a2_galleryCatCeremony', 'Ceremony'],
  ['ritual', 'a2_galleryCatRitual', 'Ritual'],
  ['aarti', 'a2_galleryCatAarti', 'Aarti'],
];

const fill = (text, values) => String(text).replace(/\{(\w+)\}/g, (whole, key) => (values[key] !== undefined ? values[key] : whole));
const written = (obj) => DETAIL_LANGS.some((l) => obj && typeof obj[l] === 'string' && obj[l].trim());

/** Has a real title and a description (a stand-in caption such as "Gallery Image" is not a title). */
export const hasDetails = (item) => {
  const titled = written(item.title) || DETAIL_LANGS.some((l) => item.cap && item.cap[l] && !isGenericTitle(item.cap[l]));
  return titled && written(item.description);
};

export const emptyDetails = () => ({
  title: { en: '', ne: '' },
  description: { en: '', ne: '' },
  category: 'general',
});

/** Form values for an existing item. A real caption stands in for a missing title. */
export const detailsFromItem = (item) => {
  const pick = (obj, l) => (obj && typeof obj[l] === 'string' ? obj[l] : '');
  const title = {};
  const description = {};
  DETAIL_LANGS.forEach((l) => {
    const cap = pick(item.cap, l);
    title[l] = pick(item.title, l) || (isGenericTitle(cap) ? '' : cap);
    description[l] = pick(item.description, l);
  });
  return { title, description, category: item.category && item.category !== 'videos' ? item.category : 'general' };
};

/** { title?, description? } messages for whatever is still missing. */
export const validateDetails = (details, t) => {
  const errors = {};
  if (!written(details.title)) errors.title = t.gl_needTitle || 'Add a title in English or Nepali.';
  if (!written(details.description)) errors.description = t.gl_needDesc || 'Add a description in English or Nepali.';
  return errors;
};

// Other languages already stored on an item are kept; only English and Nepali are edited here.
const mergeLocalized = (stored, edited) => {
  const out = { ...(stored || {}) };
  DETAIL_LANGS.forEach((l) => { out[l] = (edited[l] || '').trim(); });
  return out;
};

const input = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-ink placeholder:text-mute focus:border-vermilion focus:outline-none focus:ring-2 focus:ring-vermilion/15';

/** Title, description and category fields shared by the upload and edit forms. */
export function GalleryDetailsFields({ value, onChange, errors = {}, t, idPrefix = 'gd', hideCategory = false }) {
  const setText = (field, lang, text) => onChange({ ...value, [field]: { ...value[field], [lang]: text } });
  const langName = (l) => (l === 'en' ? (t.gl_langEn || 'English') : (t.gl_langNe || 'नेपाली'));

  const group = (field, label, placeholder, multiline) => (
    <fieldset className="space-y-2" aria-describedby={errors[field] ? `${idPrefix}-${field}-error` : undefined}>
      <legend className="mb-1 block text-sm font-semibold text-ink">
        {label} <span className="text-vermilion" aria-hidden="true">*</span>
      </legend>
      {DETAIL_LANGS.map((l) => {
        const props = {
          id: `${idPrefix}-${field}-${l}`,
          value: value[field][l],
          onChange: (e) => setText(field, l, e.target.value),
          placeholder,
          lang: l,
          'aria-invalid': errors[field] ? true : undefined,
          className: `${input} ${multiline ? 'resize-y' : ''} ${errors[field] ? 'border-red-400' : ''}`,
        };
        return (
          <div key={l}>
            <label htmlFor={props.id} className="mb-1 block text-xs font-semibold text-ink-soft">{langName(l)}</label>
            {multiline ? <textarea rows={3} {...props} /> : <input type="text" {...props} />}
          </div>
        );
      })}
      {errors[field] && <p id={`${idPrefix}-${field}-error`} role="alert" className="text-sm text-red-600">{errors[field]}</p>}
    </fieldset>
  );

  return (
    <div className="space-y-5">
      {group('title', t.gl_titleLabel || 'Title', t.gl_titlePh || 'What is in this picture?', false)}
      {group('description', t.gl_descLabel || 'Description', t.gl_descPh || 'A sentence or two that tells visitors what they are looking at.', true)}
      <p className="text-xs text-mute">{t.gl_langHint || 'Fill in at least one language. Visitors see theirs, or English if it is empty.'}</p>
      {!hideCategory && (
        <div>
          <label htmlFor={`${idPrefix}-category`} className="mb-1 block text-sm font-semibold text-ink">{t.a2_category || 'Category'}</label>
          <select
            id={`${idPrefix}-category`}
            value={value.category}
            onChange={(e) => onChange({ ...value, category: e.target.value })}
            className={`${input} bg-white`}
          >
            {CATEGORY_KEYS.map(([key, tKey, fallback]) => <option key={key} value={key}>{t[tKey] || fallback}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}

function ModalShell({ title, onClose, busy, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => { if (!busy) onClose(); }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h3 className="font-serif text-lg font-semibold text-ink">{title}</h3>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="rounded-lg p-2 text-ink-soft transition-colors hover:bg-gray-100 disabled:opacity-50">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Upload: pick the file, write its title and description, then upload. Nothing is sent until both are written. */
export function GalleryUploadModal({ t, onClose, onUploaded }) {
  const { showToast } = useToast();
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [details, setDetails] = useState(emptyDetails);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef(null);

  const isVideo = Boolean(file && file.type.startsWith('video/'));
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const chooseFile = (e) => {
    const picked = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!picked) return;
    const video = picked.type.startsWith('video/');
    if (!video && !picked.type.startsWith('image/')) {
      setFile(null);
      setFileError(t.gl_wrongFile || 'Please choose a photo or a video.');
      return;
    }
    const limit = video ? MAX_VIDEO_MB : MAX_IMAGE_MB;
    if (picked.size > limit * 1024 * 1024) {
      setFile(null);
      setFileError(fill(t.gl_tooLarge || 'That file is too large (most {size} MB).', { size: limit }));
      return;
    }
    setFileError('');
    setFile(picked);
  };

  const change = (next) => {
    setDetails(next);
    if (submitted) setErrors(validateDetails(next, t));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    const found = validateDetails(details, t);
    setErrors(found);
    if (!file) { setFileError(t.gl_needFile || 'Choose a photo or a video.'); return; }
    if (found.title || found.description) return;

    const title = mergeLocalized(null, details.title);
    const description = mergeLocalized(null, details.description);
    const form = new FormData();
    if (isVideo) {
      form.append('video', file);
      form.append('title', JSON.stringify(title));
      form.append('description', JSON.stringify(description));
      form.append('category', details.category);
    } else {
      form.append('photo', file);
      form.append('data', JSON.stringify({ cap: title, title, description, category: details.category, hue: '#A80808' }));
    }

    setUploading(true);
    try {
      const response = await api.post(isVideo ? '/admin/gallery/video' : '/admin/gallery', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showToast(isVideo ? (t.a2_galleryVideoUploaded || 'Video uploaded successfully') : (t.a2_photoUploaded || 'Photo uploaded successfully'), 'success');
      onUploaded(response.data.data);
    } catch (error) {
      console.error('Upload error:', error);
      showToast(error.response?.data?.message || t.a2_uploadFailed || 'Upload failed', 'error');
      setUploading(false);
    }
  };

  return (
    <ModalShell title={t.a2_galleryUploadNew || 'Upload New'} onClose={onClose} busy={uploading}>
      <form onSubmit={submit} noValidate className="space-y-5">
        <div>
          {file ? (
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 p-3">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                {isVideo ? <video src={preview} muted className="h-full w-full object-cover" /> : <img src={preview} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{file.name}</p>
                <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading} className="mt-1 text-sm font-semibold text-vermilion hover:underline">
                  {t.gl_changeFile || 'Choose another'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="flex w-full flex-col items-center rounded-xl border-2 border-dashed border-gray-300 px-4 py-8 text-center transition-colors hover:border-vermilion"
            >
              <span className="mb-2 flex gap-2 text-mute"><ImageIcon size={28} aria-hidden="true" /><VideoIcon size={28} aria-hidden="true" /></span>
              <span className="text-sm font-semibold text-ink">{t.gl_chooseFile || 'Choose a photo or video'}</span>
              <span className="mt-1 text-xs text-mute">{t.gl_fileTypes || 'Photos: JPG, PNG, WEBP up to 10 MB. Videos: MP4, MOV up to 50 MB.'}</span>
            </button>
          )}
          <input ref={fileInput} type="file" accept="image/*,video/*" onChange={chooseFile} className="hidden" aria-label={t.gl_chooseFile || 'Choose a photo or video'} />
          {fileError && <p role="alert" className="mt-2 text-sm text-red-600">{fileError}</p>}
        </div>

        <GalleryDetailsFields value={details} onChange={change} errors={errors} t={t} idPrefix="gu" />

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={uploading} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-gray-300 disabled:opacity-50">
            {t.gl_cancel || 'Cancel'}
          </button>
          <button type="submit" disabled={uploading} className="inline-flex items-center gap-2 rounded-lg bg-vermilion px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#820606] disabled:opacity-60">
            {uploading && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {uploading ? (t.uploading || 'Uploading...') : (t.gl_upload || 'Upload')}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/** Edit the title, description and category of a picture or video that is already uploaded. */
export function GalleryEditModal({ item, t, onClose, onSaved }) {
  const { showToast } = useToast();
  const [details, setDetails] = useState(() => detailsFromItem(item));
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const change = (next) => {
    setDetails(next);
    if (submitted) setErrors(validateDetails(next, t));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    const found = validateDetails(details, t);
    setErrors(found);
    if (found.title || found.description) return;

    setSaving(true);
    try {
      const payload = {
        title: mergeLocalized(item.title, details.title),
        description: mergeLocalized(item.description, details.description),
      };
      if (item.type !== 'video') payload.category = details.category; // a video keeps its own category
      const response = await api.put(`/admin/gallery/${item._id}`, payload);
      showToast(t.gl_saved || 'Details saved', 'success');
      onSaved(response.data.data);
    } catch (error) {
      console.error('Gallery save error:', error);
      showToast(error.response?.data?.message || t.gl_saveFailed || 'Could not save the details', 'error');
      setSaving(false);
    }
  };

  return (
    <ModalShell title={t.gl_editHeading || 'Edit details'} onClose={onClose} busy={saving}>
      <form onSubmit={submit} noValidate className="space-y-5">
        <div className="h-40 overflow-hidden rounded-xl bg-gray-100">
          {item.type === 'video'
            ? <video src={item.photo} muted className="h-full w-full object-cover" />
            : <img src={item.photo} alt="" className="h-full w-full object-cover" />}
        </div>

        <GalleryDetailsFields value={details} onChange={change} errors={errors} t={t} idPrefix="ge" hideCategory={item.type === 'video'} />

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-gray-300 disabled:opacity-50">
            {t.gl_cancel || 'Cancel'}
          </button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-vermilion px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#820606] disabled:opacity-60">
            {saving && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {t.gl_save || 'Save changes'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
