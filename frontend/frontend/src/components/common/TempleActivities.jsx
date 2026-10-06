import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import {
  ACTIVITIES,
  MONTH_ROTATION,
  FESTIVAL_ROTATION,
  SPECIAL_PUJA_HELP,
} from '../../data/templeActivities';

/**
 * The temple's activities and working history, at the foot of the booking page.
 *
 * Shown after the booking form, not before it: someone on this page came to book
 * a puja, and a wall of history above the form would be in the way. Someone
 * looking for this information scrolls straight past to it.
 *
 * Every block takes its prose from the language copy and its names from the
 * shared lists, so switching language translates the writing and never renames
 * anyone. The month and festival labels come from the copy because those are
 * words a reader needs translated; the people under them are proper nouns and
 * stay as they are.
 */

const Block = ({ title, children, id }) => (
  <section className="mt-10 first:mt-0" aria-labelledby={id}>
    <h3
      id={id}
      className="font-serif text-xl font-semibold text-maroon sm:text-2xl"
    >
      {title}
    </h3>
    <div className="mt-3 space-y-3">{children}</div>
  </section>
);

const Paras = ({ items }) =>
  items.map((text) => (
    <p key={text.slice(0, 24)} className="max-w-3xl text-base leading-relaxed text-ink-soft">
      {text}
    </p>
  ));

/** A labelled list: "Magh: name, name" — a term used with the people holding it. */
const TermList = ({ rows, labelOf, namesOf }) => (
  <dl className="mt-3 space-y-1.5">
    {rows.map(({ key, names }) => (
      <div
        key={key}
        className="flex flex-col gap-0.5 border-b border-line/70 pb-1.5 last:border-b-0 sm:flex-row sm:gap-3"
      >
        <dt className="shrink-0 text-sm font-semibold text-ink sm:w-32">{labelOf(key)}</dt>
        <dd className="text-sm leading-relaxed text-ink-soft">{namesOf(names).join(', ')}</dd>
      </div>
    ))}
  </dl>
);

const TempleActivities = () => {
  const { lang } = useLanguage();
  const copy = ACTIVITIES[lang] || ACTIVITIES.en;

  return (
    <div className="mx-auto mt-16 max-w-5xl px-4 pb-16 sm:px-6" lang={lang}>
      <div className="rounded-2xl border border-line bg-panel p-6 sm:p-8">
        {/* Naimittik puja */}
        <Block id="act-naimittik" title={copy.naimittik.title}>
          <p className="max-w-3xl text-base leading-relaxed text-ink-soft">
            {copy.naimittik.intro}
          </p>

          <h4 className="mt-6 text-xs font-bold uppercase tracking-wider text-mute">
            {copy.naimittik.monthsTitle}
          </h4>
          <TermList
            rows={MONTH_ROTATION}
            labelOf={(key) => copy.months[key]}
            namesOf={(names) => names}
          />

          <h4 className="mt-6 text-xs font-bold uppercase tracking-wider text-mute">
            {copy.naimittik.festivalsTitle}
          </h4>
          <p className="mt-2 max-w-3xl text-base leading-relaxed text-ink-soft">
            {copy.naimittik.festivalsIntro}
          </p>
          <TermList
            rows={FESTIVAL_ROTATION}
            labelOf={(key) => copy.festivals[key]}
            namesOf={(names) => names}
          />

          <p className="mt-4 max-w-3xl text-base leading-relaxed text-ink-soft">
            {copy.naimittik.closing}
          </p>
        </Block>

        {/* Sadhana and sandhya */}
        <Block id="act-sadhana" title={copy.sadhana.title}>
          <Paras items={copy.sadhana.p} />
        </Block>

        {/* Bal vihar */}
        <Block id="act-balbihar" title={copy.balbihar.title}>
          <Paras items={copy.balbihar.p} />
        </Block>

        {/* Special puja */}
        <Block id="act-vishespuja" title={copy.vishespuja.title}>
          <Paras items={copy.vishespuja.p} />
          <p className="mt-4 text-sm font-semibold text-ink">
            {copy.vishespuja.thanksIntro}
          </p>
          <TermList
            rows={SPECIAL_PUJA_HELP}
            labelOf={(key) => copy.help[key]}
            namesOf={(names) => names}
          />
        </Block>

        {/* The two phases of the master plan */}
        <Block id="act-first-phase" title={copy.firstPhase.title}>
          <Paras items={copy.firstPhase.p} />
        </Block>

        <Block id="act-second-phase" title={copy.secondPhase.title}>
          <Paras items={copy.secondPhase.p} />
        </Block>

        {/* Special thanks */}
        <Block id="act-special-thanks" title={copy.specialThanks.title}>
          <Paras items={copy.specialThanks.p} />
        </Block>
      </div>
    </div>
  );
};

export default TempleActivities;