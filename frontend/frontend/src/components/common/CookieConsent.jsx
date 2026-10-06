import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';

const STORAGE_KEY = 'srt_cookie_consent';

const messages = (lang, t) => {
  const defaults = {
    en: 'We use cookies to make the website faster and improve your experience. Do you accept cookies?',
    ne: 'वेबसाइट छिटो बनाउन र तपाईंको अनुभव सुधार्न हामी कुकीहरू प्रयोग गर्छौं। के तपाईं कुकीहरू स्वीकार गर्नुहुन्छ?',
    hi: 'वेबसाइट को तेज़ी से लोड करने और आपके अनुभव को बेहतर बनाने के लिए हम कुकीज़ का उपयोग करते हैं। क्या आप कुकीज़ स्वीकार करते हैं?',
    zh: '我们使用 Cookie 来加快网站速度并改善您的体验。您是否接受 Cookie？',
    ta: 'இணையதளத்தை வேகமாக்கவும் உங்கள் அனுபவத்தை மேம்படுத்தவும் நாங்கள் குக்கீகளைப் பயன்படுத்துகிறோம். குக்கீகளை ஏற்கிறீர்களா?',
  };
  return defaults[lang] || defaults.en;
};

const acceptedText = {
  en: 'Accept',
  ne: 'स्वीकार गर्नुहोस्',
  hi: 'स्वीकार करें',
  zh: '接受',
  ta: 'ஏற்க',
};

const declinedText = {
  en: 'Decline',
  ne: 'अस्वीकार गर्नुहोस्',
  hi: 'अस्वीकार करें',
  zh: '拒绝',
  ta: 'மறு',
};

export default function CookieConsent() {
  const { t, lang } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY)) return;
    const timer = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  const decide = (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch (e) {
      /* storage unavailable - just close the bar */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 sm:bottom-4 left-1/2 -translate-x-1/2 z-[140] w-full sm:w-[calc(100%-2rem)] max-w-2xl px-4 py-3 sm:py-3.5 rounded-t-2xl sm:rounded-2xl bg-white/95 backdrop-blur-md shadow-2xl shadow-black/10 ring-1 ring-slate-200 cookie-consent-in"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="flex-1 text-sm text-slate-600 leading-relaxed">
          {messages(lang)}
          {t.cookiePolicy && (
            <span className="ml-1 text-maroon font-medium">{t.cookiePolicy}</span>
          )}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => decide('declined')}
            className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
          >
            {declinedText[lang] || 'Decline'}
          </button>
          <button
            type="button"
            onClick={() => decide('accepted')}
            className="px-5 py-2 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-maroon to-maroon-deep shadow-md shadow-black/10 hover:-translate-y-0.5 transition-all"
          >
            {acceptedText[lang] || 'Accept'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes cookieConsentIn {
          from { opacity: 0; transform: translate(-50%, 16px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .cookie-consent-in {
          animation: cookieConsentIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}