import React, { useCallback, useEffect, useState } from 'react';
import { Radio, Save, Youtube, Video, RefreshCw, ExternalLink, Info } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import OmLoader from '../common/OmLoader';

const FIELD =
  'w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-[#A80808]';
const LABEL = 'mb-1.5 block text-xs font-bold text-gray-700';

/** Turns whatever was pasted into an 11-character YouTube id, for the hint. */
const toVideoId = (value) => {
  const raw = String(value || '').trim();
  if (/^[\w-]{11}$/.test(raw)) return raw;
  const patterns = [
    /youtube\.com\/watch\?(?:.*&)?v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/live\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ];
  for (const rx of patterns) {
    const m = raw.match(rx);
    if (m) return m[1];
  }
  return '';
};

const looksLikeChannelId = (value) => /^UC[\w-]{22}$/.test(String(value || '').trim());

/**
 * Live Puja (Admin → Live Puja).
 *
 * The admin fills in the YouTube channel once. From then on the server decides
 * what the home page shows: the running broadcast when the channel is on air, and
 * the fallback video when it is not. Nothing has to be switched by hand at the
 * start and end of every puja — unless the server has no YouTube API key, in
 * which case the "I am live now" field is how a stream is announced.
 */
const AdminLivePuja = ({ settings, updateSettings, t = {} }) => {
  const { showToast } = useToast();
  const [form, setForm] = useState({
    enabled: false,
    autoPlay: true,
    channelName: '',
    channelUrl: '',
    channelId: '',
    manualLiveVideoId: '',
    offlineUrl: '',
    offlineTitle: '',
  });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const cfg = settings?.livePuja || {};
    setForm({
      enabled: cfg.enabled === true,
      autoPlay: cfg.autoPlay !== false,
      channelName: cfg.channelName || '',
      channelUrl: cfg.channelUrl || '',
      channelId: cfg.channelId || '',
      manualLiveVideoId: cfg.manualLiveVideoId || '',
      offlineUrl: cfg.offlineVideo?.url || '',
      offlineTitle: cfg.offlineVideo?.title || '',
    });
  }, [settings]);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/live/puja');
      setStatus(res.data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const save = async () => {
    setSaving(true);
    try {
      await updateSettings({
        livePuja: {
          enabled: form.enabled,
          autoPlay: form.autoPlay,
          channelName: form.channelName.trim(),
          channelUrl: form.channelUrl.trim(),
          channelId: form.channelId.trim(),
          manualLiveVideoId: form.manualLiveVideoId.trim(),
          offlineVideo: { url: form.offlineUrl.trim(), title: form.offlineTitle.trim() },
        },
      });
      showToast(t?.a1_liveSaved || 'Live Puja settings saved', 'success');
      loadStatus();
    } catch (error) {
      console.error('Save live puja error:', error);
      showToast(error.response?.data?.message || t?.a1_liveSaveFailed || 'Could not save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const offlineId = toVideoId(form.offlineUrl);
  const manualId = toVideoId(form.manualLiveVideoId);
  const autoDetect = status?.detectMode === 'auto';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-ink">
            <Radio size={18} className="text-vermilion" aria-hidden="true" />
            {t?.a1_livePujaTitle || 'Live Puja'}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            {t?.a1_livePujaHint ||
              'Point this at the temple’s YouTube channel. The home page plays the broadcast when it is on air and the fallback video when it is not.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setChecking(true); loadStatus().finally(() => setChecking(false)); }}
          disabled={checking}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          {checking ? <OmLoader size="sm" color="maroon" /> : <RefreshCw size={15} aria-hidden="true" />}
          {t?.a1_liveCheckNow || 'Check now'}
        </button>
      </div>

      {/* Current state */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
          {t?.a1_liveStatus || 'Right now'}
        </p>
        {loading ? (
          <OmLoader size="sm" color="maroon" />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold ${
                  status?.live
                    ? 'bg-red-50 text-red-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${status?.live ? 'bg-red-600' : 'bg-gray-400'}`} />
                {status?.live
                  ? (t?.a1_liveOnAir || 'LIVE — visitors see the broadcast')
                  : (t?.a1_liveOffAir || 'Not live — visitors see the fallback video')}
              </span>
              {status?.channelUrl && (
                <a
                  href={status.channelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-vermilion hover:underline"
                >
                  {t?.a1_liveOpenChannel || 'Open channel'}
                  <ExternalLink size={12} aria-hidden="true" />
                </a>
              )}
            </div>

            {/*
              What the server actually holds, so a page that "does nothing" can be
              diagnosed without guessing: a block switched off, a channel ID that
              was never filled in and a video URL that could not be read all look
              identical from the outside.
            */}
            <dl className="mt-4 grid gap-x-6 gap-y-1 border-t border-gray-100 pt-3 text-xs text-gray-500 sm:grid-cols-2">
              <div className="flex justify-between gap-2">
                <dt>{t?.a1_liveDiagEnabled || 'Block enabled'}</dt>
                <dd className="font-semibold text-gray-700">{status?.enabled ? 'yes' : 'no'}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>{t?.a1_liveDiagSource || 'Live decided by'}</dt>
                <dd className="font-semibold text-gray-700">{status?.source || '—'}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>{t?.a1_liveDiagChannelId || 'Channel ID saved'}</dt>
                <dd className="font-semibold text-gray-700">{status?.channelId || '—'}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>{t?.a1_liveDiagFallback || 'Fallback video'}</dt>
                <dd className="font-semibold text-gray-700">{status?.offline?.videoId || '—'}</dd>
              </div>
            </dl>
          </>
        )}
      </div>

      {/* Channel */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
          <Youtube size={16} className="text-vermilion" aria-hidden="true" />
          {t?.a1_liveChannel || 'YouTube channel'}
        </h3>

        <label className="flex cursor-pointer items-center gap-2 mb-3">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => set({ enabled: e.target.checked })}
            className="h-4 w-4 accent-[#A80808]"
          />
          <span className="text-sm font-medium text-ink">
            {t?.a1_liveEnabled || 'Show the Live Puja block on the home page'}
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-2 mb-4 rounded-xl bg-gray-50 px-4 py-3">
          <input
            type="checkbox"
            checked={form.autoPlay}
            onChange={(e) => set({ autoPlay: e.target.checked })}
            className="mt-0.5 h-4 w-4 accent-[#A80808]"
          />
          <span>
            <span className="block text-sm font-medium text-ink">
              {t?.a1_liveAutoPlay || 'Start playing automatically, muted'}
            </span>
            <span className="block text-xs text-gray-500">
              {t?.a1_liveAutoPlayHint ||
                'Browsers only allow autoplay when the sound is off. Visitors turn the sound on with the player’s own controls.'}
            </span>
          </span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={LABEL}>
            {t?.a1_liveChannelName || 'Channel name'}
            <input
              className={FIELD}
              value={form.channelName}
              onChange={(e) => set({ channelName: e.target.value })}
              placeholder="Shree Ram Chandra Mandir"
            />
          </label>
          <label className={LABEL}>
            {t?.a1_liveChannelUrl || 'Channel URL'}
            <input
              className={FIELD}
              value={form.channelUrl}
              onChange={(e) => set({ channelUrl: e.target.value })}
              placeholder="https://youtube.com/@RamMandirOfficial"
            />
          </label>
          <label className={`${LABEL} sm:col-span-2`}>
            {t?.a1_liveChannelId || 'Channel ID'}
            <input
              className={`${FIELD} font-mono`}
              value={form.channelId}
              onChange={(e) => set({ channelId: e.target.value })}
              placeholder="UCxxxxxxxxxxxxxxxxxxxxxx"
            />
            <span
              className={`mt-1 block text-xs ${
                form.channelId && !looksLikeChannelId(form.channelId) ? 'text-amber-700' : 'text-mute'
              }`}
            >
              {form.channelId && !looksLikeChannelId(form.channelId)
                ? (t?.a1_liveChannelIdHint ||
                  'A channel ID starts with UC and is 24 characters. Copy it from the channel URL: youtube.com/channel/UC…')
                : (t?.a1_liveChannelIdHelp ||
                  'YouTube → your channel → Share → Copy channel ID. This is what the live check uses.')}
            </span>
          </label>
        </div>

        <div className="mt-5 rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-600">
          <p className="mb-1 font-semibold text-gray-700">
            {t?.a1_liveManualTitle || 'No API key? Announce the stream yourself'}
          </p>
          <p className="mb-2">
            {t?.a1_liveManualHint ||
              'With no YouTube API key the server cannot ask YouTube whether you are live. Paste the live video URL here while the broadcast runs, and clear it when it ends; the fallback video returns automatically.'}
          </p>
          <label className={LABEL}>
            {t?.a1_liveManualVideo || 'I am live now (video URL or ID)'}
            <input
              className={`${FIELD} font-mono`}
              value={form.manualLiveVideoId}
              onChange={(e) => set({ manualLiveVideoId: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=…"
            />
            {manualId && (
              <span className="mt-1 block text-xs text-emerald-700">
                {t?.a1_liveManualOk || 'Video found'}: {manualId}
              </span>
            )}
          </label>
        </div>
      </div>

      {/* Fallback video */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
          <Video size={16} className="text-vermilion" aria-hidden="true" />
          {t?.a1_liveOfflineTitle || 'Shown when nothing is live'}
        </h3>
        <p className="mb-4 text-xs text-gray-500">
          {t?.a1_liveOfflineHint ||
            'A YouTube link or a direct video file. The block is never empty for a visitor.'}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={LABEL}>
            {t?.a1_liveOfflineUrl || 'Video URL or embed link'}
            <input
              className={`${FIELD} font-mono`}
              value={form.offlineUrl}
              onChange={(e) => set({ offlineUrl: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=…"
            />
            {offlineId && (
              <span className="mt-1 block text-xs text-emerald-700">
                {t?.a1_liveOfflineOk || 'Video found'}: {offlineId}
              </span>
            )}
          </label>
          <label className={LABEL}>
            {t?.a1_liveOfflineCaption || 'Caption'}
            <input
              className={FIELD}
              value={form.offlineTitle}
              onChange={(e) => set({ offlineTitle: e.target.value })}
              placeholder={t?.a1_liveOfflinePlaceholder || 'Last puja — watch on YouTube'}
            />
          </label>
        </div>
      </div>

      {!autoDetect && (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <Info size={14} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
          <span>
            {form.channelId && looksLikeChannelId(form.channelId)
              ? (t?.a1_liveManualMode ||
                'No YouTube API key on the server, so it cannot ask YouTube whether you are live. Use “I am live now” below to announce a stream; the fallback video returns when you clear it.')
              : (t?.a1_liveNoKey ||
                'For fully automatic detection, add YOUTUBE_API_KEY to the server environment. Until then, fill in the channel ID and announce a stream by hand below.')}
          </span>
        </p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-xl bg-vermilion px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#820606] disabled:opacity-50"
      >
        {saving ? <OmLoader size="sm" color="white" /> : <Save size={16} aria-hidden="true" />}
        {saving ? (t?.a1_c_saving || 'Saving...') : (t?.save || 'Save')}
      </button>
    </div>
  );
};

export default AdminLivePuja;