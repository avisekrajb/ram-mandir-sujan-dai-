/**
 * Intent detection for the temple assistant.
 *
 * Keywords are written for English (plus the way Nepali is often typed in
 * Latin letters), Nepali, Hindi, Chinese and Tamil. Plain Latin words match as
 * whole words and tolerate small typos; anything else (other scripts, or
 * phrases with a space) matches as a substring.
 *
 * ORDER MATTERS: when two intents score the same, the earlier one wins.
 */

const INTENTS = [
  {
    id: 'developer',
    words: ['developer', 'developed', 'creator', 'who made', 'made this', 'who created', 'who built',
      'विकास', 'बनाएको', 'बनायो', 'बनाया', '开发', '开发者', 'உருவாக்க'],
  },
  {
    id: 'privacy',
    words: ['privacy', 'personal information', 'गोपनीयता', '隐私', 'தனியுரிமை'],
  },
  {
    id: 'terms',
    words: ['terms', 'conditions', 'rules', 'नियम', 'सर्त', 'शर्त', '条款', 'விதிமுறை'],
  },
  {
    id: 'calendar',
    words: ['calendar', 'tithi', 'panchang', 'panchanga', 'patro', 'date converter', 'nepali date', 'bs to ad', 'ad to bs',
      'festival calendar', 'पात्रो', 'पञ्चाङ्ग', 'पंचांग', 'तिथि', 'कैलेंडर', '日历', '历法', 'நாட்காட்டி', 'பஞ்சாங்கம்', 'திதி'],
  },
  {
    id: 'converter',
    words: ['unicode', 'preeti', 'converter', 'font', 'युनिकोड', 'यूनिकोड', 'प्रीति', 'कन्भर्टर', 'कन्वर्टर', '转换', 'யூனிகோட்', 'பிரீதி', 'மாற்றி'],
  },
  {
    id: 'aarti',
    words: ['aarti', 'arati', 'arti', 'bhajan', 'prayer', 'chant', 'आरती', 'भजन', '灯供', '祈祷', 'ஆரத்தி'],
  },
  {
    id: 'hours',
    words: ['hours', 'timings', 'time', 'open', 'opening', 'closing', 'closed', 'darshan', 'samay',
      'समय', 'दर्शन', 'खुल्ने', 'खुलने', '时间', '开放', '朝拜', 'நேரம்', 'தரிசன'],
  },
  {
    id: 'booking',
    words: ['booking', 'book', 'reserve', 'reservation', 'puja', 'pooja', 'hall', 'ceremony',
      'बुकिङ', 'बुकिंग', 'बुक', 'पूजा', 'आरक्षण', '预订', '预约', '法会', 'முன்பதிவு', 'பூஜை'],
  },
  {
    id: 'donation',
    words: ['donate', 'donation', 'donor', 'support', 'seva', 'qr', 'contribute', 'contribution', 'daan', 'dan',
      'दान', 'सहयोग', 'सेवा', 'दाता', '捐赠', '捐款', '捐助', 'நன்கொடை', 'காணிக்கை'],
  },
  {
    id: 'events',
    words: ['events', 'festivals', 'upcoming', 'celebration', 'program', 'utsav', 'jatra',
      'karyakram', 'parba', 'chadparba', 'कार्यक्रम', 'पर्व', 'उत्सव', 'आगामी', 'त्योहार', 'त्यौहार',
      '活动', '节日', '庆典', '即将', 'நிகழ்வு', 'திருவிழா', 'பண்டிகை', 'விழா'],
  },
  {
    id: 'gallery',
    words: ['gallery', 'photos', 'pictures', 'images', 'videos', 'pic', 'tasbir', 'tasvir',
      'ग्यालरी', 'गैलरी', 'फोटो', 'तस्बिर', 'तस्वीर', 'भिडियो', 'वीडियो', '图库', '照片', '图片', '视频', '相册',
      'காட்சியகம்', 'புகைப்பட', 'படங்கள்', 'வீடியோ', 'கேலரி'],
  },
  {
    id: 'team',
    words: ['team', 'committee', 'members', 'people', 'staff', 'trustees', 'chairman', 'president',
      'secretary', 'treasurer', 'coordinator', 'samiti', 'sadasya',
      'टिम', 'टीम', 'समिति', 'सदस्य', 'अध्यक्ष', '团队', '委员会', '成员', 'குழு', 'உறுப்பினர்', 'நிர்வாக'],
  },
  {
    id: 'founder',
    words: ['founder', 'patron', 'sansthapak', 'संस्थापक', '创始人', 'நிறுவனர்'],
  },
  {
    id: 'history',
    words: ['history', 'story', 'about', 'established', 'origin', 'heritage', 'itihas',
      'इतिहास', 'बारेमा', 'बारे में', '历史', '关于', '简介', 'வரலாறு', 'பற்றி'],
  },
  {
    id: 'blogs',
    words: ['news', 'blogs', 'articles', 'updates',
      'समाचार', 'ब्लग', 'ब्लॉग', 'लेख', 'खबर', '新闻', '博客', '文章', 'செய்தி', 'வலைப்பதிவு', 'கட்டுரை'],
  },
  {
    id: 'visiting',
    words: ['reach', 'visit', 'visiting', 'travel', 'guide', 'parking', 'how to get', 'kasari', 'पुग्न', 'भ्रमण', 'यात्रा', 'गाइड', 'दर्शन गाइड',
      '参观', '访问', 'வழி'],
  },
  {
    id: 'contact',
    words: ['contact', 'phone', 'call', 'email', 'address', 'location', 'where', 'map', 'directions', 'locate', 'sampark', 'thegana', 'kaha', 'kahan',
      'सम्पर्क', 'संपर्क', 'ठेगाना', 'पता', 'स्थान', 'फोन', 'नक्सा', 'नक्शा', 'कहाँ', 'कहां',
      '联系', '电话', '地址', '位置', '地图', '哪里', 'தொடர்பு', 'முகவரி', 'இருப்பிடம்', 'வரைபடம்', 'எங்கே'],
  },
  {
    id: 'thanks',
    words: ['thank', 'thanks', 'धन्यवाद', '谢谢', 'நன்றி'],
  },
  {
    id: 'greeting',
    words: ['hello', 'hi', 'hey', 'namaste', 'namaskar', 'नमस्ते', 'नमस्कार', 'हैलो', '你好', 'வணக்கம்'],
  },
];

