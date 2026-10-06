import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeftRight, Clock, Coins, Languages, Moon, Sparkles, Sunrise, Sunset } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import useSiteSettings from '../../hooks/useSiteSettings';
import useKtmClock from './header/useKtmClock';
import { formatPatroClock, patroName } from './header/usePatroToday';

/**
 * The strip above the navbar, kept simple: today's panchang on the left (sunrise, sunset, the tithi with
 * its Krishna/Shukla half, and the festival or the next one) and the four tools on the right, each by
 * name with its own icon, each opening that tool directly (/tools#date | #text | #currency | #time).
 * The "Time & Weather" tool keeps an icon that matches the live weather, but no temperature: that is shown at
 * the bottom of the Contact page. The clock and the dates are not repeated here: the Time & Weather tool and
 * the calendar show them.
 *
 * It scrolls away with the page; the navbar below is the part that sticks. Wide screens get everything on
 * one line; narrower ones put the tools on a second line, and on a phone each line scrolls sideways
 * instead of wrapping into a tall block. If the patro cannot be reached the panchang is simply left out.
 */

// The same four tools, names and icons as the Tools page itself.
const TOOLS = [
  { id: 'date', icon: ArrowLeftRight, key: 'a5_toolDate', fallback: 'Date Converter' },
  { id: 'text', icon: Languages, key: 'a5_toolText', fallback: 'Unicode / Preeti Converter' },
  { id: 'currency', icon: Coins, key: 'a5_toolCurrency', fallback: 'Currency Exchange' },
  { id: 'time', icon: Clock, key: 'a5_toolTime', fallback: 'Time & Weather' },
];

// A row that scrolls sideways on a phone without showing a scrollbar.
const ROW = 'flex min-w-0 max-w-full items-center overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

