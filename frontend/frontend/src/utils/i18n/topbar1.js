// Top strip panchang line (prefix tp_): the next festival and how far away it is, and
// the half of the lunar month a tithi belongs to (Krishna = waning moon, Shukla =
// waxing moon). "Sunrise", "Sunset", "Tithi" and "Today" reuse the site-wide keys.
// Merged into the site dictionary in ./index.js; a missing language falls back to English.
const strings = {
  en: {
    tp_next: 'Next',
    tp_tomorrow: 'Tomorrow',
    tp_inDays: 'in {n} days',
    tp_panchang: 'Today’s panchang',
    tp_krishna: 'Krishna',
    tp_shukla: 'Shukla',
  },
  ne: {
    tp_next: 'अर्को',
    tp_tomorrow: 'भोलि',
    tp_inDays: '{n} दिनमा',
    tp_panchang: 'आजको पञ्चाङ्ग',
    tp_krishna: 'कृष्ण',
    tp_shukla: 'शुक्ल',
  },
  hi: {
    tp_next: 'अगला',
    tp_tomorrow: 'कल',
    tp_inDays: '{n} दिन में',
    tp_panchang: 'आज का पंचांग',
    tp_krishna: 'कृष्ण',
    tp_shukla: 'शुक्ल',
  },
  zh: {
    tp_next: '下一个',
    tp_tomorrow: '明天',
    tp_inDays: '{n} 天后',
    tp_panchang: '今日历书',
    tp_krishna: '黑半月',
    tp_shukla: '白半月',
  },
  ta: {
    tp_next: 'அடுத்தது',
    tp_tomorrow: 'நாளை',
    tp_inDays: '{n} நாட்களில்',
    tp_panchang: 'இன்றைய பஞ்சாங்கம்',
    tp_krishna: 'தேய்பிறை',
    tp_shukla: 'வளர்பிறை',
  },
};

export default strings;
