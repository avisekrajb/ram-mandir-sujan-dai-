const mongoose = require('mongoose');

const localizedStringSchema = new mongoose.Schema({
  en: { type: String, default: '' },
  ne: { type: String, default: '' },
  hi: { type: String, default: '' },
  zh: { type: String, default: '' },
  ta: { type: String, default: '' },
}, { _id: false });

/*
 * A year/date is held per language so the History page can show "2050" to an
 * English reader and "२०५०" to a Nepali one. Records saved before this field
 * was localized stored a single string; those are widened on read (see
 * getHistory in adminController).
 */
const yearEntrySchema = new mongoose.Schema({
  year: { type: localizedStringSchema, default: () => ({}) },
  text: { type: localizedStringSchema, default: () => ({}) },
}, { _id: false });

const historySchema = new mongoose.Schema({
  photo: {
    type: String,
    default: null,
  },
  period: {
    en: { type: String, default: '' },
    ne: { type: String, default: '' },
    hi: { type: String, default: '' },
    zh: { type: String, default: '' },
    ta: { type: String, default: '' },
  },
  title: {
    en: { type: String, required: true },
    ne: { type: String, default: '' },
    hi: { type: String, default: '' },
    zh: { type: String, default: '' },
    ta: { type: String, default: '' },
  },
  desc: {
    en: { type: String, default: '' },
    ne: { type: String, default: '' },
    hi: { type: String, default: '' },
    zh: { type: String, default: '' },
    ta: { type: String, default: '' },
  },
  // Body paragraphs. Legacy entries stored a fixed p1..p4 object, so both shapes
  // are accepted: { p1, p2, ... } is normalized into an ordered array on read.
  paragraphs: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({ p1: {}, p2: {}, p3: {}, p4: {} }),
  },
  // Optional heading above the bullet list
  listTitle: { type: localizedStringSchema, default: () => ({}) },
  // Optional bullet points
  points: { type: [localizedStringSchema], default: () => [] },
  // Optional year-by-year list, e.g. the conservation sequence
  entries: { type: [yearEntrySchema], default: () => [] },
  // Badge shown on the photo, per language for the same reason as above.
  year: {
    type: localizedStringSchema,
    default: () => ({}),
  },
  // Marks an entry that ships with the app, so it is only ever seeded once.
  seedKey: {
    type: String,
    default: '',
  },
  order: {
    type: Number,
    default: 0,
  },
  enabled: {
    type: Boolean,
    default: true,
  },
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
historySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('History', historySchema);
