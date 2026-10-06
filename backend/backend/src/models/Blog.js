const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    en: { type: String, required: [true, 'English title is required'], default: '' },
    ne: { type: String, default: '' },
    hi: { type: String, default: '' },
    zh: { type: String, default: '' },
    ta: { type: String, default: '' },
  },
  excerpt: {
    en: { type: String, required: [true, 'English excerpt is required'], default: '' },
    ne: { type: String, default: '' },
    hi: { type: String, default: '' },
    zh: { type: String, default: '' },
    ta: { type: String, default: '' },
  },
  content: {
    en: { type: String, required: [true, 'English content is required'], default: '' },
    ne: { type: String, default: '' },
    hi: { type: String, default: '' },
    zh: { type: String, default: '' },
    ta: { type: String, default: '' },
  },
  image: {
    type: String,
    default: null,
  },
  category: {
    en: { type: String, default: 'General' },
    ne: { type: String, default: 'सामान्य' },
    hi: { type: String, default: 'सामान्य' },
    zh: { type: String, default: '一般' },
    ta: { type: String, default: 'பொது' },
  },
  author: {
    type: String,
    default: 'Shree Ramchandra Temple Trust',
  },
  readTime: {
    type: String,
    default: '5 min read',
  },
  views: {
    type: Number,
    default: 0,
  },
  likes: {
    type: Number,
    default: 0,
  },
  published: {
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
blogSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Blog', blogSchema);