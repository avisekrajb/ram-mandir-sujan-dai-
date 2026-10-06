const mongoose = require('mongoose');

const localizedStringSchema = new mongoose.Schema({
  en: { type: String, default: '' },
  ne: { type: String, default: '' },
  hi: { type: String, default: '' },
  zh: { type: String, default: '' },
  ta: { type: String, default: '' }
}, { _id: false });

const aboutSchema = new mongoose.Schema({
  hero: {
    image: { type: String, default: '/aboutusphoto.jpeg' },
    title: { type: localizedStringSchema, default: () => ({}) }
    // INTRO REMOVED FROM HERO - Now separate field below
  },
  // NEW FIELD: Intro text that appears below the hero banner
  introText: { 
    type: localizedStringSchema, 
    default: () => ({
      en: 'Welcome to Shree Ramchandra Temple, a sacred place of worship and spiritual solace.',
      ne: 'श्री रामचन्द्र मन्दिरमा स्वागत छ, पूजा र आध्यात्मिक शान्तिको पवित्र स्थान।',
      hi: 'श्री रामचन्द्र मंदिर में आपका स्वागत है, पूजा और आध्यात्मिक शांति का पवित्र स्थान।',
      zh: '欢迎来到室利罗摩钱德拉神庙，一个礼拜和心灵慰藉的神圣之地。',
      ta: 'ஸ்ரீ ராமச்சந்திர கோயிலுக்கு வருக, வழிபாடு மற்றும் ஆன்மீக ஆறுதலின் புனித இடம்.'
    })
  },
  sections: [{
    key: { type: String, required: true },
    title: { type: localizedStringSchema, required: true },
    // Opening paragraph (kept in sync with paragraphs.p1 for older readers)
    body: { type: localizedStringSchema, required: true },
    paragraphs: {
      p1: { type: localizedStringSchema, default: () => ({}) },
      p2: { type: localizedStringSchema, default: () => ({}) },
      p3: { type: localizedStringSchema, default: () => ({}) },
      p4: { type: localizedStringSchema, default: () => ({}) }
    },
    // Optional heading shown above the bullet list
    listTitle: { type: localizedStringSchema, default: () => ({}) },
    // Optional bullet points rendered under the paragraphs
    points: { type: [localizedStringSchema], default: () => [] },
    image: { type: String, default: '' },
    order: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true }
  }],
  activities: [{
    key: { type: String, required: true },
    title: { type: localizedStringSchema, required: true },
    desc: { type: localizedStringSchema, default: () => ({}) },
    paragraphs: {
      p1: { type: localizedStringSchema, default: () => ({}) },
      p2: { type: localizedStringSchema, default: () => ({}) },
      p3: { type: localizedStringSchema, default: () => ({}) },
      p4: { type: localizedStringSchema, default: () => ({}) }
    },
    order: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('About', aboutSchema);