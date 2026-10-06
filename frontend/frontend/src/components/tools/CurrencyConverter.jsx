import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Search, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { formatAdDate, localDigits } from '../../utils/nepaliCalendar';
import { fieldClass, labelClass, fill, loadStored, storeValue } from './toolsShared';

// Code, English name, and a short symbol for the badge. Ordered with the ones Nepal uses most first.
const CURRENCIES = [
  ['NPR', 'Nepalese Rupee', 'रू'], ['USD', 'US Dollar', '$'], ['INR', 'Indian Rupee', '₹'],
  ['CNY', 'Chinese Yuan', '¥'], ['EUR', 'Euro', '€'], ['GBP', 'British Pound', '£'],
  ['AUD', 'Australian Dollar', 'A$'], ['CAD', 'Canadian Dollar', 'C$'], ['JPY', 'Japanese Yen', '¥'],
  ['KRW', 'South Korean Won', '₩'], ['AED', 'UAE Dirham', 'DH'], ['SAR', 'Saudi Riyal', 'SR'],
  ['QAR', 'Qatari Riyal', 'QR'], ['KWD', 'Kuwaiti Dinar', 'KD'], ['OMR', 'Omani Rial', 'RO'],
  ['BHD', 'Bahraini Dinar', 'BD'], ['MYR', 'Malaysian Ringgit', 'RM'], ['SGD', 'Singapore Dollar', 'S$'],
  ['THB', 'Thai Baht', '฿'], ['HKD', 'Hong Kong Dollar', 'HK$'], ['NZD', 'New Zealand Dollar', 'NZ$'],
  ['CHF', 'Swiss Franc', 'Fr'], ['BTN', 'Bhutanese Ngultrum', 'Nu'], ['BDT', 'Bangladeshi Taka', '৳'],
  ['PKR', 'Pakistani Rupee', '₨'], ['LKR', 'Sri Lankan Rupee', 'Rs'], ['MVR', 'Maldivian Rufiyaa', 'Rf'],
  ['MMK', 'Myanmar Kyat', 'K'], ['AFN', 'Afghan Afghani', 'Af'], ['IDR', 'Indonesian Rupiah', 'Rp'],
  ['PHP', 'Philippine Peso', '₱'], ['VND', 'Vietnamese Dong', '₫'], ['TWD', 'New Taiwan Dollar', 'NT$'],
  ['RUB', 'Russian Ruble', '₽'], ['TRY', 'Turkish Lira', '₺'], ['ILS', 'Israeli Shekel', '₪'],
  ['EGP', 'Egyptian Pound', 'E£'], ['ZAR', 'South African Rand', 'R'], ['BRL', 'Brazilian Real', 'R$'],
  ['SEK', 'Swedish Krona', 'kr'], ['NOK', 'Norwegian Krone', 'kr'], ['DKK', 'Danish Krone', 'kr'],
].map(([code, name, symbol]) => ({ code, name, symbol }));

const RATES_URL = 'https://open.er-api.com/v6/latest/NPR';
const CACHE_KEY = 'cc_rates_v2';
const FRESH_MS = 3 * 60 * 60 * 1000; // the provider publishes once a day, so there is no point asking more often
const MANUAL_MIN_MS = 20 * 60 * 1000;
const QUICK = [1, 10, 100, 1000, 10000, 100000];

async function fetchRates() {
  const res = await fetch(RATES_URL);
  if (!res.ok) throw new Error('Rate provider unavailable');
  const data = await res.json();
  if (data.result !== 'success' || !data.rates) throw new Error('Rate provider returned no data');
  return {
    rates: data.rates,
    provider: data.time_last_update_unix ? data.time_last_update_unix * 1000 : Date.now(),
    fetched: Date.now(),
  };
}

