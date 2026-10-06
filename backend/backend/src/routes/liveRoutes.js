const express = require('express');
const router = express.Router();
const { getFacebookLive, getFacebookPage, PAGE_URL } = require('../services/facebookLiveService');
const { getLivePuja } = require('../services/livePujaService');

// @desc    Is the temple's Facebook page live right now? Plus its recent past lives.
// @route   GET /api/live/facebook
// @access  Public
router.get('/facebook', async (req, res) => {
  try {
    const result = await getFacebookLive();
    res.set('Cache-Control', 'public, max-age=30');
    res.json({ success: true, pageUrl: PAGE_URL, ...result });
  } catch (error) {
    console.error('Live route error:', error.message);
    res.json({ success: true, pageUrl: PAGE_URL, configured: false, live: null, past: [] });
  }
});

// @desc    The page card (name, followers, picture) and its latest videos
// @route   GET /api/live/facebook/page
// @access  Public
router.get('/facebook/page', async (req, res) => {
  try {
    const result = await getFacebookPage();
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Facebook page route error:', error.message);
    res.json({ success: true, pageUrl: PAGE_URL, configured: false, page: null, videos: [] });
  }
});

// @desc    Live Puja: is the YouTube channel on air, and what to play if not
// @route   GET /api/live/puja
// @access  Public
router.get('/puja', async (req, res) => {
  try {
    const result = await getLivePuja();
    res.set('Cache-Control', 'public, max-age=30');
    res.json(result);
  } catch (error) {
    console.error('Live Puja route error:', error.message);
    res.json({
      success: true,
      enabled: false,
      autoPlay: false,
      live: false,
      liveVideoId: '',
      offline: { videoId: '', url: '', title: '' },
      channelName: '',
      channelUrl: '',
      channelId: '',
      detectMode: 'none',
      source: 'error',
    });
  }
});

module.exports = router;
