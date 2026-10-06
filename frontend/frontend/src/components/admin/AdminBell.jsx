import React, { useEffect, useRef, useState } from 'react';
import { Bell, Upload, Trash2, Volume2, Play, Square } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import OmLoader from '../common/OmLoader';

const MAX_SECONDS = 60;
const MAX_BYTES = 5 * 1024 * 1024;

const bytesLabel = (n) => `${(n / (1024 * 1024)).toFixed(1)} MB`;

const secondsLabel = (s) => {
  const total = Math.max(0, Math.round(s));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/**
 * Notification bell sound (Admin → Bell).
 *
 * The admin uploads one MP3 that plays when a new notification reaches the
 * panel. The one-minute limit is checked here, in the browser, by asking an
 * <audio> element for the duration before anything is sent: the server cannot
 * measure length without downloading the whole file, and a rejected 5 MB upload
 * is a poor way to learn a clip is too long.
 *
 * With no file uploaded the panel stays silent rather than falling back to a
 * tone, so a working office is never surprised by an unexpected noise.
 */
const AdminBell = ({ t = {} }) => {
  const { showToast } = useToast();
  const fileRef = useRef(null);
  const audioRef = useRef(null);

  const [sound, setSound] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [measured, setMeasured] = useState(null); // { seconds, url } of the picked file
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const res = await api.get('/admin/settings');
      setSound(res.data?.bellSound || { url: null, enabled: true, label: '' });
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load the bell sound settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Release the temporary object URL of a rejected / replaced pick.
  useEffect(() => () => { if (measured?.url) URL.revokeObjectURL(measured.url); }, [measured]);

  const stopPreview = () => {
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
    setPlaying(false);
  };

  const pick = (file) => {
    setError('');
    setMeasured(null);
    if (!file) return;

    if (file.type !== 'audio/mpeg' && file.type !== 'audio/mp3') {
      setError(t?.a1_bellMp3Only || 'Please choose an MP3 file.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError((t?.a1_bellTooBig || 'The file must be smaller than {max}.')
        .replace('{max}', bytesLabel(MAX_BYTES)));
      return;
    }

    // Read the duration without uploading: loadedmetadata carries it once the
    // browser has the header, which is all that is needed.
    const url = URL.createObjectURL(file);
    const probe = new Audio();
    probe.preload = 'metadata';
    probe.onloadedmetadata = () => {
      const seconds = probe.duration;
      URL.revokeObjectURL(url);
      if (!Number.isFinite(seconds)) {
        setError(t?.a1_bellUnreadable || 'That file could not be read as audio.');
        return;
      }
      if (seconds > MAX_SECONDS) {
        setError((t?.a1_bellTooLong || 'The sound must be {max} or shorter (this one is {actual}).')
          .replace('{max}', secondsLabel(MAX_SECONDS))
          .replace('{actual}', secondsLabel(seconds)));
        return;
      }
      setMeasured({ seconds, url: URL.createObjectURL(file) });
    };
    probe.onerror = () => {
      URL.revokeObjectURL(url);
      setError(t?.a1_bellUnreadable || 'That file could not be read as audio.');
    };
    probe.src = url;
  };

  const upload = async () => {
    const input = fileRef.current;
    const file = input?.files?.[0];
    if (!file || !measured) return;

    setBusy(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('audio', file);
      const res = await api.post('/admin/bell/sound', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSound(res.data?.data || null);
      setMeasured(null);
      if (input) input.value = '';
      showToast(t?.a1_bellUploaded || 'Bell sound uploaded', 'success');
      load();
    } catch (e) {
      setError(e.response?.data?.message || t?.a1_bellUploadFailed || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(t?.a1_bellRemoveConfirm || 'Remove the bell sound?')) return;
    setBusy(true);
    setError('');
    try {
      const res = await api.delete('/admin/bell/sound');
      setSound(res.data?.data || null);
      showToast(t?.a1_bellRemoved || 'Bell sound removed', 'success');
    } catch (e) {
      setError(e.response?.data?.message || t?.a1_bellRemoveFailed || 'Could not remove the sound');
    } finally {
      setBusy(false);
    }
  };

  const toggle = async () => {
    const next = !sound?.enabled;
    setBusy(true);
    setError('');
    try {
      const res = await api.put('/admin/settings', {
        bellSound: { ...(sound || {}), enabled: next },
      });
      setSound(res.data?.bellSound || { ...(sound || {}), enabled: next });
      showToast(
        next ? (t?.a1_bellTurnedOn || 'Bell sound on') : (t?.a1_bellTurnedOff || 'Bell sound off'),
        'success'
      );
    } catch (e) {
      setError(e.response?.data?.message || t?.a1_bellSaveFailed || 'Could not save');
    } finally {
      setBusy(false);
    }
  };

  const previewUrl = measured?.url || sound?.url || null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <OmLoader size="md" color="maroon" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-ink">
          <Bell size={18} className="text-vermilion" aria-hidden="true" />
          {t?.a1_bellTitle || 'Bell sound'}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          {t?.a1_bellHint ||
            'An MP3 played when a new notification arrives in the admin panel. Maximum 1 minute.'}
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        {/* Current sound */}
        {sound?.url ? (
          <div className="mb-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">
                  {sound.label || t?.a1_bellCurrentSound || 'Uploaded sound'}
                </p>
                <p className="text-xs text-mute">
                  {sound.enabled
                    ? (t?.a1_bellOn || 'Plays on new notifications')
                    : (t?.a1_bellOff || 'Muted')}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={toggle}
                  disabled={busy}
                  className="rounded-xl border-2 border-vermilion px-4 py-2 text-sm font-semibold text-vermilion transition-colors hover:bg-vermilion hover:text-white disabled:opacity-50"
                >
                  {sound.enabled ? (t?.a1_bellMute || 'Mute') : (t?.a1_bellUnmute || 'Unmute')}
                </button>
                <button
                  type="button"
                  onClick={remove}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-red-300 px-4 py-2 text-sm font-semibold text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 size={15} aria-hidden="true" />
                  {t?.remove || 'Remove'}
                </button>
              </div>
            </div>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption -- a bell has no captions */}
            <audio
              ref={audioRef}
              src={sound.url}
              preload="metadata"
              onEnded={() => setPlaying(false)}
              className="w-full"
            />
          </div>
        ) : (
          <p className="mb-5 rounded-xl bg-gray-50 px-4 py-3 text-sm text-ink-soft">
            {t?.a1_bellNone || 'No sound uploaded. The panel stays silent.'}
          </p>
        )}

        {/* Preview: the picked file if there is one, otherwise the uploaded one */}
        {previewUrl && (
          <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-panel px-4 py-3">
            <Volume2 size={16} className="text-vermilion" aria-hidden="true" />
            {measured ? (
              <>
                <span className="text-sm text-ink">
                  {(t?.a1_bellChosen || 'Chosen file')}: {secondsLabel(measured.seconds)}
                </span>
                <audio ref={audioRef} src={measured.url} preload="metadata" onEnded={() => setPlaying(false)} className="w-full" />
              </>
            ) : (
              // eslint-disable-next-line jsx-a11y/media-has-caption -- a bell has no captions
              <audio ref={audioRef} src={sound.url} preload="metadata" onEnded={() => setPlaying(false)} className="w-full" />
            )}
            <button
              type="button"
              onClick={() => {
                const el = audioRef.current;
                if (!el) return;
                if (playing) stopPreview();
                else {
                  el.currentTime = 0;
                  el.play().then(() => setPlaying(true)).catch(() => {});
                }
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink hover:bg-gray-50"
            >
              {playing ? <Square size={13} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />}
              {playing ? (t?.a1_bellStop || 'Stop') : (t?.a1_bellPreview || 'Preview')}
            </button>
          </div>
        )}

        {/* Upload */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="audio/mpeg,.mp3"
            onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-vermilion px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#820606] disabled:opacity-50"
          >
            <Upload size={15} aria-hidden="true" />
            {t?.upload || 'Upload'}
          </button>
          {measured && (
            <button
              type="button"
              onClick={upload}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-vermilion px-5 py-2.5 text-sm font-semibold text-vermilion transition-colors hover:bg-vermilion hover:text-white disabled:opacity-50"
            >
              {busy ? <OmLoader size="sm" color="vermilion" /> : <Bell size={15} aria-hidden="true" />}
              {t?.save || 'Save'}
            </button>
          )}
          <span className="text-xs text-mute">
            MP3 • {t?.a1_bellMaxLength || 'Max 1 minute'} • {bytesLabel(MAX_BYTES)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AdminBell;