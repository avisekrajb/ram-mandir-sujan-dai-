import React, { useMemo, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import {
  BS_MONTH_DAYS,
  BS_MONTHS,
  GREGORIAN_MONTHS,
  WEEKDAYS,
  adToBs,
  bsToAd,
  formatAdDate,
  formatBsDate,
  getBsMonthDays,
  localDigits,
} from '../../utils/nepaliCalendar';
import { fieldClass, labelClass, fill, useCopy } from './toolsShared';

const BS_YEARS = Object.keys(BS_MONTH_DAYS).map(Number);
const BS_FIRST = BS_YEARS[0];
const BS_LAST = BS_YEARS[BS_YEARS.length - 1];

const partsOf = (utcDate) => ({ year: utcDate.getUTCFullYear(), month: utcDate.getUTCMonth() + 1, day: utcDate.getUTCDate() });

// The English dates the calendar table covers: the first and last day of the BS years it holds.
const AD_FIRST = partsOf(bsToAd(BS_FIRST, 1, 1));
const AD_LAST = partsOf(bsToAd(BS_LAST, 12, getBsMonthDays(BS_LAST, 12)));

const daysInAdMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();

// Today in Nepal, whatever the visitor's own clock says.
const ktmToday = () => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kathmandu', year: 'numeric', month: 'numeric', day: 'numeric' })
      .formatToParts(new Date())
      .map((x) => [x.type, x.value])
  );
  return { year: Number(p.year), month: Number(p.month), day: Number(p.day) };
};

const relativeLabel = (t, lang, ad, today) => {
  const diff = Math.round((Date.UTC(ad.year, ad.month - 1, ad.day) - Date.UTC(today.year, today.month - 1, today.day)) / 86400000);
  if (diff === 0) return t.tb_relToday || 'Today';
  if (diff === 1) return t.tb_relTomorrow || 'Tomorrow';
  if (diff === -1) return t.tb_relYesterday || 'Yesterday';
  const n = localDigits(Math.abs(diff), lang);
  return diff > 0 ? fill(t.tb_relIn || 'In {n} days', { n }) : fill(t.tb_relAgo || '{n} days ago', { n });
};

// Latin digits whatever the visitor types (Devanagari digits are fine too).
const toLatinYear = (text) =>
  text.replace(/[०-९]/g, (d) => '०१२३४५६७८९'.indexOf(d)).replace(/\D/g, '').slice(0, 4);

