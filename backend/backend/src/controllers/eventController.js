const mongoose = require('mongoose');
const Event = require('../models/Event');
const { announceEvent } = require('../services/newsletterService');
const { DEFAULT_EVENTS } = require('../data/templeContent');

/** The home page shows at most this many events. */
const HOME_SLOT_MAX = 4;

/**
 * Coerce anything into a valid home slot: 0 (hidden) or an integer 1..4.
 * Guards the "max 4" rule and keeps junk out of the collection, since
 * findByIdAndUpdate runs without casting a raw string.
 */
const normalizeHomeSlot = (raw) => {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  const i = Math.trunc(n);
  if (i < 1) return 0;
  return Math.min(i, HOME_SLOT_MAX);
};

/**
 * The app ships with a few standing programs (साधना–सन्ध्या, बालविहार) that
 * recur all year. They are created once, identified by `seedKey`, and are then
 * fully editable from Admin → Events like any other event.
 */
let seedPromise = null;

exports.ensureSeedEvents = () => {
  if (!seedPromise) {
    seedPromise = (async () => {
      try {
        // A seed dropped from DEFAULT_EVENTS is retired: the record published earlier must go
        // too, otherwise it keeps showing on the page although it is no longer part of the app.
        // Only seeded rows are touched - anything the admin added has no seedKey.
        const liveSeedKeys = [...DEFAULT_EVENTS.map((s) => s.seedKey), '', null];
        const retired = await Event.find({ seedKey: { $nin: liveSeedKeys } }).select('_id seedKey');
        for (const ev of retired) {
          await Event.deleteOne({ _id: ev._id });
          console.log(`Events: removed retired seed "${ev.seedKey}"`);
        }

        for (const seed of DEFAULT_EVENTS) {
          const exists = await Event.findOne({ seedKey: seed.seedKey });
          if (!exists) {
            await Event.create(seed);
            continue;
          }

          // A content correction shipped in a later seedVersion: refresh the
          // published copy so the fix reaches the live page.
          if (exists.seedVersion !== seed.seedVersion) {
            exists.set({
              title: seed.title,
              desc: seed.desc,
              period: seed.period,
              yearText: seed.yearText,
              paragraphs: seed.paragraphs,
              listTitle: seed.listTitle,
              points: seed.points,
              order: seed.order,
              seedVersion: seed.seedVersion,
            });
            await exists.save();
            console.log(`Events: refreshed "${seed.seedKey}" to seed v${seed.seedVersion}`);
            continue;
          }

          // Fill in anything added after the record was first seeded, without
          // touching fields the admin has since edited.
          const missing = {};
          for (const key of ['period', 'yearText', 'paragraphs', 'listTitle', 'points']) {
            const current = exists.get(key);
            const empty =
              current == null ||
              (typeof current === 'string' && !current.trim()) ||
              (Array.isArray(current) && current.length === 0) ||
              (current && typeof current === 'object' && !Array.isArray(current) &&
                !Object.values(current).some((v) => (typeof v === 'string' ? v.trim() : v)));
            if (empty && seed[key] != null) missing[key] = seed[key];
          }
          // `order` is a plain number, so 0 and undefined both count as unset.
          if (!exists.get('order') && seed.order) missing.order = seed.order;

          if (Object.keys(missing).length > 0) {
            exists.set(missing);
            await exists.save();
          }
        }
      } catch (error) {
        console.error('Seed events error:', error.message);
        // allow a retry on the next request
        seedPromise = null;
      }
    })();
  }
  return seedPromise;
};

