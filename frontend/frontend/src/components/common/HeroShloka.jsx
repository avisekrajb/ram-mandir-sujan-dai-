import React from 'react';

/**
 * HeroShloka — the invocation and stuti shown over the home page hero video.
 *
 * The hero no longer carries the temple name or the tagline as visible text;
 * this replaces it. The temple name is still rendered as a visually hidden
 * <h1> so the page keeps exactly one top-level heading for screen readers and
 * search engines, which a visible title used to provide.
 *
 * All three pieces of text are admin-editable per language (Admin → Hero) and
 * arrive already resolved to the active language. The verse is stored as one
 * string per language and split on newlines, so each line can be sized and
 * spaced individually: the two labels sit apart from the verse itself.
 *
 * The Devanagari values below are the fallback for installs whose settings row
 * predates the editable fields.
 */

const INVOCATION = 'श्रीरामचन्द्राय नमः';
const STUTI_LABEL = 'श्रीरामस्तुति:';
const VERSE = [
  'लोकाभिरामं रणरङ्गधीरं राजीवनेत्रं रघुवंशनाथम् ।',
  'कारुण्यरूपं करुणाकरंतं श्रीरामचन्द्रंशरणं प्रपद्ये॥',
];

/* Accepts either an array of lines or one newline-separated string. */
const toLines = (value, fallback) => {
  const lines = (Array.isArray(value) ? value : String(value ?? '').split('\n'))
    .map((line) => String(line).trim())
    .filter(Boolean);

  return lines.length > 0 ? lines : fallback;
};

const HeroShloka = ({ templeName, enabled = true, invocation, stutiLabel, verse }) => {
  const verseLines = toLines(verse, VERSE);

  return (
    <div className="hero-shloka">
      {/* One real h1 per page, available to assistive tech and crawlers. */}
      <h1 className="sr-only">{templeName}</h1>

      {enabled !== false && (
        <>
          <p className="hero-shloka__label">{invocation || INVOCATION}</p>
          <p className="hero-shloka__label">{stutiLabel || STUTI_LABEL}</p>

          <div className="hero-shloka__rule" aria-hidden />

          <p className="hero-shloka__verse">
            {verseLines.map((line) => (
              <span key={line} className="hero-shloka__line">
                {line}
              </span>
            ))}
          </p>
        </>
      )}
    </div>
  );
};

export default HeroShloka;