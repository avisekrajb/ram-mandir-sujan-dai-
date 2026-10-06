import admin1 from './admin1';
import admin2 from './admin2';
import admin3 from './admin3';
import admin4 from './admin4';
import admin5 from './admin5';
import admin6 from './admin6';
import admin7 from './admin7';

const LANGS = ['en', 'ne', 'hi', 'zh', 'ta'];

/**
 * Every admin-panel string, per language. Loaded on demand (utils/i18n/index.js, loadAdminTranslations) when an admin panel
 * opens, so the public site does not download them.
 */
const adminAll = LANGS.reduce((acc, lang) => {
  acc[lang] = Object.assign({}, ...[admin1, admin2, admin3, admin4, admin5, admin6, admin7].map((d) => d[lang] || {}));
  return acc;
}, {});

export default adminAll;