// Browsers have no Nepali currency names, so these are written out.
const NEPALI_NAMES = {
  NPR: 'नेपाली रुपैयाँ', USD: 'अमेरिकी डलर', INR: 'भारतीय रुपैयाँ', CNY: 'चिनियाँ युयान', EUR: 'युरो',
  GBP: 'ब्रिटिश पाउन्ड', AUD: 'अस्ट्रेलियन डलर', CAD: 'क्यानेडियन डलर', JPY: 'जापानी येन',
  KRW: 'दक्षिण कोरियन वोन', AED: 'युएई दिरहम', SAR: 'सऊदी रियाल', QAR: 'कतार रियाल',
  KWD: 'कुवेती दिनार', OMR: 'ओमानी रियाल', BHD: 'बहराइनी दिनार', MYR: 'मलेशियन रिङ्गिट',
  SGD: 'सिङ्गापुर डलर', THB: 'थाई बाहत', HKD: 'हङकङ डलर', NZD: 'न्युजिल्यान्ड डलर',
  CHF: 'स्विस फ्र्यांक', BTN: 'भुटानी न्गल्ट्रम', BDT: 'बंगलादेशी टका', PKR: 'पाकिस्तानी रुपैयाँ',
  LKR: 'श्रीलङ्काली रुपैयाँ', MVR: 'माल्दिभ्स रुफिया', MMK: 'म्यानमार क्याट', AFN: 'अफगानी',
  IDR: 'इन्डोनेसियाली रुपिया', PHP: 'फिलिपिन्स पेसो', VND: 'भियतनामी डोङ', TWD: 'ताइवानी डलर',
  RUB: 'रुसी रुबल', TRY: 'टर्किस लिरा', ILS: 'इजरायली शेकेल', EGP: 'इजिप्टियन पाउन्ड',
  ZAR: 'दक्षिण अफ्रिकी रयान्ड', BRL: 'ब्राजिलियन रियल', SEK: 'स्विडिस क्रोना', NOK: 'नर्वेजियन क्रोन',
  DKK: 'डेनिस क्रोन',
};

// Currency names in the visitor's language: written out for Nepali, from the browser for the
// rest, and English where the browser has none.
const nameFormats = {};
function currencyName(currency, lang) {
  if (lang === 'en') return currency.name;
  if (lang === 'ne') return NEPALI_NAMES[currency.code] || currency.name;
  try {
    if (!nameFormats[lang]) nameFormats[lang] = new Intl.DisplayNames([lang], { type: 'currency' });
    const name = nameFormats[lang].of(currency.code);
    return name && name !== currency.code ? name : currency.name;
  } catch {
    return currency.name;
  }
}

// Indian grouping (1,00,000) for rupees, the usual 1,000,000 for the rest; Devanagari digits for ne and hi.
const groupingFor = (code) => (code === 'NPR' || code === 'INR' ? 'en-IN' : 'en-US');
const amountDigits = (v) => (v === 0 ? 0 : Math.abs(v) < 0.01 ? 6 : Math.abs(v) < 1 ? 4 : 2);
const rateDigits = (v) => (v >= 100 ? 2 : v >= 1 ? 3 : 6);

function formatNumber(value, { code, lang, digits }) {
  if (value == null || !Number.isFinite(value)) return '—';
  const max = digits(value);
  const text = new Intl.NumberFormat(groupingFor(code), {
    minimumFractionDigits: Math.min(2, max),
    maximumFractionDigits: max,
  }).format(value);
  return localDigits(text, lang);
}

const nameOf = (code) => CURRENCIES.find((c) => c.code === code);

