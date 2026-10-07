import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, MapPin, Save, SlidersHorizontal, Type } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import LanguageSwitcher from '../common/LanguageSwitcher';
import api from '../../services/api';
import { Button, Field, Segmented, Toggle, inputCls } from './kit/kit';
import { Modal } from './kit/Overlays';
import { Card, Dropzone, SaveBar } from './kit/PageShell';

const SIZE_OPTIONS = [
  { value: 'w-8 h-8', label: 'XS', maxW: 'max-w-[32px]' },
  { value: 'w-10 h-10', label: 'S', maxW: 'max-w-[40px]' },
  { value: 'w-12 h-12', label: 'M', maxW: 'max-w-[48px]' },
  { value: 'w-14 h-14', label: 'L', maxW: 'max-w-[56px]' },
  { value: 'w-16 h-16', label: 'XL', maxW: 'max-w-[64px]' },
  { value: 'w-20 h-20', label: '2XL', maxW: 'max-w-[80px]' },
];

const SHAPE_OPTIONS = [
  { value: 'rounded', label: 'Soft' },
  { value: 'rounded-xl', label: 'Round' },
  { value: 'rounded-2xl', label: 'Extra' },
  { value: 'rounded-full', label: 'Circle' },
  { value: 'rounded-none', label: 'Square' },
];

const BG_OPTIONS = [
  { value: 'from-vermilion to-maroon-deep', label: 'Default' },
  { value: 'from-red-600 to-red-800', label: 'Red' },
  { value: 'from-amber-500 to-brand-600', label: 'Amber' },
  { value: 'from-brand-400 to-brand-600', label: 'Rose' },
];

const TEXT_COLOR_OPTIONS = [
  { value: 'text-maroon', label: 'Maroon' },
  { value: 'text-ink', label: 'Dark' },
  { value: 'text-white', label: 'White' },
  { value: 'text-vermilion', label: 'Vermilion' },
  { value: 'text-ink-soft', label: 'Grey' },
];

const TEXT_SIZE_OPTIONS = [
  { value: 'text-xs sm:text-xs', label: 'XS' },
  { value: 'text-xs sm:text-sm', label: 'S' },
  { value: 'text-sm sm:text-base', label: 'M' },
  { value: 'text-base sm:text-lg', label: 'L' },
  { value: 'text-lg sm:text-xl', label: 'XL' },
];

const WEIGHT_OPTIONS = [
  { value: 'font-medium', label: 'Medium' },
  { value: 'font-semibold', label: 'Semi' },
  { value: 'font-bold', label: 'Bold' },
  { value: 'font-extrabold', label: 'Black' },
];

const DEFAULT_TEXT = {
  en: 'Shree Ramchandra',
  ne: 'श्री रामचन्द्र',
  hi: 'श्री रामचंद्र',
  zh: '什里·拉姆钱德拉',
  ta: 'ஸ்ரீ ராமச்சந்திர',
};

/** Every knob the page edits, as one object, so reset and save are one line each. */
const fromSettings = (settings) => {
  const l = settings?.logo || {};
  return {
    photo: l.photo || null,
    text: l.text || DEFAULT_TEXT,
    size: l.size || 'w-12 h-12',
    shape: l.shape || 'rounded-full',
    bgColor: l.bgColor || 'from-vermilion to-maroon-deep',
    showText: l.showText !== false,
    textColor: l.textColor || 'text-maroon',
    textSize: l.textSize || 'text-sm md:text-base',
    fontWeight: l.fontWeight || 'font-bold',
    showLocation: l.showLocation !== false,
  };
};

