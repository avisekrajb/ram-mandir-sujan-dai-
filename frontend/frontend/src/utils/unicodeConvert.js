// ─── Text / font conversion utilities ──────────────────────────────────────
// Preeti↔Unicode char maps based on the public "Preeti" font mapping
// (Shuvayatra/preeti + behnam gist), with post-processing rules.

// Preeti → Unicode char map (from the official mapping file)
const PREETI_MAP = {
  '\u00f7': '/',
  'v': '\u0916',
  'r': '\u091a',
  '"': '\u0942',
  '~': '\u091e\u094d',
  'z': '\u0936',
  '\u00e7': '\u0950',
  'f': '\u093e',
  'b': '\u0926',
  'n': '\u0932',
  'j': '\u0935',
  '\u00d7': '\u00d7',
  'V': '\u0916\u094d',
  'R': '\u091a\u094d',
  '\u00df': '\u0926\u094d\u092e',
  '^': '\u096c',
  '\u00db': '!',
  'Z': '\u0936\u094d',
  'F': '\u0901',
  'B': '\u0926\u094d\u092f',
  'N': '\u0932\u094d',
  '\u00cb': '\u0919\u094d\u0917',
  'J': '\u0935\u094d',
  '6': '\u091f',
  '2': '\u0926\u094d\u0926',
  '\u00bf': '\u0930\u0942',
  '>': '\u0936\u094d\u0930',
  ':': '\u0938\u094d',
  '\u00a7': '\u091f\u094d\u091f',
  '&': '\u096d',
  '\u00a3': '\u0918\u094d',
  '\u2022': '\u0921\u094d\u0921',
  '.': '\u0964',
  '\u00ab': '\u094d\u0930',
  '*': '\u096e',
  '\u201e': '\u0927\u094d\u0930',
  'w': '\u0927',
  's': '\u0915',
  'g': '\u0928',
  '\u00e6': '\u201c',
  'c': '\u0905',
  'o': '\u092f',
  'k': '\u092a',
  'W': '\u0927\u094d',
  '\u00d6': '=',
  'S': '\u0915\u094d',
  '\u00d2': '\u00a8',
  '_': ')',
  '[': '\u0943',
  '\u00da': '\u2019',
  'G': '\u0928\u094d',
  '\u02c6': '\u092b\u094d',
  'C': '\u090b',
  'O': '\u0907',
  '\u00ce': '\u0919\u094d\u0916',
  'K': '\u092a\u094d',
  '7': '\u0920',
  '\u00b6': '\u0920\u094d\u0920',
  '3': '\u0918',
  '9': '\u0922',
  '?': '\u0930\u0941',
  ';': '\u0938',
  "'": '\u0941',
  '#': '\u0969',
  '\u00a2': '\u0926\u094d\u0918',
  '/': '\u0930',
  '+': '\u0902',
  '\u00aa': '\u0919',
  't': '\u0924',
  'p': '\u0909',
  '|': '\u094d\u0930',
  'x': '\u0939',
  '\u00e5': '\u0926\u094d\u0935',
  'd': '\u092e',
  '`': '\u091e',
  'l': '\u093f',
  'h': '\u091c',
  'T': '\u0924\u094d',
  'P': '\u090f',
  '\u00dd': '\u091f\u094d\u0920',
  '\\': '\u094d',
  '\u00d9': ';',
  'X': '\u0939\u094d',
  '\u00c5': '\u0939\u0943',
  'D': '\u092e\u094d',
  '@': '\u0968',
  '\u00cd': '\u0919\u094d\u0915',
  'L': '\u0940',
  'H': '\u091c\u094d',
  '4': '\u0926\u094d\u0927',
  '\u00b1': '+',
  '0': '\u0923\u094d',
  '<': '?',
  '8': '\u0921',
  '\u00a5': '\u0930\u094d\u200d',
  '$': '\u096a',
  '\u00a1': '\u091c\u094d\u091e\u094d',
  ',': ',',
  '\u00a9': '\u0930',
  '(': '\u096f',
  '\u2018': '\u0945',
  'u': '\u0917',
  'q': '\u0924\u094d\u0930',
  '}': '\u0948',
  'y': '\u0925',
  'e': '\u092d',
  'a': '\u092c',
  'i': '\u0937\u094d',
  '\u2030': '\u091d\u094d',
  'U': '\u0917\u094d',
  'Q': '\u0924\u094d\u0924',
  ']': '\u0947',
  '\u02dc': '\u093d',
  'Y': '\u0925\u094d',
  '\u00d8': '\u094d\u092f',
  'E': '\u092d\u094d',
  'A': '\u092c\u094d',
  'M': '\u0903',
  '\u00cc': '\u0928\u094d\u0928',
  'I': '\u0915\u094d\u0937\u094d',
  '5': '\u091b',
  '\u00b4': '\u091d',
  '1': '\u091c\u094d\u091e',
  '\u00b0': '\u0919\u094d\u0922',
  '=': '.',
  '\u00c6': '\u201d',
  '\u2039': '\u0919\u094d\u0918',
  '%': '\u096b',
  '\u00a4': '\u091d\u094d',
  '!': '\u0967',
  '-': '(',
  '\u203a': '\u0926\u094d\u0930',
  ')': '\u0966',
  '\u2026': '\u2018',
  '\u00dc': '%',
};

