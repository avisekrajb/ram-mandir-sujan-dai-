const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const admin = require('../middleware/admin');
const { requireArea } = require('../middleware/permissions');
const rateLimit = require('../middleware/rateLimit');
const {
  trackVisitor,
  getVisitorStats,
  updateTimeSpent,
  getVisitorDetails,
  getPublicVisitorCount,
  detectLanguage,
} = require('../controllers/visitorController');

// Public routes. Anyone can call these, so each has a per-address ceiling (a person browsing makes a
// handful of calls a minute); without it a script could fill the visitor table in minutes.
const writeLimiter = rateLimit({ windowMs: 60 * 1000, max: 120, message: 'Too many requests.' });
const readLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, message: 'Too many requests.' });

router.post('/track', writeLimiter, trackVisitor);
router.post('/time', writeLimiter, updateTimeSpent);
router.get('/count', readLimiter, getPublicVisitorCount);

// Country-based language suggestion, used on a visitor's first visit.
// Declared before `/:id` so "detect" is never read as a visitor id.
router.get('/detect', readLimiter, detectLanguage);

// Admin routes
router.get('/stats', protect, admin, requireArea('analytics'), getVisitorStats);
router.get('/:id', protect, admin, requireArea('analytics'), getVisitorDetails);

module.exports = router;