function Field({ id, label, className = '', children }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

function Result({ t, label, primary, secondary, weekday, relative, error, copyText }) {
  const [copied, copy] = useCopy(t);
  return (
    <div className="mt-5 rounded-2xl border border-line bg-white p-5" aria-live="polite">
      {error ? (
        <p role="alert" className="text-base font-medium text-red-600">{error}</p>
      ) : (
        <>
          <p className="text-sm font-semibold text-mute">{label}</p>
          <p className="mt-1.5 font-serif text-2xl font-semibold leading-snug text-ink sm:text-3xl">{primary}</p>
          <p className="mt-2 text-lg text-ink">
            {weekday}
            {relative ? <span className="text-ink-soft"> · {relative}</span> : null}
          </p>
          <p className="mt-0.5 text-base text-ink-soft">{secondary}</p>
          <button type="button" onClick={() => copy(copyText)} className="btn-outline mt-4 px-4">
            {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
            {copied ? (t.copied || 'Copied!') : (t.copy || 'Copy')}
          </button>
        </>
      )}
    </div>
  );
}

function Panel({ tag, todayLabel, onToday, children, result }) {
  return (
    <section className="min-w-0 rounded-2xl border border-line bg-panel p-4 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="rounded-full bg-vermilion px-3.5 py-1.5 text-sm font-bold text-white">{tag}</h3>
        <button type="button" onClick={onToday} className="btn-outline px-4">{todayLabel}</button>
      </div>
      {children}
      {result}
    </section>
  );
}

// Year, month and day side by side from `sm`; on a phone the day drops to its own row so the month name fits.
const GRID = 'grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,0.9fr)]';
const DAY_FIELD = 'col-span-2 sm:col-span-1';

/** Date converter: English (AD) to Bikram Sambat (BS) and back, as two panels that answer as you pick. */
export default function DateConverter({ t, lang }) {
  const today = useMemo(ktmToday, []);
  const todayBs = useMemo(() => adToBs(new Date(today.year, today.month - 1, today.day)), [today]);

  const [adYearText, setAdYearText] = useState(String(today.year));
  const [adMonth, setAdMonth] = useState(today.month);
  const [adDay, setAdDay] = useState(today.day);

  const [bsYear, setBsYear] = useState(todayBs ? todayBs.year : BS_LAST);
  const [bsMonth, setBsMonth] = useState(todayBs ? todayBs.month : 1);
  const [bsDay, setBsDay] = useState(todayBs ? todayBs.day : 1);

  const adMonths = GREGORIAN_MONTHS[lang] || GREGORIAN_MONTHS.en;
  const bsMonths = BS_MONTHS[lang] || BS_MONTHS.en;
  const weekdays = WEEKDAYS[lang] || WEEKDAYS.en;
  const other = lang === 'ne' ? 'en' : 'ne'; // the second line is written in the other script

  const range = {
    from: formatAdDate(AD_FIRST, lang, true),
    to: formatAdDate(AD_LAST, lang, true),
  };

  // AD → BS
  const adYear = /^\d{4}$/.test(adYearText) ? Number(adYearText) : null;
  const adDayCount = adYear == null ? 31 : daysInAdMonth(adYear, adMonth);
  const adDayShown = Math.min(adDay, adDayCount);

  const adResult = useMemo(() => {
    if (adYear == null) return { error: t.tb_yearIncomplete || 'Enter a four-digit year.' };
    const bs = adToBs(new Date(adYear, adMonth - 1, adDayShown));
    if (!bs) {
      return { error: fill(t.tb_outOfRange || 'This date is outside the supported range: {from} to {to}.', range) };
    }
    const ad = { year: adYear, month: adMonth, day: adDayShown };
    const primary = formatBsDate(bs, lang);
    const weekday = weekdays[bs.weekday];
    return {
      primary,
      weekday,
      secondary: formatBsDate(bs, other),
      relative: relativeLabel(t, lang, ad, today),
      copyText: `${primary}, ${weekday}`,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adYear, adMonth, adDayShown, lang, t]);

  // BS → AD
  const bsDayCount = getBsMonthDays(bsYear, bsMonth);
  const bsDayShown = Math.min(bsDay, bsDayCount);

  const bsResult = useMemo(() => {
    const d = bsToAd(bsYear, bsMonth, bsDayShown);
    if (!d) return { error: fill(t.tb_outOfRange || 'This date is outside the supported range: {from} to {to}.', range) };
    const ad = partsOf(d);
    const primary = formatAdDate(ad, lang);
    const weekday = weekdays[d.getUTCDay()];
    return {
      primary,
      weekday,
      secondary: formatAdDate(ad, other),
      relative: relativeLabel(t, lang, ad, today),
      copyText: `${primary}, ${weekday}`,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bsYear, bsMonth, bsDayShown, lang, t]);

  const useTodayAd = () => { setAdYearText(String(today.year)); setAdMonth(today.month); setAdDay(today.day); };
  const useTodayBs = () => {
    if (!todayBs) return;
    setBsYear(todayBs.year); setBsMonth(todayBs.month); setBsDay(todayBs.day);
  };

  return (
    <div className="px-4 pb-6 pt-5 sm:px-10 sm:pb-10 sm:pt-8">
      <div className="grid gap-5 lg:grid-cols-2">
        {/* English date → Nepali date */}
        <Panel
          tag={t.tb_adToBs || 'AD → BS'}
          todayLabel={t.today || 'Today'}
          onToday={useTodayAd}
          result={(
            <Result
              t={t}
              label={t.tb_resultBs || 'Bikram Sambat date'}
              error={adResult.error}
              primary={adResult.primary}
              weekday={adResult.weekday}
              secondary={adResult.secondary}
              relative={adResult.relative}
              copyText={adResult.copyText}
            />
          )}
        >
          <p className="mb-3 text-base text-ink-soft">{t.tb_pickAd || 'Pick an English date'}</p>
          <div className={GRID}>
            <Field id="ad-year" label={t.year || 'Year'}>
              <input
                id="ad-year"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                placeholder="YYYY"
                value={adYearText}
                onChange={(e) => setAdYearText(toLatinYear(e.target.value))}
                aria-invalid={adYear == null}
                className={fieldClass}
              />
            </Field>
            <Field id="ad-month" label={t.month || 'Month'}>
              <select id="ad-month" value={adMonth} onChange={(e) => setAdMonth(Number(e.target.value))} className={fieldClass}>
                {adMonths.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
              </select>
            </Field>
            <Field id="ad-day" label={t.day || 'Day'} className={DAY_FIELD}>
              <select id="ad-day" value={adDayShown} onChange={(e) => setAdDay(Number(e.target.value))} className={fieldClass}>
                {Array.from({ length: adDayCount }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{localDigits(d, lang)}</option>
                ))}
              </select>
            </Field>
          </div>
        </Panel>

        {/* Nepali date → English date */}
        <Panel
          tag={t.tb_bsToAd || 'BS → AD'}
          todayLabel={t.today || 'Today'}
          onToday={useTodayBs}
          result={(
            <Result
              t={t}
              label={t.tb_resultAd || 'English date'}
              error={bsResult.error}
              primary={bsResult.primary}
              weekday={bsResult.weekday}
              secondary={bsResult.secondary}
              relative={bsResult.relative}
              copyText={bsResult.copyText}
            />
          )}
        >
          <p className="mb-3 text-base text-ink-soft">{t.tb_pickBs || 'Pick a Nepali date (BS)'}</p>
          <div className={GRID}>
            <Field id="bs-year" label={t.year || 'Year'}>
              <select id="bs-year" value={bsYear} onChange={(e) => setBsYear(Number(e.target.value))} className={fieldClass}>
                {BS_YEARS.map((y) => <option key={y} value={y}>{localDigits(y, lang)}</option>)}
              </select>
            </Field>
            <Field id="bs-month" label={t.month || 'Month'}>
              <select id="bs-month" value={bsMonth} onChange={(e) => setBsMonth(Number(e.target.value))} className={fieldClass}>
                {bsMonths.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
              </select>
            </Field>
            <Field id="bs-day" label={t.day || 'Day'} className={DAY_FIELD}>
              <select id="bs-day" value={bsDayShown} onChange={(e) => setBsDay(Number(e.target.value))} className={fieldClass}>
                {Array.from({ length: bsDayCount }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{localDigits(d, lang)}</option>
                ))}
              </select>
            </Field>
          </div>
        </Panel>
      </div>

      <p className="mt-5 text-sm leading-relaxed text-mute">
        {t.tb_liveNote || 'The result changes as you change the date.'}{' '}
        {fill(t.tb_range || 'Covers BS {bs}, which is {from} to {to} in the English calendar.', {
          bs: `${localDigits(BS_FIRST, lang)}–${localDigits(BS_LAST, lang)}`,
          ...range,
        })}
      </p>
    </div>
  );
}
