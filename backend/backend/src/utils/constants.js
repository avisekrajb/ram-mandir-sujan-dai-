// User Roles
const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
};

// Booking Status
const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// Gallery Types
const GALLERY_TYPES = {
  PHOTO: 'photo',
  VIDEO: 'video',
};

// Languages
const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ne', name: 'Nepali' },
  { code: 'hi', name: 'Hindi' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ta', name: 'Tamil' },
];

// File Upload Limits
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];

// Default Settings
const DEFAULT_SETTINGS = {
  heroPoster: 'linear-gradient(160deg,#7A1F2B 0%,#5B1420 45%,#2B1810 100%)',
  timings: {
    open: '05:00 AM',
    close: '08:00 PM',
  },
  quotes: {
    en: 'Where there is righteousness in the heart, there is beauty in the character.',
    ne: 'जहाँ हृदयमा धार्मिकता हुन्छ, त्यहाँ चरित्रमा सुन्दरता हुन्छ।',
    hi: 'जहाँ हृदय में धार्मिकता है, वहाँ चरित्र में सुंदरता है।',
    zh: '心中有正义，性格便有美。',
    ta: 'இதயத்தில் நேர்மை இருந்தால், குணத்தில் அழகு இருக்கும்.',
  },
  logo: {
    text: {
      en: 'Shree Ramchandra',
      ne: 'श्री रामचन्द्र',
      hi: 'श्री रामचन्द्र',
      zh: '室利罗摩钱德拉',
      ta: 'ஸ்ரீ ராமச்சந்திர',
    },
  },
};

// Regex Patterns
const PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[0-9]{10}$/,
  YOUTUBE_URL: /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/,
};

module.exports = {
  USER_ROLES,
  BOOKING_STATUS,
  GALLERY_TYPES,
  LANGUAGES,
  MAX_FILE_SIZE,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  DEFAULT_SETTINGS,
  PATTERNS,
};