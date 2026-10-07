import React, { useEffect, useRef, useState } from 'react';
import { Music4, Volume2, Play, Square, ShieldAlert, Trash2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import OmLoader from '../common/OmLoader';
import { Toggle } from './kit/kit';
import { playOfflineSound } from '../../utils/offlineSound';

/*
 * Offline notice and sound (super-admin only).
 *
 * This is a super-admin page because the sound plays on every visitor's device,
 * unasked, the moment their connection drops. That is not a decision a content
 * admin should be able to make alone - the server enforces the same rule by
 * dropping `offlineNotice` from an ordinary admin's save (see
 * SUPERADMIN_ONLY_SETTINGS_KEYS in the backend's permissions middleware).
 */

const DEFAULTS = {
  enabled: true,
  sound: 'temple',
  volume: 40,
  repeat: true,
  interval: 12,
  respectSoundToggle: true,
  track: { url: '', name: '', duration: 0, bytes: 0, uploadedAt: null },
  title: { en: '', ne: '', hi: '', zh: '', ta: '' },
  message: { en: '', ne: '', hi: '', zh: '', ta: '' },
  backOnline: { en: '', ne: '', hi: '', zh: '', ta: '' },
};

const LANGS = [
  ['en', 'English'],
  ['ne', 'नेपाली'],
  ['hi', 'हिन्दी'],
  ['zh', '中文'],
  ['ta', 'தமிழ்'],
];

/*
 * The limits, checked here in the browser before anything is sent.
 *
 * The length is read from the file's own header by an <audio> element, which
 * needs only the first few kilobytes. The server cannot do this without
 * downloading the whole file, and rejecting a 10 MB upload as a way of learning a
 * track is too long is a poor trade - so the check happens first, and the server
 * enforces the type and the size regardless.
 */
const MAX_SECONDS = 600; // ten minutes
const MAX_BYTES = 10 * 1024 * 1024;

const bytesLabel = (n) => `${(n / (1024 * 1024)).toFixed(1)} MB`;
const secondsLabel = (s) => {
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
};

// The sound choices, in the order they are offered.
const SOUNDS = [
  { value: 'none', label: 'No sound' },
  { value: 'upload', label: 'My uploaded music' },
  { value: 'temple', label: 'Bell and Om (the welcome sound)' },
  { value: 'bell', label: 'Bell only' },
  { value: 'om', label: 'Om only' },
];

/** Deep-merge what the server sent over the defaults. */
const merge = (saved) => {
  const out = { ...DEFAULTS };
  if (!saved) return out;
  ['enabled', 'sound', 'volume', 'repeat', 'interval', 'respectSoundToggle'].forEach((key) => {
    if (saved[key] !== undefined) out[key] = saved[key];
  });
  out.track = { ...DEFAULTS.track, ...(saved.track || {}) };
  ['title', 'message', 'backOnline'].forEach((key) => {
    out[key] = { ...DEFAULTS[key], ...(saved[key] || {}) };
  });
  return out;
};

const AdminOfflineNotice = ({ t = {} }) => {
  const { showToast } = useToast();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // The file chosen but not yet uploaded, and its measured length.
  const [measured, setMeasured] = useState(null);
  const fileRef = useRef(null);
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  // The preview stops itself when the page goes away, so a test tone cannot
  // outlive the admin panel.
  const stopPreview = useRef(null);

  useEffect(() => () => stopPreview.current?.(), []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.get('/admin/settings');
        if (alive) setForm(merge(res.data?.offlineNotice));
      } catch (e) {
        if (alive) {
          setForm(merge(null));
          setError(e.response?.data?.message || (t?.a1_offLoadFailed || 'Could not load the offline settings'));
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [t]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setText = (key, code, value) =>
    setForm((f) => ({ ...f, [key]: { ...f[key], [code]: value } }));

  /*
   * Choose an MP3. The type and the size are checked here, and the length is read
   * from the header by an <audio> element - none of which uploads anything.
   */
  const pick = (file) => {
    setError('');
    setMeasured(null);
    stopAudition();
    if (!file) return;

    if (file.type !== 'audio/mpeg' && file.type !== 'audio/mp3') {
      setError(t?.a1_offMp3Only || 'Please choose an MP3 file.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError((t?.a1_offTooBig || 'The file must be {max} or smaller (this one is {actual}).')
        .replace('{max}', bytesLabel(MAX_BYTES))
        .replace('{actual}', bytesLabel(file.size)));
      return;
    }

    const url = URL.createObjectURL(file);
    const probe = new Audio();
    probe.preload = 'metadata';
    probe.onloadedmetadata = () => {
      const seconds = probe.duration;
      URL.revokeObjectURL(url);
      if (!Number.isFinite(seconds)) {
        setError(t?.a1_offUnreadable || 'That file could not be read as audio.');
        return;
      }
      if (seconds > MAX_SECONDS) {
        setError((t?.a1_offTooLong || 'The music must be {max} or shorter (this one is {actual}).')
          .replace('{max}', secondsLabel(MAX_SECONDS))
          .replace('{actual}', secondsLabel(seconds)));
        return;
      }
      // A second URL is needed here: the first one was revoked above.
      setMeasured({ file, seconds, url: URL.createObjectURL(file) });
    };
    probe.onerror = () => {
      URL.revokeObjectURL(url);
      setError(t?.a1_offUnreadable || 'That file could not be read as audio.');
    };
    probe.src = url;
  };

  const upload = async () => {
    const input = fileRef.current;
    if (!measured) return;
    stopAudition();

    setBusy(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('audio', measured.file);
      // The measured length, so the server need not download the file to learn it.
      fd.append('duration', String(Math.round(measured.seconds)));
      const res = await api.post('/admin/offline/music', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm((f) => ({ ...f, track: merge({ track: res.data?.data }).track, sound: 'upload' }));
      setMeasured(null);
      if (input) input.value = '';
      showToast(t?.a1_offUploaded || 'Music uploaded', 'success');
    } catch (e) {
      setError(e.response?.data?.message || t?.a1_offUploadFailed || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  /*
   * Delete the music for good. The server destroys the file on Cloudinary and
   * clears every reference to it, so nothing is left to play; nothing else on this
   * page is touched.
   *
   * The confirm says "permanently" on purpose - this cannot be undone, and there
   * is no copy kept anywhere.
   */
  const removeTrack = async () => {
    const name = form.track?.name || 'this music';
    const msg = (t?.a1_offRemoveConfirm
      || 'Delete "{name}" permanently? The file is removed from storage and cannot be brought back.')
      .replace('{name}', name);
    if (!window.confirm(msg)) return;

    stopAudition();
    setBusy(true);
    setError('');
    try {
      const res = await api.delete('/admin/offline/music');
      setForm((f) => ({ ...f, track: merge({ track: res.data?.data }).track }));
      // Fall back to the synthesised sound, since the uploaded one is gone.
      setForm((f) => (f.sound === 'upload' ? { ...f, sound: 'temple' } : f));
      setMeasured(null);
      showToast(t?.a1_offRemoved || 'Music deleted', 'success');
    } catch (e) {
      setError(e.response?.data?.message || t?.a1_offRemoveFailed || 'Could not delete the music');
    } finally {
      setBusy(false);
    }
  };

  // Stop any preview currently sounding before starting another, so repeated
  // presses cannot stack sounds on top of each other.
  const startPreview = () => {
    stopAudition();
    if (form.sound === 'none') return;
    stopPreview.current = playOfflineSound({
      sound: form.sound,
      volume: form.volume,
      // One occurrence only: a preview that loops would be very hard to stop.
      repeat: false,
      interval: form.interval,
      trackUrl: form.track?.url || '',
    });
  };

  const stopAudition = () => {
    stopPreview.current?.();
    stopPreview.current = null;
  };

  /* The saved track, auditioned through a plain <audio> element. */
  const stopTrackAudio = () => {
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
    setPlaying(false);
  };

  const toggleTrackAudio = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      stopTrackAudio();
      return;
    }
    el.volume = Math.max(0, Math.min(100, Number(form.volume) || 0)) / 100;
    el.play().then(() => setPlaying(true)).catch(() => {});
  };

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await api.put('/admin/settings', { offlineNotice: form });
      setForm(merge(res.data?.offlineNotice));
      showToast(t?.a1_offSaved || 'Offline settings saved', 'success');
    } catch (e) {
      setError(e.response?.data?.message || (t?.a1_offSaveFailed || 'Could not save'));
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

  const soundless = form.sound === 'none';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-ink">
          <Music4 size={18} className="text-vermilion" aria-hidden="true" />
          {t?.a1_offTitle || 'Offline notice and sound'}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          {t?.a1_offHint ||
            'What visitors see, and hear, when their connection drops. Switched on by default; the sound is off until you choose one.'}
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {/* Master switch */}
      {/* ---------- The uploaded music ---------- */}
      <div className={`rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ${form.enabled ? '' : 'opacity-50'}`}>
        <div className="flex items-center gap-2">
          <Music4 size={16} className="text-vermilion" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-ink">
            {t?.a1_offTrackTitle || 'Your music'}
          </h3>
        </div>
        <p className="mt-0.5 text-xs text-mute">
          {(t?.a1_offTrackHint
            || 'One MP3 of your own, up to {max} and {secs}. It repeats while the visitor stays offline, and the sound stops the moment they are back. This is kept separate from the notification bell sound.')
            .replace('{max}', bytesLabel(MAX_BYTES))
            .replace('{secs}', secondsLabel(MAX_SECONDS))}
        </p>

        {/* Saved track */}
        {form.track?.url && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-panel px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">
                  {form.track.name || t?.a1_offTrackUnknown || 'Uploaded music'}
                </p>
                <p className="mt-0.5 text-xs text-mute">
                  {form.track.duration ? secondsLabel(form.track.duration) : '—'}
                  {form.track.bytes ? ` • ${bytesLabel(form.track.bytes)}` : ''}
                </p>
                {/*
                  The stored address, shown verbatim. If the music is not playing on
                  the site, this is the first thing to look at: it should be a full
                  https:// URL. A bare path such as `uploads/track.mp3` means the
                  file was never sent to storage and the browser cannot fetch it.
                */}
                <p className="mt-1 break-all text-[11px] text-mute/80">
                  {form.track.url}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleTrackAudio}
                  className="inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-xl border border-gray-300 px-4 text-sm font-semibold text-ink-soft transition-colors hover:bg-gray-50"
                >
                  {playing ? <Square size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
                  {playing ? (t?.a1_offStop || 'Stop') : (t?.a1_offListen || 'Listen')}
                </button>
                <button
                  type="button"
                  onClick={removeTrack}
                  disabled={busy}
                  className="inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
                >
                  <Trash2 size={14} aria-hidden="true" />
                  {t?.a1_offDelete || 'Delete'}
                </button>
              </div>
            </div>
            <audio
              ref={audioRef}
              src={form.track.url}
              preload="none"
              onEnded={() => setPlaying(false)}
              className="hidden"
            />
          </div>
        )}

        {/* A new file */}
        <div className="mt-4">
          <input
            ref={fileRef}
            type="file"
            accept="audio/mpeg,audio/mp3,.mp3"
            onChange={(e) => pick(e.target.files?.[0])}
            className="block w-full text-xs text-ink-soft file:mr-3 file:rounded-xl file:border-0 file:bg-vermilion file:px-5 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-[#820606]"
          />

          {measured && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-panel px-4 py-3">
              <p className="text-xs text-ink-soft">
                <span className="font-semibold text-ink">{measured.file.name}</span>
                {' • '}
                {secondsLabel(measured.seconds)}
                {' • '}
                {bytesLabel(measured.file.size)}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(measured.url);
                    setMeasured(null);
                    const input = fileRef.current;
                    if (input) input.value = '';
                  }}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-gray-50"
                >
                  {t?.a1_offCancel || 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={upload}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-vermilion px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#820606] disabled:opacity-50"
                >
                  {busy && <OmLoader size="sm" color="white" />}
                  {t?.a1_offUpload || 'Upload'}
                </button>
              </div>
            </div>
          )}

          {/* The chosen file, before it is uploaded, so the length can be heard. */}
          {measured && (
            <audio
              src={measured.url}
              controls
              preload="metadata"
              className="mt-3 w-full"
            />
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">
              {t?.a1_offEnabled || 'Show the notice'}
            </p>
            <p className="mt-0.5 text-xs text-mute">
              {form.enabled
                ? t?.a1_offEnabledOn || 'Visitors are told when they go offline.'
                : t?.a1_offEnabledOff || 'Switched off: nothing appears and nothing plays.'}
            </p>
          </div>
          <Toggle
            checked={form.enabled !== false}
            onChange={(next) => set({ enabled: next })}
            label={t?.a1_offEnabled || 'Show the notice'}
          />
        </div>
      </div>

      {/* Sound */}
      <div className={`rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ${form.enabled ? '' : 'opacity-50'}`}>
        <div className="flex items-center gap-2">
          <Volume2 size={16} className="text-vermilion" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-ink">
            {t?.a1_offSound || 'Sound while offline'}
          </h3>
        </div>
        <p className="mt-0.5 text-xs text-mute">
          {t?.a1_offSoundHint ||
            'The temple bell and Om, made by the site itself — nothing to upload. Browsers only allow sound after a visitor has tapped or clicked the page, so a sound cannot start until then.'}
        </p>

        <fieldset className="mt-4 space-y-2" disabled={!form.enabled}>
          <legend className="sr-only">{t?.a1_offSound || 'Sound while offline'}</legend>
          {SOUNDS.map((s) => (
            <label
              key={s.value}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 text-sm transition-colors ${
                form.sound === s.value
                  ? 'border-vermilion bg-vermilion/[0.05] font-semibold text-ink'
                  : 'border-gray-200 text-ink-soft hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="offline-sound"
                value={s.value}
                checked={form.sound === s.value}
                onChange={() => set({ sound: s.value })}
                className="h-4 w-4 border-gray-300 text-vermilion focus:ring-vermilion"
              />
              {s.label}
            </label>
          ))}
        </fieldset>

        {!soundless && (
          <>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-soft" htmlFor="off-volume">
                  {t?.a1_offVolume || 'Volume'} ({form.volume}%)
                </label>
                <input
                  id="off-volume"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={form.volume}
                  onChange={(e) => set({ volume: Number(e.target.value) })}
                  disabled={!form.enabled}
                  className="w-full accent-vermilion"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-soft" htmlFor="off-interval">
                  {t?.a1_offInterval || 'Seconds between repeats'}
                </label>
                <input
                  id="off-interval"
                  type="number"
                  min={4}
                  max={120}
                  value={form.interval}
                  onChange={(e) => set({ interval: Number(e.target.value) })}
                  disabled={!form.enabled || !form.repeat}
                  className="w-full rounded-lg border border-[#8F8685] bg-white px-3 py-2 text-sm text-ink focus:border-vermilion focus:outline-none focus:ring-2 focus:ring-vermilion/15 disabled:opacity-50"
                />
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">
                    {t?.a1_offRepeat || 'Repeat while still offline'}
                  </p>
                  <p className="mt-0.5 text-xs text-mute">
                    {form.repeat
                      ? t?.a1_offRepeatOn || 'It plays again every few seconds until they are back online.'
                      : t?.a1_offRepeatOff || 'It plays once and does not come back.'}
                  </p>
                </div>
                <Toggle
                  checked={form.repeat !== false}
                  onChange={(next) => set({ repeat: next })}
                  disabled={!form.enabled}
                  label={t?.a1_offRepeat || 'Repeat while still offline'}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">
                    {t?.a1_offRespect || 'Respect the speaker button'}
                  </p>
                  <p className="mt-0.5 text-xs text-mute">
                    {t?.a1_offRespectHint ||
                      'If a visitor has already muted the temple sounds in the header, stay quiet as well.'}
                  </p>
                </div>
                <Toggle
                  checked={form.respectSoundToggle !== false}
                  onChange={(next) => set({ respectSoundToggle: next })}
                  disabled={!form.enabled}
                  label={t?.a1_offRespect || 'Respect the speaker button'}
                />
              </div>
            </div>

            {/* Audition, so the choice is heard before it is saved. */}
            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl bg-panel px-4 py-3">
              <button
                type="button"
                onClick={startPreview}
                disabled={!form.enabled}
                className="inline-flex min-h-[2.5rem] items-center gap-2 rounded-xl bg-vermilion px-5 text-sm font-semibold text-white transition-colors hover:bg-[#820606] disabled:opacity-50"
              >
                <Play size={14} aria-hidden="true" />
                {t?.a1_offAudition || 'Play it'}
              </button>
              <button
                type="button"
                onClick={stopAudition}
                className="inline-flex min-h-[2.5rem] items-center gap-2 rounded-xl border border-gray-300 px-5 text-sm font-semibold text-ink-soft transition-colors hover:bg-gray-50"
              >
                <Square size={14} aria-hidden="true" />
                {t?.a1_offStop || 'Stop'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Wording */}
      {[
        ['title', t?.a1_offTitleLabel || 'Notice title'],
        ['message', t?.a1_offMessageLabel || 'Notice message'],
        ['backOnline', t?.a1_offBackLabel || 'Shown when back online'],
      ].map(([key, label]) => (
        <div key={key} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-ink">{label}</h3>
          <p className="mt-0.5 text-xs text-mute">
            {t?.a1_offTextHint || 'Leave a language empty to use the wording that ships with the site.'}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {LANGS.map(([code, name]) => (
              <div key={code}>
                <label className="mb-1 block text-xs font-semibold text-ink-soft" htmlFor={`off-${key}-${code}`}>
                  {name}
                </label>
                <input
                  id={`off-${key}-${code}`}
                  type="text"
                  maxLength={200}
                  value={form[key][code] || ''}
                  onChange={(e) => setText(key, code, e.target.value)}
                  placeholder={t?.a1_offUseDefault || 'Use the default'}
                  className="w-full rounded-lg border border-[#8F8685] bg-white px-3 py-2 text-sm text-ink placeholder:text-mute focus:border-vermilion focus:outline-none focus:ring-2 focus:ring-vermilion/15"
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Why this page is super-admin only, said where it is decided. */}
      <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
        <ShieldAlert size={14} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
        <span>
          {t?.a1_offSuperOnly ||
            'Super administrator only, because this can start a sound on every visitor’s device without them choosing to hear it.'}
        </span>
      </p>

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

export default AdminOfflineNotice;