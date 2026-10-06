import React, { useEffect, useState } from 'react';
import { ExternalLink, Megaphone, PanelTop } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import OmLoader from '../common/OmLoader';
import { Toggle } from './kit/kit';

/*
 * Every switch on this page drives one part of the public header, and each part
 * is checked as `enabled !== false` where it is drawn. A group that has never
 * been saved therefore leaves the header exactly as it is today, which is what
 * makes the defaults below safe to ship.
 */
const DEFAULTS = {
  topBar: { enabled: true },
  panchang: { enabled: true },
  tools: { enabled: true },
  logo: { enabled: true },
  mainNav: { enabled: true },
  sound: { enabled: true },
  language: { enabled: true },
  account: { enabled: true },
  marquee: { enabled: false, speed: 40, link: '', text: { en: '', ne: '', hi: '', zh: '', ta: '' } },
};

const LANGS = [
  ['en', 'English'],
  ['ne', 'नेपाली'],
  ['hi', 'हिन्दी'],
  ['zh', '中文'],
  ['ta', 'தமிழ்'],
];

// Filled in from the components below; the label and the hint are translated.
const PARTS = (t) => [
  { key: 'topBar', label: t?.a1_hdTopBar || 'Top strip', hint: t?.a1_hdTopBarHint || 'The thin bar above the navbar.' },
  { key: 'panchang', label: t?.a1_hdPanchang || 'Panchang', hint: t?.a1_hdPanchangHint || "Today's sunrise, sunset, tithi and festival, on the left of the top strip." },
  { key: 'tools', label: t?.a1_hdTools || 'Tool links', hint: t?.a1_hdToolsHint || 'Date, text, currency and time tools on the right of the top strip.' },
  { key: 'logo', label: t?.a1_hdLogo || 'Logo and temple name', hint: t?.a1_hdLogoHint || 'The mark at the left of the navbar.' },
  { key: 'mainNav', label: t?.a1_hdMainNav || 'Main menu', hint: t?.a1_hdMainNavHint || 'The navigation links in the navbar. The phone menu keeps working either way.' },
  { key: 'sound', label: t?.a1_hdSound || 'Sound button', hint: t?.a1_hdSoundHint || 'The speaker that mutes and unmutes the site sounds.' },
  { key: 'language', label: t?.a1_hdLanguage || 'Language menu', hint: t?.a1_hdLanguageHint || 'The language picker. With one language enabled it is hidden anyway.' },
  { key: 'account', label: t?.a1_hdAccount || 'Sign in / account', hint: t?.a1_hdAccountHint || 'The account button and the sign-in dialog entry point.' },
];

// Deep-merge what the server sent over the defaults, so a switch that is missing
// from the saved document still arrives here as "on" rather than undefined.
const merge = (saved) => {
  const out = { ...DEFAULTS, marquee: { ...DEFAULTS.marquee } };
  PARTS().forEach(({ key }) => {
    if (saved?.[key]) out[key] = { ...out[key], ...saved[key] };
  });
  if (saved?.marquee) {
    out.marquee = {
      ...out.marquee,
      ...saved.marquee,
      text: { ...DEFAULTS.marquee.text, ...(saved.marquee.text || {}) },
    };
  }
  return out;
};

/**
 * Header (Admin → Header).
 *
 * Two things live here: a switch per part of the header, and the scrolling text
 * (marquee) line above it. There is one Save button rather than a save per
 * switch, because the switches are compared against each other — switching off
 * the whole top strip makes its two halves irrelevant, and it is clearer to
 * review that before it is written than to have it happen as each one is
 * flipped.
 */
