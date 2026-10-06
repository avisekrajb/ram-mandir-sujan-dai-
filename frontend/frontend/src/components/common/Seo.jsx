import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { applySeo, trimDescription } from '../../utils/seo';
import seoPages from '../../data/seoPages.json';

/** Head tags for a page whose title and text come from the content (e.g. a blog post). Renders nothing. */
const Seo = ({ title, description, image, type = 'website', published, noindex = false }) => {
  const { pathname } = useLocation();
  const { lang } = useLanguage();
  useEffect(() => {
    if (!title) return;
    const brand = seoPages.brand[lang] || seoPages.brand.en;
    applySeo({
      title: `${title} | ${brand}`,
      description: trimDescription(description || seoPages.pages['/'].description[lang] || seoPages.pages['/'].description.en),
      path: pathname,
      lang,
      image,
      type,
      published,
      noindex,
    });
  }, [title, description, image, type, published, noindex, pathname, lang]);
  return null;
};

export default Seo;
