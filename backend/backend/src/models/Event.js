const mongoose = require('mongoose');

const localizedStringSchema = new mongoose.Schema({
  en: { type: String, default: '' },
  ne: { type: String, default: '' },
  hi: { type: String, default: '' },
  zh: { type: String, default: '' },
  ta: { type: String, default: '' },
}, { _id: false });

const eventSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
  },
  photo: {
    type: String,
    default: null,
  },
  upcoming: {
    type: Boolean,
    default: true,
  },
  title: {
    en: { type: String, required: true },
    ne: { type: String, default: '' },
    hi: { type: String, default: '' },
    zh: { type: String, default: '' },
    ta: { type: String, default: '' },
  },
  desc: {
    en: { type: String, required: true },
    ne: { type: String, default: '' },
    hi: { type: String, default: '' },
    zh: { type: String, default: '' },
    ta: { type: String, default: '' },
  },
  dateNepali: {
    en: { type: String, default: '' },
    ne: { type: String, default: '' },
    hi: { type: String, default: '' },
    zh: { type: String, default: '' },
    ta: { type: String, default: '' },
  },
  // When this program recurs (e.g. "प्रत्येक शनिबार") rather than on one date
  period: {
    en: { type: String, default: '' },
    ne: { type: String, default: '' },
    hi: { type: String, default: '' },
    zh: { type: String, default: '' },
    ta: { type: String, default: '' },
  },
  // Reference year shown as a label. Free text, may be left blank.
  yearText: {
    type: String,
    default: '',
  },
  // Body paragraphs. Free-length list; older records stored { p1..p4 }.
  paragraphs: {
    type: mongoose.Schema.Types.Mixed,
    default: () => [],
  },
  // Optional heading above the bullet list
  listTitle: {
    en: { type: String, default: '' },
    ne: { type: String, default: '' },
    hi: { type: String, default: '' },
    zh: { type: String, default: '' },
    ta: { type: String, default: '' },
  },
  // Optional bullet points
  points: {
    type: [localizedStringSchema],
    default: () => [],
  },
  // Manual ordering for the events page
  order: {
    type: Number,
    default: 0,
  },
  // Home page placement, chosen in Admin -> Events.
  // 0 = not shown on the home page, 1-4 = the position it occupies there.
  // The same number is used on the events page so a position means one thing.
  homeSlot: {
    type: Number,
    default: 0,
  },
  // Marks an event that ships with the app, so it is only ever seeded once.
  // Free-text and editable: leave it blank for events created in admin.
  seedKey: {
    type: String,
    default: '',
  },
  // Bump when a seeded record's published text changes. The seeder refreshes
  // the copy only when this differs, so admin edits survive a plain restart but
  // a genuine content correction still lands.
  seedVersion: {
    type: Number,
    default: 0,
  },
  greg: {
    en: { type: String, default: '' },
    ne: { type: String, default: '' },
    hi: { type: String, default: '' },
    zh: { type: String, default: '' },
    ta: { type: String, default: '' },
  },
  // NEW FIELDS - Add these
  interestedCount: {
    type: Number,
    default: 0,
  },
  views: {
    type: Number,
    default: 0,
  },
  shareCount: {
    type: Number,
    default: 0,
  },
  interestedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update timestamp on save
eventSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Event', eventSchema);