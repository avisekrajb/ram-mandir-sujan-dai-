const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const { ensureSeedEvents, getHomeEvents } = require('../controllers/eventController');
const protect = require('../middleware/auth');
const admin = require('../middleware/admin');
const { requireArea } = require('../middleware/permissions');
const { MAX_LIST, clampInt } = require('../utils/listLimits');
const { announceEvent } = require('../services/newsletterService');

// ============================================
// SPECIFIC ROUTES (MUST BE BEFORE /:id)
// ============================================

// @desc    Get the events the admin placed on the home page (max 4, in slot order)
// @route   GET /api/events/home
// @access  Public
router.get('/home', getHomeEvents);

// @desc    Get upcoming events
// @route   GET /api/events/upcoming
// @access  Public
router.get('/upcoming', async (req, res) => {
  try {
    await ensureSeedEvents();
    const events = await Event.find({ upcoming: true }).sort({ date: 1 }).limit(6);
    res.json(events);
  } catch (error) {
    console.error('Get upcoming events error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get past events
// @route   GET /api/events/past
// @access  Public
router.get('/past', async (req, res) => {
  try {
    const events = await Event.find({ upcoming: false }).sort({ date: -1 }).limit(10);
    res.json(events);
  } catch (error) {
    console.error('Get past events error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get popular events (most interested)
// @route   GET /api/events/popular
// @access  Public
router.get('/popular', async (req, res) => {
  try {
    const limit = clampInt(req.query.limit, 5, 1, 50);
    const events = await Event.find({ upcoming: true })
      .sort({ interestedCount: -1, views: -1 })
      .limit(limit);
    res.json(events);
  } catch (error) {
    console.error('Get popular events error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get user's interested events
// @route   GET /api/events/interested
// @access  Private
router.get('/interested', protect, async (req, res) => {
  try {
    const events = await Event.find({ 
      interestedBy: req.user.id,
      upcoming: true 
    }).sort({ date: 1 });
    res.json(events);
  } catch (error) {
    console.error('Get interested events error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get event engagement stats (admin only)
// @route   GET /api/events/stats/engagement
// @access  Private/Admin
router.get('/stats/engagement', protect, admin, requireArea('content'), async (req, res) => {
  try {
    const totalEvents = await Event.countDocuments();
    const upcomingEvents = await Event.countDocuments({ upcoming: true });
    const pastEvents = await Event.countDocuments({ upcoming: false });
    
    const stats = await Event.aggregate([
      {
        $group: {
          _id: null,
          totalInterested: { $sum: '$interestedCount' },
          totalViews: { $sum: '$views' },
          totalShares: { $sum: '$shareCount' },
          avgInterested: { $avg: '$interestedCount' },
          avgViews: { $avg: '$views' },
        }
      }
    ]);
    
    const mostInterested = await Event.find({ upcoming: true })
      .sort({ interestedCount: -1 })
      .limit(5)
      .select('title interestedCount views');
    
    res.json({
      success: true,
      data: {
        totalEvents,
        upcomingEvents,
        pastEvents,
        ...(stats[0] || { totalInterested: 0, totalViews: 0, totalShares: 0, avgInterested: 0, avgViews: 0 }),
        mostInterested,
      }
    });
  } catch (error) {
    console.error('Get engagement stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================
// DYNAMIC ROUTES (WITH :id PARAMETER)
// ============================================

// @desc    Get all events
// @route   GET /api/events
// @access  Public
router.get('/', async (req, res) => {
  try {
    await ensureSeedEvents();
    const events = await Event.find().sort({ date: 1 }).limit(MAX_LIST);
    res.json(events);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get event by ID
// @route   GET /api/events/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Mark event as interested
// @route   POST /api/events/:id/interested
// @access  Private
router.post('/:id/interested', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Initialize arrays if not exist
    if (!event.interestedBy) event.interestedBy = [];
    
    // Check if already interested
    if (event.interestedBy.some(id => id.toString() === req.user.id)) {
      return res.status(400).json({ message: 'Already interested in this event' });
    }
    
    event.interestedBy.push(req.user.id);
    event.interestedCount = (event.interestedCount || 0) + 1;
    await event.save();
    
    res.json({ 
      success: true, 
      count: event.interestedCount,
      message: 'Marked as interested'
    });
  } catch (error) {
    console.error('Interested error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Remove interest from event
// @route   POST /api/events/:id/uninterested
// @access  Private
router.post('/:id/uninterested', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    if (!event.interestedBy) {
      event.interestedBy = [];
    }
    
    const before = event.interestedBy.length;
    event.interestedBy = event.interestedBy.filter(id => id.toString() !== req.user.id);
    // Only decrement when this user had actually registered interest.
    if (event.interestedBy.length < before) {
      event.interestedCount = Math.max(0, (event.interestedCount || 0) - 1);
    }
    await event.save();
    
    res.json({ 
      success: true, 
      count: event.interestedCount,
      message: 'Removed from interested'
    });
  } catch (error) {
    console.error('Uninterested error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Track event view
// @route   POST /api/events/:id/view
// @access  Public
router.post('/:id/view', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    event.views = (event.views || 0) + 1;
    await event.save();
    res.json({ success: true, views: event.views });
  } catch (error) {
    console.error('View tracking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Track event share
// @route   POST /api/events/:id/share
// @access  Public
router.post('/:id/share', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    event.shareCount = (event.shareCount || 0) + 1;
    await event.save();
    res.json({ success: true, shareCount: event.shareCount });
  } catch (error) {
    console.error('Share tracking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get all interested users for an event (admin only)
// @route   GET /api/events/:id/interested-users
// @access  Private/Admin
router.get('/:id/interested-users', protect, admin, requireArea('content'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('interestedBy', 'name email phone profilePhoto');
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json({
      success: true,
      event: event.title,
      count: event.interestedBy.length,
      users: event.interestedBy,
    });
  } catch (error) {
    console.error('Get interested users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================
// ADMIN ROUTES
// ============================================

// @desc    Create event (admin only)
// @route   POST /api/events
// @access  Private/Admin
router.post('/', protect, admin, requireArea('content'), async (req, res) => {
  try {
    const { notifySubscribers, ...fields } = req.body;
    const eventData = {
      ...fields,
      interestedCount: 0,
      views: 0,
      interestedBy: [],
      shareCount: 0,
    };
    const event = await Event.create(eventData);
    // Same as Admin -> Events: e-mail the subscribers who ticked "events" (once per event, in the background).
    if (notifySubscribers !== false && notifySubscribers !== 'false') {
      announceEvent(event, { createdBy: req.user && req.user._id }).catch((e) => console.error('Event subscriber notification error:', e.message));
    }
    res.status(201).json(event);
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Update event (admin only)
// @route   PUT /api/events/:id
// @access  Private/Admin
router.put('/:id', protect, admin, requireArea('content'), async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findByIdAndUpdate(id, req.body, { new: true });
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Delete event (admin only)
// @route   DELETE /api/events/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, requireArea('content'), async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findByIdAndDelete(id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json({ success: true, message: 'Event deleted' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;