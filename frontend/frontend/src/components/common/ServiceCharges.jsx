import React from 'react';
import { MapPin, Phone, Info } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import SubTitle from './SubTitle';
import { SERVICE_CHARGES as D } from '../../data/serviceCharges';

/**
 * Service charges, as on the temple's notice boards: what it costs to hold a
 * wedding, bratabandha, tikatala or a shoot in the courtyard, and the price of
 * each puja and service, with whom to contact. Prices come from
 * data/serviceCharges.js. `columns="two"` sets the two lists side by side on wide
 * screens (the default stacks them for a narrow column).
 */
const ServiceCharges = ({ columns = 'one', className = '' }) => {
  const { lang } = useLanguage();
  const devanagari = lang === 'ne' || lang === 'hi';

  // Nepali for Nepali and Hindi, English for the rest.
  const pick = (obj) => (obj ? (devanagari ? obj.ne || obj.en : obj.en || obj.ne) : '');
  // The boards write numbers in Devanagari digits; Indian grouping (51,001 / 1,00,000) either way.
  const digits = (v) => (devanagari ? String(v).replace(/[0-9]/g, (d) => '०१२३४५६७८९'[d]) : String(v));
  const money = (n) => {
    const num = digits(Number(n).toLocaleString('en-IN'));
    return devanagari ? `रू. ${num}/-` : `Rs. ${num}/-`;
  };
  const letters = devanagari ? ['क', 'ख', 'ग', 'घ', 'ङ'] : ['A', 'B', 'C', 'D', 'E'];

  const Row = ({ label, detail, amount }) => (
    <li className="flex items-baseline gap-3 py-2">
      <span className="min-w-0 text-base text-ink sm:text-[17px]">
        {label}
        {detail ? <span className="block text-sm text-ink-soft">{detail}</span> : null}
      </span>
      <span className="mb-1.5 min-w-4 flex-1 self-end border-b border-dotted border-gray-300" aria-hidden="true" />
      <span className="shrink-0 text-base font-semibold tabular-nums text-ink sm:text-[17px]">{money(amount)}</span>
    </li>
  );

  const card = 'rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6';
  const c = D.contact;

  return (
    <section className={className} aria-label={pick(D.heading)}>
      <SubTitle>{pick(D.heading)}</SubTitle>

      <div className={`mt-6 grid gap-6 ${columns === 'two' ? 'lg:grid-cols-2' : ''}`}>
        {/* Programs in the courtyard */}
        <div className={card}>
          <h3 className="font-serif text-xl font-semibold text-ink">{pick(D.courtyard.title)}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft sm:text-base">{pick(D.courtyard.intro)}</p>
          <div className="mt-4 space-y-5">
            {D.courtyard.groups.map((group, gi) => (
              <div key={group.key}>
                <p className="flex items-center gap-2.5 text-base font-semibold text-ink sm:text-lg">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-vermilion ring-1 ring-brand-100">
                    {letters[gi]}
                  </span>
                  {pick(group.title)}
                </p>
                <ul className="mt-1 divide-y divide-line/60">
                  {group.rows.map((row, ri) => (
                    <Row key={ri} label={pick(row.label)} amount={row.amount} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Puja and services */}
        <div className={card}>
          <h3 className="font-serif text-xl font-semibold text-ink">{pick(D.puja.title)}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft sm:text-base">{pick(D.puja.intro)}</p>
          <ol className="mt-4 divide-y divide-line/60">
            {D.puja.rows.map((row, i) => (
              <Row key={i} label={`${digits(i + 1)})  ${pick(row.label)}`} detail={pick(row.detail)} amount={row.amount} />
            ))}
          </ol>
        </div>
      </div>

      {/* Who to contact */}
      <div className="mt-6 rounded-2xl bg-panel p-5 ring-1 ring-line sm:p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-mute">{pick(c.label)}</p>
        <p className="mt-2 text-base font-semibold text-ink sm:text-lg">
          {pick(c.name)} <span className="font-normal text-ink-soft">· {pick(c.role)}</span>
        </p>
        <ul className="mt-3 space-y-2 text-base text-ink-soft">
          <li className="flex items-center gap-2.5">
            <Phone size={16} className="shrink-0 text-vermilion" aria-hidden="true" />
            <a href={`tel:${c.phone}`} className="font-semibold text-ink hover:text-vermilion">{digits(c.phone)}</a>
          </li>
          <li className="flex items-start gap-2.5">
            <MapPin size={16} className="mt-1 shrink-0 text-vermilion" aria-hidden="true" />
            <span>
              {pick(c.committee)}
              <br />
              {pick(c.address)} · <a href={`tel:${c.officePhone.replace(/-/g, '')}`} className="font-semibold text-ink hover:text-vermilion">{digits(c.officePhone)}</a>
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <Info size={16} className="mt-1 shrink-0 text-vermilion" aria-hidden="true" />
            <span className="text-sm sm:text-base">{pick(c.note)}</span>
          </li>
        </ul>
      </div>
    </section>
  );
};

export default ServiceCharges;
