/**
 * Welcome sound: one strike of a temple bell, then a soft "Om".
 *
 * Both are synthesised with the Web Audio API, so there is no audio file to
 * download. Browsers only let a page make sound once the visitor has
 * interacted with the site, so when the page is not yet allowed to play, the
 * sound waits for the first click, tap or key press instead.
 *
 * It plays once per page load. Visitors can switch it off (speaker button in
 * the header / mobile menu); the choice is kept in localStorage.
 */

const STORAGE_KEY = 'rcmt:sound';

const OM_HZ = 136.1; // C sharp, the pitch Om is traditionally chanted on
const BELL_HZ = OM_HZ * 4; // the bell rings two octaves above the chant
const BELL_RING = 7; // seconds until the longest bell partial has died away
const OM_DELAY = 0.8; // the chant starts under the ringing bell
const TOTAL_SECONDS = 8.5; // bell, chant and hall echo are all over by now

// Loudness of each part (1 = full scale). Kept low: this is a greeting.
const BELL_LEVEL = 0.5;
const OM_LEVEL = 0.16;
const HALL_LEVEL = 0.3;

// Bell partials after Risset: [frequency ratio, detune in Hz, level, share of
// the ring time]. The two detuned pairs give the slow beating of a real bell.
const BELL_PARTIALS = [
  [0.56, 0, 1.0, 1.0],
  [0.56, 1, 0.67, 0.9],
  [0.92, 0, 1.0, 0.65],
  [0.92, 1.7, 1.8, 0.55],
  [1.19, 0, 2.67, 0.325],
  [1.7, 0, 1.67, 0.35],
  [2.0, 0, 1.46, 0.25],
  [2.74, 0, 1.33, 0.2],
  [3.0, 0, 1.33, 0.15],
  [3.76, 0, 1.0, 0.1],
  [4.07, 0, 1.33, 0.075],
];
const BELL_TOTAL = BELL_PARTIALS.reduce((sum, partial) => sum + partial[2], 0);

// Automate a parameter through [seconds after `t`, value] points.
const glide = (param, t, points) => {
  points.forEach(([offset, value], i) => {
    if (i === 0) param.setValueAtTime(value, t + offset);
    else param.linearRampToValueAtTime(value, t + offset);
  });
};

function strikeBell(ctx, out, t) {
  BELL_PARTIALS.forEach(([ratio, detune, level, share]) => {
    const end = t + BELL_RING * share;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = BELL_HZ * ratio + detune;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime((level / BELL_TOTAL) * BELL_LEVEL, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain);
    gain.connect(out);
    osc.start(t);
    osc.stop(end + 0.05);
  });

  // The clapper: a few milliseconds of bright noise at the moment of the strike.
  const frames = Math.floor(ctx.sampleRate * 0.03);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  const band = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  noise.buffer = buffer;
  band.type = 'bandpass';
  band.frequency.value = 3200;
  gain.gain.setValueAtTime(BELL_LEVEL * 0.35, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  noise.connect(band);
  band.connect(gain);
  gain.connect(out);
  noise.start(t);
}

/**
 * "A - U - M": a voice-like source (three slightly detuned saws with a slow
 * vibrato) through formant filters that move from an open "aa" to a rounded
 * "oo", then close into a hummed "mm" that fades out.
 */
function chantOm(ctx, out, t) {
  const fadeFrom = 2.5;
  const fadeTime = 0.4;
  const end = t + fadeFrom + fadeTime * 6;

  const voice = ctx.createBiquadFilter();
  voice.type = 'lowpass';
  voice.frequency.value = 2600;

  const vibrato = ctx.createOscillator();
  const vibratoDepth = ctx.createGain();
  vibrato.frequency.value = 4.6;
  vibratoDepth.gain.value = 5; // cents
  vibrato.connect(vibratoDepth);
  vibrato.start(t);
  vibrato.stop(end);

  [-8, 0, 7].forEach((cents) => {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = OM_HZ;
    osc.detune.value = cents;
    vibratoDepth.connect(osc.detune);
    osc.connect(voice);
    osc.start(t);
    osc.stop(end);
  });

  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0, t);
  envelope.gain.linearRampToValueAtTime(OM_LEVEL, t + 0.45);
  envelope.gain.setTargetAtTime(0, t + fadeFrom, fadeTime);
  envelope.connect(out);

  const path = (type, q, frequency, level) => {
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    filter.type = type;
    filter.Q.value = q;
    glide(filter.frequency, t, frequency);
    glide(gain.gain, t, level);
    voice.connect(filter);
    filter.connect(gain);
    gain.connect(envelope);
  };

  //                    "aa" .......... "oo" ............. "mm"
  path('bandpass', 4, [[0, 720], [0.7, 720], [1.2, 430], [1.7, 400], [2.1, 280]],
    [[0, 3], [0.7, 3], [1.2, 1.6], [1.7, 1.5], [2.1, 0.6]]);
  path('bandpass', 6, [[0, 1150], [0.7, 1150], [1.2, 820], [1.7, 780], [2.1, 1000]],
    [[0, 2], [0.7, 2], [1.2, 1.2], [1.7, 1.1], [2.1, 0.2]]);
  path('bandpass', 8, [[0, 2500]], [[0, 1.5], [1.7, 0.8], [2.1, 0.02]]);
  // Chest tone under the vowels; it becomes the hum once the mouth closes.
  path('lowpass', 0.7, [[0, 300]], [[0, 0.25], [1.7, 0.3], [2.1, 0.5]]);
}

