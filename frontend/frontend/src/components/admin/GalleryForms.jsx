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

/** How many photos one batch may carry. Mirrors GALLERY_BATCH_MAX on the server. */
export const BULK_MAX = 6;

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

function ModalShell({ title, onClose, busy, children, wide }) {
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
        className={`max-h-[90dvh] w-full overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6 ${wide ? 'max-w-2xl' : 'max-w-lg'}`}
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

/**
 * Upload up to six photos in one go (Admin -> Gallery).
 *
 * The title is written once and applied to every photo in the batch, which is the
 * point: six pictures of the same ceremony get one title instead of six forms.
 * Each row also has its own title box, pre-filled with that shared title, so a photo
 * that needs a different caption can be given one without another round trip.
 *
 * Description and category are shared. Description may be left empty and added later
 * with Edit, so a batch of quick photos is not held up by prose.
 */
export function GalleryBulkUploadModal({ t, onClose, onUploaded }) {
  const { showToast } = useToast();
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [details, setDetails] = useState(emptyDetails);
  const [rows, setRows] = useState([]);
  const [fileError, setFileError] = useState('');
  const [titleError, setTitleError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(0);
  const fileInput = useRef(null);

  // Object URLs for the thumbnails, released when they are replaced or on close.
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  // New photos start on the shared title, so a batch of one title is typed once.
  useEffect(() => {
    setRows(files.map((f) => ({ file: f.name, title: details.title.en || details.title.ne || '' })));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the picked files change
  }, [files]);

  const sharedTitle = details.title.en || details.title.ne || '';
  const remaining = BULK_MAX - files.length;

  const chooseFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = '';
    if (!picked.length) return;

    const good = [];
    for (const f of picked) {
      if (!f.type.startsWith('image/')) continue;
      if (f.size > MAX_IMAGE_MB * 1024 * 1024) continue;
      good.push(f);
    }
    // Take what fits; anything over the cap is left for the next batch.
    const accepted = good.slice(0, remaining);
    const skipped = picked.length - accepted.length;
    setFiles((prev) => [...prev, ...accepted].slice(0, BULK_MAX));
    setFileError(
      skipped > 0
        ? fill(t.gl_bulkTooMany || 'You can upload up to {max} photos at a time. The rest were not added.', { max: BULK_MAX })
        : ''
    );
  };

  const removeAt = (i) => {
    setFiles((prev) => prev.filter((_, x) => x !== i));
    setRows((prev) => prev.filter((_, x) => x !== i));
  };

  const setRowTitle = (i, value) => setRows((prev) => prev.map((r, x) => (x === i ? { ...r, title: value } : r)));

  const applySharedTitleToAll = () => {
    setRows((prev) => prev.map((r) => ({ ...r, title: sharedTitle })));
  };

  const change = (next) => {
    setDetails(next);
    if (titleError) setTitleError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!files.length) {
      setFileError(t.gl_needFile || 'Choose a photo or a video.');
      return;
    }
    // A photo is never published untitled: it falls back to the shared title, so a
    // batch is only blocked when no photo at all would end up with a title.
    const anyTitled = sharedTitle.trim() || rows.some((r) => r.title.trim());
    if (!anyTitled) {
      setTitleError(t.gl_bulkNeedTitle || 'Give the batch a title, or write one on a photo.');
      return;
    }
    setTitleError('');

    const form = new FormData();
    files.forEach((f) => form.append('photos', f));
    form.append(
      'data',
      JSON.stringify({
        cap: details.title,
        title: details.title,
        description: details.description,
        category: details.category,
        hue: '#A80808',
        // Per-photo titles are matched back to their file by name.
        titles: rows.map((r) => ({ file: r.file, title: { en: r.title.trim() } })),
      })
    );

    setUploading(true);
    try {
      const response = await api.post('/admin/gallery/bulk', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const added = response.data?.data || [];
      const failed = response.data?.failed || [];
      setDone(added.length);
      if (failed.length) {
        showToast(
          fill(t.gl_bulkPartial || '{done} photo(s) added, {failed} could not be.', {
            done: added.length,
            failed: failed.length,
          }),
          'warning'
        );
      } else {
        showToast(fill(t.gl_bulkDone || '{n} photo(s) added.', { n: added.length }), 'success');
      }
      onUploaded(added);
    } catch (error) {
      console.error('Bulk upload error:', error);
      showToast(error.response?.data?.message || t.a2_uploadFailed || 'Upload failed', 'error');
      setUploading(false);
    }
  };

  return (
    <ModalShell
      title={t.gl_bulkHeading || `Add up to ${BULK_MAX} photos`}
      onClose={onClose}
      busy={uploading}
      wide
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        {done > 0 && (
          <p className="rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
            {fill(t.gl_bulkDone || '{n} photo(s) added.', { n: done })}
          </p>
        )}

        {/* Pick */}
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink">
              {t.gl_bulkPhotos || 'Photos'}{' '}
              <span className="font-normal text-mute">
                ({files.length}/{BULK_MAX})
              </span>
            </p>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading || remaining === 0}
              className="text-sm font-semibold text-vermilion hover:underline disabled:opacity-50"
            >
              {remaining === 0
                ? (t.gl_bulkFull || 'Batch is full')
                : (t.gl_bulkAddMore || '+ Add more photos')}
            </button>
          </div>

          {files.length === 0 ? (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="flex w-full flex-col items-center rounded-xl border-2 border-dashed border-gray-300 px-4 py-10 text-center transition-colors hover:border-vermilion"
            >
              <span className="mb-2 flex gap-2 text-mute">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <ImageIcon key={i} size={i === 0 ? 28 : 22} aria-hidden="true" />
                ))}
              </span>
              <span className="text-sm font-semibold text-ink">
                {fill(t.gl_bulkChoose || 'Choose up to {max} photos', { max: BULK_MAX })}
              </span>
              <span className="mt-1 text-xs text-mute">
                {fill(t.gl_bulkChooseHint || 'JPG, PNG or WEBP, up to {size} MB each.', { size: MAX_IMAGE_MB })}
              </span>
            </button>
          ) : (
            <ul className="space-y-2">
              {files.map((f, i) => (
                <li key={`${f.name}-${f.size}`} className="flex items-center gap-3 rounded-xl border border-gray-200 p-2">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    {previews[i] && <img src={previews[i]} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-mute" title={f.name}>{f.name}</p>
                    <input
                      type="text"
                      value={rows[i] ? rows[i].title : ''}
                      onChange={(e) => setRowTitle(i, e.target.value)}
                      placeholder={t.gl_bulkTitlePerPhoto || 'Title for this photo'}
                      aria-label={t.gl_bulkTitlePerPhoto || 'Title for this photo'}
                      className={`${input} mt-1 !py-1.5 text-sm`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAt(i)}
                    disabled={uploading}
                    title={t.remove || 'Remove'}
                    aria-label={t.remove || 'Remove'}
                    className="shrink-0 rounded-lg p-2 text-mute transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            onChange={chooseFiles}
            className="hidden"
            aria-label={fill(t.gl_bulkChoose || 'Choose up to {max} photos', { max: BULK_MAX })}
          />
          {fileError && <p role="alert" className="mt-2 text-sm text-red-600">{fileError}</p>}
        </div>

        {/* One title for the whole batch */}
        <div className="space-y-5 rounded-xl border border-vermilion/25 bg-vermilion/[0.04] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-vermilion">
            {t.gl_bulkShared || 'Written once, used for every photo above'}
          </p>

          <fieldset className="space-y-2">
            <legend className="mb-1 block text-sm font-semibold text-ink">
              {t.gl_titleLabel || 'Title'} <span className="text-vermilion" aria-hidden="true">*</span>
            </legend>
            {DETAIL_LANGS.map((l) => (
              <div key={l}>
                <label htmlFor={`gb-title-${l}`} className="mb-1 block text-xs font-semibold text-ink-soft">
                  {l === 'en' ? (t.gl_langEn || 'English') : (t.gl_langNe || 'नेपाली')}
                </label>
                <input
                  id={`gb-title-${l}`}
                  type="text"
                  value={details.title[l]}
                  onChange={(e) => {
                    const next = { ...details, title: { ...details.title, [l]: e.target.value } };
                    change(next);
                    // Typing the shared title pushes it onto every row, so the
                    // per-photo boxes stay in step with what was just written.
                    setRows((prev) => prev.map((r) => ({ ...r, title: r.title || e.target.value })));
                  }}
                  placeholder={t.gl_bulkTitlePh || 'e.g. Annual Bhajan and Kirtan'}
                  aria-invalid={titleError ? true : undefined}
                  className={`${input} ${titleError ? 'border-red-400' : ''}`}
                />
              </div>
            ))}
            {titleError && <p role="alert" className="text-sm text-red-600">{titleError}</p>}
            {sharedTitle && rows.some((r) => r.title !== sharedTitle) && (
              <button type="button" onClick={applySharedTitleToAll} className="text-xs font-semibold text-brand-600 hover:underline">
                {t.gl_bulkApplyAll || 'Use this title on all photos'}
              </button>
            )}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="mb-1 block text-sm font-semibold text-ink">
              {t.gl_descLabel || 'Description'}
              <span className="ml-1.5 font-normal text-mute">
                ({t.gl_bulkDescOptional || 'optional, can be added later'})
              </span>
            </legend>
            {DETAIL_LANGS.map((l) => (
              <div key={l}>
                <label htmlFor={`gb-desc-${l}`} className="mb-1 block text-xs font-semibold text-ink-soft">
                  {l === 'en' ? (t.gl_langEn || 'English') : (t.gl_langNe || 'नेपाली')}
                </label>
                <textarea
                  id={`gb-desc-${l}`}
                  rows={2}
                  value={details.description[l]}
                  onChange={(e) => change({ ...details, description: { ...details.description, [l]: e.target.value } })}
                  className={`${input} resize-y`}
                />
              </div>
            ))}
          </fieldset>

          <div>
            <label htmlFor="gb-category" className="mb-1 block text-sm font-semibold text-ink">
              {t.a2_category || 'Category'}
            </label>
            <select
              id="gb-category"
              value={details.category}
              onChange={(e) => change({ ...details, category: e.target.value })}
              className={`${input} bg-white`}
            >
              {CATEGORY_KEYS.map(([key, tKey, fallback]) => (
                <option key={key} value={key}>{t[tKey] || fallback}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-gray-300 disabled:opacity-50"
          >
            {done > 0 ? (t.gl_close || 'Close') : (t.gl_cancel || 'Cancel')}
          </button>
          <button
            type="submit"
            disabled={uploading || files.length === 0 || done > 0}
            className="inline-flex items-center gap-2 rounded-lg bg-vermilion px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#820606] disabled:opacity-60"
          >
            {uploading && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {uploading
              ? (t.uploading || 'Uploading...')
              : fill(t.gl_bulkSubmit || 'Add {n} photo(s)', { n: files.length })}
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
