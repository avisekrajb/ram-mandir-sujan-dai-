// SEO files for the static site.
//
//   node scripts/seo.cjs public   writes public/robots.txt and public/sitemap.xml for the production address
//   node scripts/seo.cjs build    runs after `react-scripts build` (npm run build does this): refreshes the sitemap and robots.txt in
//                                 build/, and writes a copy of build/index.html for every public route (build/history/index.html ...)
//                                 with that page's title, description, canonical address and Open Graph / Twitter tags. Static hosts
//                                 serve these files for /history and so on, so Facebook, WhatsApp, X and Bing, which do not run
//                                 JavaScript, see page-specific tags. The English text is used; the app switches the language.
//
// The address is REACT_APP_SITE_URL (environment, then .env.production, then .env). To add published blog posts to the sitemap set
// SEO_API_URL to the API address (for example https://api.example.org/api) when building.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pages = require('../src/data/seoPages.json');
const mode = process.argv[2] || 'build';

const readEnv = (file) => {
  try {
    return Object.fromEntries(
      fs.readFileSync(path.join(root, file), 'utf8').split(/\r?\n/)
        .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean).map((m) => [m[1], m[2]]),
    );
  } catch { return {}; }
};
const site = (process.env.SEO_SITE_URL || process.env.REACT_APP_SITE_URL || readEnv('.env.production').REACT_APP_SITE_URL || readEnv('.env').REACT_APP_SITE_URL || '').replace(/\/+$/, '');
if (!/^https?:\/\//.test(site)) { console.error('seo: set REACT_APP_SITE_URL (for example https://example.org)'); process.exit(1); }

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const noindex = (p) => pages.noindex.some((n) => p === n || p.startsWith(`${n}/`));
const publicRoutes = Object.keys(pages.pages).filter((p) => !noindex(p));
const META = {
  '/': { changefreq: 'weekly', priority: '1.0' },
  '/events': { changefreq: 'weekly', priority: '0.8' },
  '/history': { changefreq: 'monthly', priority: '0.8' },
  '/about': { changefreq: 'monthly', priority: '0.8' },
  '/blogs': { changefreq: 'weekly', priority: '0.7' },
  '/calendar': { changefreq: 'daily', priority: '0.6' },
  '/privacy': { changefreq: 'yearly', priority: '0.3' },
  '/terms': { changefreq: 'yearly', priority: '0.3' },
};

const fetchJson = async (url) => {
  try { const r = await fetch(url, { signal: AbortSignal.timeout(8000) }); return r.ok ? await r.json() : null; } catch { return null; }
};

const robots = () => [
  'User-agent: *',
  'Allow: /',
  'Disallow: /admin',
  'Disallow: /super',
  'Disallow: /profile',
  'Disallow: /mybookings',
  'Disallow: /booking',
  'Disallow: /reset-password',
  'Disallow: /donate/success',
  'Disallow: /donate/failure',
  'Disallow: /api/',
  '',
  `Sitemap: ${site}/sitemap.xml`,
  '',
].join('\n');

const sitemap = (extra = []) => {
  const entry = (loc, m = {}, lastmod) => `  <url>\n    <loc>${esc(loc)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}${m.changefreq ? `\n    <changefreq>${m.changefreq}</changefreq>` : ''}${m.priority ? `\n    <priority>${m.priority}</priority>` : ''}\n  </url>`;
  const urls = publicRoutes.map((p) => entry(`${site}${p === '/' ? '/' : p}`, META[p] || { changefreq: 'monthly', priority: '0.6' }));
  extra.forEach((e) => urls.push(entry(e.loc, { changefreq: 'monthly', priority: '0.6' }, e.lastmod)));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
};

if (mode === 'public') {
  fs.writeFileSync(path.join(root, 'public', 'robots.txt'), robots());
  fs.writeFileSync(path.join(root, 'public', 'sitemap.xml'), sitemap());
  console.log(`seo: wrote public/robots.txt and public/sitemap.xml for ${site} (${publicRoutes.length} pages)`);
  process.exit(0);
}

(async () => {
  const build = process.env.BUILD_PATH ? path.resolve(root, process.env.BUILD_PATH) : path.join(root, 'build'); // BUILD_PATH is react-scripts' own setting
  const templatePath = path.join(build, 'index.html');
  if (!fs.existsSync(templatePath)) { console.error('seo: build/index.html not found; run the build first'); process.exit(1); }
  const template = fs.readFileSync(templatePath, 'utf8');

  // published blog posts, when the API address is given
  const extra = [];
  if (process.env.SEO_API_URL) {
    const list = await fetchJson(`${process.env.SEO_API_URL.replace(/\/+$/, '')}/admin/blogs`);
    (list?.data || []).filter((b) => b && b._id && b.published !== false).forEach((b) => extra.push({ loc: `${site}/blogs/${b._id}`, lastmod: String(b.updatedAt || b.createdAt || '').slice(0, 10) || undefined }));
    console.log(`seo: ${extra.length} blog posts added to the sitemap`);
  }
  fs.writeFileSync(path.join(build, 'sitemap.xml'), sitemap(extra));
  fs.writeFileSync(path.join(build, 'robots.txt'), robots());

  const setMeta = (html, attr, key, value) => html.replace(new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`), (_, a, b) => `${a}${esc(value)}${b}`);
  let written = 0;
  for (const route of publicRoutes) {
    const page = pages.pages[route];
    const name = page.title.en;
    const title = page.full ? name : `${name} | ${pages.brand.en}`;
    const description = page.description.en;
    const url = `${site}${route === '/' ? '/' : route}`;
    let html = template
      .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
      .replace(/(<noscript><main[^>]*><h1[^>]*>)[^<]*(<\/h1><p>)[^<]*(<\/p>)/, (_, a, b, c) => `${a}${esc(name)}${b}${esc(description)}${c}`);
    html = setMeta(html, 'name', 'description', description);
    html = setMeta(html, 'property', 'og:title', title);
    html = setMeta(html, 'property', 'og:description', description);
    html = setMeta(html, 'name', 'twitter:title', title);
    html = setMeta(html, 'name', 'twitter:description', description);
    // build/index.html is also what the host serves for every address it has no file for, so the home copy carries no canonical address
    if (route !== '/') html = html.replace('</head>', `<link rel="canonical" href="${esc(url)}"/><meta property="og:url" content="${esc(url)}"/></head>`);
    const out = route === '/' ? templatePath : path.join(build, route.replace(/^\//, ''), 'index.html');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, html);
    written += 1;
  }
  console.log(`seo: ${written} page heads, sitemap.xml and robots.txt written to build/ for ${site}`);
})();
