// Content filter for public text (contact form, reviews).
//
// It answers one question: "is this text OK to accept?" and, if not, why:
//   rude  - abusive / vulgar words (English, romanised Nepali & Hindi,
//           Devanagari, plus Chinese and Tamil)
//   link  - URLs, markup or e-mail-style addresses pasted into the text
//   spam  - promotional or scam wording
//   junk  - meaningless text: keyboard mashing, stretches of one character,
//           or hardly any letters
//
// Repeated words are deliberately NOT treated as junk: devotees often write
// chants such as "Ram Ram Ram Ram".
//
// The word lists live in ../data/blockedWords.js.

const lists = require('../data/blockedWords');

// ── Normalisation ────────────────────────────────────────────────────────────

const INVISIBLE = /[­​-‍⁠﻿]/g;
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's', '!': 'i' };
const LEET_CHARS = /[013457@$!]/g;
const DIGIT_LEET = /[013457]/g;

// Devanagari spellings that people mix freely: long/short vowels, ण/न, श/ष/स,
// व/ब, chandrabindu/anusvara. Applied to the lists and to the text alike.
const DEVA_FOLD = { 'ण': 'न', 'ी': 'ि', 'ू': 'ु', 'ई': 'इ', 'ऊ': 'उ', 'ँ': 'ं', 'श': 'स', 'ष': 'स', 'व': 'ब' };
const normalizeDeva = (s) =>
  s
    .normalize('NFC')
    .replace(INVISIBLE, '')
    .replace(/़/g, '') // nukta
    .replace(/[णीूईऊँशषव]/g, (c) => DEVA_FOLD[c]);

const baseLatin = (s) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(INVISIBLE, '');

const squash3 = (s) => s.replace(/([a-z])\1{2,}/g, '$1$1'); // "fuuuck" -> "fuuck"
const squash1 = (s) => s.replace(/([a-z])\1+/g, '$1'); // "fuuck"  -> "fuck"

// ── Matchers built from the lists ────────────────────────────────────────────

// Latin words are compared in two forms: with runs of 3+ letters shortened to 2
// ("A"), and with every run shortened to 1 ("B"). Form B is only safe for words
// that have no double letter of their own and are long enough, otherwise "ass"
// would become "as" and "nigger" would become "Niger".
const buildLatinMatcher = ({ exact, strong, suffixes }) => {
  const exactA = new Set(exact);
  const exactB = new Set(exact.filter((w) => squash1(w) === w && w.length >= 4));
  const strongA = strong;
  const strongB = strong.filter((w) => squash1(w) === w && w.length >= 4);

  const hasExact = (set, word) => {
    if (set.has(word)) return true;
    return suffixes.some((suf) => word.length > suf.length && word.endsWith(suf) && set.has(word.slice(0, -suf.length)));
  };

  return (a, b) =>
    hasExact(exactA, a) ||
    hasExact(exactB, b) ||
    strongA.some((root) => a.startsWith(root)) ||
    strongB.some((root) => b.startsWith(root));
};

const buildDevaMatcher = ({ exact, strong, suffixes }) => {
  const exactSet = new Set(exact.map(normalizeDeva));
  const strongRoots = strong.map(normalizeDeva);
  const sufs = suffixes.map(normalizeDeva);
  return (word) =>
    exactSet.has(word) ||
    sufs.some((suf) => word.length > suf.length && word.endsWith(suf) && exactSet.has(word.slice(0, -suf.length))) ||
    strongRoots.some((root) => word.startsWith(root));
};

const matchEnglish = buildLatinMatcher(lists.english);
const matchRomanised = buildLatinMatcher(lists.romanised);
const matchDeva = buildDevaMatcher(lists.devanagari);
const SUBSTRINGS = lists.substring.map((w) => w.normalize('NFC').toLowerCase());
const SPAM_PHRASES = lists.spamPhrases.map((p) => p.toLowerCase());

// ── Rude-word detection ──────────────────────────────────────────────────────

const isRudeLatin = (word) => {
  if (!word) return false;
  const a = squash3(word);
  const b = squash1(word);
  return matchEnglish(a, b) || matchRomanised(a, b);
};

// Candidate words for one whitespace-separated chunk of Latin-script text:
//  - the chunk with symbols stripped and leetspeak resolved ("f.u.c.k", "a$$hole"),
//  - and each word-like piece inside it ("hello,fuck" -> "hello", "fuck").
// A masked letter ("f*ck") is tried as each vowel.
const latinCandidates = (chunk) => {
  const lower = baseLatin(chunk);
  const out = new Set();

  const joined = lower.replace(LEET_CHARS, (c) => LEET[c]).replace(/[^a-z*]/g, '');
  if (joined.includes('*')) {
    const stripped = joined.replace(/\*/g, '');
    out.add(stripped);
    for (const v of 'aeiou') out.add(joined.replace('*', v).replace(/\*/g, ''));
  } else if (joined) {
    out.add(joined);
  }

  for (const piece of lower.replace(DIGIT_LEET, (c) => LEET[c]).split(/[^a-z]+/)) {
    if (piece) out.add(piece);
  }
  return out;
};

