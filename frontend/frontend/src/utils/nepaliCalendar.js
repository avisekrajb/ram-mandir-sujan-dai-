// ─── Nepali (Bikram Sambat) calendar data & conversion ─────────────────────
// Data source: `nepali-date-converter` (MIT) — verified table 2000–2090 BS.
// BS 2000/1/1 (Baisakh 1, 2000) = AD 1943-04-13.

export const NEPALI_MONTH_ORDER = [
  'Baisakh', 'Jestha', 'Asar', 'Shrawan', 'Bhadra', 'Aswin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra',
];

// Month lengths per BS year, in Baisakh → Chaitra order
export const BS_MONTH_DAYS = {
  2000: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2001: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2002: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2003: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2004: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2005: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2006: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2007: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2008: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2009: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2010: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2011: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2012: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2013: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2014: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2015: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2016: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2017: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2018: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2019: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2020: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2021: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2022: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2023: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2024: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2025: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2026: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2027: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2028: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2029: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
  2030: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2031: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2032: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2033: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2034: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2035: [30, 32, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2036: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2037: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2038: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2039: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2040: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2041: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2042: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2043: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2044: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2045: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2046: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2047: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2048: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2049: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2050: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2051: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2052: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2053: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2054: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2055: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2056: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
  2057: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2058: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2059: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2060: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2061: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2062: [30, 32, 31, 32, 31, 31, 29, 30, 29, 30, 29, 31],
  2063: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2064: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2065: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2066: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2067: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2068: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2069: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2070: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2071: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2072: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2073: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2074: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2075: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2076: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2077: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2078: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2079: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2081: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2082: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2083: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2084: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2085: [31, 32, 31, 32, 30, 31, 30, 30, 29, 30, 30, 30],
  2086: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2087: [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30],
  2088: [30, 31, 32, 32, 30, 31, 30, 30, 29, 30, 30, 30],
  2089: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2090: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
};

const MIN_DAY = 1;
const MAX_DAY = 33238;
const EPOCH_YEAR = 2000;

// Precompute cumulative day offsets (same algorithm as nepali-date-converter)
let runningDays = 0;
const yearDaysMapping = Object.keys(BS_MONTH_DAYS).map(year => {
  const daysInYear = BS_MONTH_DAYS[year].reduce((a, b) => a + b, 0);
  const entry = [daysInYear, runningDays];
  runningDays += daysInYear;
  return entry;
});

const monthDaysMappings = Object.keys(BS_MONTH_DAYS).map(year => {
  let daySum = 0;
  return BS_MONTH_DAYS[year].map(md => {
    const entry = [md, daySum];
    daySum += md;
    return entry;
  });
});

function mod(m, val) {
  let v = val;
  while (v < 0) v += m;
  return v % m;
}

// BS year → number of days since epoch (Baisakh 1, 2000 = day 1)
export function findPassedDays(year, month0, date) {
  const yearIndex = year - EPOCH_YEAR;
  const pastYearDays = yearDaysMapping[yearIndex][1];
  const extraMonth = mod(12, month0);
  const extraYear = Math.floor(month0 / 12);
  const pastMonthDays =
    yearDaysMapping[yearIndex + extraYear][1] -
    pastYearDays +
    monthDaysMappings[yearIndex + extraYear][extraMonth][1];
  const daysPassed = pastYearDays + pastMonthDays + date;
  return daysPassed;
}

// day number since epoch → { year, month(0-indexed), date }
export function mapDaysToDate(daysPassed) {
  const yearIndex = yearDaysMapping.findIndex(
    y => daysPassed > y[1] && daysPassed <= y[1] + y[0]
  );
  const monthRemainder = daysPassed - yearDaysMapping[yearIndex][1];
  const monthIndex = monthDaysMappings[yearIndex].findIndex(
    m => monthRemainder > m[1] && monthRemainder <= m[1] + m[0]
  );
  const date = monthRemainder - monthDaysMappings[yearIndex][monthIndex][1];
  return { year: yearIndex + EPOCH_YEAR, month: monthIndex, date };
}

export function getBsMonthDays(year, month1) {
  const data = BS_MONTH_DAYS[year];
  if (!data) return 0;
  return data[month1 - 1] || 0;
}

export function isValidBsDate(year, month1, day) {
  if (!BS_MONTH_DAYS[year]) return false;
  if (month1 < 1 || month1 > 12) return false;
  return day >= 1 && day <= getBsMonthDays(year, month1);
}

// BS → AD Date (local midnight)
export function bsToAd(year, month1, day) {
  const daysPassed = findPassedDays(year, month1 - 1, day);
  if (daysPassed < MIN_DAY || daysPassed > MAX_DAY) return null;
  return new Date(Date.UTC(1943, 3, 13 + daysPassed));
}

// AD Date → { year, month(1-indexed), day, weekday }
export function adToBs(date) {
  const daysPassed = Math.round(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
      Date.UTC(1943, 3, 13)) /
      (1000 * 3600 * 24)
  );
  if (daysPassed < MIN_DAY || daysPassed > MAX_DAY) return null;
  const bs = mapDaysToDate(daysPassed);
  return {
    year: bs.year,
    month: bs.month + 1,
    day: bs.date,
    weekday: date.getDay(),
  };
}