const AdminLogo = ({ settings, updateSettings, t }) => {
  const { showToast } = useToast();
  const fileRef = useRef(null);
  const [activeLang, setActiveLang] = useState('en');
  const [form, setForm] = useState(() => fromSettings(settings));
  const [saved, setSaved] = useState(() => fromSettings(settings));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);

  // Adopt the server's copy whenever it changes underneath us, without stamping over
  // edits in progress (a save lands here too).
  useEffect(() => {
    const next = fromSettings(settings);
    setForm((cur) => (JSON.stringify(cur) === JSON.stringify(next) ? cur : next));
    setSaved(next);
  }, [settings]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);

  const localized = useMemo(() => {
    const o = form.text || {};
    return o[activeLang] || o.en || '';
  }, [form.text, activeLang]);

  const maxWidthFor = (size) => (SIZE_OPTIONS.find((o) => o.value === size) || SIZE_OPTIONS[2]).maxW;

  /** The logo exactly as the header draws it, reused in the preview and the page. */
  const Preview = ({ compact = false }) => (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className={`${compact ? 'h-12 w-12' : form.size} ${form.shape} bg-gradient-to-br ${form.bgColor} flex flex-shrink-0 items-center justify-center overflow-hidden text-white ${maxWidthFor(form.size)}`}
      >
        {form.photo ? <img src={form.photo} alt="" className="h-full w-full object-cover" /> : <span className="text-xl">🕉</span>}
      </div>
      {form.showText && (
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className={`truncate font-serif ${form.textSize} ${form.fontWeight} ${form.textColor} max-w-[10rem] sm:max-w-[16rem]`}>
            {localized || 'Shree Ramchandra'}
          </span>
          {form.showLocation && (
            <span className="flex items-center gap-1 truncate text-xs text-ink-soft max-w-[10rem] sm:max-w-[16rem]">
              <MapPin size={10} className="flex-shrink-0 text-vermilion" aria-hidden="true" />
              {t.templeSub || 'Gaushala, Kathmandu'}
            </span>
          )}
        </div>
      )}
    </div>
  );

  const upload = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast(t.uploadImageOnly || 'Please upload an image file', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast((t.a3_c_imageMaxSize || 'Image must be less than {size}MB').replace('{size}', '5'), 'error');
      return;
    }
    setUploading(true);
    const body = new FormData();
    body.append('image', file);
    try {
      const res = await api.post('/admin/upload/logo', body, { headers: { 'Content-Type': 'multipart/form-data' } });
      // The photo is stored as soon as it is uploaded; the rest waits for Save.
      set({ photo: res.data.url });
      showToast(t.a3_logo_uploaded || 'Logo uploaded successfully', 'success');
    } catch (error) {
      showToast(error.response?.data?.message || (t.a3_c_uploadFailed || 'Upload failed'), 'error');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateSettings({ logo: { ...(settings?.logo || {}), ...form } });
      setSaved(form);
      showToast(t.a3_logo_saved || 'Logo settings saved successfully', 'success');
    } catch (error) {
      console.error('Save logo error:', error);
      showToast(error.response?.data?.message || (t.a3_logo_saveFailed || 'Failed to save logo'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => setForm(saved);

  return (
    <div className="space-y-4 pb-2">
      <Card
        n={1}
        icon={Image}
        title={t.a3_logo_livePreview || 'Live Preview'}
        description={t.a3_logo_previewHint || 'How the logo appears in the site header. This updates as you type.'}
        actions={
          <Button icon={SlidersHorizontal} onClick={() => setStyleOpen(true)}>
            {t.a3_logo_styling || 'Styling'}
          </Button>
        }
      >
        <div className="flex min-h-[7rem] items-center justify-center rounded-xl border border-dashed border-line bg-panel p-6">
          <Preview />
        </div>
      </Card>

      <Card
        n={2}
        icon={Image}
        title={t.a3_logo_image || 'Logo Image'}
        description={t.a3_logo_imageHint || 'PNG, JPG or WEBP. A square picture works best.'}
      >
        <Dropzone
          inputRef={fileRef}
          onPick={upload}
          preview={form.photo}
          busy={uploading}
          boxClassName="h-32"
          onRemove={() => set({ photo: null })}
          removeLabel={t.remove || 'Remove'}
          empty={
            <div className="flex flex-col items-center gap-1.5 p-4 text-center text-ink-soft">
              <Image size={26} aria-hidden="true" />
              <span className="text-xs font-semibold">{t.a3_c_clickToUpload || 'Click to upload'}</span>
              <span className="text-xs text-mute">PNG, JPG, WEBP · 5MB</span>
            </div>
          }
          hint={t.a3_logo_photoNote || 'Uploading a picture saves it straight away. The other settings wait for Save.'}
        />
      </Card>

      <Card
        n={3}
        icon={Type}
        title={t.a3_logo_text || 'Logo Text'}
        description={t.a3_logo_textHint || 'The name shown next to the picture.'}
        actions={<LanguageSwitcher active={activeLang} onChange={setActiveLang} t={t} />}
      >
        <div className="space-y-5">
          <Field
            label={(t.a3_logo_textIn || 'Text in {lang}').replace('{lang}', activeLang.toUpperCase())}
            htmlFor="logo-text"
          >
            <input
              id="logo-text"
              data-autofocus
              type="text"
              value={form.text[activeLang] || ''}
              onChange={(e) => set({ text: { ...form.text, [activeLang]: e.target.value } })}
              className={inputCls}
              placeholder={(t.a3_logo_enterText || 'Enter logo text in {lang}').replace('{lang}', activeLang)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Toggle checked={form.showText} onChange={(v) => set({ showText: v })} label={t.a3_logo_showText || 'Show text'} />
            <Toggle checked={form.showLocation} onChange={(v) => set({ showLocation: v })} label={t.a3_logo_showLocation || 'Show location'} />
          </div>
        </div>
      </Card>

      <Modal
        open={styleOpen}
        onClose={() => setStyleOpen(false)}
        title={t.a3_logo_styling || 'Styling'}
        description={t.a3_logo_stylingHint || 'Size, shape and colour of the logo. Changes show in the preview behind this popup.'}
        size="lg"
        footer={
          <>
            <Button onClick={() => setStyleOpen(false)}>{t.gl_close || 'Close'}</Button>
            <Button variant="primary" icon={Save} onClick={() => setStyleOpen(false)}>
              {t.a3_logo_applyStyle || 'Apply'}
            </Button>
          </>
        }
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t.a3_logo_size || 'Logo Size'} hint={t.a3_logo_sizeHint || 'Constrained so it cannot stretch.'}>
            <Segmented options={SIZE_OPTIONS} value={form.size} onChange={(v) => set({ size: v })} />
          </Field>
          <Field label={t.a3_logo_shape || 'Logo Shape'}>
            <Segmented options={SHAPE_OPTIONS} value={form.shape} onChange={(v) => set({ shape: v })} />
          </Field>
          <Field label={t.a3_logo_bgColor || 'Background Colour'}>
            <Segmented options={BG_OPTIONS} value={form.bgColor} onChange={(v) => set({ bgColor: v })} />
          </Field>
          <Field label={t.a3_logo_textColor || 'Text Colour'}>
            <Segmented options={TEXT_COLOR_OPTIONS} value={form.textColor} onChange={(v) => set({ textColor: v })} />
          </Field>
          <Field label={t.a3_logo_textSize || 'Text Size'}>
            <Segmented options={TEXT_SIZE_OPTIONS} value={form.textSize} onChange={(v) => set({ textSize: v })} />
          </Field>
          <Field label={t.a3_logo_fontWeight || 'Font Weight'}>
            <Segmented options={WEIGHT_OPTIONS} value={form.fontWeight} onChange={(v) => set({ fontWeight: v })} />
          </Field>
        </div>
      </Modal>

      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={save}
        onReset={dirty ? reset : undefined}
        saveLabel={t.a3_logo_saveAll || 'Save all settings'}
        resetLabel={t.a3_logo_discard || 'Discard changes'}
      />
    </div>
  );
};

export default AdminLogo;