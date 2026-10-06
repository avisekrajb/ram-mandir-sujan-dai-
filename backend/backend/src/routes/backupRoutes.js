const express = require('express');
const router = express.Router();
const archiver = require('archiver');
const https = require('https');
const http = require('http');
const Backup = require('../models/Backup');
const protect = require('../middleware/auth');
const admin = require('../middleware/admin');
const { requireArea } = require('../middleware/permissions');
const requireSuperAdmin = require('../middleware/superadmin');
const cloudinary = require('../config/cloudinary');

// ============================================
// BACKUP ROUTES
// ============================================
// Every route below is super admin only, not merely an admin holding the
// "system" area. A backup is a copy of the whole site including its accounts and
// its uploaded media: it is downloadable, and it can be restored over the live
// data. Handing that to a content admin would give them a way to read and roll
// back everything, so the area check stays as a second line and not as the gate.

const superOnly = [protect, admin, requireArea('system'), requireSuperAdmin];

// @desc    Create backup
// @route   POST /api/admin/backup/create
// @access  Private/SuperAdmin
router.post('/create', ...superOnly, async (req, res) => {
  try {
    const { description, type, includeDeleted, sections } = req.body;

    // Which data sections to include (empty => full backup with everything)
    const requestedSections = Array.isArray(sections) && sections.length > 0
      ? sections
      : Object.keys(COLLECTORS);

    const backupData = {};
    for (const key of requestedSections) {
      if (!COLLECTORS[key]) continue;
      try {
        backupData[key] = await COLLECTORS[key]();
      } catch (collectError) {
        console.error(`Collect ${key} error:`, collectError);
        backupData[key] = [];
      }
    }

    // Settings single-document is always captured (restore depends on it)
    backupData.settings = await collectSettings();

    // Collect deleted items (last 30 days)
    let deletedItems = [];
    if (includeDeleted !== false) {
      deletedItems = await collectDeletedItems();
    }

    const resolvedType = type === 'partial' && requestedSections.length < Object.keys(COLLECTORS).length
      ? 'partial'
      : (type || 'full');

    // Create backup document
    const backup = await Backup.create({
      name: `Backup-${new Date().toISOString().split('T')[0]}`,
      description: description || (resolvedType === 'partial' ? 'Partial system backup' : 'Full system backup'),
      type: resolvedType,
      data: backupData,
      stats: Object.keys(backupData).reduce((acc, key) => {
        const value = backupData[key];
        acc[key] = Array.isArray(value) ? value.length : 1;
        return acc;
      }, {}),
      deletedItems: deletedItems,
      createdBy: req.user.id,
      createdByName: req.user.name || 'Admin',
      status: 'completed',
    });

    // Upload to Cloudinary as backup file
    try {
      const backupJson = JSON.stringify(backupData, null, 2);
      const buffer = Buffer.from(backupJson, 'utf-8');
      
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'temple-backups',
            resource_type: 'raw',
            type: 'authenticated',
            public_id: `backup-${backup._id}`,
            format: 'json',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(buffer);
      });

      backup.fileUrl = result.secure_url;
      backup.fileId = result.public_id;
      backup.fileSize = result.bytes;
      await backup.save();
    } catch (cloudinaryError) {
      console.error('Cloudinary upload error:', cloudinaryError);
      // Continue even if Cloudinary fails
    }

    res.json({
      success: true,
      message: 'Backup created successfully',
      data: backup,
    });
  } catch (error) {
    console.error('Create backup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get all backups
// @route   GET /api/admin/backup
// @access  Private/Admin
router.get('/', ...superOnly, async (req, res) => {
  try {
    const backups = await Backup.find()
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email');
    res.json({
      success: true,
      data: backups,
    });
  } catch (error) {
    console.error('Get backups error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Download backup (ZIP with JSON data + media files)
// @route   GET /api/admin/backup/:id/download
// @access  Private/Admin
router.get('/:id/download', ...superOnly, async (req, res) => {
  try {
    const backup = await Backup.findById(req.params.id);
    if (!backup) {
      return res.status(404).json({ message: 'Backup not found' });
    }

    // If no media available, fall back to a single JSON download
    const mediaUrls = collectMediaUrls(backup.data);
    if (mediaUrls.length === 0) {
      const backupJson = JSON.stringify(backup.data, null, 2);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=backup-${backup._id}.json`);
      return res.send(backupJson);
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=backup-${backup._id}.zip`);

    const archive = new archiver.ZipArchive();
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) res.status(500);
      res.end();
    });

    archive.pipe(res);

    // 1. Include the JSON data file
    const backupJson = JSON.stringify(backup.data, null, 2);
    archive.append(backupJson, { name: 'backup.json' });

    // 2. Download and include each media file (photos/videos)
    const seen = new Set();
    let addedCount = 0;
    for (const url of mediaUrls) {
      if (seen.has(url)) continue;
      seen.add(url);

      const filename = mediaFilename(url);
      if (!filename) continue;

      try {
        const dataBuffer = await fetchBuffer(url);
        archive.append(dataBuffer, { name: `media/${filename}` });
        addedCount += 1;
      } catch (fetchError) {
        console.error(`Could not fetch media ${url}:`, fetchError.message);
      }
    }

    console.log(`Backup ${backup._id}: added ${addedCount} media files`);

    archive.finalize();
  } catch (error) {
    console.error('Download backup error:', error);
    if (!res.headersSent) res.status(500).json({ message: 'Server error' });
    else res.end();
  }
});

// @desc    Get Cloudinary backup URL
// @route   GET /api/admin/backup/:id/cloudinary
// @access  Private/Admin
router.get('/:id/cloudinary', ...superOnly, async (req, res) => {
  try {
    const backup = await Backup.findById(req.params.id);
    if (!backup) {
      return res.status(404).json({ message: 'Backup not found' });
    }

    if (!backup.fileUrl) {
      return res.status(404).json({ message: 'No file uploaded to Cloudinary' });
    }

    // Backups are stored privately; hand out a short-lived signed link. Older
    // backups uploaded before this change are still public and keep their URL.
    let fileUrl = backup.fileUrl;
    if (backup.fileId && /\/authenticated\//.test(backup.fileUrl)) {
      fileUrl = cloudinary.utils.private_download_url(backup.fileId, 'json', {
        resource_type: 'raw',
        type: 'authenticated',
        expires_at: Math.floor(Date.now() / 1000) + 10 * 60,
      });
    }

    res.json({
      success: true,
      fileUrl,
    });
  } catch (error) {
    console.error('Get Cloudinary URL error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Restore from backup
// @route   POST /api/admin/backup/:id/restore
// @access  Private/Admin
router.post('/:id/restore', ...superOnly, async (req, res) => {
  try {
    const backup = await Backup.findById(req.params.id);
    if (!backup) {
      return res.status(404).json({ message: 'Backup not found' });
    }

    const data = backup.data || {};
    // User accounts are never restored: backups omit password hashes, so a
    // wipe-and-reinsert would either fail validation half-way or lock everyone
    // out. Accounts are managed live instead.
    const MODEL_MAP = {
      bookings: () => require('../models/Booking'),
      donations: () => require('../models/Donation'),
      events: () => require('../models/Event'),
      gallery: () => require('../models/Gallery'),
      history: () => require('../models/History'),
      team: () => require('../models/Team'),
      contacts: () => require('../models/Contact'),
      blogs: () => require('../models/Blog'),
    };

    // Validate every section first so a bad document can't leave a
    // collection half-wiped after deleteMany has already run.
    const plan = [];
    for (const key of Object.keys(MODEL_MAP)) {
      if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
      const list = data[key];
      if (!Array.isArray(list)) continue;

      const Model = MODEL_MAP[key]();
      const docs = list.map(item => {
        const { __v, ...rest } = item || {};
        return rest;
      });
      for (const doc of docs) {
        const err = new Model(doc).validateSync();
        if (err) {
          return res.status(400).json({
            success: false,
            message: `Backup section "${key}" is invalid; nothing was restored (${err.message})`,
          });
        }
      }
      plan.push({ Model, docs });
    }

    for (const { Model, docs } of plan) {
      await Model.deleteMany({});
      if (docs.length > 0) {
        await Model.insertMany(docs);
      }
    }

    // Restore settings if present
    if (data.settings && data.settings._id) {
      const AdminSettings = require('../models/AdminSettings');
      const current = await AdminSettings.getSettings();
      const { _id, __v, ...rest } = data.settings;
      Object.assign(current, rest);
      current.updatedAt = Date.now();
      await current.save();
    }

    res.json({
      success: true,
      message: 'Backup restored successfully',
    });
  } catch (error) {
    console.error('Restore backup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Delete backup
// @route   DELETE /api/admin/backup/:id
// @access  Private/Admin
router.delete('/:id', ...superOnly, async (req, res) => {
  try {
    const backup = await Backup.findById(req.params.id);
    if (!backup) {
      return res.status(404).json({ message: 'Backup not found' });
    }

    // Delete from Cloudinary
    if (backup.fileId) {
      try {
        const type = /\/authenticated\//.test(backup.fileUrl || '') ? 'authenticated' : 'upload';
        await cloudinary.uploader.destroy(backup.fileId, { resource_type: 'raw', type });
      } catch (cloudinaryError) {
        console.error('Cloudinary delete error:', cloudinaryError);
      }
    }

    await backup.deleteOne();
    res.json({
      success: true,
      message: 'Backup deleted successfully',
    });
  } catch (error) {
    console.error('Delete backup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get backup stats
// @route   GET /api/admin/backup/stats
// @access  Private/Admin
router.get('/stats', ...superOnly, async (req, res) => {
  try {
    const total = await Backup.countDocuments();
    const recent = await Backup.find()
      .sort({ createdAt: -1 })
      .limit(1);
    
    const totalSize = await Backup.aggregate([
      { $group: { _id: null, total: { $sum: '$fileSize' } } }
    ]);

    res.json({
      success: true,
      data: {
        total,
        recent: recent[0] || null,
        totalSize: totalSize[0]?.total || 0,
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

const COLLECTORS = {
  users: async () => {
    const User = require('../models/User');
    // Backup documents are stored raw (the model's toJSON does not run), so leave
    // out everything that must never leave the server: password hash, reset
    // token / OTP hash and attempts, session cut-off and the sign-in address.
    return await User.find().select('-password -resetPasswordToken -resetPasswordExpire -resetOtpAttempts -tokensValidAfter -lastLoginIp');
  },
  bookings: async () => {
    const Booking = require('../models/Booking');
    return await Booking.find();
  },
  donations: async () => {
    const Donation = require('../models/Donation');
    return await Donation.find();
  },
  events: async () => {
    const Event = require('../models/Event');
    return await Event.find();
  },
  gallery: async () => {
    const Gallery = require('../models/Gallery');
    return await Gallery.find();
  },
  history: async () => {
    const History = require('../models/History');
    return await History.find();
  },
  team: async () => {
    const Team = require('../models/Team');
    return await Team.find();
  },
  contacts: async () => {
    const Contact = require('../models/Contact');
    return await Contact.find();
  },
  visitors: async () => {
    const Visitor = require('../models/Visitor');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return await Visitor.find({ createdAt: { $gte: thirtyDaysAgo } });
  },
  blogs: async () => {
    const Blog = require('../models/Blog');
    return await Blog.find();
  },
};

async function collectSettings() {
  const AdminSettings = require('../models/AdminSettings');
  return await AdminSettings.getSettings();
}

async function collectDeletedItems() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // This would need to track deleted items in a separate collection
  // For now, return an empty array
  return [];
}

// ============================================
// ZIP / MEDIA HELPERS
// ============================================

// Recursively find Cloudinary media URLs inside a backup data object.
// Handles both plain url/photo fields and { en, ne, hi, zh, ta } localized objects.
function collectMediaUrls(obj, result = new Set()) {
  if (!obj || typeof obj !== 'object') return result;

  if (typeof obj === 'string') {
    if (isMediaUrl(obj)) result.add(obj);
    return result;
  }

  // A single localization object like { en, ne, hi, zh, ta } - collect any image urls
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === 'string') {
      if (isMediaUrl(val)) result.add(val);
    } else if (Array.isArray(val)) {
      for (const item of val) collectMediaUrls(item, result);
    } else if (val && typeof val === 'object') {
      collectMediaUrls(val, result);
    }
  }
  return result;
}

// Only the temple's own Cloudinary media is fetched into a backup. The stored data contains strings
// typed by visitors (donation screenshot links, profile photo links ...); fetching "any image URL"
// would make the server request internal addresses or arbitrary hosts for them (SSRF).
function isMediaUrl(str) {
  if (typeof str !== 'string' || str.length > 2048) return false;
  try {
    const u = new URL(str);
    if (u.protocol !== 'https:' || u.hostname.toLowerCase() !== 'res.cloudinary.com' || u.username || u.password) return false;
    const cloud = process.env.CLOUDINARY_CLOUD_NAME;
    return !cloud || u.pathname.startsWith(`/${cloud}/`);
  } catch {
    return false;
  }
}

// Build a safe filename from a media URL using its Cloudinary public id (or last path segment).
function mediaFilename(url) {
  try {
    const u = new URL(url);
    // Cloudinary URLs look like: .../image/upload/v123/abc123def.jpg
    const segments = u.pathname.split('/').filter(Boolean);
    let fileName = segments[segments.length - 1] || '';
    if (!fileName) return '';
    // Keep only a-z0-9._- to avoid path traversal / invalid chars
    fileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    if (fileName.length > 100) {
      const ext = fileName.slice(fileName.lastIndexOf('.'));
      fileName = fileName.slice(0, 90) + ext;
    }
    return fileName;
  } catch {
    return '';
  }
}

// Download a URL into a Buffer (follows redirects, respects size cap).
function fetchBuffer(url, maxBytes = 50 * 1024 * 1024, hops = 0) {
  return new Promise((resolve, reject) => {
    // Every hop (the first request and each redirect) must still be the temple's Cloudinary media.
    if (!isMediaUrl(url)) return reject(new Error('Not a Cloudinary media address'));
    const client = https;

    const req = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        if (hops >= 3) return reject(new Error('Too many redirects'));
        // Follow redirect
        const next = new URL(res.headers.location, url).toString();
        return fetchBuffer(next, maxBytes, hops + 1).then(resolve).catch(reject);
      }

      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }

      const chunks = [];
      let total = 0;
      res.on('data', (chunk) => {
        total += chunk.length;
        if (total > maxBytes) {
          req.destroy();
          return reject(new Error('Media file too large to backup'));
        }
        chunks.push(chunk);
      });
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Media download timed out'));
    });
  });
}

module.exports = router;