// Weekday (0=Sunday) of the first day of a BS month
export function getBsMonthStartWeekday(year, month1) {
  const ad = bsToAd(year, month1, 1);
  return ad ? ad.getUTCDay() : 0;
}

// Convert western digits to Devanagari digits
export function toNepaliDigits(value) {
  const digits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  return String(value).replace(/\d/g, d => digits[parseInt(d, 10)]);
}

// ─── Localized names (site languages: en, ne, hi, zh, ta) ──────────────────
export const WEEKDAYS = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  ne: ['आइतबार', 'सोमबार', 'मंगलबार', 'बुधबार', 'बिहिबार', 'शुक्रबार', 'शनिबार'],
  hi: ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'],
  zh: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
  ta: ['ஞாயிறு', 'திங்கள்', 'செவ்வாய்', 'புதன்', 'வியாழன்', 'வெள்ளி', 'சனி'],
};

export const WEEKDAYS_SHORT = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  ne: ['आइत', 'सोम', 'मंगल', 'बुध', 'बिहि', 'शुक्र', 'शनि'],
  hi: ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'],
  zh: ['日', '一', '二', '三', '四', '五', '六'],
  ta: ['ஞா', 'தி', 'செ', 'பு', 'வி', 'வெ', 'ச'],
};

export const BS_MONTHS = {
  en: ['Baisakh', 'Jestha', 'Asar', 'Shrawan', 'Bhadra', 'Aswin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'],
  ne: ['बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज', 'कार्तिक', 'मंसिर', 'पुष', 'माघ', 'फागुन', 'चैत'],
  hi: ['वैशाख', 'ज्येष्ठ', 'आषाढ़', 'श्रावण', 'भाद्रपद', 'आश्विन', 'कार्तिक', 'मार्गशीर्ष', 'पौष', 'माघ', 'फाल्गुन', 'चैत्र'],
  zh: ['拜萨克', '杰斯塔', '阿萨尔', '斯拉万', '巴德拉', '阿斯温', '卡尔蒂克', '芒西尔', '波乌什', '马格', '法尔贡', '猜特拉'],
  ta: ['பைசாக்', 'ஜேஷ்ட', 'அசார்', 'ஸ்ரவண்', 'பத்ரா', 'அஸ்வின்', 'கார்த்திக்', 'மங்சீர்', 'பௌஷ்', 'மாக்', 'பால்குன்', 'சைத்ரா'],
};

export const SAKA_MONTHS = {
  en: ['Chaitra', 'Vaisakha', 'Jyaistha', 'Asadha', 'Sravana', 'Bhadra', 'Asvina', 'Kartika', 'Margasira', 'Pausa', 'Magha', 'Phalguna'],
  ne: ['चैत्र', 'वैशाख', 'ज्येष्ठ', 'आषाढ', 'श्रावण', 'भाद्र', 'आश्विन', 'कार्तिक', 'मार्गशीर्ष', 'पौष', 'माघ', 'फाल्गुन'],
  hi: ['चैत्र', 'वैशाख', 'ज्येष्ठ', 'आषाढ़', 'श्रावण', 'भाद्रपद', 'आश्विन', 'कार्तिक', 'मार्गशीर्ष', 'पौष', 'माघ', 'फाल्गुन'],
  zh: ['挲陀罗月', '毗舍佉月', '逝瑟吒月', '额沙茶月', '室罗伐拏月', '婆达罗钵陀月', '阿湿缚庾阇月', '迦剌底迦月', '末伽始罗月', '报沙月', '磨祛月', '颇勒窭拏月'],
  ta: ['சைத்திரம்', 'வைசாகம்', 'ஜ்யேஷ்டம்', 'ஆஷாடம்', 'ஸ்ராவணம்', 'பாத்ரபதம்', 'அஸ்வினம்', 'கார்த்திகம்', 'மார்கழி', 'பௌஷம்', 'மாகம்', 'பால்குனம்'],
};

export const GREGORIAN_MONTHS = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  ne: ['जनवरी', 'फेब्रुअरी', 'मार्च', 'अप्रिल', 'मे', 'जुन', 'जुलाई', 'अगस्ट', 'सेप्टेम्बर', 'अक्टोबर', 'नोभेम्बर', 'डिसेम्बर'],
  hi: ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'],
  zh: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
  ta: ['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'],
};

// ─── Dates and numbers as a reader of `lang` writes them ───────────────────
// Nepali and Hindi write their digits in Devanagari.
export const localDigits = (value, lang) => (lang === 'ne' || lang === 'hi' ? toNepaliDigits(value) : String(value));

