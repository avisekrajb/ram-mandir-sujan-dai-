const axios = require('axios');

/**
 * Facebook live status for the temple page.
 *
 * Facebook offers no public way to ask "is this page live right now?", so this
 * reads the page's live videos through the Graph API with a Page access token
 * (FB_PAGE_TOKEN, created by an admin of the page; see README). Without a token
 * the service reports `configured: false` and the site keeps using the live link
 * saved in Admin → Home.
 *
 * Result: { configured, live, past }
 *   live  the broadcast that is on air now, or null
 *   past  the most recent finished lives, newest first
 * Each item: { id, url, title, date, thumbnail }.
 *
 * Answers are cached for a minute, so any number of visitors cost one Graph call
 * a minute; the token never leaves the server.
 */

const GRAPH = 'https://graph.facebook.com/v19.0';
const PAGE_URL = (process.env.FB_PAGE_URL || 'https://www.facebook.com/shreeramchandramandir').replace(/\/+$/, '');
const TTL_MS = 60 * 1000;
const ERROR_TTL_MS = 20 * 1000;
const PAST_LIMIT = 8;

let cache = { at: 0, ttl: 0, data: null };

const absolute = (permalink, id) => {
  if (permalink && /^https?:\/\//i.test(permalink)) return permalink;
  if (permalink) return `https://www.facebook.com${permalink.startsWith('/') ? '' : '/'}${permalink}`;
  return `${PAGE_URL}/videos/${id}`;
};

const toItem = (v) => ({
  id: String(v.id),
  url: absolute(v.permalink_url, v.id),
  title: (v.title || '').trim(),
  date: v.creation_time || null,
  thumbnail: v.video?.picture || null,
});

const FIELDS = 'id,status,title,permalink_url,creation_time,video{picture}';

const fetchLives = async (status, limit) => {
  const { data } = await axios.get(`${GRAPH}/me/live_videos`, {
    params: {
      broadcast_status: JSON.stringify([status]),
      fields: FIELDS,
      limit,
      access_token: process.env.FB_PAGE_TOKEN,
    },
    timeout: 8000,
  });
  return Array.isArray(data?.data) ? data.data : [];
};

const getFacebookLive = async () => {
  if (!process.env.FB_PAGE_TOKEN) return { configured: false, live: null, past: [] };

  if (cache.data && Date.now() - cache.at < cache.ttl) return cache.data;

  try {
    const [onAir, finished] = await Promise.all([fetchLives('LIVE', 1), fetchLives('VOD', PAST_LIMIT)]);
    const data = {
      configured: true,
      live: onAir[0] ? toItem(onAir[0]) : null,
      past: finished.map(toItem).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
    };
    cache = { at: Date.now(), ttl: TTL_MS, data };
    return data;
  } catch (error) {
    // Log the Graph error message only: the request config holds the token.
    const reason = error.response?.data?.error?.message || error.message;
    console.error('Facebook live lookup failed:', reason);
    // Serve the last good answer for a moment rather than flipping the site back and forth.
    if (cache.data) {
      cache.at = Date.now();
      cache.ttl = ERROR_TTL_MS;
      return cache.data;
    }
    return { configured: true, error: true, live: null, past: [] };
  }
};

// ---------------------------------------------------------------------------
// Page card (name, followers, picture) and the latest uploaded videos, for the
// "Follow us on Facebook" block. Same token, a longer cache: these change slowly.
// ---------------------------------------------------------------------------

const PAGE_TTL_MS = 10 * 60 * 1000;
const PAGE_FIELDS = 'name,link,followers_count,fan_count,picture.width(160).height(160){url}';
const VIDEO_FIELDS = 'id,title,description,permalink_url,created_time,picture,length';
const VIDEO_LIMIT = 9;

let pageCache = { at: 0, ttl: 0, data: null };

const firstLine = (text) => String(text || '').split('\n')[0].trim().slice(0, 120);

const getFacebookPage = async () => {
  const base = { pageUrl: PAGE_URL };
  const token = process.env.FB_PAGE_TOKEN;
  if (!token) return { ...base, configured: false, page: null, videos: [] };

  if (pageCache.data && Date.now() - pageCache.at < pageCache.ttl) return pageCache.data;

  const [pageRes, videosRes] = await Promise.allSettled([
    axios.get(`${GRAPH}/me`, { params: { fields: PAGE_FIELDS, access_token: token }, timeout: 8000 }),
    axios.get(`${GRAPH}/me/videos`, { params: { fields: VIDEO_FIELDS, limit: VIDEO_LIMIT, access_token: token }, timeout: 8000 }),
  ]);

  if (pageRes.status === 'rejected' && videosRes.status === 'rejected') {
    const reason = pageRes.reason?.response?.data?.error?.message || pageRes.reason?.message;
    console.error('Facebook page lookup failed:', reason);
    if (pageCache.data) {
      pageCache.at = Date.now();
      pageCache.ttl = ERROR_TTL_MS;
      return pageCache.data;
    }
    return { ...base, configured: true, error: true, page: null, videos: [] };
  }

  const p = pageRes.status === 'fulfilled' ? pageRes.value.data : null;
  const list = videosRes.status === 'fulfilled' && Array.isArray(videosRes.value.data?.data) ? videosRes.value.data.data : [];

  const data = {
    ...base,
    configured: true,
    page: p ? {
      name: p.name || '',
      link: p.link || PAGE_URL,
      followers: Number.isFinite(p.followers_count) ? p.followers_count : (Number.isFinite(p.fan_count) ? p.fan_count : null),
      picture: p.picture?.data?.url || null,
    } : null,
    videos: list
      .map((v) => ({
        id: String(v.id),
        url: absolute(v.permalink_url, v.id),
        title: firstLine(v.title || v.description),
        date: v.created_time || null,
        thumbnail: v.picture || null,
        length: Number.isFinite(v.length) ? v.length : null,
      }))
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
  };
  pageCache = { at: Date.now(), ttl: PAGE_TTL_MS, data };
  return data;
};

module.exports = { getFacebookLive, getFacebookPage, PAGE_URL };
