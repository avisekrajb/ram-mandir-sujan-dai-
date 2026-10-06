import { translations as base } from '../translations';
import adminPublic from './adminPublic.generated';
import chat1 from './chat1';
import chat2 from './chat2';
import title1 from './title1';
import tools1 from './tools1';
import contact1 from './contact1';
import calendar1 from './calendar1';
import gallery1 from './gallery1';
import booking1 from './booking1';
import topbar1 from './topbar1';
import auth1 from './auth1';
import newsletter1 from './newsletter1';

const LANGS = ['en', 'ne', 'hi', 'zh', 'ta'];
// The admin panels' dictionaries (admin1-7.js, about 540 KB) are not part of this bundle: only the strings the public site uses
// (adminPublic, written by scripts/split-i18n.cjs) are. The rest is added by loadAdminTranslations() when an admin panel opens.
const extras = [adminPublic, chat1, chat2, title1, tools1, contact1, calendar1, gallery1, booking1, topbar1, auth1, newsletter1];

/**
 * All UI strings per language: the main site dictionary plus the extra dictionaries. Missing keys in a language fall back to
 * English.
 */
export const translations = LANGS.reduce((acc, lang) => {
  const en = Object.assign({}, base.en, ...extras.map((d) => d.en || {}));
  const own = Object.assign({}, base[lang], ...extras.map((d) => d[lang] || {}));
  acc[lang] = lang === 'en' ? en : { ...en, ...own };
  return acc;
}, {});

// Add every admin string to the dictionaries above, with the same English fallback.
const mergeAdmin = (all) => {
  LANGS.forEach((lang) => {
    if (lang !== 'en') {
      Object.keys(all.en).forEach((key) => { if (!(key in translations[lang])) translations[lang][key] = all.en[key]; });
    }
    Object.assign(translations[lang], all[lang]);
  });
};

let adminLoading = null;
/** Resolves once the admin dictionaries are in `translations`. The admin pages wait for it before they render. */
export const loadAdminTranslations = () => {
  if (!adminLoading) adminLoading = import('./adminAll').then((m) => mergeAdmin(m.default));
  return adminLoading;
};

// While developing, everything is there from the start, as it always was.
if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line global-require
  mergeAdmin(require('./adminAll').default);
  adminLoading = Promise.resolve();
}

export default translations;
