// Word lists for the public message filter (contact form + reviews).
// Edit freely: list plain spellings, the filter handles case, stretched letters
// ("fuuuck"), leetspeak ("f*ck", "sh!t", "f.u.c.k") and Devanagari spelling
// variants itself.
//
// Kinds of entry:
//  - exact:  the whole word must match; a few common word endings are tolerated
//            (English "-s/-ing/-er", Nepali "-ko/-le/-lai", ...). Use this for short
//            words that also occur inside innocent words.
//  - strong: any word that STARTS with it is blocked. Long, unmistakable roots only.
//  - substring: for scripts written without word breaks (Chinese) or with heavy
//            suffixing (Tamil); matched anywhere in the text.
//
// This is a starting set, not a complete dictionary. Add words as they turn up,
// and keep out words that are also ordinary words or names.

// ── English ──────────────────────────────────────────────────────────────────
const english = {
  exact: [
    'shit', 'shitty', 'shithead', 'bullshit', 'dickhead', 'pussy', 'slut', 'whore',
    'twat', 'wank', 'wanker', 'asshole', 'arsehole', 'dumbass', 'jackass', 'douche',
    'douchebag', 'scumbag', 'idiot', 'moron', 'retard', 'retarded', 'nigger', 'nigga',
    'faggot', 'porn', 'porno', 'xxx', 'kys', 'stfu', 'wtf', 'ass',
  ],
  strong: ['fuck', 'motherfuck', 'bitch', 'bastard', 'cunt', 'asshole', 'arsehole', 'shithead', 'dickhead', 'nigger', 'faggot'],
  suffixes: ['s', 'es', 'ed', 'er', 'ers', 'ing', 'y'],
};

// ── Romanised Nepali / Hindi ─────────────────────────────────────────────────
const romanised = {
  exact: [
    'muji', 'mujhi', 'randi', 'randike', 'raandi', 'raand', 'gandu', 'gaandu', 'gand',
    'gaand', 'lauda', 'lavda', 'lund', 'chut', 'chodu', 'chutiya', 'chutiye', 'harami',
    'haramkhor', 'haramzada', 'haramjada', 'kamina', 'kamine', 'jhatu', 'jhaatu',
    'bhosdi', 'bhosdike', 'bhosda', 'bhosadi', 'behenchod', 'bhenchod', 'madarchod',
    'maderchod', 'machikne', 'machikney', 'machhikne', 'chikne', 'bokachoda',
  ],
  strong: [
    'madarchod', 'maderchod', 'behenchod', 'bhenchod', 'bhosdik', 'bhosdi', 'chutiya',
    'chutiye', 'gaandu', 'gandu', 'machikne', 'machhikne', 'haramkhor', 'haramzada',
    'randike', 'lauda', 'lavda',
  ],
  suffixes: ['ko', 'ka', 'ki', 'le', 'lai', 'ma', 'haru', 'ho', 'hai'],
};

// ── Devanagari: Nepali + Hindi ───────────────────────────────────────────────
const devanagari = {
  exact: [
    'रण्डी', 'रन्डी', 'रंडी', 'मुजी', 'मुजि', 'गाण्डु', 'गान्डु', 'गांडू', 'गाँडू',
    'लण्ड', 'लंड', 'लौडा', 'लौडे', 'लवडा', 'चुत', 'चूत', 'चुतिया', 'चूतिया', 'चुत्तिया',
    'हरामी', 'हरामखोर', 'हरामजादा', 'हरामजादी', 'कमिना', 'कमीना', 'कमिनी', 'कमीनी',
    'भोसडी', 'भोसडीको', 'भोसडीके', 'भोसडिके', 'मादरचोद', 'बहनचोद', 'भेनचोद',
    'बेश्या', 'वेश्या', 'बेस्या', 'झाटु', 'झाँटु', 'झाटू', 'मचिक्ने', 'माचिक्ने',
    'मच्छिक्ने', 'चिक्ने', 'चोद', 'चोदु', 'चुदाई',
  ],
  strong: [
    'मादरचोद', 'बहनचोद', 'भेनचोद', 'भोसडी', 'चुतिया', 'चूतिया', 'हरामखोर', 'हरामजाद',
    'मचिक्ने', 'माचिक्ने', 'मच्छिक्ने', 'गाण्डु', 'गान्डु', 'गांडू',
  ],
  suffixes: ['को', 'का', 'की', 'ले', 'लाई', 'हरु', 'हरू', 'हरुको', 'सँग', 'मा'],
};

// ── Chinese + Tamil: plain substring match ───────────────────────────────────
const substring = [
  // Chinese
  '他妈的', '他媽的', '妈的', '媽的', '操你', '草泥马', '草泥馬', '傻逼', '傻b', '傻屄',
  '王八蛋', '贱人', '賤人', '婊子', '狗娘养', '狗娘養', '滚你妈', '去死吧',
  // Tamil
  'தேவடியா', 'தேவிடியா', 'புண்டை', 'சூத்து', 'கூதி', 'தாயோளி', 'ஓத்தா', 'ஒம்மாள',
];

// ── Promotional / scam phrases (matched on the lowercased text) ──────────────
const spamPhrases = [
  'click here', 'buy now', 'limited offer', 'make money', 'earn money', 'earn $',
  'work from home', 'casino', 'viagra', 'backlink', 'seo service', 'seo services',
  'crypto invest', 'forex', 'online betting', 'betting', 'loan offer', 'whatsapp me',
  'free gift', '100% free', 'guaranteed income', 'adult dating', 'cheap pills',
];

module.exports = { english, romanised, devanagari, substring, spamPhrases };
