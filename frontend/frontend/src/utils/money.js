/**
 * Donation amounts: the ceiling, and how a large number is written down.
 *
 * The ceiling is fifty lakh in one donation. It is declared here once and
 * imported by both the form and the server-side check, because a limit that
 * lives only in the browser is a suggestion.
 */
export const MAX_DONATION = 5_000_000; // 50 lakh
export const MIN_DONATION = 1;

/** Above this the amount is written in short form, because a long one is hard to read at a glance. */
const LAKH = 100_000;
const CRORE = 10_000_000;

/** Trims a fraction to at most `places` decimals and drops a trailing ".0". */
const trim = (value, places = 2) => {
  const rounded = Number(value.toFixed(places));
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
};

/**
 * The short form: 50,000 → "50K", 250,000 → "2.5L", 5,000,000 → "50L",
 * 12,500,000 → "1.25Cr". Uses K for thousand, L for lakh and Cr for crore, the
 * way the amount is read aloud in Nepal; plain digits below a thousand.
 */
export const shortAmount = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '0';
  if (n >= CRORE) return `${trim(n / CRORE)}Cr`;
  if (n >= LAKH) return `${trim(n / LAKH)}L`;
  if (n >= 1000) return `${trim(n / 1000)}K`;
  return String(Math.round(n));
};

/** The full form with Indian/Nepali digit grouping: 5,000,000 → "50,00,000". */
export const groupedAmount = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return '0';
  const s = String(Math.round(n));
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}`;
};

/** "50L (50,00,000)" — both readings, for anywhere the full figure matters. */
export const amountWithShort = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '';
  const short = shortAmount(n);
  const full = groupedAmount(n);
  return short === full ? full : `${short} (${full})`;
};

/**
 * True when the amount is over the ceiling. The form uses this to refuse the
 * figure while it is being typed; the server repeats the check, because a
 * request can arrive without ever passing through the form.
 */
export const overDonationLimit = (value) => Number(value) > MAX_DONATION;

/** Clamp to the allowed range. Used when a quick-amount button is pressed. */
export const clampDonation = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return MIN_DONATION;
  return Math.min(MAX_DONATION, Math.max(MIN_DONATION, Math.round(n)));
};

/**
 * Ten lakh: the point at which the amount stops being a short figure and starts
 * needing room. Below it the field can stay narrower, leaving the label beside it
 * readable; from here up the box widens in steps.
 */
export const WIDE_AMOUNT_FROM = 1000000; // 10 lakh

/*
 * Bands rather than a digit count, so the width tracks the amount being typed and
 * settles back when digits are deleted. A digit count would jump between two
 * sizes while a number is half-written (typing "1000000" passes through six and
 * then seven digits), which reads as a twitch rather than a response.
 *
 * The top band is 100%, the full width the field had before, so the largest
 * amount has all the room it needs.
 */
const AMOUNT_WIDTH_BANDS = [
  { upTo: 1000, width: 50 },
  { upTo: 100000, width: 58 },
  { upTo: WIDE_AMOUNT_FROM, width: 68 },
  { upTo: 10000000, width: 82 },
  { upTo: Infinity, width: 100 },
];

/**
 * Width of the amount field as a percentage of its container.
 *
 * An empty or unparseable value takes the narrowest band, not the widest: the
 * field then only ever grows while digits are added and only ever shrinks while
 * they are deleted. Starting an empty field at full width and snapping it narrow
 * on the first keystroke would be a jump the donor did not ask for.
 */
export const amountFieldWidth = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return AMOUNT_WIDTH_BANDS[0].width;
  const band = AMOUNT_WIDTH_BANDS.find((b) => n <= b.upTo);
  return band ? band.width : 100;
};

/** True from ten lakh up, which is where the field widens and the total is worth showing. */
export const isWideAmount = (value) => Number(value) >= WIDE_AMOUNT_FROM;

/**
 * The declared income and photograph are asked for only from ten lakh up.
 *
 * Declared here rather than in the pages so the form and the server agree on the
 * same figure: a donation below it is never asked for the fields, and the server
 * never refuses one for their absence.
 */
export const needsDeclaredIncome = (value) => Number(value) >= WIDE_AMOUNT_FROM;

/*
 * Amount in words, in the Indian and Nepali way of counting (crore, lakh,
 * thousand) rather than the international one, because that is how a figure of
 * this size is read aloud here. Used for the running total under the field, so a
 * donor can check the digits they typed without trusting the short form alone.
 */
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const underHundred = (n) => {
  if (n < 20) return ONES[n];
  const t = TENS[Math.floor(n / 10)];
  const o = ONES[n % 10];
  // No hyphen: this is written the way a cheque is, "Thirty Four Thousand".
  return o ? `${t} ${o}` : t;
};

const underThousand = (n) => {
  const parts = [];
  if (n >= 100) {
    parts.push(`${ONES[Math.floor(n / 100)]} Hundred`);
    n %= 100;
  }
  if (n) parts.push(underHundred(n));
  return parts.join(' ');
};

/**
 * "Rupees Fifty Lakh Only" for 5,000,000.
 *
 * Returns an empty string below one lakh: the digits are short enough to read
 * directly there and a line of words would be more clutter than help. Figures
 * above the ceiling still get words — the form should show what was typed, even
 * though the submit will refuse it — but past ninety-nine crore there is nothing
 * sensible to say, so that stops.
 */
export const amountInWords = (value) => {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 100000 || n > 99999999) return '';

  const parts = [];
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const hundred = n % 1000;

  if (crore) parts.push(`${underThousand(crore)} Crore`);
  if (lakh) parts.push(`${underThousand(lakh)} Lakh`);
  if (thousand) parts.push(`${underThousand(thousand)} Thousand`);
  if (hundred) parts.push(underThousand(hundred));
  if (!parts.length) return '';

  return `Rupees ${parts.join(' ')} Only`;
};