import api from '../../services/api';
import { optimizeImageCached } from '../../utils/imageOptimize';

/**
 * Live data for the assistant.
 *
 * Every list comes from the same public endpoints the site pages use, is cached
 * for a few minutes (so asking twice does not refetch) and is never invented:
 * a field that is missing from the record is simply left out of the reply.
 */

const TTL_MS = 5 * 60 * 1000;
const cache = new Map();

const cached = (key, loader) => {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.promise;
  const promise = loader();
  cache.set(key, { at: Date.now(), promise });
  // a failed request must not stay cached
  promise.catch(() => { if (cache.get(key)?.promise === promise) cache.delete(key); });
  return promise;
};

/** Forget everything (used when the visitor signs out). */
export const clearChatDataCache = () => cache.clear();

const asArray = (body) => {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  return [];
};

export const getSettings = () => cached('settings', async () => (await api.get('/admin/settings')).data || {});

export const getUpcomingEvents = () => cached('events', async () => asArray((await api.get('/events/upcoming')).data));

export const getGalleryItems = () => cached('gallery', async () => asArray((await api.get('/admin/gallery/all')).data));

export const getTeamMembers = () => cached('team', async () => asArray((await api.get('/admin/team')).data));

export const getBlogs = () => cached('blogs', async () => asArray((await api.get('/admin/blogs')).data));

// ---------------------------------------------------------------------------
// small helpers shared by the reply builders
// ---------------------------------------------------------------------------

/** Text for the visitor's language, then English, then Nepali. */
export const localized = (value, lang) => {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  return String(value[lang] || value.en || value.ne || '').trim();
};

/** Keep an answer short: cut at a sentence or word boundary. */
export const shorten = (text, max = 300) => {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('। '), cut.lastIndexOf('! '));
  if (stop > max * 0.5) return cut.slice(0, stop + 1);
  const space = cut.lastIndexOf(' ');
  return `${cut.slice(0, space > 0 ? space : max).trim()}…`;
};

/** A phone number that is still the admin placeholder (e.g. "+977-1-4XXXXXX") is not shown. */
export const realPhone = (value) => {
  const v = String(value || '').trim();
  return /\d{5,}/.test(v) && !/x/i.test(v) ? v : '';
};

/** Small, lazy-loadable image URL. Cloudinary links are resized; others pass through. */
export const cardImage = (src, width = 400) => {
  if (!src || typeof src !== 'string') return '';
  if (src.includes('/video/upload/')) {
    // video: use the still frame Cloudinary generates, like the gallery page does
    return src
      .replace('/video/upload/', `/video/upload/so_0,q_auto,w_${width},c_limit/`)
      .replace(/\.[a-z0-9]+$/i, '.jpg');
  }
  return optimizeImageCached(src, { width }) || src;
};

const ROLE_ORDER = {
  founder: 0, president: 1, vicePresident: 2, secretary: 3, treasurer: 4, coordinator: 5, coCoordinator: 6, member: 7, volunteer: 8,
};

// Built-in role names, so an untranslated saved role still reads in the visitor's language.
const ROLE_LABELS = {
  founder: { en: 'Founder / Patron', ne: 'संस्थापक / संरक्षक', hi: 'संस्थापक / संरक्षक', zh: '创始人 / 赞助人', ta: 'நிறுவனர் / புரவலர்' },
  president: { en: 'President / Chairperson', ne: 'अध्यक्ष', hi: 'अध्यक्ष', zh: '主席', ta: 'தலைவர்' },
  vicePresident: { en: 'Vice President', ne: 'उपाध्यक्ष', hi: 'उपाध्यक्ष', zh: '副主席', ta: 'துணைத் தலைவர்' },
  secretary: { en: 'Secretary', ne: 'सचिव', hi: 'सचिव', zh: '秘书', ta: 'செயலாளர்' },
  treasurer: { en: 'Treasurer', ne: 'कोषाध्यक्ष', hi: 'कोषाध्यक्ष', zh: '财务主管', ta: 'பொருளாளர்' },
  coordinator: { en: 'Coordinator', ne: 'संयोजक', hi: 'संयोजक', zh: '协调员', ta: 'ஒருங்கிணைப்பாளர்' },
  coCoordinator: { en: 'Co-Coordinator', ne: 'सह-संयोजक', hi: 'सह-संयोजक', zh: '联合协调员', ta: 'இணை ஒருங்கிணைப்பாளர்' },
  member: { en: 'Member', ne: 'सदस्य', hi: 'सदस्य', zh: '成员', ta: 'உறுப்பினர்' },
  volunteer: { en: 'Volunteer / Service Member', ne: 'सेवक', hi: 'सेवक', zh: '志愿者', ta: 'தன்னார்வலர்' },
};

export const memberRole = (member, lang) => {
  const text = localized(member.role, lang);
  const builtIn = ROLE_LABELS[member.roleType];
  if (builtIn && (!text || text === builtIn.en)) return builtIn[lang] || builtIn.en;
  return text;
};

/** Enabled team members in the same order as the team page (founder first). */
export const sortedTeam = (members) => (members || [])
  .filter((m) => m && m.enabled !== false)
  .sort((a, b) => {
    const oa = ROLE_ORDER[a.roleType] ?? 99;
    const ob = ROLE_ORDER[b.roleType] ?? 99;
    return oa !== ob ? oa - ob : (a.order || 0) - (b.order || 0);
  });

// ---------------------------------------------------------------------------
// card builders: { image, title, subtitle, to }; empty fields are omitted
// ---------------------------------------------------------------------------

export const eventCard = (event, lang) => {
  const nepali = localized(event.dateNepali, lang);
  const greg = localized(event.greg, lang);
  return {
    image: cardImage(event.photo),
    title: localized(event.title, lang) || localized(event.listTitle, lang),
    badge: nepali || greg,
    subtitle: nepali && greg && nepali !== greg ? greg : '',
    to: '/events',
  };
};

export const photoCard = (item, lang, label) => ({
  image: cardImage(item.photo),
  title: localized(item.cap, lang) || localized(item.title, lang) || label,
  subtitle: label,
  to: item.type === 'video' ? '/gallery?tab=videos' : '/gallery',
  kind: item.type === 'video' ? 'video' : 'photo',
});

export const teamCard = (member, lang) => ({
  image: cardImage(member.photo),
  title: localized(member.name, lang),
  subtitle: memberRole(member, lang),
  to: '/templeteams',
  kind: 'person',
});

export const blogCard = (blog, lang) => ({
  image: cardImage(blog.image),
  title: localized(blog.title, lang),
  subtitle: localized(blog.category, lang) || localized(blog.excerpt, lang),
  to: blog._id ? `/blogs/${blog._id}` : '/blogs',
});