const containsRude = (text) => {
  const clean = String(text).normalize('NFC').replace(INVISIBLE, '');
  const lowered = clean.toLowerCase();

  // Scripts without word breaks / with heavy suffixing
  if (SUBSTRINGS.some((w) => lowered.includes(w))) return true;

  const chunks = clean.split(/\s+/).filter(Boolean);

  // Spelled-out words: "f u c k" -> one candidate from a run of single letters
  let run = [];
  const flushRun = () => {
    if (run.length >= 3 && isRudeLatin(run.join(''))) return true;
    run = [];
    return false;
  };

  for (const chunk of chunks) {
    if (/[ऀ-ॿ]/.test(chunk)) {
      const tokens = normalizeDeva(chunk).split(/[^\p{L}\p{M}\p{N}]+/u).filter(Boolean);
      if (tokens.some(matchDeva)) return true;
    }
    const letters = baseLatin(chunk).replace(/[^a-z]/g, '');
    if (letters.length === 1 && /^[a-z]$/i.test(chunk.replace(/[^\p{L}]/gu, ''))) {
      run.push(letters);
    } else if (flushRun()) {
      return true;
    }
    for (const cand of latinCandidates(chunk)) {
      if (isRudeLatin(cand)) return true;
    }
  }
  return flushRun();
};

// ── Link / markup detection ──────────────────────────────────────────────────

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const URL_LIKE = new RegExp(
  [
    'https?:\\/\\/',
    'www\\.',
    '\\b(?:bit\\.ly|tinyurl\\.com|t\\.me|wa\\.me|goo\\.gl)\\b',
    '[a-z0-9-]+\\.(?:com|net|org|info|biz|xyz|top|click|link|site|online|shop|store|live|ru|cn|tk|ml|ga|cf|gq)\\b',
  ].join('|'),
  'i'
);
const MARKUP = /<\s*\/?\s*(?:script|a|iframe|img|svg|style|link|object|embed)\b/i;

const containsLink = (text) => {
  const t = String(text);
  return MARKUP.test(t) || URL_LIKE.test(t.replace(EMAIL, ' '));
};

// ── Spam wording ─────────────────────────────────────────────────────────────

const containsSpam = (text) => {
  const t = ` ${String(text).toLowerCase().replace(/\s+/g, ' ')} `;
  return SPAM_PHRASES.some((p) => t.includes(p));
};

// ── Junk / gibberish detection ───────────────────────────────────────────────

const KEYBOARD_ROWS = [
  { keys: 'qwertyuiop', run: 5 },
  { keys: 'asdfghjkl', run: 4 },
  { keys: 'zxcvbnm', run: 4 },
];

const hasKeyboardRun = (word) => {
  if (word.includes('qwer')) return true;
  return KEYBOARD_ROWS.some(({ keys, run }) => {
    for (let i = 0; i + run <= keys.length; i += 1) {
      const seg = keys.slice(i, i + run);
      if (word.includes(seg) || word.includes([...seg].reverse().join(''))) return true;
    }
    return false;
  });
};

const isGibberishWord = (w) => {
  if (w.length > 30) return true;
  if (w.length < 5) return false;
  if (!/[aeiouy]/.test(w)) return true; // no vowel at all
  if (/[^aeiouy]{6,}/.test(w)) return true; // 6+ consonants in a row
  if (hasKeyboardRun(w)) return true;
  if (w.length >= 6 && /^(.{1,4})\1{2,}$/.test(w)) return true; // "hahaha", "asdasdasd"
  return false;
};

const countLetters = (s) => (s.match(/\p{L}/gu) || []).length;

const looksLikeJunk = (text) => {
  const t = String(text).normalize('NFC').replace(INVISIBLE, '');
  if (countLetters(t) < 3) return true;
  if (/([^\s])\1{7,}/u.test(t)) return true; // "aaaaaaaa", "!!!!!!!!"

  // Share of Latin-script words that look like mashing; judged over the whole
  // text so one odd word in a real sentence does not reject it.
  const words = baseLatin(t).split(/[^a-z]+/).filter((w) => w.length >= 3);
  if (words.length > 0) {
    const bad = words.filter(isGibberishWord).length;
    if (bad / words.length >= 0.5) return true;
  }
  return false;
};

// ── Public API ───────────────────────────────────────────────────────────────

/** Check a block of free text. Returns { ok: true } or { ok: false, reason }. */
const checkText = (text) => {
  const t = String(text ?? '');
  if (containsRude(t)) return { ok: false, reason: 'rude' };
  if (containsLink(t)) return { ok: false, reason: 'link' };
  if (containsSpam(t)) return { ok: false, reason: 'spam' };
  if (looksLikeJunk(t)) return { ok: false, reason: 'junk' };
  return { ok: true };
};

/** Check a person's name: same rules, but names are short and may hold digits. */
const checkName = (name) => {
  const t = String(name ?? '');
  if (containsRude(t)) return { ok: false, reason: 'rude' };
  if (containsLink(t) || t.includes('@')) return { ok: false, reason: 'link' };
  if (countLetters(t) < 2) return { ok: false, reason: 'junk' };
  const words = baseLatin(t).split(/[^a-z]+/).filter((w) => w.length >= 3);
  if (words.length > 0 && words.filter(isGibberishWord).length / words.length >= 0.5) {
    return { ok: false, reason: 'junk' };
  }
  if (/([^\s])\1{5,}/u.test(t)) return { ok: false, reason: 'junk' };
  return { ok: true };
};

/**
 * Check several named fields at once, e.g. { name, message }. Returns the first
 * problem as { ok: false, field, reason }, or { ok: true }.
 */
const checkFields = (fields) => {
  for (const [field, value] of Object.entries(fields)) {
    const result = field === 'name' ? checkName(value) : checkText(value);
    if (!result.ok) return { ok: false, field, reason: result.reason };
  }
  return { ok: true };
};

// English text for API responses; the website shows its own translation per `reason`.
const REASON_MESSAGES = {
  rude: 'Please keep your message respectful - rude or abusive words are not allowed.',
  link: 'Links and web addresses are not allowed. Please remove them and try again.',
  spam: 'This looks like promotional text. Please write a genuine message.',
  junk: 'This does not look like a real message. Please write a few clear words.',
};

module.exports = { checkText, checkName, checkFields, REASON_MESSAGES };