// A BS date from adToBs():  "२०८३ असोज १९ गते" (ne), "१९ आश्विन २०८३" (hi), "Aswin 19, 2083" (the rest).
// `short` leaves out the year.
export function formatBsDate(bs, lang, short = false) {
  if (!bs) return '';
  const month = (BS_MONTHS[lang] || BS_MONTHS.en)[bs.month - 1];
  const d = (v) => localDigits(v, lang);
  if (lang === 'ne') return short ? `${month} ${d(bs.day)} गते` : `${d(bs.year)} ${month} ${d(bs.day)} गते`;
  if (lang === 'hi') return short ? `${d(bs.day)} ${month}` : `${d(bs.day)} ${month} ${d(bs.year)}`;
  return short ? `${month} ${bs.day}` : `${month} ${bs.day}, ${bs.year}`;
}

// A Gregorian { year, month, day }:  "5 October 2026", "५ अक्टोबर २०२६", "2026年10月5日".
// `short` abbreviates the English month ("5 Oct 2026").
export function formatAdDate({ year, month, day }, lang, short = false) {
  const months = GREGORIAN_MONTHS[lang] || GREGORIAN_MONTHS.en;
  if (lang === 'zh') return `${year}年${month}月${day}日`;
  const name = lang === 'en' && short ? months[month - 1].slice(0, 3) : months[month - 1];
  return `${localDigits(day, lang)} ${name} ${localDigits(year, lang)}`;
}

export const CHINESE_MONTHS = {
  en: ['Zhengyue', 'Eryue', 'Sanyue', 'Siyue', 'Wuyue', 'Liuyue', 'Qiyue', 'Bayue', 'Jiuyue', 'Shiyue', 'Shiyiyue', 'Shieryue'],
  ne: ['जनवरी', 'फेब्रुअरी', 'मार्च', 'अप्रिल', 'मे', 'जुन', 'जुलाई', 'अगस्ट', 'सेप्टेम्बर', 'अक्टोबर', 'नोभेम्बर', 'डिसेम्बर'],
  hi: ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'],
  zh: ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
  ta: ['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'],
};

export const THAI_MONTHS = {
  en: ['Makara', 'Kumpha', 'Minakhom', 'Mesayon', 'Phruetsaphakhom', 'Mithunakhom', 'Karakadakhom', 'Singhakhom', 'Kanyayon', 'Tulakhom', 'Phruetsachikayon', 'Thanwakhom'],
  ne: ['जनवरी', 'फेब्रुअरी', 'मार्च', 'अप्रिल', 'मे', 'जुन', 'जुलाई', 'अगस्ट', 'सेप्टेम्बर', 'अक्टोबर', 'नोभेम्बर', 'डिसेम्बर'],
  hi: ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'],
  zh: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
  ta: ['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'],
};

// ─── Saka calendar (India) ─────────────────────────────────────────────────
// Saka year = Gregorian year - 78.  Chaitra 1 = March 22 (Mar 21 in leap year).
const SAKA_MONTH_LENS = [30, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 30];

export function isGregorianLeap(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// First day of Saka year (Chaitra 1) as a Date
export function sakaYearStart(sakaYear) {
  const gregYear = sakaYear + 78;
  const day = isGregorianLeap(gregYear) ? 21 : 22;
  return new Date(gregYear, 2, day); // March
}

export function getSakaMonthDays(sakaYear, month1) {
  let len = SAKA_MONTH_LENS[month1 - 1];
  if (month1 === 1 && isGregorianLeap(sakaYear + 78)) len = 31;
  return len;
}

// First day (Date) of a Saka month
export function sakaMonthStart(sakaYear, month1) {
  const start = sakaYearStart(sakaYear);
  let offset = 0;
  for (let m = 1; m < month1; m++) offset += getSakaMonthDays(sakaYear, m);
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset);
}

// ─── Chinese calendar (China) ───────────────────────────────────────────────
// Chinese New Year dates (Gregorian) for a reasonable range
export const CHINESE_NEW_YEAR = {
  2020: [1, 25], 2021: [2, 12], 2022: [2, 1], 2023: [1, 22], 2024: [2, 10],
  2025: [1, 29], 2026: [2, 17], 2027: [2, 6], 2028: [1, 26], 2029: [2, 13],
  2030: [2, 3], 2031: [1, 23], 2032: [2, 11], 2033: [1, 31], 2034: [2, 19],
  2035: [2, 8], 2036: [1, 28], 2037: [2, 15], 2038: [2, 4], 2039: [1, 24],
};

// Zodiac in order (Rat first for years divisible by 4 in the 12-cycle sense)
export const ZODIAC_ZH = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
export const ZODIAC_EN = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'];

export function chineseZodiacIndex(gregYear) {
  return ((gregYear - 4) % 12 + 12) % 12;
}

// ─── Thai Buddhist calendar (Thailand) ──────────────────────────────────────
export const THAI_BE_OFFSET = 543; // Buddhist Era = AD + 543
export const THAI_YEAR_TH = ['พ.ศ.'];

// Re-export day names with a stable order (Sunday-first)
export const DAY_NAMES = WEEKDAYS;