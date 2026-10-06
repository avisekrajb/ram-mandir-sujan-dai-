const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const admin = require('../middleware/admin');
const { requireArea } = require('../middleware/permissions');
const mongoose = require('mongoose');
const { hasArea } = require('../middleware/permissions');
const accountCtrl = require('../controllers/accountController');
const { profilePhotoUpload, userUploadLimiter } = require('../middleware/uploadUserImage');
const User = require('../models/User');
const cloudinary = require('../config/cloudinary');
const { passwordProblem } = require('../utils/passwordPolicy');
const rateLimit = require('../middleware/rateLimit');
const { MAX_LIST } = require('../utils/listLimits');
const { generateToken } = require('../controllers/authController');

// @desc    Get all users (admin only)
// @route   GET /api/users
// @access  Private/Admin
router.get('/', protect, admin, requireArea('users'), async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 }).limit(MAX_LIST);
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get user stats (bookings count, donations count)
// @route   GET /api/users/stats
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    // Import models dynamically to avoid circular dependency
    const Booking = require('../models/Booking');
    const Donation = require('../models/Donation');
    
    const [bookings, donations] = await Promise.all([
      Booking.countDocuments({ userId: req.user.id }),
      Donation.countDocuments({ userId: req.user.id }),
    ]);
    
    res.json({
      totalBookings: bookings,
      totalDonations: donations,
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Users may only read their own profile; admins with the "users" area may read any.
    const isSelf = String(req.user._id) === String(req.params.id);
    if (!isSelf && !(['admin', 'superadmin'].includes(req.user.role) && hasArea(req.user, 'users'))) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.name = name || user.name;
    user.phone = phone || user.phone;
    user.address = address || user.address;
    await user.save();
    
    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Upload profile photo
// @route   POST /api/users/upload-profile-photo
// @access  Private
router.post('/upload-profile-photo', protect, userUploadLimiter, profilePhotoUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete old profile photo from Cloudinary if exists
    if (user.profilePhoto) {
      try {
        const publicId = user.profilePhoto.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`profile/${publicId}`);
      } catch (error) {
        console.log('Old profile photo deletion skipped:', error.message);
      }
    }

    user.profilePhoto = req.file.path;
    await user.save();

    res.json({ url: req.file.path });
  } catch (error) {
    console.error('Upload profile photo error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Remove profile photo
// @route   DELETE /api/users/profile-photo
// @access  Private
router.delete('/profile-photo', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete from Cloudinary
    if (user.profilePhoto) {
      try {
        const publicId = user.profilePhoto.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`profile/${publicId}`);
      } catch (error) {
        console.log('Profile photo deletion skipped:', error.message);
      }
    }

    user.profilePhoto = null;
    await user.save();

    res.json({ success: true, message: 'Profile photo removed' });
  } catch (error) {
    console.error('Remove profile photo error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Change password
// @route   PUT /api/users/password
// @access  Private
// The current password is checked here, so a stolen login token must not be able to guess it freely.
const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many password change attempts. Please try again in 15 minutes.',
  keyGenerator: (req) => (req.user ? `pwchange:${req.user._id}` : null),
});

router.put('/password', protect, passwordChangeLimiter, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({ message: 'Current and new password are required' });
    }
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Everyone follows the same rule as sign-up and Admin → My account (8+ characters, no common ones).
    const passwordError = passwordProblem(newPassword, { email: user.email, name: user.name });
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    // Check current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    // Update password. Every other session of this account (a phone, a stolen token) ends; the
    // caller gets a fresh token so this device stays signed in.
    user.password = newPassword;
    user.revokeSessions();
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully',
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Delete user (admin only)
// @route   DELETE /api/users/:id
// @access  Private/Admin
// Same rules and audit entry as DELETE /api/admin/accounts/:id (never yourself,
// never a super admin, admins only by the super admin).
router.delete('/:id', protect, admin, requireArea('users'), accountCtrl.deleteAccount);

// @desc    Update user role (admin only)
// @route   PUT /api/users/:id/role
// @access  Private/Admin
// This used to run an unguarded findByIdAndUpdate, so any admin could grant
// admin to anyone or demote the super admin. It now shares the guarded handler
// (only the super admin changes admin access; a super admin is never touched).
router.put('/:id/role', protect, admin, requireArea('users'), accountCtrl.setRole);

module.exports = router;