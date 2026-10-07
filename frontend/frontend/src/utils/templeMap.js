// The one map for the temple, shared by the contact page and the footer so both show
// the same place, the same zoom and the same pin.

// Pin: Ram Mandir, Battisputali, Kathmandu.
export const TEMPLE_LAT = 27.706820676182783;
export const TEMPLE_LNG = 85.33819027525377;

// Short link for the directions button: opens the app on mobile, the web on desktop.
export const TEMPLE_DIRECTIONS_URL = 'https://maps.app.goo.gl/pHmm1ykS3TLezuZ28';

// Google Maps embed (primary). A short maps.app.goo.gl link cannot be framed, hence the pb= form.
export const TEMPLE_MAP_EMBED =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3532.3389018929365!2d85.33819027525377!3d27.706820676182783!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39eb19761839ec2b%3A0xcc3f44bcaa9f2a2f!2sRam%20Mandir%2C%20Battisputali!5e0!3m2!1sen!2snp!4v1791343152626!5m2!1sen!2snp';

// OpenStreetMap embed, used when the Google iframe fails.
const MAP_BBOX = [
  (TEMPLE_LNG - 0.005).toFixed(4),
  (TEMPLE_LAT - 0.003).toFixed(4),
  (TEMPLE_LNG + 0.005).toFixed(4),
  (TEMPLE_LAT + 0.003).toFixed(4),
].join('%2C');

export const TEMPLE_MAP_FALLBACK_EMBED =
  `https://www.openstreetmap.org/export/embed.html?bbox=${MAP_BBOX}&layer=mapnik&marker=${TEMPLE_LAT},${TEMPLE_LNG}`;

// Default address shown next to the map.
export const TEMPLE_ADDRESS = 'Battisputali, Kathmandu, Nepal';

// Older placeholder/gaushala embeds saved in Admin -> Footer before the temple map was
// used: they point somewhere else, so they count as "not set".
export const LEGACY_MAP_URLS = [
  'https://www.google.com/maps?q=27.7068207,85.3381903&z=16&hl=en&output=embed',
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3532.245849736379!2d85.3221176!3d27.7170489!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39eb190c9f5c8d7b%3A0x4f8b3f8b3f8b3f8b!2sGaushala%2C%20Kathmandu%2044600!5e0!3m2!1sen!2snp!4v1700000000000',
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d7064.843056298416!2d85.342925!3d27.70426855!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39eb199d17032265%3A0xc7e605b267b03e75!2sBattisputali%2C%20Kathmandu%2C%20Bagmati%20Province%2044600!5e0!3m2!1sen!2snp!4v1791003263092!5m2!1sen!2snp',
];

// The admin URL, unless it is empty, unframable or one of the old placeholders.
export const resolveAdminMapUrl = (adminUrl) => {
  const url = String(adminUrl || '').trim();
  if (!url || url.includes('maps.app.goo.gl')) return '';
  return LEGACY_MAP_URLS.includes(url) ? '' : url;
};