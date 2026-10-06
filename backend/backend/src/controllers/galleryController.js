const Gallery = require('../models/Gallery');

// @desc    Get all gallery photos
// @route   GET /api/gallery/photos
// @access  Public
exports.getPhotos = async (req, res) => {
  try {
    const photos = await Gallery.find({ type: 'photo' })
      .sort({ createdAt: -1 });
    res.json({
      success: true,
      count: photos.length,
      data: photos,
    });
  } catch (error) {
    console.error('Get photos error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all gallery videos
// @route   GET /api/gallery/videos
// @access  Public
exports.getVideos = async (req, res) => {
  try {
    const videos = await Gallery.find({ type: 'video' })
      .sort({ createdAt: -1 });
    res.json({
      success: true,
      count: videos.length,
      data: videos,
    });
  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get gallery item by ID
// @route   GET /api/gallery/:id
// @access  Public
exports.getGalleryItem = async (req, res) => {
  try {
    const item = await Gallery.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Gallery item not found' });
    }

    res.json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error('Get gallery item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add gallery photo (admin only)
// @route   POST /api/admin/gallery
// @access  Private/Admin
exports.addPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No photo uploaded' });
    }

    const data = req.body.data ? JSON.parse(req.body.data) : {};
    const photo = await Gallery.create({
      photo: req.file.path,
      cap: data.cap || { en: 'Temple Photo' },
      type: 'photo',
      hue: data.hue || '#7A1F2B',
    });

    res.status(201).json({
      success: true,
      data: photo,
      message: 'Photo added successfully',
    });
  } catch (error) {
    console.error('Add photo error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add gallery video (admin only)
// @route   POST /api/admin/gallery/videos
// @access  Private/Admin
exports.addVideo = async (req, res) => {
  try {
    const { url, cap } = req.body;

    if (!url) {
      return res.status(400).json({ message: 'Video URL is required' });
    }

    const video = await Gallery.create({
      url,
      cap: cap || { en: 'Temple Video' },
      type: 'video',
    });

    res.status(201).json({
      success: true,
      data: video,
      message: 'Video added successfully',
    });
  } catch (error) {
    console.error('Add video error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete gallery item (admin only)
// @route   DELETE /api/admin/gallery/:id
// @access  Private/Admin
exports.deleteGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Gallery.findByIdAndDelete(id);
    
    if (!item) {
      return res.status(404).json({ message: 'Gallery item not found' });
    }

    res.json({
      success: true,
      message: 'Gallery item deleted successfully',
    });
  } catch (error) {
    console.error('Delete gallery item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};