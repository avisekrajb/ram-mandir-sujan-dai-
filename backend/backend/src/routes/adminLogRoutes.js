const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const admin = require('../middleware/admin');
const requireSuperAdmin = require('../middleware/superadmin');
const {
  getAdminActivity,
  addAdminLog,
  clearAdminLogs,
  deleteAdminLog,
  getAdminLogStats,
} = require('../controllers/adminController');

// Route order matters: `/:id` would otherwise swallow `/stats` and try to
// delete a log whose id is the string "stats".

// @desc    Get admin activity stats
// @route   GET /api/admin/activity/stats
// @access  Private/Admin
router.get('/stats', protect, admin, getAdminLogStats);

// @desc    Get admin activity logs (latest only, newest first)
// @route   GET /api/admin/activity
// @access  Private/Admin
router.get('/', protect, admin, getAdminActivity);

// @desc    Add admin activity log
// @route   POST /api/admin/activity/log
// @access  Private/Admin
router.post('/log', protect, admin, requireSuperAdmin, addAdminLog);

// @desc    Clear admin activity logs
// @route   DELETE /api/admin/activity
// @access  Private/Admin
router.delete('/', protect, admin, requireSuperAdmin, clearAdminLogs);

// @desc    Delete a single admin activity log
// @route   DELETE /api/admin/activity/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, requireSuperAdmin, deleteAdminLog);

module.exports = router;