/** Adjacent-transposition-aware edit distance (small strings only). */
const distance = (a, b) => {
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 2) return 3;
  const d = Array.from({ length: la + 1 }, (_, i) => [i, ...new Array(lb).fill(0)]);
  for (let j = 1; j <= lb; j += 1) d[0][j] = j;
  for (let i = 1; i <= la; i += 1) {
    for (let j = 1; j <= lb; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[la][lb];
};

const IS_PLAIN_WORD = /^[a-z]+$/;

// "events" and "event" are the same word for matching purposes
const stem = (w) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w);

const tokenMatches = (token, kw) => {
  const root = stem(kw);
  if (stem(token) === root) return true;
  if (root.length >= 5 && token.length > root.length && token.startsWith(root)) return true;
  // typo tolerance only for longer words, and the first letter must agree
  if (kw.length >= 6 && token.length >= 5 && token[0] === kw[0]) {
    return distance(token, kw) <= (kw.length >= 9 ? 2 : 1);
  }
  return false;
};

/** Score every intent for `query`; returns { id, score } of the best one, or null. */
export const detectIntent = (query) => {
  const q = String(query || '').toLowerCase().normalize('NFC');
  if (!q.trim()) return null;
  const tokens = q.match(/[a-z]+/g) || [];

  let best = null;
  INTENTS.forEach((intent) => {
    let score = 0;
    intent.words.forEach((kw) => {
      if (IS_PLAIN_WORD.test(kw)) {
        if (tokens.some((tok) => tokenMatches(tok, kw))) score += 1;
      } else if (q.includes(kw)) {
        score += kw.includes(' ') ? 2 : 1;
      }
    });
    if (score > 0 && (!best || score > best.score)) best = { id: intent.id, score };
  });
  return best;
};

/** True when the question asks specifically about videos. */
export const asksForVideos = (query) => {
  const q = String(query || '').toLowerCase();
  return /video|bhidiyo|भिडियो|वीडियो|视频|வீடியோ/.test(q);
};

export default INTENTS;
