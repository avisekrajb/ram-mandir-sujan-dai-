// Links and embed addresses come from admin-edited settings and from the API. Browsers run
// `javascript:` addresses placed in href / src / iframe attributes, so every such value is passed
// through these helpers first. (The API also refuses to save them: this is the second lock.)

const trimmed = (value) => (typeof value === 'string' ? value.trim() : '');

// An absolute http(s) address, or '' when the value is anything else (javascript:, data:, relative...).
export const safeHttpUrl = (value, allowedHosts) => {
  const raw = trimmed(value);
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
    if (Array.isArray(allowedHosts) && allowedHosts.length) {
      const host = url.hostname.toLowerCase();
      if (!allowedHosts.some((h) => host === h || host.endsWith('.' + h))) return '';
    }
    return url.href;
  } catch {
    return '';
  }
};

// A link that may be http(s), mailto: or tel:. '' otherwise.
export const safeLink = (value) => {
  const raw = trimmed(value);
  if (/^(mailto|tel):/i.test(raw)) return raw;
  return safeHttpUrl(raw);
};

// An in-site path ("/events", "/blogs/12"): must start with a single slash. '' otherwise.
export const safeSitePath = (value) => {
  const raw = trimmed(value);
  // No spaces / tabs / line breaks / control characters inside: browsers drop them, so "/<TAB>/evil.com"
  // would become "//evil.com", an address on another site.
  const hasHiddenChar = [...raw].some((ch) => ch.charCodeAt(0) <= 0x20 || ch.charCodeAt(0) === 0x7f);
  return /^\/(?![/\\])/.test(raw) && !hasHiddenChar ? raw : '';
};

// A link typed by an admin without a scheme ("www.facebook.com/page") is completed to https://.
export const httpUrlFromInput = (value) => {
  const raw = trimmed(value);
  if (!raw) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return safeHttpUrl(raw);
  return safeHttpUrl('https://' + raw.replace(/^\/+/, ''));
};

// Hosts that may be framed for the footer / contact map.
export const MAP_HOSTS = ['google.com', 'google.com.np', 'openstreetmap.org', 'maps.google.com'];
// Hosts the live-video player may embed.
export const VIDEO_HOSTS = ['youtube.com', 'youtube-nocookie.com', 'youtu.be', 'facebook.com', 'fb.watch'];