function Badge({ symbol }) {
  return (
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 font-bold text-vermilion ring-1 ring-brand-100 ${symbol.length > 2 ? 'text-xs' : 'text-base'}`} aria-hidden="true">
      {symbol}
    </span>
  );
}

function DetailDialog({ t, lang, row, base, amount, onUseAsBase, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const name = currencyName(row, lang);
  const line = (a, b) => (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-panel px-4 py-3">
      <span className="text-sm text-ink-soft">{a}</span>
      <span className="text-right text-base font-semibold text-ink">{b}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-ink/60 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cc-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="animate-dropdown w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-rt"
      >
        <div className="relative bg-vermilion px-6 pb-6 pt-7 text-white">
          <button type="button" onClick={onClose} ref={closeRef} aria-label={t.tb_close || 'Close'} className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25">
            <X size={18} aria-hidden="true" />
          </button>
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 text-base font-bold" aria-hidden="true">{row.symbol}</span>
            <div className="min-w-0">
              <h4 id="cc-dialog-title" className="font-serif text-2xl font-semibold">{row.code}</h4>
              <p className="text-base text-white/85">{name}</p>
            </div>
          </div>
          <p className="mt-6 text-sm text-white/75">{fill(t.tb_worthOf || '{amount} {base} is', { amount: formatNumber(amount, { code: base, lang, digits: amountDigits }), base })}</p>
          <p className="mt-1 break-words font-serif text-3xl font-semibold">
            {formatNumber(row.value, { code: row.code, lang, digits: amountDigits })} <span className="text-xl font-normal">{row.code}</span>
          </p>
        </div>
        <div className="space-y-2.5 p-5">
          {row.per != null && line(`${localDigits(1, lang)} ${base} =`, `${formatNumber(row.per, { code: row.code, lang, digits: rateDigits })} ${row.code}`)}
          {row.per ? line(`${localDigits(1, lang)} ${row.code} =`, `${formatNumber(1 / row.per, { code: base, lang, digits: rateDigits })} ${base}`) : null}
          <button type="button" onClick={onUseAsBase} className="btn-primary mt-2 w-full">
            {fill(t.tb_useAsBase || 'Convert from {code}', { code: row.code })}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Currency exchange: any currency in the list to all the others, from one daily rate table (base NPR). */
export default function CurrencyConverter({ t, lang }) {
  const { showToast } = useToast();
  const tRef = useRef(t);
  tRef.current = t;

  const [amount, setAmount] = useState(() => String(loadStored('cc_amount', '1') ?? '1'));
  const [base, setBase] = useState(() => {
    const saved = loadStored('cc_base', 'NPR');
    return nameOf(saved) ? saved : 'NPR';
  });
  const [data, setData] = useState(() => loadStored(CACHE_KEY, null));
  const [loading, setLoading] = useState(() => !loadStored(CACHE_KEY, null));
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [openCode, setOpenCode] = useState(null);
  const trigger = useRef(null);

  const load = useCallback(async ({ manual = false } = {}) => {
    const cached = loadStored(CACHE_KEY, null);
    const age = cached ? Date.now() - cached.fetched : Infinity;
    if (manual && age < MANUAL_MIN_MS) {
      showToast(tRef.current.tb_ratesFresh || 'These rates are already up to date.', 'info');
      return;
    }
    if (!manual && age < FRESH_MS) {
      setData(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const fresh = await fetchRates();
      storeValue(CACHE_KEY, fresh);
      setData(fresh);
      setError(null);
    } catch {
      if (cached?.rates) {
        setData(cached);
        setError('offline');
      } else {
        setError('failed');
      }
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [load]);

  const changeAmount = (text) => {
    // Devanagari digits are fine; keep one decimal point.
    const latin = text.replace(/[०-९]/g, (d) => '०१२३४५६७८९'.indexOf(d)).replace(/,/g, '');
    const clean = latin.replace(/[^\d.]/g, '').replace(/^(\d*\.\d*).*$/, '$1');
    setAmount(clean);
    storeValue('cc_amount', clean);
  };
  const pickAmount = (n) => { setAmount(String(n)); storeValue('cc_amount', String(n)); };
  const changeBase = (code) => { setBase(code); storeValue('cc_base', code); };

  const rates = data?.rates;
  const amountNumber = Number.parseFloat(amount) || 0;
  const baseCurrency = nameOf(base);

  const rows = useMemo(() => {
    if (!rates || !rates[base]) return [];
    const q = query.trim().toLowerCase();
    return CURRENCIES
      .filter((c) => c.code !== base && rates[c.code])
      .map((c) => {
        const per = rates[c.code] / rates[base]; // units of c for 1 of the base
        return { ...c, per, value: per * amountNumber };
      })
      .filter((c) => !q || c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || currencyName(c, lang).toLowerCase().includes(q));
  }, [rates, base, amountNumber, query, lang]);

  const open = openCode ? rows.find((r) => r.code === openCode) : null;
  const openRow = (code, el) => { trigger.current = el; setOpenCode(code); };
  const closeDialog = useCallback(() => {
    setOpenCode(null);
    trigger.current?.focus?.();
  }, []);

  // "1 USD = 140.25 NPR", or "1 NPR = 0.0071 USD" when rupees are the base
  const compareCode = base === 'NPR' ? 'USD' : 'NPR';
  const compare = rates && rates[base] && rates[compareCode] ? rates[compareCode] / rates[base] : null;

  const asOf = data?.provider ? new Date(data.provider) : null;
  const asOfText = asOf
    ? formatAdDate({ year: asOf.getUTCFullYear(), month: asOf.getUTCMonth() + 1, day: asOf.getUTCDate() }, lang, true)
    : '';

  return (
    <div className="px-4 pb-6 pt-5 sm:px-10 sm:pb-10 sm:pt-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        {/* what to convert */}
        <div className="h-fit rounded-2xl border border-line bg-panel p-5 sm:p-6">
          <label htmlFor="cc-amount" className={labelClass}>{t.tb_amount || 'Amount'}</label>
          <input
            id="cc-amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(e) => changeAmount(e.target.value)}
            className={`${fieldClass} h-14 font-serif text-2xl font-semibold`}
          />

          <label htmlFor="cc-base" className={`${labelClass} mt-4`}>{t.tb_convertFrom || 'Convert from'}</label>
          <select id="cc-base" value={base} onChange={(e) => changeBase(e.target.value)} className={fieldClass}>
            {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} — {currencyName(c, lang)}</option>)}
          </select>

          <div className="mt-4 flex flex-wrap gap-2">
            {QUICK.map((n) => {
              const on = amountNumber === n;
              return (
                <button
                  key={n}
                  type="button"
                  aria-pressed={on}
                  onClick={() => pickAmount(n)}
                  className={`min-h-[2.5rem] rounded-full border px-3.5 text-sm font-semibold transition-colors ${on ? 'border-vermilion bg-vermilion text-white' : 'border-line bg-white text-ink hover:border-vermilion hover:text-vermilion'}`}
                >
                  {localDigits(n.toLocaleString(groupingFor(base)), lang)}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
            {asOfText && <span className="text-sm text-ink-soft">{fill(t.tb_rateAsOf || 'Rates as of {date}', { date: asOfText })}</span>}
            <button type="button" onClick={() => load({ manual: true })} disabled={loading} className="btn-outline ml-auto px-4 disabled:opacity-60">
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
              {loading ? (t.tb_loading || 'Loading…') : (t.tb_refresh || 'Refresh')}
            </button>
          </div>

          {error === 'failed' && (
            <p role="alert" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {t.tb_ratesFailed || 'Could not load exchange rates. Please try again.'}
            </p>
          )}
          {error === 'offline' && (
            <p className="mt-4 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink-soft">
              {t.tb_ratesSaved || 'No connection. Showing the last saved rates.'}
            </p>
          )}
        </div>

        {/* the answers */}
        <div className="min-w-0 overflow-hidden rounded-2xl border border-line">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-panel px-4 py-3 sm:px-5">
            <p className="text-base font-semibold text-ink">
              {compare != null
                ? `${localDigits(1, lang)} ${base} = ${formatNumber(compare, { code: compareCode, lang, digits: rateDigits })} ${compareCode}`
                : '—'}
            </p>
            <div className="relative w-full sm:w-56">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.tb_searchCur || 'Search currency'}
                aria-label={t.tb_searchCur || 'Search currency'}
                className={`${fieldClass} h-10 pl-9 text-sm`}
              />
            </div>
          </div>

          <div className="max-h-[30rem] overflow-y-auto">
            {loading && !rates ? (
              <p className="py-16 text-center text-base text-mute">{t.tb_loading || 'Loading…'}</p>
            ) : rows.length === 0 ? (
              <p className="py-16 text-center text-base text-mute">{rates ? (t.tb_noCurrency || 'No currency found') : (t.tb_ratesFailed || 'Could not load exchange rates. Please try again.')}</p>
            ) : (
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10 bg-white text-xs font-bold uppercase tracking-wide text-mute shadow-[0_1px_0_0_#ECE5E4]">
                  <tr>
                    <th scope="col" className="py-2.5 pl-4 sm:pl-5">{t.tb_currency || 'Currency'}</th>
                    <th scope="col" className="hidden py-2.5 text-right sm:table-cell">{fill(t.tb_rateHdr || '1 unit in {base}', { base })}</th>
                    <th scope="col" className="py-2.5 pr-4 text-right sm:pr-5">{t.tb_amount || 'Amount'}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.code}
                      tabIndex={0}
                      onClick={(e) => openRow(r.code, e.currentTarget)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openRow(r.code, e.currentTarget); }
                      }}
                      className="cursor-pointer border-b border-line/70 transition-colors last:border-b-0 hover:bg-panel focus-visible:bg-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-vermilion"
                    >
                      <td className="py-3 pl-4 sm:pl-5">
                        <div className="flex items-center gap-3">
                          <Badge symbol={r.symbol} />
                          <div className="min-w-0">
                            <div className="text-base font-semibold text-ink">{r.code}</div>
                            <div className="truncate text-sm text-ink-soft">{currencyName(r, lang)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden py-3 text-right font-mono text-sm text-ink-soft sm:table-cell">
                        {formatNumber(1 / r.per, { code: base, lang, digits: rateDigits })}
                      </td>
                      <td className="py-3 pr-4 text-right font-serif text-lg font-semibold text-ink sm:pr-5">
                        {formatNumber(r.value, { code: r.code, lang, digits: amountDigits })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <p className="mt-5 text-sm leading-relaxed text-mute">
        {t.tb_indicative || 'Indicative market rates, updated once a day. Banks and Nepal Rastra Bank rates can differ.'}
      </p>

      {open && baseCurrency && (
        <DetailDialog
          t={t}
          lang={lang}
          row={open}
          base={base}
          amount={amountNumber}
          onUseAsBase={() => { changeBase(open.code); setOpenCode(null); }}
          onClose={closeDialog}
        />
      )}
    </div>
  );
}
