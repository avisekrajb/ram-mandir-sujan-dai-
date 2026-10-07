import React, { useState } from 'react';
import SectionTitle from '../common/SectionTitle';
import { handleImageError } from '../../utils/imageFallback';
import { optimizeImageCached } from '../../utils/imageOptimize';

/**
 * The "आयोजन गरिने कार्यक्रमहरू" block of the Events page: the temple's programs as
 * numbered sections, managed from Admin → Events.
 *
 * A section carries a heading, an optional photo and an ordered list of blocks -
 * a sub-heading, a paragraph, a bulleted list or a table. Every section is
 * numbered from its position on the page, so an admin who reorders or switches a
 * section off never has to renumber anything by hand.
 *
 * The photo is optional on purpose. A section saved without one prints as a
 * numbered block with no empty picture area, which is why the picture column is
 * only rendered when there is something to put in it.
 */

// Nepali digits, so the numbering matches the text on the page in every language.
const NEPALI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
const toNepaliDigits = (n) => String(n).replace(/[0-9]/g, (d) => NEPALI_DIGITS[Number(d)]);
const isDevanagari = (lang) => lang === 'ne' || lang === 'hi';

const getLocalizedText = (obj, lang) => {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[lang] || obj.en || obj.ne || '';
};

function SectionPhoto({ src, alt }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    <div className="relative aspect-[16/10] overflow-hidden bg-panel md:aspect-auto md:min-h-[14rem]">
      <img
        src={optimizeImageCached(src, { width: 900 }) || src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: 'center 38%' }}
      />
    </div>
  );
}

/** A grid. Scrolls sideways on a phone rather than squashing the columns. */
const BlockTable = ({ block, lang }) => {
  const headers = (block.headers || []).map((h) => getLocalizedText(h, lang)).filter(Boolean);
  const rows = (block.rows || [])
    .map((r) => (r.cells || r || []).map((c) => getLocalizedText(c, lang)))
    .filter((cells) => cells.some(Boolean));
  if (!rows.length) return null;

  return (
    <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[32rem] border-collapse text-left text-base">
        {headers.length > 0 && (
          <thead>
            <tr className="border-b border-line">
              {headers.map((h, i) => (
                <th
                  key={i}
                  scope="col"
                  className="whitespace-nowrap py-2.5 pr-4 text-sm font-semibold uppercase tracking-wide text-brand-600"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((cells, r) => (
            <tr key={r} className="border-b border-line last:border-0">
              {cells.map((cell, c) => (
                <td key={c} className="py-3 pr-4 align-top leading-relaxed text-ink-soft">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Block = ({ block, lang }) => {
  if (!block || !block.type) return null;

  if (block.type === 'heading') {
    const text = getLocalizedText(block.text, lang);
    return text ? <h4 className="mt-6 font-serif text-xl font-semibold text-ink first:mt-0">{text}</h4> : null;
  }

  if (block.type === 'para') {
    const text = getLocalizedText(block.text, lang);
    return text ? <p className="leading-relaxed text-ink-soft sm:text-[17px]">{text}</p> : null;
  }

  if (block.type === 'list') {
    const points = (block.points || []).map((p) => getLocalizedText(p, lang)).filter(Boolean);
    if (!points.length) return null;
    return (
      <ul className="list-disc space-y-1.5 pl-5 marker:text-gray-400">
        {points.map((text, i) => (
          <li key={i} className="leading-relaxed text-ink-soft sm:text-[17px]">{text}</li>
        ))}
      </ul>
    );
  }

  if (block.type === 'table') return <BlockTable block={block} lang={lang} />;

  return null;
};

const ProgramSections = ({ sections, lang, title }) => {
  const items = (sections || [])
    .filter((s) => s && s.enabled !== false)
    .filter((s) => getLocalizedText(s.title, lang) || (s.blocks || []).length)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  if (items.length === 0) return null;

  const digits = isDevanagari(lang) ? toNepaliDigits : (n) => String(n);

  return (
    <section className="w-full">
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">
        <SectionTitle align="left">{title}</SectionTitle>
        <div className="mt-8 space-y-6">
          {items.map((section, i) => {
            const heading = getLocalizedText(section.title, lang);
            // A section with a photo gets the picture beside the text; without one
            // it prints as a plain numbered block, with no blank area left over.
            const withPhoto = Boolean(section.photo);
            return (
              <article
                key={section.key || section._id || i}
                className={`overflow-hidden rounded-xl border border-line bg-white ${withPhoto ? 'md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]' : ''}`}
              >
                {withPhoto && <SectionPhoto src={section.photo} alt={heading} />}
                <div className="p-5 sm:p-7">
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white"
                    >
                      {digits(i + 1)}
                    </span>
                    {heading && (
                      <h3 className="font-serif text-2xl font-semibold leading-snug text-ink">{heading}</h3>
                    )}
                  </div>

                  {(section.blocks || []).length > 0 && (
                    <div className="mt-4 space-y-4 pl-0 sm:pl-11">
                      {(section.blocks || []).map((block, b) => (
                        <Block key={b} block={block} lang={lang} />
                      ))}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ProgramSections;