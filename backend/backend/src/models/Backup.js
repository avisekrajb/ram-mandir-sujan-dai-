const mongoose = require('mongoose');

const backupSchema = new mongoose.Schema({
  // Backup metadata
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    enum: ['full', 'partial', 'auto'],
    default: 'full',
  },
  
  // Backup content
  data: {
    type: Object,
    default: {},
  },
  
  // Cloudinary URL
  fileUrl: {
    type: String,
    default: '',
  },
  fileId: {
    type: String,
    default: '',
  },
  
  // File size in bytes
  fileSize: {
    type: Number,
    default: 0,
  },
  
  // Statistics
  stats: {
    users: { type: Number, default: 0 },
    bookings: { type: Number, default: 0 },
    donations: { type: Number, default: 0 },
    events: { type: Number, default: 0 },
    gallery: { type: Number, default: 0 },
    history: { type: Number, default: 0 },
    team: { type: Number, default: 0 },
    contacts: { type: Number, default: 0 },
    visitors: { type: Number, default: 0 },
    blogs: { type: Number, default: 0 },
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  
  // Created by
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdByName: {
    type: String,
    default: '',
  },
  
  // Deletion info (for deleted items backup)
  deletedItems: {
    type: [{
      collection: { type: String },
      itemId: { type: String },
      data: { type: Object },
      deletedAt: { type: Date, default: Date.now },
      deletedBy: { type: String },
    }],
    default: [],
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  },
});

// Index for TTL (automatic deletion after 30 days)
backupSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Backup', backupSchema);