import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, RefreshCw, ShieldCheck, Upload, X } from 'lucide-react';
import api from '../../services/api';

/**
 * The donor's own photograph, taken live in the browser. A selfie only: there is
 * no file picker and no drag-and-drop, so a photograph cannot be taken from
 * somewhere else or from a picture already on the device.
 *
 * How the timing works, because it is deliberate:
 *  - Five seconds after the camera opens the picture is taken by itself, so a
 *    donor who simply sits still is done without touching anything.
 *  - Until then, and for a full minute afterwards, the donor can take it
 *    sooner by pressing the button.
 *  - If a minute passes with nobody taking the photograph the timer starts
 *    again from the top, rather than leaving a camera open to someone who has
 *    walked away from it.
 *
 * The picture is drawn onto a canvas at a modest size before it is stored: a
 * camera frame is far larger than a photograph on a donation record needs, and
 * the file is kept with the donation.
 */

const AUTO_CAPTURE_SECONDS = 5;
const MANUAL_WINDOW_SECONDS = 60;
const CAPTURE_WIDTH = 640;

const SelfieCapture = ({ value, photoUrl, onChange, onError, t = {} }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const autoTimer = useRef(null);
  const resetTimer = useRef(null);

  const [open, setOpen] = useState(false);
  const [countdown, setCountdown] = useState(AUTO_CAPTURE_SECONDS);
  const [remaining, setRemaining] = useState(MANUAL_WINDOW_SECONDS);
  const [cameraError, setCameraError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [percent, setPercent] = useState(0);

  const text = (key, fallback) => t?.[key] || fallback;

  // Stop the camera for certain: it is a privacy device and must not stay open
  // behind a closed panel, a finished upload or an unmounted form.
  const stopStream = useCallback(() => {
    if (autoTimer.current) { clearTimeout(autoTimer.current); autoTimer.current = null; }
    if (resetTimer.current) { clearTimeout(resetTimer.current); resetTimer.current = null; }
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    const video = videoRef.current;
    if (video) video.srcObject = null;
  }, []);

  useEffect(() => stopStream, [stopStream]);

  const capture = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const scale = Math.min(1, CAPTURE_WIDTH / video.videoWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext('2d');
    // The preview is mirrored for the donor's comfort, so the saved picture is
    // flipped to match, otherwise everyone would appear left-handed.
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) return;
    stopStream();

    setUploading(true);
    setCameraError('');
    try {
      const fd = new FormData();
      fd.append('image', blob, 'donor-photo.jpg');
      const res = await api.post('/donations/photo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          if (event.total) setPercent(Math.round((event.loaded / event.total) * 100));
        },
      });
      const url = res.data?.url;
      if (!url) throw new Error('The server did not return the photo.');
      onChange?.(url);
      setOpen(false);
    } catch (err) {
      setCameraError(
        err?.response?.data?.message || text('a1_donPhotoUploadFailed', 'The photograph could not be saved. Please try again.')
      );
    } finally {
      setUploading(false);
    }
  }, [onChange, stopStream, text]);

  // Start over: five seconds to the automatic capture, one minute of manual
  // window, then a fresh minute if nobody pressed the button.
  const startTimers = useCallback(() => {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    if (resetTimer.current) clearTimeout(resetTimer.current);

    let left = AUTO_CAPTURE_SECONDS;
    setCountdown(left);
    const tick = () => {
      left -= 1;
      if (left <= 0) {
        capture();
        return;
      }
      setCountdown(left);
      autoTimer.current = setTimeout(tick, 1000);
    };
    autoTimer.current = setTimeout(tick, 1000);

    let window = MANUAL_WINDOW_SECONDS;
    setRemaining(window);
    const wind = () => {
      window -= 1;
      if (window <= 0) {
        // Nobody took it in a minute: give the whole thing another minute
        // rather than leaving a live camera pointing at an empty room.
        startTimers();
        return;
      }
      setRemaining(window);
      resetTimer.current = setTimeout(wind, 1000);
    };
    resetTimer.current = setTimeout(wind, 1000);
  }, [capture]);

  const startCamera = useCallback(async () => {
    setCameraError('');
    setOpen(true);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(text('a1_donNoCamera', 'This device cannot open a camera. The photograph is required.'));
      return;
    }
    try {
      // The front camera only: `facingMode: 'user'` is the selfie. A device with
      // more than one camera still gives the one pointed at the person.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => {});
      }
      startTimers();
    } catch (err) {
      setCameraError(
        err?.name === 'NotAllowedError'
          ? text('a1_donCameraDenied', 'The camera was blocked. Please allow it, as the photograph is required.')
          : text('a1_donCameraFailed', 'The camera could not be opened. The photograph is required.')
      );
    }
  }, [startTimers, text]);

  const close = useCallback(() => {
    stopStream();
    setOpen(false);
    setCameraError('');
  }, [stopStream]);

  // Already captured: show the picture with the option to take it again.
  if (photoUrl) {
    return (
      <div>
        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
          <img src={photoUrl} alt={text('a1_donPhotoAlt', 'Your photograph')} className="block h-48 w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange?.('')}
            aria-label={text('a1_donPhotoRemove', 'Remove the photograph')}
            className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow hover:bg-white"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-green-700">
          <ShieldCheck size={14} aria-hidden="true" />
          {text('a1_donPhotoSaved', 'Photograph captured.')}
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <div>
        <button
          type="button"
          onClick={startCamera}
          disabled={uploading}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#A80808]/40 bg-[#A80808]/[0.04] px-4 py-6 text-sm font-semibold text-[#A80808] transition-colors hover:bg-[#A80808]/[0.08] disabled:opacity-50"
        >
          {uploading ? <Upload size={18} aria-hidden="true" /> : <Camera size={18} aria-hidden="true" />}
          {uploading
            ? text('a1_donPhotoUploadingPct', 'Saving your photograph… {n}%').replace('{n}', String(percent))
            : text('a1_donPhotoTake', 'Take your photograph')}
        </button>
        <p className="mt-1.5 text-xs text-mute">
          {text('a1_donPhotoHint', 'Taken with the front camera. Your photograph is taken automatically after 5 seconds.')}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          // Mirrored so the donor sees themselves the way a mirror shows them.
          className="block h-64 w-full scale-x-[-1] object-cover"
        />
        {cameraError && (
          <p className="absolute inset-x-3 top-3 rounded-lg bg-red-600/95 px-3 py-2 text-center text-xs font-medium text-white">
            {cameraError}
          </p>
        )}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8">
          <button
            type="button"
            onClick={close}
            aria-label={text('a1_donPhotoCancel', 'Cancel')}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
          >
            <X size={18} aria-hidden="true" />
          </button>

          <div className="text-center text-white">
            <p className="text-xs font-semibold">
              {countdown > 0
                ? text('a1_donAutoIn', 'Automatically in {n}s').replace('{n}', String(countdown))
                : text('a1_donTakeNow', 'Taking now…')}
            </p>
            <p className="text-[11px] text-white/80">
              {text('a1_donManualLeft', 'or press the button within {n}s').replace('{n}', String(remaining))}
            </p>
          </div>

          <button
            type="button"
            onClick={capture}
            disabled={uploading}
            aria-label={text('a1_donShutter', 'Take the photograph now')}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-[#A80808] transition-transform hover:scale-105 disabled:opacity-50"
          >
            <Camera size={20} className="text-white" aria-hidden="true" />
          </button>
        </div>
      </div>
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-mute">
        <RefreshCw size={13} aria-hidden="true" />
        {text('a1_donPhotoRestart', 'If nobody takes the photograph within a minute, the camera starts again.')}
      </p>
      {!navigator.mediaDevices?.getUserMedia && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-red-600">
          <CameraOff size={13} aria-hidden="true" />
          {text('a1_donNoCameraSupport', 'This browser cannot open a camera.')}
        </p>
      )}
    </div>
  );
};

export default SelfieCapture;