import React from 'react';
import { Check, ChevronDown, Globe } from 'lucide-react';
import Dropdown from './Dropdown';
import { LANGUAGES } from './navConfig';

/** Language picker: globe + current language code, menu of native names. */
const LanguageMenu = ({ lang, setLang, enabled, label = 'Language', filled = false, variant = 'icon' }) => {
  const bar = variant === 'bar';
  const options = LANGUAGES.filter((l) => enabled.includes(l.code));
  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  return (
    <Dropdown
      align="right"
      panelClassName="min-w-[11.25rem]"
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`${label}: ${current.native}`}
          className={filled
            ? 'inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-lg bg-vermilion px-3.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700'
            : bar
              ? 'inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-ink transition-colors hover:bg-white hover:text-vermilion'
              : 'icon-btn gap-1 px-3'}
          lang={filled || bar ? current.code : undefined}
        >
          {filled ? (
            <span>{current.native}</span>
          ) : bar ? (
            <>
              <Globe size={15} className="text-vermilion" aria-hidden="true" />
              <span>{current.native}</span>
            </>
          ) : (
            <>
              <Globe size={18} aria-hidden="true" />
              <span className="hidden text-sm font-semibold text-ink lg:inline">{current.short}</span>
            </>
          )}
          <ChevronDown size={14} aria-hidden="true" className={`transition-transform ${filled || bar ? '' : 'hidden lg:block'} ${open ? 'rotate-180' : ''}`} />
        </button>
      )}
    >
      {(close) =>
        options.map((l) => (
          <button
            key={l.code}
            type="button"
            role="menuitemradio"
            aria-checked={lang === l.code}
            lang={l.code}
            onClick={() => {
              setLang(l.code);
              close();
            }}
            className={`menu-item justify-between ${lang === l.code ? 'font-semibold text-vermilion' : ''}`}
          >
            <span>{l.native}</span>
            {lang === l.code && <Check size={16} aria-hidden="true" />}
          </button>
        ))
      }
    </Dropdown>
  );
};

export default LanguageMenu;
