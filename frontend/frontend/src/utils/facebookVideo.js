import api from '../services/api';

// Accepts a plain video URL, a share link, OR a full Facebook embed <iframe>
// code and always returns a clean Facebook video URL.
export const extractFacebookVideoUrl = (input) => {
  if (!input || typeof input !== 'string') return '';
  let value = input.trim();
  if (/<iframe/i.test(value)) {
    const srcMatch = value.match(/src=["']([^"']+)["']/i);
    const src = srcMatch ? srcMatch[1] : value;
    const hrefMatch = src.match(/[?&]href=([^&]+)/i);
    if (hrefMatch) {
      try { value = decodeURIComponent(hrefMatch[1]); }
      catch (e) { value = hrefMatch[1]; }
    } else if (!src.includes('plugins/video.php')) {
      value = src;
    }
  }
  return value;
};

// A Reel is detected by /reel/, /reels/, /share/v/ or /share/r/ in the URL
export const isReelUrl = (url) =>
  /\/reel\//i.test(url) || /\/reels\//i.test(url) || /\/share\/v\//i.test(url) || /\/share\/r\//i.test(url);

// Facebook share links (/share/v/, /share/r/, fb.watch) 302-redirect to the
// canonical reel/video URL, and the plugins/video.php embed cannot follow that
// redirect: it answers "Video Unavailable". So such a link must be resolved
// (server-side, through our backend) before it is ever put in an iframe.
export const isUnresolvedFacebookUrl = (url) =>
  /facebook\.com\/share\//i.test(url || '') || /(^|\.)fb\.watch\//i.test(url || '');

// Lookups that worked are kept in memory and in localStorage (a resolved reel
// address never changes), so a later backend hiccup cannot break the videos.
// Failures are never kept: the next call tries again.
const resolveCache = new Map();
const STORE_KEY = 'rcmt:fb-resolved';
const readStore = () => {
  try { return JSON.parse(window.localStorage.getItem(STORE_KEY) || '{}') || {}; } catch (e) { return {}; }
};
const writeStore = (key, value) => {
  try {
    const store = readStore();
    store[key] = value;
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch (e) { /* storage blocked: the in-memory cache still works */ }
};

// Returns the canonical URL, or the input unchanged when it could not be resolved
// (check isUnresolvedFacebookUrl on the result).
export const resolveFacebookVideoUrl = async (input) => {
  const clean = extractFacebookVideoUrl(input);
  if (!clean) return '';
  if (!isUnresolvedFacebookUrl(clean)) return clean;
  if (resolveCache.has(clean)) return resolveCache.get(clean);
  const stored = readStore()[clean];
  if (stored) {
    resolveCache.set(clean, stored);
    return stored;
  }
  try {
    const { data } = await api.post('/admin/facebook/resolve', { url: clean });
    const resolved = data?.url;
    if (resolved && !isUnresolvedFacebookUrl(resolved)) {
      resolveCache.set(clean, resolved);
      writeStore(clean, resolved);
      return resolved;
    }
  } catch (e) { /* fall through: unresolved */ }
  return clean;
};

// Builds the plugins/video.php embed URL for a Facebook video/reel URL.
// Only the first video autoplays (muted) to avoid the "one plays, others
// stop" conflict; the rest load paused and play independently on click.
export const buildFacebookEmbedSrc = (cleanUrl, auto = false, muted = true) =>
  `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
    cleanUrl
  )}&show_text=false&width=560&autoplay=${auto ? 'true' : 'false'}&mute=${muted ? 'true' : 'false'}`;

// ─── YouTube support (regular videos + Shorts) ──────────────────────────────
// Accepts youtube.com/watch, youtube.com/shorts/, youtu.be/ and /embed/ forms.
export const isYouTubeUrl = (url) =>
  /(^|\.)youtube\.com\//i.test(url) || /(^|\.)youtu\.be\//i.test(url);

export const getYouTubeVideoId = (url) => {
  if (!url || typeof url !== 'string') return '';
  let m = url.match(/[?&]v=([^&]+)/i);
  if (m) return m[1];
  m = url.match(/youtu\.be\/([^?&#]+)/i);
  if (m) return m[1];
  m = url.match(/\/shorts\/([^?&#]+)/i);
  if (m) return m[1];
  m = url.match(/\/embed\/([^?&#]+)/i);
  if (m) return m[1];
  return '';
};

export const buildYouTubeEmbedSrc = (url, auto = false, muted = true) => {
  const id = getYouTubeVideoId(url);
  if (!id) return '';
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1&autoplay=${auto ? '1' : '0'}&mute=${muted ? '1' : '0'}`;
};