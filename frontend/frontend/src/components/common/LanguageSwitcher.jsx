import React from 'react';
import useEnabledLanguages from '../../hooks/useEnabledLanguages';

const LanguageSwitcher = ({ active, onChange, t }) => {
  const enabled = useEnabledLanguages();

  const allLanguages = [
    { code: 'en', label: t?.langEnglish || 'English' },
    { code: 'ne', label: t?.langNepali || 'नेपाली' },
    { code: 'hi', label: t?.langHindi || 'हिन्दी' },
    { code: 'zh', label: t?.langChinese || '中文' },
    { code: 'ta', label: t?.langTamil || 'தமிழ்' },
  ];

  const languages = allLanguages.filter((l) => enabled.includes(l.code));

  return (
    <div className="flex gap-1.5 mb-4 bg-panel p-1 rounded-xl w-fit flex-wrap">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => onChange(lang.code)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            active === lang.code
              ? 'bg-white text-maroon shadow-sm'
              : 'text-ink-soft hover:text-ink'
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;