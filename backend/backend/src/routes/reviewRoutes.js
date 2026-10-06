const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Review = require('../models/Review');
const protect = require('../middleware/auth');
const admin = require('../middleware/admin');
const { requireArea } = require('../middleware/permissions');
const rateLimit = require('../middleware/rateLimit');
const { parsePagination } = require('../utils/listLimits');
const { checkFields, REASON_MESSAGES } = require('../utils/messageFilter');
const { createNotification } = require('../controllers/notificationController');

const STATUSES = ['pending', 'approved', 'hidden'];
const DAY_MS = 24 * 60 * 60 * 1000;

// How many reviews the admin moderation queue lists (newest first).
const ADMIN_REVIEW_LIMIT = 50;

// Every attempt counts, including ones the filter turns away. A person rarely
// leaves more than a review or two; this stops floods without blocking retries.
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many reviews from this connection. Please try again later.',
});

// ============================================
// PUBLIC ROUTES
// ============================================

// @desc    Approved reviews + average rating
// @route   GET /api/reviews
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { limit } = parsePagination(req.query, { defaultLimit: 30, maxLimit: 100 });

    const [items, agg] = await Promise.all([
      Review.find({ status: 'approved' })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('name rating comment createdAt')
        .lean(),
      Review.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: null, count: { $sum: 1 }, average: { $avg: '$rating' } } },
      ]),
    ]);

    const summary = agg[0]
      ? { count: agg[0].count, average: Math.round(agg[0].average * 10) / 10 }
      : { count: 0, average: 0 };

    res.json({ success: true, data: items, summary });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Submit a review (held for approval)
// @route   POST /api/reviews
// @access  Public
router.post('/', submitLimiter, async (req, res) => {
  try {
    const { name, rating, comment, hp_field: honeypot } = req.body || {};

    // Hidden field only bots fill in: pretend it worked, store nothing.
    if (honeypot) {
      return res.status(201).json({ success: true, message: 'Review received' });
    }

    if (typeof name !== 'string' || typeof comment !== 'string') {
      return res.status(400).json({ success: false, message: 'Name, rating and review are required' });
    }
    const cleanName = name.trim();
    const cleanComment = comment.trim();
    const stars = Number(rating);

    if (cleanName.length < 2 || cleanName.length > 60) {
      return res.status(400).json({ success: false, field: 'name', message: 'Name must be 2 to 60 characters' });
    }
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      return res.status(400).json({ success: false, field: 'rating', message: 'Please choose a rating from 1 to 5' });
    }
    if (cleanComment.length < 5 || cleanComment.length > 600) {
      return res.status(400).json({ success: false, field: 'comment', message: 'Review must be 5 to 600 characters' });
    }

    const verdict = checkFields({ name: cleanName, comment: cleanComment });
    if (!verdict.ok) {
      return res.status(400).json({
        success: false,
        code: 'content_rejected',
        field: verdict.field,
        reason: verdict.reason,
        message: REASON_MESSAGES[verdict.reason],
      });
    }

    // Same person pressing Send twice
    const duplicate = await Review.exists({
      name: cleanName,
      comment: cleanComment,
      createdAt: { $gte: new Date(Date.now() - DAY_MS) },
    });
    if (duplicate) {
      return res.status(409).json({ success: false, code: 'duplicate', message: 'You have already sent this review.' });
    }

    const review = await Review.create({ name: cleanName, rating: stars, comment: cleanComment, status: 'pending' });

    createNotification(
      'system',
      'New review awaiting approval',
      `${cleanName} left a ${stars}-star review: "${cleanComment.substring(0, 60)}${cleanComment.length > 60 ? '...' : ''}"`,
      { id: review._id, name: cleanName, rating: stars, status: review.status, createdAt: review.createdAt }
    );

    res.status(201).json({ success: true, message: 'Review received' });
  } catch (error) {
    console.error('Submit review error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// ADMIN ROUTES
// ============================================

// @desc    All reviews with counts per status
// @route   GET /api/reviews/admin/all
// @access  Private/Admin
router.get('/admin/all', protect, admin, requireArea('contact'), async (req, res) => {
  try {
    const { status } = req.query;
    const query = STATUSES.includes(status) ? { status } : {};

    // The moderation queue shows the newest ADMIN_REVIEW_LIMIT reviews only, the
    // same cap as the audit log. The counts are still totals for every review, so
    // the tab numbers do not silently change when the list is trimmed.
    const [items, grouped] = await Promise.all([
      Review.find(query).sort({ createdAt: -1 }).limit(ADMIN_REVIEW_LIMIT).lean(),
      Review.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    ]);

    const counts = { pending: 0, approved: 0, hidden: 0 };
    grouped.forEach((g) => { if (g._id in counts) counts[g._id] = g.n; });
    counts.total = counts.pending + counts.approved + counts.hidden;

    res.json({ success: true, data: items, counts });
  } catch (error) {
    console.error('Admin get reviews error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Approve / hide / return to pending
// @route   PATCH /api/reviews/:id/status
// @access  Private/Admin
router.patch('/:id/status', protect, admin, requireArea('contact'), async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!mongoose.isValidObjectId(req.params.id) || !STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid review or status' });
    }
    const review = await Review.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    res.json({ success: true, data: review });
  } catch (error) {
    console.error('Update review status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, requireArea('contact'), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid review' });
    }
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    res.json({ success: true, message: 'Review deleted' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
