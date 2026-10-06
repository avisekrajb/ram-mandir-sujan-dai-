const mongoose = require('mongoose');
const AdminSettings = require('../models/AdminSettings');
const AdminLog = require('../models/AdminLog');

const db = () => mongoose.connection.db;

// The Atlas database is SHARED with unrelated applications. The database tools below only ever see
// and touch the collections of this app's own models, never anyone else's.
const ownCollections = () => new Set(mongoose.modelNames().map((n) => mongoose.model(n).collection.name));
const isOwnCollection = (name) => typeof name === 'string' && ownCollections().has(name);
// Fields that must never be shown, even to the super admin (hashes, reset codes, session cut-offs, IPs).
const HIDDEN_FIELDS = { password: 0, resetPasswordToken: 0, resetPasswordExpire: 0, resetOtpAttempts: 0, tokensValidAfter: 0, lastLoginIp: 0, codeHash: 0, unsubscribeToken: 0 };

// ============================================
// SUPER ADMIN DASHBOARD
// ============================================

// @desc    Get dashboard overview counts
// @route   GET /api/superadmin/dashboard
// @access  Private/SuperAdmin
exports.getDashboard = async (req, res) => {
  try {
    const User = require('../models/User');
    const Booking = require('../models/Booking');
    const Donation = require('../models/Donation');
    const Event = require('../models/Event');

    const [admins, bookings, donations, events, users, logCount] = await Promise.all([
      User.countDocuments({ role: { $in: ['admin', 'superadmin'] } }),
      Booking.countDocuments(),
      Donation.countDocuments(),
      Event.countDocuments(),
      User.countDocuments(),
      AdminLog.countDocuments(),
    ]);

    res.json({ success: true, data: { admins, bookings, donations, events, users, logs: logCount } });
  } catch (error) {
    console.error('Superadmin dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============================================
// ADMIN MANAGEMENT
// ============================================

// @desc    List all admins (and superadmin)
// @route   GET /api/superadmin/admins
// @access  Private/SuperAdmin
exports.getAdmins = async (req, res) => {
  try {
    const User = require('../models/User');
    const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: admins });
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create an admin
// @route   POST /api/superadmin/admins
// @access  Private/SuperAdmin
exports.createAdmin = async (req, res) => {
  try {
    const User = require('../models/User');
    const { name, email, password, phone, address } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }

    const admin = await User.create({
      name,
      email: normalizedEmail,
      password,
      phone: phone || '',
      address: address || '',
      role: 'admin',
      active: true,
      // Same as Admin → Admins & access: the new admin replaces the password
      // they were given at first sign-in. (Access areas default to everything;
      // narrow them from Admins & access.)
      mustChangePassword: true,
      createdBy: req.user._id,
    });

    await AdminLog.create({
      adminId: req.user.id,
      action: 'Admin Created',
      details: { email: normalizedEmail, name, targetName: name, targetEmail: normalizedEmail, access: 'full' },
      user: { id: req.user.id, name: req.user.name, email: req.user.email },
    });

    admin.password = undefined;
    res.status(201).json({ success: true, message: 'Admin created successfully', data: admin });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Enable / disable an admin
// @route   PUT /api/superadmin/admins/:id/status
// @access  Private/SuperAdmin
exports.setAdminStatus = async (req, res) => {
  try {
    const User = require('../models/User');
    const { active } = req.body;

    if (typeof active !== 'boolean') {
      return res.status(400).json({ message: 'active must be a boolean' });
    }

    const target = await User.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Never allow disabling a superadmin
    if (target.role === 'superadmin') {
      return res.status(400).json({ message: 'A super administrator cannot be disabled' });
    }

    if (target._id.toString() === req.user.id.toString()) {
      return res.status(400).json({ message: 'You cannot disable your own account' });
    }

    target.active = active;
    await target.save();

    await AdminLog.create({
      adminId: req.user.id,
      action: active ? 'Admin Enabled' : 'Admin Disabled',
      details: { email: target.email, name: target.name },
      user: { id: req.user.id, name: req.user.name, email: req.user.email },
    });

    res.json({ success: true, message: active ? 'Admin enabled' : 'Admin disabled', data: { _id: target._id, active } });
  } catch (error) {
    console.error('Set admin status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete an admin account
// @route   DELETE /api/superadmin/admins/:id
// @access  Private/SuperAdmin
exports.deleteAdmin = async (req, res) => {
  try {
    const User = require('../models/User');
    const target = await User.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    if (target.role === 'superadmin') {
      return res.status(400).json({ message: 'A super administrator cannot be deleted' });
    }
    if (target._id.toString() === req.user.id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    await target.deleteOne();

    await AdminLog.create({
      adminId: req.user.id,
      action: 'Admin Deleted',
      details: { email: target.email, name: target.name },
      user: { id: req.user.id, name: req.user.name, email: req.user.email },
    });

    res.json({ success: true, message: 'Admin deleted' });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============================================
// BOOKINGS & DONATIONS (manage all)
// ============================================

exports.getAllBookings = async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    const bookings = await Booking.find().sort({ createdAt: -1 }).populate('userId', 'name email');
    res.json({ success: true, data: bookings });
  } catch (error) {
    console.error('Superadmin bookings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    const { status } = req.body;
    const allowed = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: Date.now() },
      { new: true }
    );
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    await AdminLog.create({
      adminId: req.user.id,
      action: 'Booking Status Updated',
      details: { id: req.params.id, status },
      user: { id: req.user.id, name: req.user.name, email: req.user.email },
    });

    res.json({ success: true, data: booking });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllDonations = async (req, res) => {
  try {
    const Donation = require('../models/Donation');
    const donations = await Donation.find().sort({ date: -1 }).populate('userId', 'name email');
    res.json({ success: true, data: donations });
  } catch (error) {
    console.error('Superadmin donations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateDonationStatus = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    // Shared with the admin controller and /api/donations/:id/status, so a
    // super admin approving a donation bumps the counter and emails the donor
    // exactly like a regular admin does.
    const { updateDonationStatusById } = require('../services/donationStatusService');
    const { donation, changed, emailSent } = await updateDonationStatusById({
      id: req.params.id,
      status,
      rejectionReason,
      adminUser: req.user,
    });

    await AdminLog.create({
      adminId: req.user.id,
      action: 'Donation Status Updated',
      details: { id: req.params.id, status, changed },
      user: { id: req.user.id, name: req.user.name, email: req.user.email },
    });

    res.json({
      success: true,
      data: donation,
      message: changed
        ? `Donation status updated to ${status}${emailSent ? ' and the donor was notified' : ''}`
        : `Donation was already marked "${status}" — no change made`,
    });
  } catch (error) {
    console.error('Update donation status error:', error);
    res.status(error.statusCode || 500).json({ message: error.message || 'Server error' });
  }
};

// ============================================
// LANGUAGES
// ============================================

// @desc    Get enabled languages
// @route   GET /api/superadmin/languages
// @access  Private/SuperAdmin
exports.getLanguages = async (req, res) => {
  try {
    const settings = await AdminSettings.getSettings();
    const enabledLanguages = Array.isArray(settings.enabledLanguages) && settings.enabledLanguages.length > 0
      ? settings.enabledLanguages
      : ['en', 'ne', 'hi', 'zh', 'ta'];
    res.json({ success: true, data: enabledLanguages });
  } catch (error) {
    console.error('Get languages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Set enabled languages
// @route   PUT /api/superadmin/languages
// @access  Private/SuperAdmin
exports.setLanguages = async (req, res) => {
  try {
    const languages = req.body.languages;
    if (!Array.isArray(languages)) {
      return res.status(400).json({ message: 'languages must be an array of codes' });
    }
    const valid = ['en', 'ne', 'hi', 'zh', 'ta'];
    const cleaned = languages.filter((l) => valid.includes(l));
    const settings = await AdminSettings.getSettings();
    settings.enabledLanguages = cleaned;
    settings.updatedAt = Date.now();
    await settings.save();

    await AdminLog.create({
      adminId: req.user.id,
      action: 'Languages Updated',
      details: { enabledLanguages: cleaned },
      user: { id: req.user.id, name: req.user.name, email: req.user.email },
    });

    res.json({ success: true, data: cleaned, message: 'Languages updated' });
  } catch (error) {
    console.error('Set languages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============================================
// MAINTENANCE MODE
// ============================================

// @desc    Get maintenance mode status (public)
// @route   GET /api/maintenance
// @access  Public
exports.getPublicMaintenanceMode = async (req, res) => {
  try {
    const settings = await AdminSettings.getSettings();
    res.json({
      success: true,
      data: {
        enabled: !!(settings.maintenanceMode && settings.maintenanceMode.enabled),
        title: settings.maintenanceMode ? settings.maintenanceMode.title : {},
        message: settings.maintenanceMode ? settings.maintenanceMode.message : {},
      },
    });
  } catch (error) {
    console.error('Get maintenance mode error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get maintenance mode settings (super admin)
// @route   GET /api/superadmin/maintenance
// @access  Private/SuperAdmin
exports.getMaintenanceMode = async (req, res) => {
  try {
    const settings = await AdminSettings.getSettings();
    res.json({
      success: true,
      data: settings.maintenanceMode || { enabled: false },
    });
  } catch (error) {
    console.error('Get maintenance settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Set maintenance mode settings (super admin)
// @route   PUT /api/superadmin/maintenance
// @access  Private/SuperAdmin
exports.setMaintenanceMode = async (req, res) => {
  try {
    const { enabled, title, message } = req.body;
    const settings = await AdminSettings.getSettings();

    const current = settings.maintenanceMode || {};
    settings.maintenanceMode = {
      enabled: typeof enabled === 'boolean' ? enabled : !!(current.enabled),
      title: title || current.title || {},
      message: message || current.message || {},
    };
    settings.updatedAt = Date.now();
    await settings.save();

    await AdminLog.create({
      adminId: req.user.id,
      action: settings.maintenanceMode.enabled ? 'Maintenance Mode Enabled' : 'Maintenance Mode Disabled',
      details: { enabled: settings.maintenanceMode.enabled },
      user: { id: req.user.id, name: req.user.name, email: req.user.email },
    });

    res.json({ success: true, data: settings.maintenanceMode, message: 'Maintenance mode updated' });
  } catch (error) {
    console.error('Set maintenance mode error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============================================
// DATABASE STORAGE STATS
// ============================================

exports.getDbStats = async (req, res) => {
  try {
    const dbStats = await db().stats();
    const MB = (v) => Math.round(((v || 0) / (1024 * 1024)) * 100) / 100;

    const collectionNames = (await db().listCollections().toArray()).map((c) => c.name).filter(isOwnCollection);
    const collections = [];
    for (const cname of collectionNames) {
      try {
        const s = await db().command({ collStats: cname });
        collections.push({
          name: cname,
          count: s.count || 0,
          sizeMB: MB(s.dataSize ?? s.size),
          storageMB: MB(s.storageSize),
          indexMB: MB(s.totalIndexSize),
        });
      } catch (e) {
        /* skip */
      }
    }
    collections.sort((a, b) => b.sizeMB - a.sizeMB);

    res.json({
      success: true,
      data: {
        database: dbStats.db || 'unknown',
        dataSizeMB: MB(dbStats.dataSize),
        storageSizeMB: MB(dbStats.storageSize),
        indexSizeMB: MB(dbStats.indexSize),
        collections: collections,
      },
    });
  } catch (error) {
    console.error('DB stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    View records of a collection
// @route   GET /api/superadmin/db/:collection/records
// @access  Private/SuperAdmin
exports.getCollectionRecords = async (req, res) => {
  try {
    const name = req.params.collection;
    if (!isOwnCollection(name)) return res.status(404).json({ message: 'Collection not found' });
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const records = await db().collection(name).find({}, { projection: HIDDEN_FIELDS }).sort({ createdAt: -1 }).limit(limit).toArray();
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('Get records error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a record from a collection
// @route   DELETE /api/superadmin/db/:collection/:id
// @access  Private/SuperAdmin
exports.deleteDbRecord = async (req, res) => {
  try {
    const name = req.params.collection;
    const id = req.params.id;
    const { ObjectId } = require('mongoose').Types;
    if (!isOwnCollection(name)) return res.status(404).json({ message: 'Collection not found' });
    if (['users', 'adminsettings', 'adminlogs'].includes(name.toLowerCase())) {
      return res.status(400).json({ message: `Records of '${name}' cannot be deleted here` });
    }

    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
    const result = await db().collection(name).deleteOne(filter);
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Record not found' });
    }

    await AdminLog.create({
      adminId: req.user.id,
      action: 'DB Record Deleted',
      details: { collection: name, id },
      user: { id: req.user.id, name: req.user.name, email: req.user.email },
    });

    res.json({ success: true, message: 'Record deleted' });
  } catch (error) {
    console.error('Delete DB record error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Clear an entire collection (dangerous)
// @route   POST /api/superadmin/db/:collection/clear
// @access  Private/SuperAdmin
exports.clearCollection = async (req, res) => {
  try {
    const name = req.params.collection;
    if (!isOwnCollection(name)) return res.status(404).json({ message: 'Collection not found' });
    const PROTECTED = ['users', 'adminsettings', 'adminlogs'];
    if (PROTECTED.includes(name.toLowerCase()) || name.toLowerCase().startsWith('system.')) {
      return res.status(400).json({ message: `Collection '${name}' is protected and cannot be cleared` });
    }
    const result = await db().collection(name).deleteMany({});

    await AdminLog.create({
      adminId: req.user.id,
      action: 'DB Collection Cleared',
      details: { collection: name, deleted: result.deletedCount },
      user: { id: req.user.id, name: req.user.name, email: req.user.email },
    });

    res.json({ success: true, message: `Cleared ${result.deletedCount} records` });
  } catch (error) {
    console.error('Clear collection error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Drop/delete an entire collection (very dangerous)
// @route   DELETE /api/superadmin/db/:collection
// @access  Private/SuperAdmin
exports.deleteCollection = async (req, res) => {
  try {
    const name = req.params.collection;
    if (!isOwnCollection(name)) return res.status(404).json({ message: 'Collection not found' });
    const PROTECTED = ['users', 'adminsettings', 'adminlogs', 'admins'];
    if (PROTECTED.includes(name.toLowerCase()) || name.toLowerCase().startsWith('system.')) {
      return res.status(400).json({ message: `Collection '${name}' is protected and cannot be deleted` });
    }

    const names = (await db().listCollections().toArray()).map((c) => c.name);
    if (!names.includes(name)) {
      return res.status(404).json({ message: `Collection '${name}' not found` });
    }

    await db().collection(name).drop();

    await AdminLog.create({
      adminId: req.user.id,
      action: 'DB Collection Deleted',
      details: { collection: name },
      user: { id: req.user.id, name: req.user.name, email: req.user.email },
    });

    res.json({ success: true, message: `Collection '${name}' deleted` });
  } catch (error) {
    console.error('Delete collection error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
