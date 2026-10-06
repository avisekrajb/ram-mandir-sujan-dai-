import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
// Site + admin dictionaries merged per language (missing keys fall back to English).
import { translations } from '../utils/i18n';
import {
  getLanguage,
  getStoredLanguage,
  setLanguage,
  hasUserChosenLanguage,
} from '../services/auth';
import api from '../services/api';

const LanguageContext = createContext(null);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};

const SUPPORTED = ['en', 'ne', 'hi', 'zh', 'ta'];

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => getLanguage() || 'en');
  const [isDetecting, setIsDetecting] = useState(false);

  /**
   * Apply a language change.
   * `userChosen` is true only for an explicit pick from the switcher, and that
   * is what permanently pins the language for this browser.
   */
  const changeLanguage = useCallback((next, { userChosen = true } = {}) => {
    if (!SUPPORTED.includes(next)) return;
    setLang(next);
    setLanguage(next, { userChosen });
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  /**
   * First-visit geo-detection.
   *
   * Runs only when nothing has been stored yet, so it can never override a
   * language the visitor chose. A visitor in Nepal lands on Nepali; visitors in
   * the other supported regions get that region's language; everywhere else
   * stays English.
   *
   * Two guards matter here:
   *  - The request is skipped entirely once a language is stored, so repeat
   *    visits do not pay for the lookup.
   *  - A failed or inconclusive lookup leaves the current language alone
   *    rather than guessing.
   */
  useEffect(() => {
    if (hasUserChosenLanguage() || getStoredLanguage()) return undefined;
    if (isDetecting) return undefined;

    let active = true;
    setIsDetecting(true);

    (async () => {
      try {
        const res = await api.get('/visitors/detect');
        if (!active) return;

        const detected = res?.data?.data;
        const next = detected?.lang;

        // `detected: false` means the country could not be resolved, so the
        // server returned a bare English fallback. Applying it would be
        // indistinguishable from a guess, so keep whatever is showing.
        if (detected?.detected && SUPPORTED.includes(next)) {
          // Stored without the user-chosen flag, so a later explicit pick wins.
          setLanguage(next, { userChosen: false });
          setLang(next);
        }
      } catch {
        // Detection is best-effort; a failure must not affect the page.
      } finally {
        if (active) setIsDetecting(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [isDetecting]);

  const t = translations[lang] || translations.en;

  return (
    <LanguageContext.Provider value={{ lang, setLang: changeLanguage, t, isDetecting }}>
      {children}
    </LanguageContext.Provider>
  );
};