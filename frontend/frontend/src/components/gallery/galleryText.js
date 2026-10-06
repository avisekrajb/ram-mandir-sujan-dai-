import { isGenericTitle } from '../../utils/galleryPlaceholders';

const LANGS = ['en', 'ne', 'hi', 'zh', 'ta'];

/** Text in the reader's language; if it was only written in another, English, then Nepali, then any. */
export const localized = (obj, lang) => {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[lang] || obj.en || obj.ne || LANGS.map((l) => obj[l]).find(Boolean) || '';
};

/** A real title only: stand-in names ("Gallery Image", "WhatsApp Image…") say nothing about the picture. */
export const itemTitle = (item, lang) => {
  const real = localized(item.title, lang) || localized(item.cap, lang);
  return real && !isGenericTitle(real) ? real : '';
};

export const itemDescription = (item, lang) => localized(item.description, lang);

/** Still frame for a Cloudinary video, so a tile needs no video data until it is opened. */
export const videoPoster = (src) => (src && src.includes('/video/upload/')
  ? src.replace('/video/upload/', '/video/upload/so_0,q_auto,w_640,c_limit/').replace(/\.[a-z0-9]+$/i, '.jpg')
  : undefined);

/** Stable order: featured pictures first, then as given (the API sends newest first). */
export const featuredFirst = (items) => [
  ...items.filter((item) => item.featured === true),
  ...items.filter((item) => item.featured !== true),
];
