const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  // Session ID for tracking unique visitors
  sessionId: {
    type: String,
    required: true,
    index: true,
  },
  // IP Address
  ipAddress: {
    type: String,
    required: true,
  },
  // User ID if logged in
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  // User name if logged in
  userName: {
    type: String,
    default: '',
  },
  // Page visited
  page: {
    type: String,
    required: true,
  },
  // Page title
  pageTitle: {
    type: String,
    default: '',
  },
  // Referrer
  referrer: {
    type: String,
    default: '',
  },
  // User Agent
  userAgent: {
    type: String,
    default: '',
  },
  // Device type
  deviceType: {
    type: String,
    enum: ['desktop', 'tablet', 'mobile', 'unknown'],
    default: 'unknown',
  },
  // Browser
  browser: {
    type: String,
    default: '',
  },
  // OS
  os: {
    type: String,
    default: '',
  },
  // Location data
  location: {
    country: { type: String, default: '' },
    city: { type: String, default: '' },
    region: { type: String, default: '' },
    latitude: { type: Number, default: 0 },
    longitude: { type: Number, default: 0 },
    timezone: { type: String, default: '' },
    isp: { type: String, default: '' },
  },
  // Time spent on page (in seconds)
  timeSpent: {
    type: Number,
    default: 0,
  },
  // Whether visitor is new or returning
  isNewVisitor: {
    type: Boolean,
    default: true,
  },
  // Visit count for this session
  visitCount: {
    type: Number,
    default: 1,
  },
  // Date
  date: {
    type: Date,
    default: Date.now,
  },
  // Day (for aggregation)
  day: {
    type: String,
    default: () => new Date().toISOString().split('T')[0],
  },
  // Month (for aggregation)
  month: {
    type: String,
    default: () => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    },
  },
  // Year (for aggregation)
  year: {
    type: Number,
    default: () => new Date().getFullYear(),
  },
  // Duration (in seconds)
  duration: {
    type: Number,
    default: 0,
  },
  // Exit page
  exitPage: {
    type: String,
    default: '',
  },
  // Entry page
  entryPage: {
    type: String,
    default: '',
  },
});

// Indexes for faster queries
visitorSchema.index({ sessionId: 1, date: -1 });
visitorSchema.index({ ipAddress: 1, date: -1 });
visitorSchema.index({ page: 1, date: -1 });
visitorSchema.index({ day: 1 });
visitorSchema.index({ month: 1 });
visitorSchema.index({ year: 1 });
// "One network, one visit" counts run through these.
visitorSchema.index({ ipAddress: 1, day: 1 });
visitorSchema.index({ day: 1, ipAddress: 1 });

/**
 * Count distinct visitors by IP address.
 *
 * This is the authoritative visitor total. `sessionId` is a per-tab UUID, so
 * counting it would treat every refresh and every new tab as a separate
 * person. Counting distinct IPs per day means one device/network on one day
 * contributes exactly one visit no matter how many pages it loads.
 *
 * Limitation worth knowing: people sharing an office/home/mobile-carrier NAT
 * collapse into a single visitor, and a VPN or changing IP looks like a new
 * visitor. It is the standard tradeoff and needs no cookies or fingerprinting.
 */
visitorSchema.statics.distinctVisitorsByIp = async function (query = {}) {
  return this.distinct('ipAddress', query).then((ips) => ips.length);
};

module.exports = mongoose.model('Visitor', visitorSchema);