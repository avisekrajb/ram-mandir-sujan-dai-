// models/Team.js
const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  photo: {
    type: String,
    default: null,
  },
  name: {
    en: { type: String, required: true },
    ne: { type: String, default: '' },
    hi: { type: String, default: '' },
    zh: { type: String, default: '' },
    ta: { type: String, default: '' },
  },
  role: {
    en: { type: String, required: true },
    ne: { type: String, default: '' },
    hi: { type: String, default: '' },
    zh: { type: String, default: '' },
    ta: { type: String, default: '' },
  },
  roleType: {
    type: String,
    enum: [
      'founder',
      'president',
      'vicePresident',
      'secretary',
      'treasurer',
      'coordinator',
      'coCoordinator',
      'member',
      'volunteer'
    ],
    default: 'member'
  },
  bio: {
    en: { type: String, default: '' },
    ne: { type: String, default: '' },
    hi: { type: String, default: '' },
    zh: { type: String, default: '' },
    ta: { type: String, default: '' },
  },
  email: {
    type: String,
    default: '',
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    default: '',
    trim: true,
  },
  // Optional age, editable from Admin → Team
  age: {
    type: Number,
    default: null,
  },
  // Marks a member that ships with the app, so it is only ever seeded once.
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

// Role hierarchy order for sorting
const roleHierarchy = {
  founder: 0,
  president: 1,
  vicePresident: 2,
  secretary: 3,
  treasurer: 4,
  coordinator: 5,
  coCoordinator: 6,
  member: 7,
  volunteer: 8,
};

// Pre-save hook
teamSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to get role hierarchy
teamSchema.statics.getRoleHierarchy = function() {
  return roleHierarchy;
};

// Static method to get role labels in all languages
teamSchema.statics.getRoleLabels = function() {
  return {
    founder: {
      en: 'Founder / Patron',
      ne: 'निर्माणकर्ता / संरक्षक',
      hi: 'संस्थापक / संरक्षक',
      zh: '创始人 / 赞助人',
      ta: 'நிறுவனர் / புரவலர்'
    },
    president: {
      en: 'President / Chairperson',
      ne: 'अध्यक्ष',
      hi: 'अध्यक्ष',
      zh: '主席',
      ta: 'தலைவர்'
    },
    vicePresident: {
      en: 'Vice President',
      ne: 'उपाध्यक्ष',
      hi: 'उपाध्यक्ष',
      zh: '副主席',
      ta: 'துணைத் தலைவர்'
    },
    secretary: {
      en: 'Secretary',
      ne: 'सचिव',
      hi: 'सचिव',
      zh: '秘书',
      ta: 'செயலாளர்'
    },
    treasurer: {
      en: 'Treasurer',
      ne: 'कोषाध्यक्ष',
      hi: 'कोषाध्यक्ष',
      zh: '财务主管',
      ta: 'பொருளாளர்'
    },
    coordinator: {
      en: 'Coordinator',
      ne: 'संयोजक',
      hi: 'संयोजक',
      zh: '协调员',
      ta: 'ஒருங்கிணைப்பாளர்'
    },
    coCoordinator: {
      en: 'Co-Coordinator / Assistant Coordinator',
      ne: 'सह-संयोजक',
      hi: 'सह-संयोजक',
      zh: '联合协调员',
      ta: 'இணை ஒருங்கிணைப்பாளர்'
    },
    member: {
      en: 'Member',
      ne: 'सदस्य',
      hi: 'सदस्य',
      zh: '成员',
      ta: 'உறுப்பினர்'
    },
    volunteer: {
      en: 'Volunteer / Service Member',
      ne: 'सेवक',
      hi: 'सेवक',
      zh: '志愿者',
      ta: 'தன்னார்வலர்'
    }
  };
};

// Method to get role display name in specific language
teamSchema.methods.getRoleDisplayName = function(lang = 'en') {
  const labels = this.constructor.getRoleLabels();
  return labels[this.roleType]?.[lang] || this.role?.[lang] || this.role?.en || '';
};

module.exports = mongoose.model('Team', teamSchema);