// Post-processing rules applied after char mapping
const PREETI_POST_RULES = [
  [/\u094d\u093e/g, ''],
  [/(\u0924\u094d\u0930|\u0924\u094d\u0924)([^\u0909\u092d\u092a]+?)m/g, '$1m$2'],
  [/\u0924\u094d\u0930m/g, '\u0915\u094d\u0930'],
  [/\u0924\u094d\u0924m/g, '\u0915\u094d\u0924'],
  [/([^\u0909\u092d\u092a]+?)m/g, 'm$1'],
  [/\u0909m/g, '\u090a'],
  [/\u092dm/g, '\u091d'],
  [/\u092am/g, '\u092b'],
  [/\u0907{/g, '\u0908'],
  [/\u093f((.\u094d)*[^\u094d])/g, '$1\u093f'],
  [/(.[\u093e\u093f\u0940\u0941\u0942\u0943\u0947\u0948\u094b\u094c\u0902\u0903\u0901]*?){/g, '{$1'],
  [/((.\u094d)*){/g, '{$1'],
  [/\{/g, '\u0930\u094d'],
  [/([\u093e\u0940\u0941\u0942\u0943\u0947\u0948\u094b\u094c\u0902\u0903\u0901]+?)(\u094d(.\u094d)*[^\u094d])/g, '$2$1'],
  [/\u094d([\u093e\u0940\u0941\u0942\u0943\u0947\u0948\u094b\u094c\u0902\u0903\u0901]+?)((.\u094d)*[^\u094d])/g, '\u094d$2$1'],
  [/([\u0902\u0901])([\u093e\u093f\u0940\u0941\u0942\u0943\u0947\u0948\u094b\u094c\u0903]*)/g, '$2$1'],
  [/\u0901\u0901/g, '\u0901'],
  [/\u0902\u0902/g, '\u0902'],
  [/\u0947\u0947/g, '\u0947'],
  [/\u0948\u0948/g, '\u0948'],
  [/\u0941\u0941/g, '\u0941'],
  [/\u0942\u0942/g, '\u0942'],
  [/^\u0903/g, ':'],
  [/\u091f\u0943/g, '\u091f\u094d\u091f'],
  [/\u0947\u093e/g, '\u093e\u0947'],
  [/\u0948\u093e/g, '\u093e\u0948'],
  [/\u0905\u093e\u0947/g, '\u0913'],
  [/\u0905\u093e\u0948/g, '\u0914'],
  [/\u0905\u093e/g, '\u0906'],
  [/\u090f\u0947/g, '\u0910'],
  [/\u093e\u0947/g, '\u094b'],
  [/\u093e\u0948/g, '\u094c'],
];

export function preetiToUnicode(text) {
  if (!text) return '';
  let out = '';
  for (const ch of text) {
    out += PREETI_MAP[ch] !== undefined ? PREETI_MAP[ch] : ch;
  }
  for (const [pattern, replacement] of PREETI_POST_RULES) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

// Reverse map (Unicode → Preeti), greedy longest-match replacement
const UNICODE_TO_PREETI = (() => {
  const map = {};
  Object.keys(PREETI_MAP).forEach(preeti => {
    const uni = PREETI_MAP[preeti];
    if (map[uni] === undefined) map[uni] = preeti;
  });
  return map;
})();

// Letters Preeti has only as a half form (the full letter is typed with a following "f", which the
// forward rules fold away), and the vowels and matras it builds from two keys.
Object.assign(UNICODE_TO_PREETI, {
  'ष': 'if', // ष
  'ण': '0f', // ण
  'फ': 'ˆf', // फ
  'क्ष': 'If', // क्ष
  'ो': 'f]', // ो
  'ौ': 'f}', // ौ
  'आ': 'cf', // आ
  'ओ': 'cf]', // ओ
  'औ': 'cf}', // औ
  'ई': 'O{', // ई
  'ऊ': 'pm', // ऊ
  'ऐ': 'P]', // ऐ
  '्र': '|', // rakar; the table also lists « for it
});

const UNICODE_TO_PREETI_KEYS = Object.keys(UNICODE_TO_PREETI).sort((a, b) => b.length - a.length);

const DEV_CONSONANT = '[\\u0915-\\u0939]';
const DEV_MATRAS = '[\\u093e-\\u094c\\u0901-\\u0903]*';
const DEV_CLUSTER = `(?:${DEV_CONSONANT}\\u094d)*${DEV_CONSONANT}`;

// Preeti draws ि and र् (reph) where the eye sees them, not where Unicode stores them:
//  - r + virama + syllable: the reph is typed after that syllable ("कर्म" is s-d-{)
//  - ि comes before the whole conjunct it belongs to ("क्षि" is l-I-f)
// The reph moves first so a ि inside the syllable it sits on stays with that syllable.
const REPH_RE = new RegExp(`\\u0930\\u094d(${DEV_CLUSTER}${DEV_MATRAS})`, 'g');
const SHORT_I_RE = new RegExp(`(${DEV_CLUSTER})\\u093f`, 'g');

const reorderForPreeti = (text) => text.replace(REPH_RE, '$1{').replace(SHORT_I_RE, 'ि$1');

const isConsonantChar = (ch) => ch >= 'क' && ch <= 'ह';

export function unicodeToPreeti(input) {
  if (!input) return '';
  const text = reorderForPreeti(input);
  let out = '';
  let i = 0;
  while (i < text.length) {
    let matched = null;
    for (const key of UNICODE_TO_PREETI_KEYS) {
      if (text.startsWith(key, i)) {
        matched = key;
        break;
      }
    }
    // A consonant with a rakar (क्र, प्र, ब्र) is the full letter plus "|", not the half letter plus a
    // full र. Conjuncts that have a key of their own (त्र श्र द्र ध्र) keep it.
    if (matched && matched.length <= 2 && isConsonantChar(text[i]) && text.startsWith('्र', i + 1)
        && UNICODE_TO_PREETI[text.slice(i, i + 3)] === undefined
        && UNICODE_TO_PREETI[text[i]] !== undefined) {
      out += `${UNICODE_TO_PREETI[text[i]]}|`;
      i += 3;
      continue;
    }
    if (matched) {
      out += UNICODE_TO_PREETI[matched];
      i += matched.length;
    } else {
      out += text[i];
      i += 1;
    }
  }
  return out;
}

// ─── Roman → Devanagari (Nepali / Hindi) ───────────────────────────────────
const ROMAN_CONSONANTS = {
  ksh: '\u0915\u094d\u0937', gy: '\u091c\u094d\u091e', jn: '\u091c\u094d\u091e', tr: '\u0924\u094d\u0930',
  kh: '\u0916', gh: '\u0918', ng: '\u0919', ch: '\u091a', chh: '\u091b',
  jh: '\u091d', th: '\u0925', dh: '\u0927', 'Th': '\u0920',
  'Dh': '\u0922', ph: '\u092b', bh: '\u092d', sh: '\u0936', 'Sh': '\u0937',
  k: '\u0915', g: '\u0917', c: '\u091a', j: '\u091c', t: '\u0924', d: '\u0926',
  n: '\u0928', T: '\u091f', D: '\u0921', N: '\u0923', p: '\u092a', b: '\u092c',
  m: '\u092e', y: '\u092f', r: '\u0930', l: '\u0932', v: '\u0935', w: '\u0935',
  s: '\u0938', S: '\u0937', h: '\u0939', f: '\u092b', q: '\u0915', z: '\u091c', x: '\u0915\u094d\u0937',
};

// Typing guide: "aa ii uu" (or "ee oo") are the long vowels, "RRi" is \u090b, "M" is the anusvara
// (saMsaar) and "H" the visarga (duHkha). "ri" is \u0930 + \u093f (ghari, priya), never \u090b.
const ROMAN_INDEPENDENT_VOWELS = {
  a: '\u0905', aa: '\u0906', i: '\u0907', ii: '\u0908', ee: '\u0908', u: '\u0909', uu: '\u090a', oo: '\u090a',
  e: '\u090f', ai: '\u0910', o: '\u0913', au: '\u0914', RRi: '\u090b',
};

// 'a' has no matra: after a consonant it is the vowel the letter already carries.
const ROMAN_MATRAS = {
  aa: '\u093e', i: '\u093f', ii: '\u0940', ee: '\u0940', u: '\u0941', uu: '\u0942', oo: '\u0942',
  e: '\u0947', ai: '\u0948', o: '\u094b', au: '\u094c', RRi: '\u0943',
};

const ROMAN_MARKS = { M: '\u0902', H: '\u0903' };

const ROMAN_KEYS = Object.keys({
  ...ROMAN_CONSONANTS,
  ...ROMAN_INDEPENDENT_VOWELS,
  ...ROMAN_MATRAS,
  ...ROMAN_MARKS,
}).sort((a, b) => b.length - a.length);

// The longest key at position i. Inside a word a capital picks the retroflex letter
// (kaaThmaaNDau); at the start of a word, and for anything that is not a key as typed, case is
// ignored ("Ram", "Nepal").
function findRomanKey(word, i) {
  const exact = i > 0 ? ROMAN_KEYS.find((k) => word.startsWith(k, i)) : undefined;
  if (exact) return exact;
  return ROMAN_KEYS.find((k) => word.slice(i, i + k.length).toLowerCase() === k.toLowerCase());
}

function romanWordToDevanagari(input) {
  // A word typed in capitals is just loud ("OM", "RAM"), not full of retroflex letters.
  const word = input.length > 1 && input === input.toUpperCase() ? input.toLowerCase() : input;
  let result = '';
  let i = 0;
  let afterConsonant = false;
  while (i < word.length) {
    const key = findRomanKey(word, i);
    if (!key) {
      result += word[i];
      afterConsonant = false;
      i += 1;
      continue;
    }

    if (ROMAN_CONSONANTS[key] !== undefined) {
      if (afterConsonant) result += '्'; // virama between consecutive consonants
      result += ROMAN_CONSONANTS[key];
      afterConsonant = true;
    } else if (ROMAN_MARKS[key] !== undefined) {
      result += ROMAN_MARKS[key];
      afterConsonant = false;
    } else {
      result += afterConsonant ? (ROMAN_MATRAS[key] || '') : ROMAN_INDEPENDENT_VOWELS[key];
      afterConsonant = false;
    }
    i += key.length;
  }
  return result;
}

export function romanToDevanagari(text) {
  if (!text) return '';
  return text
    .split(/(\s+)/)
    .map(part => (/\s/.test(part) ? part : romanWordToDevanagari(part)))
    .join('');
}

// ─── Roman → Tamil (best-effort phonetic) ───────────────────────────────────
const TAMIL_MAP = {
  ksh: '\u0b95\u0bcd\u0bb7', sh: '\u0bb7', ch: '\u0b9a', ng: '\u0b99', ny: '\u0b9e',
  th: '\u0ba4', dh: '\u0ba4', ph: '\u0baa', bh: '\u0baa', 'Th': '\u0b9f', 'Dh': '\u0b9f',
  j: '\u0b9c', 'J': '\u0b9c', h: '\u0bb9',
  k: '\u0b95', g: '\u0b95', c: '\u0b9a', t: '\u0ba4', d: '\u0ba4', n: '\u0ba8',
  T: '\u0b9f', D: '\u0b9f', N: '\u0ba3', p: '\u0baa', b: '\u0baa', m: '\u0bae',
  y: '\u0baf', r: '\u0bb0', R: '\u0bb1', l: '\u0bb2', L: '\u0bb3', v: '\u0bb5',
  w: '\u0bb5', s: '\u0bb8', S: '\u0bb7', z: '\u0bb4', 'q': '\u0b95\u0bcd',
  'x': '\u0b95\u0bcd\u0bb7',
};

const TAMIL_VOWELS = {
  a: '\u0b85', aa: '\u0b86', i: '\u0b87', ii: '\u0b88', u: '\u0b89', uu: '\u0b8a',
  e: '\u0b8e', ee: '\u0b8f', ai: '\u0b90', o: '\u0b92', oo: '\u0b93', au: '\u0b94',
  am: '\u0b85\u0bae\u0bcd',
};

const TAMIL_MATRAS = {
  aa: '\u0bbe', i: '\u0bbf', ii: '\u0bc0', u: '\u0bc1', uu: '\u0bc2',
  e: '\u0bc6', ee: '\u0bc7', ai: '\u0bc8', o: '\u0bc9', oo: '\u0bcb', au: '\u0bcc',
  am: '\u0bae\u0bcd',
};

const TAMIL_KEYS = Object.keys({ ...TAMIL_MAP, ...TAMIL_VOWELS, ...TAMIL_MATRAS })
  .sort((a, b) => b.length - a.length);

function tamilWord(text) {
  let result = '';
  let i = 0;
  let prevConsonant = false;
  while (i < text.length) {
    let matched = null;
    for (const key of TAMIL_KEYS) {
      if (text.slice(i, i + key.length).toLowerCase() === key.toLowerCase()) {
        matched = key;
        break;
      }
    }
    if (!matched) {
      result += text[i];
      prevConsonant = false;
      i += 1;
      continue;
    }
    const isConsonant = TAMIL_MAP[matched] !== undefined;
    const isVowel = TAMIL_MATRAS[matched] !== undefined;
    if (isConsonant) {
      if (prevConsonant) result += '\u0bcd';
      result += TAMIL_MAP[matched];
      prevConsonant = true;
    } else if (matched === 'a' || matched === 'A') {
      prevConsonant = false;
    } else if (isVowel) {
      if (prevConsonant) {
        result += TAMIL_MATRAS[matched];
      } else {
        result += TAMIL_VOWELS[matched] || '';
      }
      prevConsonant = false;
    } else {
      prevConsonant = false;
    }
    i += matched.length;
  }
  return result;
}

export function romanToTamil(text) {
  if (!text) return '';
  return text
    .split(/(\s+)/)
    .map(part => (/\s/.test(part) ? part : tamilWord(part)))
    .join('');
}

// ─── English → Chinese (phrase dictionary, best-effort) ─────────────────────
const CHINESE_DICT = {
  'namaste': '合十问候', 'hello': '你好', 'hi': '你好', 'temple': '寺庙',
  'god': '神', 'ram': '罗摩', 'sita': '悉多', 'lakshman': '罗什曼那',
  'shree': '什里', 'hanuman': '哈奴曼', 'prayer': '祈祷', 'puja': '普迦',
  'darshan': '朝拜', 'blessing': '祝福', 'blessed': '祝福的', 'peace': '平安',
  'love': '爱', 'thank': '谢谢', 'thanks': '谢谢', 'welcome': '欢迎',
  'jai': '胜利', 'victory': '胜利', 'festival': '节日', 'music': '音乐',
  'happy': '快乐', 'new': '新', 'year': '年', 'family': '家庭', 'friend': '朋友',
  'friends': '朋友们', 'water': '水', 'fire': '火', 'flower': '花', 'food': '食物',
  'mountain': '山', 'river': '河流', 'sky': '天空', 'sun': '太阳', 'moon': '月亮',
  'om': '唵', 'aum': '唵', 'shanti': '寂静', 'karma': '业', 'dharma': '法',
  'yoga': '瑜伽', 'meditation': '冥想', 'bhajan': '赞美诗', 'aarti': '阿尔蒂',
  'prasad': '供品', 'devotee': '信徒', 'devotees': '信徒们', 'mandir': '庙宇',
  'nepal': '尼泊尔', 'kathmandu': '加德满都', 'india': '印度', 'china': '中国',
  'village': '村庄', 'morning': '早晨', 'evening': '晚上', 'night': '夜晚',
  'day': '日', 'today': '今天', 'tomorrow': '明天', 'yesterday': '昨天',
  'sacred': '神圣的', 'holy': '神圣的', 'good': '好', 'great': '伟大',
  'beautiful': '美丽', 'king': '国王', 'prince': '王子', 'queen': '王后',
  'light': '光', 'lamp': '灯', 'bell': '铃', 'conch': '海螺',
  'gold': '金', 'silver': '银', 'garland': '花环', 'coconut': '椰子',
};

export function englishToChinese(text) {
  if (!text) return '';
  return text
    .split(/(\s+)/)
    .map(part => {
      if (/\s/.test(part)) return part;
      const clean = part.toLowerCase().replace(/[^a-z]/g, '');
      return CHINESE_DICT[clean] !== undefined ? CHINESE_DICT[clean] : part;
    })
    .join('');
}