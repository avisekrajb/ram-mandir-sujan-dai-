import { preetiToUnicode, unicodeToPreeti, romanToDevanagari } from './unicodeConvert';
import { adToBs, bsToAd, formatAdDate, formatBsDate } from './nepaliCalendar';

describe('romanToDevanagari', () => {
  const cases = [
    ['namaste', 'नमस्ते'],
    ['Namaste', 'नमस्ते'],
    ['dhanyabaad', 'धन्यबाद'],
    ['ghari', 'घरि'], // "ri" is र + ि, not ऋ
    ['priya', 'प्रिय'],
    ['bahut', 'बहुत'], // "ah" is not a visarga
    ['amar', 'अमर'], // a leading "a" is अ
    ['kaam', 'काम'],
    ['tiin', 'तीन'],
    ['teen', 'तीन'],
    ['poojaa', 'पूजा'],
    ['kaaThamaaNDau', 'काठमाण्डौ'], // capitals inside a word are retroflex
    ['raaShTra', 'राष्ट्र'],
    ['OM', 'ओम'], // a word in capitals is read as lower case
    ['Shree Raam', 'श्री राम'],
    ['saMsaar', 'संसार'],
    ['duHkha', 'दुःख'],
    ['kRRiShNa', 'कृष्ण'],
    ['fal', 'फल'],
  ];
  test.each(cases)('%s → %s', (roman, devanagari) => {
    expect(romanToDevanagari(roman)).toBe(devanagari);
  });
});

describe('Preeti', () => {
  const pairs = [
    ['g]kfn', 'नेपाल'],
    ['gd:t]', 'नमस्ते'],
    ['k|]d', 'प्रेम'],
    ['wd{', 'धर्म'],
    ['lzIff', 'शिक्षा'],
  ];
  test.each(pairs)('%s ⇄ %s', (preeti, unicode) => {
    expect(preetiToUnicode(preeti)).toBe(unicode);
    expect(unicodeToPreeti(unicode)).toBe(preeti);
  });

  // Unicode → Preeti → Unicode must give the word back, including the letters Preeti builds
  // from two keys (ो ौ आ ओ औ ई ऊ ऐ ष ण फ क्ष) and the reordered ि and reph.
  const words = [
    'श्री राम मन्दिर', 'धर्म', 'कर्म', 'क्षमा', 'ज्ञान', 'विद्यालय', 'दर्शन', 'पूजा', 'आरती', 'ओम', 'औषधि',
    'ऐतिहासिक', 'ईश्वर', 'ऊर्जा', 'काठमाडौं', 'निर्मित', 'कृष्ण', 'अंग्रेजी', 'राष्ट्र', 'रुपैयाँ', 'ट्रेन',
    'ब्रह्म', 'सर्वत्र', 'क्रम', 'षष्ठी', 'गणेश', 'फूल', 'लक्ष्मी', 'कार्यक्रम', 'महाशिवरात्रि',
  ];
  test.each(words)('round trip %s', (word) => {
    expect(preetiToUnicode(unicodeToPreeti(word))).toBe(word);
  });
});

describe('date formats', () => {
  const bs = adToBs(new Date(2026, 9, 5));

  test('5 Oct 2026 is Aswin 19, 2083', () => {
    expect(bs).toMatchObject({ year: 2083, month: 6, day: 19 });
  });

  test('BS date in each style', () => {
    expect(formatBsDate(bs, 'en')).toBe('Aswin 19, 2083');
    expect(formatBsDate(bs, 'ne')).toBe('२०८३ असोज १९ गते');
    expect(formatBsDate(bs, 'ne', true)).toBe('असोज १९ गते');
    expect(formatBsDate(bs, 'hi')).toBe('१९ आश्विन २०८३');
  });

  test('AD date in each style', () => {
    const ad = { year: 2026, month: 10, day: 5 };
    expect(formatAdDate(ad, 'en')).toBe('5 October 2026');
    expect(formatAdDate(ad, 'en', true)).toBe('5 Oct 2026');
    expect(formatAdDate(ad, 'ne')).toBe('५ अक्टोबर २०२६');
    expect(formatAdDate(ad, 'zh')).toBe('2026年10月5日');
  });

  test('the calendar table covers 14 Apr 1943 to 13 Apr 2034', () => {
    expect(bsToAd(2000, 1, 1).toISOString().slice(0, 10)).toBe('1943-04-14');
    expect(bsToAd(2090, 12, 30).toISOString().slice(0, 10)).toBe('2034-04-13');
    expect(adToBs(new Date(2034, 3, 14))).toBeNull();
  });
});
