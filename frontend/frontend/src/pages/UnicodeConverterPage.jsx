import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeftRight, CalendarDays, Clock, Coins, Languages } from 'lucide-react';
import TimeWeather from '../components/common/header/TimeWeather';
import { TextSizeMini } from '../components/common/header/TextSizeMenu';
import PageHeader from '../components/common/PageHeader';
import DateConverter from '../components/tools/DateConverter';
import TextConverter from '../components/tools/TextConverter';
import CurrencyConverter from '../components/tools/CurrencyConverter';
import { useLanguage } from '../context/LanguageContext';

/* One Tools page, one tab per tool. Deep links: /tools#date | #text | #currency | #time */
const TABS = [
  { id: 'date', icon: ArrowLeftRight, key: 'a5_toolDate', fallback: 'Date Converter', sub: 'AD ⇄ BS' },
  { id: 'text', icon: Languages, key: 'a5_toolText', fallback: 'Unicode / Preeti Converter', sub: 'Preeti ⇄ Unicode' },
  { id: 'currency', icon: Coins, key: 'a5_toolCurrency', fallback: 'Currency Exchange', sub: 'NPR' },
  { id: 'time', icon: Clock, key: 'a5_toolTime', fallback: 'Time & Weather', sub: 'Kathmandu' },
];

const ToolsPage = () => {
  const { t, lang } = useLanguage();
  const { hash } = useLocation();
  const navigate = useNavigate();
  const fromHash = hash.slice(1);
  const [active, setActive] = useState(TABS.some((x) => x.id === fromHash) ? fromHash : 'date');
  const tabRefs = useRef({});

  useEffect(() => {
    if (TABS.some((x) => x.id === fromHash)) setActive(fromHash);
  }, [fromHash]);

  const select = (id) => {
    setActive(id);
    navigate({ hash: '#' + id }, { replace: true });
  };

  // Arrow keys move between tabs, as people expect from a tab list.
  const onTabKey = (e, index) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!step && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : (index + step + TABS.length) % TABS.length;
    select(TABS[next].id);
    tabRefs.current[TABS[next].id]?.focus();
  };

  const current = TABS.find((x) => x.id === active) || TABS[0];

  return (
    <div className="bg-panel px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
      <div className="mx-auto max-w-5xl">
        <PageHeader sub={t.a5_toolsSub || 'Date, text and currency converters, plus Kathmandu time and weather, all in one place.'}>
          {t.a5_toolsTitle || 'Tools'}
        </PageHeader>

        <div className="mt-4 flex items-center justify-center gap-3 text-sm text-mute">
          <span>{t.textSize || 'Text size'}</span>
          <TextSizeMini t={t} />
        </div>

        <div role="tablist" aria-label={t.a5_toolsTitle || 'Tools'} className="mt-6 flex flex-wrap justify-center gap-2">
          {TABS.map((tab, index) => {
            const on = tab.id === active;
            return (
              <button
                key={tab.id}
                ref={(el) => { tabRefs.current[tab.id] = el; }}
                type="button"
                role="tab"
                id={'tab-' + tab.id}
                aria-selected={on}
                aria-controls={'panel-' + tab.id}
                tabIndex={on ? 0 : -1}
                onClick={() => select(tab.id)}
                onKeyDown={(e) => onTabKey(e, index)}
                className={`inline-flex min-h-[2.75rem] items-center gap-2 rounded-full border px-5 text-sm font-semibold transition-colors ${
                  on ? 'border-vermilion bg-vermilion text-white shadow-sm' : 'border-line bg-white text-ink hover:border-vermilion hover:text-vermilion'
                }`}
              >
                <tab.icon size={16} aria-hidden="true" />
                {t[tab.key] || tab.fallback}
              </button>
            );
          })}
        </div>

        <section
          role="tabpanel"
          id={'panel-' + current.id}
          aria-labelledby={'tab-' + current.id}
          className="mt-6 overflow-hidden rounded-3xl border border-line bg-white shadow-rt"
        >
          <div className="flex items-center gap-4 border-b border-line px-4 py-5 sm:px-10">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-vermilion text-white">
              <current.icon size={22} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="font-serif text-2xl font-semibold text-ink">{t[current.key] || current.fallback}</h2>
              <span className="mt-1 inline-block rounded-md bg-brand-50 px-2.5 py-0.5 font-mono text-xs text-vermilion">{current.sub}</span>
            </div>
          </div>

          {current.id === 'date' && <DateConverter t={t} lang={lang} />}
          {current.id === 'text' && <TextConverter t={t} lang={lang} />}
          {current.id === 'currency' && <CurrencyConverter t={t} lang={lang} />}
          {current.id === 'time' && (
            <div className="mx-auto max-w-2xl space-y-5 px-4 pb-6 pt-5 sm:px-10 sm:pb-10 sm:pt-8">
              <TimeWeather t={t} lang={lang} detailed />
              <Link to="/calendar" className="btn-primary w-full">
                <CalendarDays size={16} aria-hidden="true" /> {t.a5_openCalendar || 'Open the Nepali calendar'}
              </Link>
            </div>
          )}
        </section>

        <p className="mt-8 text-center text-sm text-mute">{t.a5_inputStays || 'Your input stays entirely in your browser.'}</p>
      </div>
    </div>
  );
};

export default ToolsPage;