const TopInfoBar = () => {
  const { t, lang } = useLanguage();
  const { weather, digits, patro } = useKtmClock(lang);
  const location = useLocation();
  const settings = useSiteSettings();

  /*
   * Admin → Header can switch the strip off as a whole, or just one of its two
   * halves. Read as `!== false` throughout, so a settings document that predates
   * these switches (or one whose request failed) leaves the strip as it is
   * rather than blanking it.
   */
  // Named `part`, not `on`: the tool loop below already has a local `on` for
  // "which tab is open", and shadowing it here would be confusing to read.
  const part = (key) => !settings || settings.header?.[key]?.enabled !== false;
  if (!part('topBar')) return null;
  const showPanchang = part('panchang');
  const showTools = part('tools');
  // With both halves hidden the strip would be an empty bordered strip, which
  // reads as a mistake rather than a choice, so the wrapper goes too.
  if (!showPanchang && !showTools) return null;

  // ----- today's panchang -----
  const devanagari = lang === 'ne' || lang === 'hi';
  const tithiName = patro ? (devanagari ? patro.tithiNp : patro.tithiEn) || patro.tithiEn || patro.tithiNp : '';
  // "Krishna Dashami": the half of the lunar month first, as it is said. Purnima and Aunsi carry no half
  // (they are the last day of one) and an unknown half is left off.
  const paksha = patro?.paksha ? t[`tp_${patro.paksha}`] || '' : '';
  const tithi = paksha && tithiName ? `${paksha} ${tithiName}` : tithiName;
  const sunrise = patro ? formatPatroClock(patro.sunrise, lang) : '';
  const sunset = patro ? formatPatroClock(patro.sunset, lang) : '';

  // A festival today, else the next one with how far away it is.
  let festival = null;
  if (patro && patro.events.length > 0) {
    festival = {
      lead: t.today || 'Today',
      name: patroName(patro.events[0], lang),
      more: patro.events.length - 1,
      holiday: patro.isHoliday,
    };
  } else if (patro?.next) {
    const n = patro.next.daysAway;
    festival = {
      lead: t.tp_next || 'Next',
      name: patroName(patro.next.events[0], lang),
      more: patro.next.events.length - 1,
      when: n === 1 ? (t.tp_tomorrow || 'Tomorrow') : (t.tp_inDays || 'in {n} days').replace('{n}', digits(n)),
      holiday: patro.next.isHoliday,
    };
  }
  const festivalTitle = festival
    ? `${festival.lead}: ${festival.name}${festival.more > 0 ? ` +${festival.more}` : ''}${festival.when ? ` · ${festival.when}` : ''}`
    : '';
  const hasPanchang = !!(sunrise || sunset || tithi || festival);

  // The tool that is open right now is marked, as the tabs on the Tools page are.
  const openTool = location.pathname === '/tools' ? location.hash.slice(1) || 'date' : '';

  return (
    <div className="rt-site-header border-b border-line bg-panel text-ink" lang={lang}>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-0.5 px-4 py-1.5 text-[13px] sm:px-6">
        {/* panchang */}
        {hasPanchang && showPanchang && (
          <div className={`${ROW} gap-x-4 text-ink-soft`} aria-label={t.tp_panchang || 'Today’s panchang'}>
            {sunrise && (
              <span className="inline-flex shrink-0 items-center gap-1.5" title={`${t.sunrise || 'Sunrise'} ${sunrise}`}>
                <Sunrise size={16} className="text-vermilion" aria-hidden="true" />
                <span className="sr-only">{t.sunrise || 'Sunrise'}</span>
                <span className="font-medium text-ink">{sunrise}</span>
              </span>
            )}

            {sunset && (
              <span className="inline-flex shrink-0 items-center gap-1.5" title={`${t.sunset || 'Sunset'} ${sunset}`}>
                <Sunset size={16} className="text-vermilion" aria-hidden="true" />
                <span className="sr-only">{t.sunset || 'Sunset'}</span>
                <span className="font-medium text-ink">{sunset}</span>
              </span>
            )}

            {tithi && (
              <span className="inline-flex shrink-0 items-center gap-1.5" title={`${t.tithi || 'Tithi'}: ${tithi}`}>
                <Moon size={16} className="text-vermilion" aria-hidden="true" />
                <span className="sr-only">{t.tithi || 'Tithi'}:</span>
                <span className="font-medium text-ink">{tithi}</span>
              </span>
            )}

            {festival && festival.name && (
              <Link
                to="/calendar"
                title={festivalTitle}
                className="inline-flex shrink-0 items-center gap-1.5 transition-colors hover:text-vermilion"
              >
                <Sparkles size={16} className="text-vermilion" aria-hidden="true" />
                {!festival.when && <span>{festival.lead}:</span>}
                <span className={`font-medium ${festival.holiday && !festival.when ? 'text-vermilion' : 'text-ink'}`}>
                  {festival.name}
                  {festival.more > 0 ? ` +${digits(festival.more)}` : ''}
                </span>
                {festival.when && <span>· {festival.when}</span>}
              </Link>
            )}
          </div>
        )}

        {/* the four tools, by name */}
        {showTools && (
        <nav className={`${ROW} gap-1 ${showPanchang && hasPanchang ? 'sm:ml-auto' : ''}`} aria-label={t.a5_toolsTitle || 'Tools'}>
          {TOOLS.map((tool) => {
            const on = tool.id === openTool;
            // The live weather icon replaces the clock on the "Time & Weather" tool.
            const Icon = tool.id === 'time' && weather ? weather.cond.Icon : tool.icon;
            return (
              <Link
                key={tool.id}
                to={`/tools#${tool.id}`}
                aria-current={on ? 'page' : undefined}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 font-medium transition-colors ${
                  on ? 'bg-white text-vermilion shadow-sm ring-1 ring-line' : 'text-ink-soft hover:bg-white hover:text-vermilion'
                }`}
              >
                <Icon size={16} className={on ? '' : 'text-vermilion'} aria-hidden="true" />
                <span>{t[tool.key] || tool.fallback}</span>
              </Link>
            );
          })}
        </nav>
        )}
      </div>
    </div>
  );
};

export default TopInfoBar;
