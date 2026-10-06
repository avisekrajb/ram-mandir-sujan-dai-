/**
 * Image loading helpers.
 *
 * Three separate problems are addressed here:
 *
 * 1. DUPLICATE REQUESTS. Several components rendered the same photo more than
 *    once (gallery thumbnails, marquee rows, hero fallbacks). Each <img> is a
 *    separate element, and the browser only coalesces identical URLs when the
 *    first response is still cacheable. Cloudinary URLs carry a signature, so
 *    two URLs pointing at the same asset produced two real downloads. The fix
 *    is a single canonical URL per asset, reused everywhere.
 *
 * 2. OVERSIZED IMAGES. Photos were served at their full uploaded resolution
 *    into slots that render at most ~600px wide. On Cloudinary that is fixed
 *    with a transformation segment, which also lets the CDN negotiate WebP/AVIF
 *    automatically.
 *
 * 3. EAGER LOADING BELOW THE FOLD. Every image was fetched on load, including
 *    ones far below the viewport.
 */

/** Public images are already small and hand-optimised; leave them untouched. */
const LOCAL_OR_DATA = /^(data:|blob:|\/)/i;

/** Matches a Cloudinary transformation part such as `w_600` or `q_auto`. */
const TRANSFORM_PART = /^[a-z]+_[^/]+$/;

/**
 * Strip an existing transformation, version and extension prefix from a
 * Cloudinary public id.
 *
 * The transformation segment is identified structurally rather than by
 * stripping a known prefix: a public id may contain slashes ("temple/photo"),
 * so any regex that greedily consumes "up to the first slash" would swallow the
 * real path. Instead, walk the segments and drop the leading ones that look
 * like `key_value` pairs — the first segment that does not is the start of the
 * public id.
 */
const stripTransform = (publicId) => {
  const segments = publicId.split('/');

  let start = 0;
  while (start < segments.length && TRANSFORM_PART.test(segments[start])) {
    start += 1;
  }

  let rest = segments.slice(start).join('/');

  // Drop a version segment (v1234567890). The lookahead keeps the slash so the
  // remainder is collapsed to a single separator below.
  rest = rest.replace(/^v\d+(?=\/|$)/, '');
  rest = rest.replace(/^\/+/, '');

  // Keep the file extension: Cloudinary uses it to choose the source format.
  rest = rest.replace(/\.(jpe?g|png|gif|webp|avif|bmp|tiff?)$/i, '');

  return rest;
};

/**
 * Cloudinary delivery URL with width, quality and format negotiation.
 *
 * `f_auto` is the important part: Cloudinary serves AVIF where the browser
 * supports it, WebP otherwise, and falls back to the original format when
 * neither is available. A 423KB JPEG typically lands at 60-120KB this way, and
 * the browser caches one file per asset regardless of which format it got.
 *
 * @param {string} src       original URL or Cloudinary public id
 * @param {object} [options]
 * @param {number} [options.width]  desired render width in CSS pixels
 * @param {'low'|'medium'|'high'} [options.quality]
 */
export const optimizeImage = (src, { width, quality = 'medium' } = {}) => {
  if (!src || typeof src !== 'string') return src;
  if (LOCAL_OR_DATA.test(src)) return src;

  const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || 'dibusz4ag';
  const upload = `https://res.cloudinary.com/${cloudName}/image/upload/`;

  // Absolute URLs are only rewritten when they point at our own Cloudinary
  // account; a third-party image must be left exactly as-is.
  const absolute = src.startsWith('http://') || src.startsWith('https://');
  if (absolute && !src.includes('res.cloudinary.com')) return src;

  const rawId = absolute
    ? src.split('/image/upload/')[1] || src
    : src.replace(/^\/+/, '');

  const publicId = stripTransform(rawId);
  if (!publicId) return src;

  const parts = [];
  if (width) parts.push(`w_${Math.round(width)}`, 'c_limit');
  parts.push('f_auto');
  parts.push(
    `q_${
      quality === 'low'
        ? 'auto:low'
        : quality === 'high'
        ? 'auto:good'
        : 'auto'
    }`
  );

  return `${upload}${parts.join(',')}/${publicId}`;
};

/**
 * Memoised per-URL so repeated calls in one render pass return the identical
 * string, which keeps React from seeing a changed `src` and re-fetching.
 */
const cache = new Map();
export const optimizeImageCached = (src, options) => {
  const key = `${src}|${JSON.stringify(options || {})}`;
  if (cache.has(key)) return cache.get(key);
  const value = optimizeImage(src, options);
  cache.set(key, value);
  return value;
};

/**
 * Props for a below-the-fold image: lazy, async decode, and a blurred
 * placeholder so the layout does not jump when it arrives.
 */
export const lazyImageProps = (width) => ({
  loading: 'lazy',
  decoding: 'async',
  ...(width ? { width, height: Math.round(width * 0.75) } : {}),
});

/**
 * Props for the LCP element (the hero image): no lazy loading, high fetch
 * priority, and a synchronous decode so it paints in the first frame.
 */
export const priorityImageProps = (width) => ({
  loading: 'eager',
  decoding: 'sync',
  fetchPriority: 'high',
  ...(width ? { width, height: Math.round(width * 0.5625) } : {}),
});