// A short burst of fading noise stands in for the echo of a temple hall.
function hallEcho(ctx) {
  const frames = Math.floor(ctx.sampleRate * 2.2);
  const buffer = ctx.createBuffer(2, frames, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < frames; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / frames) ** 3;
    }
  }
  return buffer;
}

/**
 * Schedule the greeting on `ctx` starting at `t`; returns the master gain.
 *
 * `sound` picks which parts sound, so the same synthesis serves the welcome
 * greeting ('temple' - bell and Om together) and the offline notice, where a
 * super admin may choose the bell alone or the Om alone.
 */
export function scheduleWelcome(ctx, t, sound = 'temple') {
  const master = ctx.createGain();
  const dry = ctx.createGain();
  const hall = ctx.createConvolver();
  const wet = ctx.createGain();
  hall.buffer = hallEcho(ctx);
  wet.gain.value = HALL_LEVEL;
  dry.connect(master);
  dry.connect(hall);
  hall.connect(wet);
  wet.connect(master);
  master.connect(ctx.destination);

  if (sound !== 'om') strikeBell(ctx, dry, t);
  if (sound !== 'bell') chantOm(ctx, dry, t + OM_DELAY);
  return master;
}

/** How long one full occurrence lasts, for callers that need to time a repeat. */
export const WELCOME_SECONDS = TOTAL_SECONDS;

/* ------------------------------------------------------------------ */
/* Playback: once per page load, as soon as the browser allows sound.  */
/* ------------------------------------------------------------------ */

// Events that unlock audio. A touch counts when the finger lifts, a mouse
// click when the button goes down; scrolling never counts.
const GESTURES = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'];
const listeners = new Set();

const readStored = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
};

let enabled = readStored();
let played = false;
let ctx = null;
let master = null;
let releaseTimer = 0;

const stopWaiting = () => {
  GESTURES.forEach((type) => window.removeEventListener(type, onGesture, true));
  document.removeEventListener('visibilitychange', onVisible);
};

const release = () => {
  window.clearTimeout(releaseTimer);
  stopWaiting();
  const old = ctx;
  ctx = null;
  master = null;
  if (old) old.close().catch(() => {});
};

const start = () => {
  if (!ctx || played || ctx.state !== 'running') return;
  played = true;
  stopWaiting();
  master = scheduleWelcome(ctx, ctx.currentTime + 0.05);
  releaseTimer = window.setTimeout(release, TOTAL_SECONDS * 1000);
};

function onGesture() {
  if (ctx) ctx.resume().then(start).catch(() => {});
}

function onVisible() {
  if (!document.hidden) playWelcomeSound();
}

/**
 * Play the greeting if it is switched on and has not played on this page load.
 * Pass `fromGesture` when calling from a click handler: the browser then lets
 * the sound start immediately.
 */
export function playWelcomeSound({ fromGesture = false } = {}) {
  if (!enabled || played || ctx) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  // Opened in a background tab: greet when the visitor actually arrives.
  if (document.hidden) {
    document.addEventListener('visibilitychange', onVisible);
    return;
  }
  document.removeEventListener('visibilitychange', onVisible);

  try {
    ctx = new AudioContextClass();
  } catch {
    return;
  }
  ctx.onstatechange = start;
  GESTURES.forEach((type) => window.addEventListener(type, onGesture, { capture: true, passive: true }));
  if (fromGesture) onGesture();
  else start();
}

export const isSoundEnabled = () => enabled;

/** Switch the greeting on or off. Switching it on plays it straight away. */
export const setSoundEnabled = (on) => {
  enabled = Boolean(on);
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    /* storage blocked: the choice still applies for this visit */
  }
  listeners.forEach((fn) => fn(enabled));

  if (enabled) {
    release();
    played = false;
    playWelcomeSound({ fromGesture: true });
  } else if (ctx && master) {
    // Fade out instead of cutting off mid-ring.
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.04);
    window.clearTimeout(releaseTimer);
    releaseTimer = window.setTimeout(release, 250);
  } else {
    release();
  }
};

export const subscribeSound = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
