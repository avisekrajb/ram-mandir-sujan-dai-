/**
 * The offline sound.
 *
 * Two sources, chosen by the super admin:
 *
 *  - an uploaded MP3 ("upload"), which loops on its own <audio> element. Nothing
 *    is synthesised, so the temple's own recording is used as given.
 *  - the synthesised bell and Om ("temple", "bell", "om"), the same source as the
 *    welcome greeting in templeSound.js, so there is always something that works
 *    before anything has been uploaded.
 *
 * Why the MP3 is a plain <audio> element and not the Web Audio graph: an uploaded
 * file is already a recording, so it needs no synthesis, and an element handles
 * looping, volume and the browser's own decode for us. The synthesised sounds stay
 * on the Web Audio path because that is what they are.
 *
 * Both paths return a stop function, and both stop with a short fade rather than
 * cutting off - the same reason as the greeting: a bell or a chant sliced off
 * mid-note is a click.
 */

import { scheduleWelcome } from './templeSound';

// How long one full occurrence of the synthesised sound lasts, for timing a repeat.
const ONE_PASS_SECONDS = 8.5;

// A soft fade on the way out.
const FADE_OUT = 0.45;

// The volume a chosen setting of 100 maps to. Deliberately below full scale.
const PEAK = 0.5;

// Unlocks audio. Browsers will not start sound without a prior interaction.
const GESTURES = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'];

/**
 * Play the chosen sound until the returned function is called.
 *
 * @param {object} options
 * @param {'none'|'upload'|'temple'|'bell'|'om'} options.sound
 * @param {number} options.volume          0-100 from the admin's setting
 * @param {boolean} options.repeat         keep going, or play once
 * @param {number} options.interval        seconds between repeats
 * @param {string}  [options.trackUrl]     the uploaded MP3, for sound === 'upload'
 * @returns {() => void} stops the sound
 */
export function playOfflineSound({
  sound = 'temple',
  volume = 40,
  repeat = true,
  interval = 12,
  trackUrl = '',
} = {}) {
  if (sound === 'none') return () => {};

  /*
   * An uploaded track needs a URL the browser can actually fetch.
   *
   * If the saved value is empty, or is a bare filesystem path rather than an http
   * URL, there is nothing to play - and an <audio> element given such a source
   * fails silently, which is much harder to diagnose than a missing sound. Fall
   * back to the bell instead, so the site is never mute for no visible reason.
   */
  const playable = /^https?:\/\//i.test(String(trackUrl || '').trim());
  if (sound === 'upload' && !playable) return playSynthesised({ sound: 'temple', volume, repeat, interval });

  return sound === 'upload'
    ? playUpload({ trackUrl, volume, repeat, interval })
    : playSynthesised({ sound, volume, repeat, interval });
}

/** An <audio> element playing the uploaded MP3. */
function playUpload({ trackUrl, volume, repeat, interval }) {
  const el = new Audio();
  el.src = trackUrl;
  el.preload = 'auto';
  el.loop = false;
  el.volume = Math.max(0, Math.min(100, Number(volume) || 0)) / 100;

  let timer = 0;
  let stopped = false;
  let unlocked = false;

  const start = () => {
    if (stopped || unlocked) return;
    unlocked = true;
    detach();
    // fromGesture: the browser has already seen an interaction, so this is allowed.
    el.play().catch(() => {});
    if (repeat) {
      timer = window.setInterval(() => {
        if (stopped) return;
        // Play from the start each time, so a clip is heard whole rather than
        // from wherever the last repeat left off.
        el.currentTime = 0;
        el.play().catch(() => {});
      }, Math.max(interval, 1) * 1000);
    }
  };

  const detach = () => GESTURES.forEach((type) => window.removeEventListener(type, start, true));

  GESTURES.forEach((type) => window.addEventListener(type, start, { capture: true, passive: true }));
  // Already allowed to play: go now.
  el.play().then(start).catch(() => {});

  return () => {
    if (stopped) return;
    stopped = true;
    window.clearInterval(timer);
    detach();
    el.pause();
    el.removeAttribute('src');
    el.load();
  };
}

/** The synthesised bell and Om, on the Web Audio path. */
function playSynthesised({ sound, volume, repeat, interval }) {
  const AudioContextClass = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!AudioContextClass) return () => {};

  let ctx = null;
  let master = null;
  let timer = 0;
  let stopped = false;

  // The setting is 0-100; map it onto a gain that leaves headroom.
  const level = Math.max(0, Math.min(100, Number(volume) || 0)) / 100 * PEAK;

  const detachGestures = () => {
    GESTURES.forEach((type) => window.removeEventListener(type, unlock, true));
  };

  const unlock = () => {
    if (stopped) return;
    ctx?.resume().then(startLoop).catch(() => {});
  };

  const schedule = () => {
    if (stopped || !ctx || master) return;
    master = scheduleWelcome(ctx, ctx.currentTime + 0.05, sound === 'temple' ? 'temple' : sound);
    master.gain.value = 0;
    master.gain.setTargetAtTime(level, ctx.currentTime + 0.05, 0.08);
    if (repeat) {
      // Next strike, `interval` seconds from now, and never sooner than one pass
      // has finished - so two rings cannot overlap.
      timer = window.setTimeout(() => {
        master = null;
        schedule();
      }, Math.max(interval, ONE_PASS_SECONDS) * 1000);
    }
  };

  const startLoop = () => {
    if (stopped) return;
    detachGestures();
    schedule();
  };

  try {
    ctx = new AudioContextClass();
  } catch {
    return () => {};
  }

  if (ctx.state === 'running') startLoop();
  else {
    ctx.onstatechange = () => {
      if (ctx.state === 'running') startLoop();
    };
    GESTURES.forEach((type) => window.addEventListener(type, unlock, { capture: true, passive: true }));
  }

  return () => {
    if (stopped) return;
    stopped = true;
    detachGestures();
    window.clearTimeout(timer);

    if (ctx && master) {
      try {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setTargetAtTime(0, ctx.currentTime, FADE_OUT / 3);
      } catch {
        /* the context may already be closed */
      }
      window.setTimeout(() => {
        ctx?.close().catch(() => {});
      }, FADE_OUT * 1000 + 120);
    } else {
      ctx?.close().catch(() => {});
    }
  };
}