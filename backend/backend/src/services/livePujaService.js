const axios = require('axios');
const AdminSettings = require('../models/AdminSettings');

/**
 * Live Puja detection.
 *
 * When a YouTube API key is configured the server asks YouTube itself whether the
 * channel has a broadcast running, so the page needs no action from the admin when
 * a stream starts or ends:
 *
 *   admin starts the broadcast -> YouTube publishes a live item
 *   -> search.list finds it   -> the home page plays it
 *   -> the stream ends         -> the item leaves the result
 *   -> the offline video takes over
 *
 * Without a key (the usual case on a free hosting plan, since the Data API needs
 * billing enabled) the admin marks the broadcast by hand with
 * `livePuja.manualLiveVideoId`, and the offline video is shown when that is empty.
 *
 * The answer is cached for CACHE_MS because the home page polls it, and a YouTube
 * quota unit is spent per call.
 */

const CACHE_MS = 60 * 1000;
const REQUEST_TIMEOUT = 8000;
const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3/search';

// A YouTube channel id always starts with UC and is 24 characters long. The
// placeholder the admin may have pasted while setting this up is rejected, so a
// half-finished config never produces a broken player.
const CHANNEL_ID_RX = /^UC[\w-]{22}$/;

let cache = { at: 0, value: null };

const apiKey = () => String(process.env.YOUTUBE_API_KEY || '').trim();

/** Pulls the video id out of any of the YouTube URL shapes. */
const youtubeVideoId = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^[\w-]{11}$/.test(raw)) return raw; // a bare id

  const patterns = [
    /youtube\.com\/watch\?(?:.*&)?v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/live\/([\w-]{11})/,
  ];
  for (const rx of patterns) {
    const match = raw.match(rx);
    if (match) return match[1];
  }
  return '';
};

/** The channel page address, built from the id when the admin left it blank. */
const channelUrlFor = (config) => {
  const given = String(config?.channelUrl || '').trim();
  if (given) return given;
  const id = String(config?.channelId || '').trim();
  return CHANNEL_ID_RX.test(id) ? `https://www.youtube.com/channel/${id}` : '';
};

/** Ask YouTube for a running broadcast on the channel. */
const detectWithApi = async (channelId, key) => {
  const { data } = await axios.get(YOUTUBE_API, {
    params: {
      part: 'id,snippet',
      channelId,
      eventType: 'live',
      type: 'video',
      maxResults: 1,
      key,
    },
    timeout: REQUEST_TIMEOUT,
  });
  const item = data?.items?.[0];
  return item?.id?.videoId ? String(item.id.videoId) : '';
};

/**
 * What the home page needs to decide what to play. Never throws: a failed check
 * falls back to the offline video rather than hiding the block.
 */
const getLivePuja = async () => {
  const settings = await AdminSettings.getSettings();
  const config = settings.livePuja || {};

  const base = {
    success: true,
    enabled: config.enabled !== false && !!config.enabled,
    autoPlay: config.autoPlay !== false,
    channelName: String(config.channelName || '').trim(),
    channelUrl: channelUrlFor(config),
    channelId: String(config.channelId || '').trim(),
    offline: {
      videoId: youtubeVideoId(config.offlineVideo?.url),
      url: String(config.offlineVideo?.url || '').trim(),
      title: String(config.offlineVideo?.title || '').trim(),
    },
    detectMode: apiKey() ? 'auto' : 'manual',
  };

  if (!base.enabled) {
    return { ...base, live: false, liveVideoId: '', checkedAt: new Date().toISOString() };
  }

  // Served from cache: the home page polls, and each check costs quota.
  const now = Date.now();
  if (cache.value && now - cache.at < CACHE_MS) {
    return { ...base, ...cache.value, checkedAt: new Date(cache.at).toISOString() };
  }

  let liveVideoId = '';
  let source = 'none';

  const key = apiKey();
  const channelId = String(config.channelId || '').trim();
  if (key && CHANNEL_ID_RX.test(channelId)) {
    try {
      liveVideoId = await detectWithApi(channelId, key);
      source = 'youtube-api';
    } catch (error) {
      // A quota or network problem must not take the page down; say why and
      // carry on with whatever the admin set by hand.
      console.error('Live Puja check failed:', error.message);
      source = 'error';
    }
  }

  if (!liveVideoId) {
    liveVideoId = youtubeVideoId(config.manualLiveVideoId);
    source = liveVideoId ? 'manual' : 'none';
  }

  cache = { at: now, value: { live: !!liveVideoId, liveVideoId, source } };
  return { ...base, ...cache.value, checkedAt: new Date(now).toISOString() };
};

/** Drops the cached answer so a settings change is reflected at once. */
const clearLivePujaCache = () => {
  cache = { at: 0, value: null };
};

module.exports = { getLivePuja, clearLivePujaCache, youtubeVideoId };