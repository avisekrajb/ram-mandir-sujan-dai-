// Page titles and the tags search engines and social networks read (description, canonical, robots, Open
// Graph for Facebook / WhatsApp / LinkedIn, Twitter / X cards) for the single-page app. The same text lives
// in data/seoPages.json, which scripts/seo.cjs also uses to write a static copy of each page's head
// for crawlers that do not run JavaScript.
import seoPages from '../data/seoPages.json';

// The public address of the site. Set REACT_APP_SITE_URL in the environment; without it the page's own origin is used.
export const SITE_URL = (process.env.REACT_APP_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/+$/, '');
export const DEFAULT_IMAGE = '/og-image.jpg';

const OG_LOCALE = { en: 'en_US', ne: 'ne_NP', hi: 'hi_IN', zh: 'zh_CN', ta: 'ta_IN' };
const pick = (obj, lang) => (obj && (obj[lang] || obj.en)) || '';
const cut = (text, max) => {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
};
export const absoluteUrl = (value) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE_URL}${value.startsWith('/') ? '' : '/'}${value}`;
};

const head = () => document.head;
const upsert = (selector, create, set) => {
  let el = head().querySelector(selector);
  if (!el) { el = create(); head().appendChild(el); }
  set(el);
};
const meta = (attr, key, content) => {
  if (content === undefined || content === null || content === '') {
    const el = head().querySelector(`meta[${attr}="${key}"]`);
    if (el) el.remove();
    return;
  }
  upsert(`meta[${attr}="${key}"]`, () => { const m = document.createElement('meta'); m.setAttribute(attr, key); return m; }, (m) => m.setAttribute('content', content));
};
const link = (rel, href) => {
  if (!href) { const el = head().querySelector(`link[rel="${rel}"]`); if (el) el.remove(); return; }
  upsert(`link[rel="${rel}"]`, () => { const l = document.createElement('link'); l.setAttribute('rel', rel); return l; }, (l) => l.setAttribute('href', href));
};
const jsonLd = (id, data) => {
  const existing = document.getElementById(id);
  if (!data) { if (existing) existing.remove(); return; }
  const script = existing || Object.assign(document.createElement('script'), { id, type: 'application/ld+json' });
  script.textContent = JSON.stringify(data);
  if (!existing) head().appendChild(script);
};

/** Write the head tags for one page. */
export const applySeo = ({ title, description, path = '/', lang = 'en', image, imageAlt, type = 'website', noindex = false, published, breadcrumb = true }) => {
  if (typeof document === 'undefined') return;
  const brand = pick(seoPages.brand, lang);
  const url = `${SITE_URL}${path === '/' ? '/' : path.replace(/\/+$/, '')}`;
  const img = absoluteUrl(image || DEFAULT_IMAGE);
  const alt = imageAlt || pick(seoPages.imageAlt, lang);

  document.title = title;
  meta('name', 'description', description);
  meta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1');
  link('canonical', noindex ? '' : url);

  meta('property', 'og:type', type);
  meta('property', 'og:site_name', brand);
  meta('property', 'og:title', title);
  meta('property', 'og:description', description);
  meta('property', 'og:url', noindex ? '' : url);
  meta('property', 'og:image', img);
  meta('property', 'og:image:alt', alt);
  meta('property', 'og:locale', OG_LOCALE[lang] || OG_LOCALE.en);
  head().querySelectorAll('meta[property="og:locale:alternate"]').forEach((el) => el.remove());
  Object.entries(OG_LOCALE).filter(([code]) => code !== lang).forEach(([, value]) => {
    const m = document.createElement('meta');
    m.setAttribute('property', 'og:locale:alternate');
    m.setAttribute('content', value);
    head().appendChild(m);
  });
  if (type === 'article' && published) meta('property', 'article:published_time', published); else meta('property', 'article:published_time', '');

  meta('name', 'twitter:card', 'summary_large_image');
  meta('name', 'twitter:title', title);
  meta('name', 'twitter:description', description);
  meta('name', 'twitter:image', img);
  meta('name', 'twitter:image:alt', alt);

  const crumbs = breadcrumb && !noindex && path !== '/'
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: brand, item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: title.split(' | ')[0], item: url },
        ],
      }
    : null;
  jsonLd('seo-breadcrumb', crumbs);
};

const isNoindex = (path) => seoPages.noindex.some((p) => path === p || path.startsWith(`${p}/`));

/** Head tags for a route from data/seoPages.json; unknown routes (blog posts, custom pages) get the blog / site default. */
export const applyRouteSeo = (pathname, lang) => {
  const raw = (pathname || '/').replace(/\/+$/, '') || '/';
  // the gallery's tabs (/gallery/videos ...) are one page: they share its address
  const path = raw.startsWith('/gallery/') ? '/gallery' : raw;
  const lookup = path.startsWith('/blogs/') ? '/blogs' : path;
  const page = seoPages.pages[lookup] || (path.startsWith('/admin') || path.startsWith('/super') ? seoPages.pages['/admin'] : null);
  const brand = pick(seoPages.brand, lang);
  if (!page) {
    applySeo({ title: brand, description: pick(seoPages.pages['/'].description, lang), path, lang, noindex: isNoindex(path) || path.startsWith('/page-') });
    return;
  }
  const name = pick(page.title, lang);
  const title = page.full ? name : `${name} | ${brand}`;
  applySeo({ title, description: pick(page.description, lang), path, lang, noindex: isNoindex(path) });
};

export const trimDescription = (text, max = 160) => cut(text, max);
