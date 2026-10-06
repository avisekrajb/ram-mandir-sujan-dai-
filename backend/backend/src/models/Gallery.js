const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema({
  photo: {
    type: String,
    default: null,
  },
  hue: {
    type: String,
    default: '#7A1F2B',
  },
  cap: {
    en: { type: String, default: '' },
    ne: { type: String, default: '' },
    hi: { type: String, default: '' },
    zh: { type: String, default: '' },
    ta: { type: String, default: '' },
  },
  title: {
    en: { type: String, default: '' },
    ne: { type: String, default: '' },
    hi: { type: String, default: '' },
    zh: { type: String, default: '' },
    ta: { type: String, default: '' },
  },
  description: {
    en: { type: String, default: '' },
    ne: { type: String, default: '' },
    hi: { type: String, default: '' },
    zh: { type: String, default: '' },
    ta: { type: String, default: '' },
  },
  type: {
    type: String,
    enum: ['photo', 'video'],
    default: 'photo',
  },
  category: {
    type: String,
    default: 'general',
  },
  // Shown in the "Featured" block at the top of the public gallery page.
  featured: {
    type: Boolean,
    default: false,
  },
  size: {
    type: Number,
    default: 0,
  },
  url: {
    type: String,
    default: null,
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

module.exports = mongoose.model('Gallery', gallerySchema);