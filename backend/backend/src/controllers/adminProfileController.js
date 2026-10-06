const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AdminLog = require('../models/AdminLog');
const cloudinary = require('../config/cloudinary');
const { logAdminActivity } = require('./adminController');
const { passwordProblem } = require('../utils/passwordPolicy');

// Same token shape as authController.generateToken.
const issueToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '30d' });

// ============ ADMIN PROFILE CONTROLLERS ============

// @desc    Get admin profile, sign-in details and own recent activity
// @route   GET /api/admin/profile
// @access  Private/Admin
exports.getAdminProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const recentActivity = await AdminLog.find({ adminId: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('action details createdAt')
      .lean();
    res.json({
      success: true,
      data: user,
      security: {
        lastLoginAt: user.lastLoginAt || null,
        lastLoginIp: user.lastLoginIp || '',
        loginCount: user.loginCount || 0,
        mustChangePassword: !!user.mustChangePassword,
        isGoogleUser: !!user.isGoogleUser,
        permissions: user.role === 'admin' && Array.isArray(user.permissions) ? user.permissions : null,
        createdAt: user.createdAt,
      },
      recentActivity: recentActivity.map((a) => ({
        _id: a._id,
        action: a.action,
        at: a.createdAt,
        details: a.details || {},
      })),
    });
  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update admin profile (name, phone, address)
// @route   PUT /api/admin/profile
// @access  Private/Admin
exports.updateAdminProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (trimmed.length < 2 || trimmed.length > 50) {
        return res.status(400).json({ success: false, message: 'Name must be 2 to 50 characters' });
      }
      user.name = trimmed;
    }
    // Strings are accepted even when empty so a phone number or address can be cleared.
    if (typeof phone === 'string') user.phone = phone.trim().slice(0, 30);
    if (typeof address === 'string') user.address = address.trim().slice(0, 200);

    await user.save();

    logAdminActivity(req.user.id, 'Profile Updated', { name: user.name });

    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        profilePhoto: user.profilePhoto,
        role: user.role
      },
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update admin profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Upload admin profile photo
// @route   POST /api/admin/profile/photo
// @access  Private/Admin
exports.uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No image uploaded' 
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Delete old profile photo from cloudinary if exists
    if (user.profilePhoto) {
      try {
        const urlParts = user.profilePhoto.split('/');
        const publicId = `${urlParts[urlParts.length - 2]}/${urlParts[urlParts.length - 1].split('.')[0]}`;
        await cloudinary.uploader.destroy(publicId);
        console.log('Old profile photo deleted successfully');
      } catch (error) {
        console.log('Old profile photo deletion skipped:', error.message);
      }
    }

    // Update user with new photo URL
    user.profilePhoto = req.file.path;
    await user.save();

    // Log admin activity (if function exists)
    if (req.app && req.app.locals && req.app.locals.logAdminActivity) {
      req.app.locals.logAdminActivity(req.user.id, 'Profile Photo Updated', { 
        url: req.file.path 
      });
    }

    res.json({
      success: true,
      data: {
        profilePhoto: user.profilePhoto
      },
      message: 'Profile photo uploaded successfully'
    });
  } catch (error) {
    console.error('Upload profile photo error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
};

// @desc    Remove admin profile photo
// @route   DELETE /api/admin/profile/photo
// @access  Private/Admin
exports.removeProfilePhoto = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Delete photo from cloudinary if exists
    if (user.profilePhoto) {
      try {
        const urlParts = user.profilePhoto.split('/');
        const publicId = `${urlParts[urlParts.length - 2]}/${urlParts[urlParts.length - 1].split('.')[0]}`;
        await cloudinary.uploader.destroy(publicId);
        console.log('Profile photo deleted from cloudinary');
      } catch (error) {
        console.log('Cloudinary deletion skipped:', error.message);
      }
    }

    user.profilePhoto = null;
    await user.save();

    // Log admin activity (if function exists)
    if (req.app && req.app.locals && req.app.locals.logAdminActivity) {
      req.app.locals.logAdminActivity(req.user.id, 'Profile Photo Removed', {});
    }

    res.json({
      success: true,
      message: 'Profile photo removed successfully'
    });
  } catch (error) {
    console.error('Remove profile photo error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
};

// @desc    Change admin password
// @route   PUT /api/admin/profile/password
// @access  Private/Admin
exports.changeAdminPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (typeof currentPassword !== 'string' || !currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide current and new password' 
      });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters'
      });
    }
    if (newPassword.length > 128) {
      return res.status(400).json({ success: false, message: 'New password is too long' });
    }
    const passwordError = passwordProblem(newPassword);
    if (passwordError) {
      return res.status(400).json({ success: false, message: passwordError });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ success: false, message: 'Choose a password different from your current one' });
    }

    // Update password; every other device is signed out, this one gets a fresh token.
    user.password = newPassword;
    user.revokeSessions();
    await user.save();

    logAdminActivity(req.user.id, 'Password Changed', {});

    res.json({
      success: true,
      message: 'Password changed successfully',
      token: issueToken(user._id),
    });
  } catch (error) {
    console.error('Change admin password error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
};
// @desc    Sign out of every other device (this one stays signed in)
// @route   POST /api/admin/profile/revoke-sessions
// @access  Private/Admin
exports.revokeMySessions = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    user.revokeSessions();
    await user.save();
    logAdminActivity(req.user.id, 'Signed Out Everywhere', {});
    res.json({
      success: true,
      message: 'Signed out of every other device',
      token: issueToken(user._id),
    });
  } catch (error) {
    console.error('Revoke my sessions error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
