import React from 'react';
import { Heart } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { ACK, ORGANISATIONS, PEOPLE, BLESSING } from '../../data/acknowledgement';

/** The two closing lines, sized to match the heading: one class, used twice. */
const BLESSING_SIZE = 'font-serif text-2xl font-bold leading-snug text-maroon sm:text-3xl';

/**
 * The acknowledgement that closes the donation page.
 *
 * The names are shown straight away rather than behind a button: a visitor who
 * came to donate has not come for a wall of names, but one who wants to look for
 * a donor should not have to go looking for a control either. Two columns and
 * numbered continuously from the first organisation to the last person, so any
 * entry can be referred to by its number ("no. 87") and the numbering matches
 * the printed book.
 *
 * The names are read from one list shared by every language (see the data
 * module) — they are proper nouns, and spelling a donor differently depending
 * on the reader's language would be wrong.
 */
const Names = ({ items, start, headingId }) => (
  <ol
    aria-labelledby={headingId}
    className="mt-3 grid list-none gap-x-6 gap-y-1.5 p-0 sm:grid-cols-2"
  >
    {items.map((item, i) => (
      <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-ink-soft">
        <span className="shrink-0 tabular-nums text-xs font-semibold text-vermilion/80">
          {start + i}.
        </span>
        <span>{item}</span>
      </li>
    ))}
  </ol>
);

const AcknowledgementSection = () => {
  const { lang } = useLanguage();
  const copy = ACK[lang] || ACK.en;
  const total = ORGANISATIONS.length + PEOPLE.length;

  return (
    <section
      className="mx-auto mt-16 max-w-5xl px-4 pb-16 sm:px-6"
      aria-labelledby="acknowledgement-heading"
      lang={lang}
    >
      <div className="rounded-2xl border border-line bg-panel p-6 sm:p-8">
        <h2
          id="acknowledgement-heading"
          className="flex items-center gap-2.5 font-serif text-2xl font-semibold text-maroon sm:text-3xl"
        >
          <Heart size={22} className="shrink-0 text-vermilion" aria-hidden="true" />
          {copy.heading}
        </h2>

        <p className="mt-4 max-w-3xl text-base leading-relaxed text-ink-soft">
          {copy.intro}
        </p>

        {/* Kept as a plain caption: with the list this long, saying how many
            entries there are saves a reader from wondering what they are
            looking at. */}
        <p className="mt-3 text-xs text-mute">
          {(copy.count || '{n} names').replace('{n}', String(total))}
        </p>

        <h3 id="ack-org-heading" className="mt-6 text-xs font-bold uppercase tracking-wider text-mute">
          {copy.orgHeading}
        </h3>
        <Names items={ORGANISATIONS} start={1} headingId="ack-org-heading" />

        <h3 id="ack-people-heading" className="mt-6 text-xs font-bold uppercase tracking-wider text-mute">
          {copy.peopleHeading}
        </h3>
        <Names items={PEOPLE} start={ORGANISATIONS.length + 1} headingId="ack-people-heading" />

        <div className="mt-6 space-y-3 border-t border-line pt-5">
          {copy.closing.map((para) => (
            <p key={para.slice(0, 24)} className="max-w-3xl text-base leading-relaxed text-ink-soft">
              {para}
            </p>
          ))}
        </div>

        {/*
          The closing blessing. Both lines are set at the same size as the
          heading above (text-2xl / sm:text-3xl) so the three read as one
          statement rather than a heading followed by smaller print, and both
          lines use the identical class so they cannot drift apart. Centred,
          because a blessing is not read left-to-right like the paragraphs above
          it. Not translated: it is the temple's own invocation, and the mantra
          is not ours to render into another language.
        */}
        <div className="mt-8 space-y-2 border-t border-line pt-8 text-center">
          <p className={BLESSING_SIZE}>{BLESSING.mantra}</p>
          <p className={BLESSING_SIZE}>{BLESSING.blessing}</p>
        </div>
      </div>
    </section>
  );
};

export default AcknowledgementSection;