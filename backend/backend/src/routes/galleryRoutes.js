const express = require('express');
const router = express.Router();
const Gallery = require('../models/Gallery');
const { MAX_LIST } = require('../utils/listLimits');

// @desc    Get all gallery photos
// @route   GET /api/gallery/photos
// @access  Public
router.get('/photos', async (req, res) => {
  try {
    const photos = await Gallery.find({ type: 'photo' }).sort({ createdAt: -1 }).limit(MAX_LIST);
    res.json(photos);
  } catch (error) {
    console.error('Get gallery photos error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get all gallery videos
// @route   GET /api/gallery/videos
// @access  Public
router.get('/videos', async (req, res) => {
  try {
    const videos = await Gallery.find({ type: 'video' }).sort({ createdAt: -1 }).limit(MAX_LIST);
    res.json(videos);
  } catch (error) {
    console.error('Get gallery videos error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;