// @desc    Get all events
// @route   GET /api/events
// @access  Public
exports.getAllEvents = async (req, res) => {
  try {
    await exports.ensureSeedEvents();
    const events = await Event.find().sort({ order: 1, date: 1 });
    res.json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    console.error('Get all events error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get the events the admin placed on the home page (max 4, slot order)
// @route   GET /api/events/home
// @access  Public
exports.getHomeEvents = async (req, res) => {
  try {
    await exports.ensureSeedEvents();
    // Sorted by slot, so the response order IS the 1/2/3/4 order shown.
    const events = await Event.find({ homeSlot: { $gte: 1, $lte: HOME_SLOT_MAX } })
      .sort({ homeSlot: 1, date: 1 })
      .limit(HOME_SLOT_MAX);
    res.json(events);
  } catch (error) {
    console.error('Get home events error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get upcoming events
// @route   GET /api/events/upcoming
// @access  Public
exports.getUpcomingEvents = async (req, res) => {
  try {
    await exports.ensureSeedEvents();
    const events = await Event.find({ upcoming: true })
      .sort({ date: 1 })
      .limit(6);
    res.json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    console.error('Get upcoming events error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get past events
// @route   GET /api/events/past
// @access  Public
exports.getPastEvents = async (req, res) => {
  try {
    const events = await Event.find({ upcoming: false })
      .sort({ date: -1 })
      .limit(10);
    res.json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    console.error('Get past events error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get event by ID
// @route   GET /api/events/:id
// @access  Public
exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json({
      success: true,
      data: event,
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Upload event photo (admin only)
// @route   POST /api/admin/upload/event
// @access  Private/Admin
exports.uploadEventPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No image uploaded' 
      });
    }

    // Validate file type
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file (JPG, PNG, WEBP)'
      });
    }

    // Validate file size (max 5MB)
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'Image must be less than 5MB'
      });
    }

    // Get the URL from Cloudinary or local storage
    let photoUrl = req.file.path;
    
    // If using local storage (multer diskStorage)
    if (!photoUrl && req.file.filename) {
      photoUrl = `/uploads/events/${req.file.filename}`;
    }

    res.json({
      success: true,
      url: photoUrl,
      message: 'Photo uploaded successfully'
    });
  } catch (error) {
    console.error('Upload event photo error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
};

// @desc    Create event with photo (admin only)
// @route   POST /api/events
// @access  Private/Admin
exports.createEvent = async (req, res) => {
  try {
    let eventData = { ...req.body };
    
    // Handle photo if uploaded
    if (req.file) {
      eventData.photo = req.file.path || `/uploads/events/${req.file.filename}`;
    }
    
    eventData.homeSlot = normalizeHomeSlot(eventData.homeSlot);
    
    // Initialize default values
    eventData.interestedCount = 0;
    eventData.views = 0;
    eventData.shareCount = 0;
    eventData.interestedBy = [];

    const event = await Event.create(eventData);
    
    // E-mail the subscribers who ticked "events" (queued and sent in the background, one mailing per event;
    // the admin can switch automatic event mails off in Admin -> Subscribers & mail, or skip one with
    // notifySubscribers: false in the request). Never holds up or breaks saving the event.
    if (req.body.notifySubscribers !== false && req.body.notifySubscribers !== 'false') {
      announceEvent(event, { createdBy: req.user && req.user._id }).catch((notifyError) => {
        console.error('Event subscriber notification error:', notifyError.message);
      });
    }

    res.status(201).json({
      success: true,
      data: event,
      message: 'Event created successfully',
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update event with photo (admin only)
// @route   PUT /api/events/:id
// @access  Private/Admin
exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    
    // Handle photo if uploaded
    if (req.file) {
      updateData.photo = req.file.path || `/uploads/events/${req.file.filename}`;
    }
    
    if ('homeSlot' in updateData) {
      updateData.homeSlot = normalizeHomeSlot(updateData.homeSlot);
    }
    
    const event = await Event.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json({
      success: true,
      data: event,
      message: 'Event updated successfully',
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete event (admin only)
// @route   DELETE /api/events/:id
// @access  Private/Admin
exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findByIdAndDelete(id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get popular events
// @route   GET /api/events/popular
// @access  Public
exports.getPopularEvents = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const events = await Event.find({ upcoming: true })
      .sort({ interestedCount: -1, views: -1 })
      .limit(limit);
    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error('Get popular events error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Track event view
// @route   POST /api/events/:id/view
// @access  Public
exports.trackEventView = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    event.views = (event.views || 0) + 1;
    await event.save();
    res.json({ success: true, views: event.views });
  } catch (error) {
    console.error('Track view error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Track event share
// @route   POST /api/events/:id/share
// @access  Public
exports.trackEventShare = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    event.shareCount = (event.shareCount || 0) + 1;
    await event.save();
    res.json({ success: true, shareCount: event.shareCount });
  } catch (error) {
    console.error('Track share error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark event as interested
// @route   POST /api/events/:id/interested
// @access  Private
exports.markInterested = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    if (!event.interestedBy) event.interestedBy = [];
    
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
};

// @desc    Remove interest from event
// @route   POST /api/events/:id/uninterested
// @access  Private
exports.unmarkInterested = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    if (!event.interestedBy) event.interestedBy = [];
    
    event.interestedBy = event.interestedBy.filter(id => id.toString() !== req.user.id);
    event.interestedCount = Math.max(0, (event.interestedCount || 0) - 1);
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
};

// @desc    Get user's interested events
// @route   GET /api/events/interested
// @access  Private
exports.getInterestedEvents = async (req, res) => {
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
};

// @desc    Get event engagement stats (admin only)
// @route   GET /api/events/stats/engagement
// @access  Private/Admin
exports.getEngagementStats = async (req, res) => {
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
};

// @desc    Get all interested users for an event (admin only)
// @route   GET /api/events/:id/interested-users
// @access  Private/Admin
exports.getInterestedUsers = async (req, res) => {
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
};