const AdminHeader = ({ t = {} }) => {
  const { showToast } = useToast();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.get('/admin/settings');
        if (alive) setForm(merge(res.data?.header));
      } catch (e) {
        if (alive) {
          setForm(merge(null));
          setError(e.response?.data?.message || (t?.a1_headerLoadFailed || 'Could not load the header settings'));
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [t]);

  const setPart = (key, enabled) => setForm((f) => ({ ...f, [key]: { ...f[key], enabled } }));
  const setMarquee = (patch) => setForm((f) => ({ ...f, marquee: { ...f.marquee, ...patch } }));
  const setMarqueeText = (code, value) =>
    setForm((f) => ({ ...f, marquee: { ...f.marquee, text: { ...f.marquee.text, [code]: value } } }));

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await api.put('/admin/settings', { header: form });
      setForm(merge(res.data?.header));
      showToast(t?.a1_headerSaved || 'Header settings saved', 'success');
    } catch (e) {
      setError(e.response?.data?.message || (t?.a1_headerSaveFailed || 'Could not save'));
    } finally {
      setBusy(false);
    }
  };

  if (loading || !form) {
    return (
      <div className="flex items-center justify-center py-16">
        <OmLoader size="md" color="maroon" />
      </div>
    );
  }

  const marqueeText = form.marquee.text || {};

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-ink">
          <PanelTop size={18} className="text-vermilion" aria-hidden="true" />
          {t?.a1_headerTitle || 'Header'}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          {t?.a1_headerHint ||
            'Choose what the header shows. Everything stays as it is until you switch something off here.'}
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {/* Parts */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <ul className="divide-y divide-gray-100">
          {PARTS(t).map(({ key, label, hint }) => {
            const on = form[key]?.enabled !== false;
            // With the whole top strip off, its two halves no longer matter.
            const moot = key === 'panchang' || key === 'tools' ? form.topBar?.enabled === false : false;
            return (
              <li key={key} className={`flex flex-wrap items-center justify-between gap-4 px-6 py-4 ${moot ? 'opacity-50' : ''}`}>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{label}</p>
                  <p className="mt-0.5 text-xs text-mute">{hint}</p>
                </div>
                <Toggle checked={on} onChange={(next) => setPart(key, next)} disabled={moot} label={label} />
              </li>
            );
          })}
        </ul>
      </div>

      {/* Scrolling text */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Megaphone size={16} className="text-vermilion" aria-hidden="true" />
              {t?.a1_marqueeTitle || 'Scrolling text (marquee)'}
            </h3>
            <p className="mt-0.5 text-xs text-mute">
              {t?.a1_marqueeHint ||
                'A line of your own words moving slowly above the navbar. Leave the text empty and nothing is shown, even with it switched on.'}
            </p>
          </div>
          <Toggle
            checked={form.marquee.enabled === true}
            onChange={(next) => setMarquee({ enabled: next })}
            label={t?.a1_marqueeTitle || 'Scrolling text (marquee)'}
          />
        </div>

        <div className="mt-5 space-y-4">
          {LANGS.map(([code, name]) => (
            <div key={code}>
              <label className="mb-1 block text-xs font-semibold text-ink-soft" htmlFor={`mq-${code}`}>
                {name}
              </label>
              <input
                id={`mq-${code}`}
                type="text"
                maxLength={200}
                value={marqueeText[code] || ''}
                onChange={(e) => setMarqueeText(code, e.target.value)}
                placeholder={(t?.a1_marqueePlaceholder || 'e.g. Morning darshan begins at 5:00 AM. Enter a link to make the line clickable.')}
                className="w-full rounded-lg border border-[#8F8685] bg-white px-3 py-2 text-sm text-ink placeholder:text-mute focus:border-vermilion focus:outline-none focus:ring-2 focus:ring-vermilion/15"
              />
            </div>
          ))}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-soft" htmlFor="mq-speed">
                {t?.a1_marqueeSpeed || 'Seconds for one pass'}
              </label>
              <input
                id="mq-speed"
                type="number"
                min={10}
                max={180}
                step={5}
                value={form.marquee.speed}
                onChange={(e) => setMarquee({ speed: Number(e.target.value) })}
                className="w-full rounded-lg border border-[#8F8685] bg-white px-3 py-2 text-sm text-ink focus:border-vermilion focus:outline-none focus:ring-2 focus:ring-vermilion/15"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-soft" htmlFor="mq-link">
                {t?.a1_marqueeLink || 'Link (optional)'}
              </label>
              <input
                id="mq-link"
                type="text"
                value={form.marquee.link || ''}
                onChange={(e) => setMarquee({ link: e.target.value })}
                placeholder="https://"
                className="w-full rounded-lg border border-[#8F8685] bg-white px-3 py-2 text-sm text-ink placeholder:text-mute focus:border-vermilion focus:outline-none focus:ring-2 focus:ring-vermilion/15"
              />
            </div>
          </div>

          {/* Preview: what the line will look like, at the chosen speed */}
          <div className="rounded-xl bg-maroon-deep px-4 py-2 text-[13px] text-white">
            <p className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-white/70">
              <ExternalLink size={11} aria-hidden="true" />
              {t?.a1_marqueePreview || 'Preview'}
            </p>
            {form.marquee.enabled === true && (marqueeText.en || '').trim() ? (
              <div className="rt-marquee overflow-hidden" style={{ '--marquee-duration': `${form.marquee.speed || 40}s` }}>
                <div className="rt-marquee-line">
                  <span className="rt-marquee-text">{marqueeText.en}</span>
                  <span className="rt-marquee-text" aria-hidden="true">{marqueeText.en}</span>
                </div>
              </div>
            ) : (
              <span className="text-white/60">
                {t?.a1_marqueePreviewOff || 'Switch it on and write some English text to see it move.'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-xl bg-vermilion px-6 text-sm font-semibold text-white transition-colors hover:bg-[#820606] focus:outline-none focus-visible:ring-2 focus-visible:ring-vermilion/40 disabled:opacity-50"
        >
          {busy && <OmLoader size="sm" color="white" />}
          {t?.save || 'Save'}
        </button>
      </div>
    </div>
  );
};

export default AdminHeader;