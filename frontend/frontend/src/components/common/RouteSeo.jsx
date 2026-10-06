import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { applyRouteSeo } from '../../utils/seo';

/**
 * Keeps the page title, description, canonical address and the Open Graph / Twitter tags in step with the
 * route and the reader's language. Pages with their own content (a blog post) set their own with <Seo>.
 */
const RouteSeo = () => {
  const { pathname } = useLocation();
  const { lang } = useLanguage();
  useEffect(() => { applyRouteSeo(pathname, lang); }, [pathname, lang]);
  return null;
};

export default RouteSeo;
