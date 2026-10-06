import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import useSiteSettings from '../../hooks/useSiteSettings';

// The same shape every other page reads its localized strings through.
const localized = (obj, lang) => {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[lang] || obj.en || '';
};

/**
 * The scrolling line above the navbar (Admin → Header → Scrolling text).
 *
 * The admin's own words, in the reader's language, moving slowly from right to
 * left between the top strip and the navbar. The text is drawn twice and the
 * track is translated by -50%, so the moment the first copy has left, the second
 * is already in place: the line loops without a gap and without a jump.
 *
 * Two things keep it from misbehaving:
 *  - The duplicate copy is hidden from assistive technology and marked
 *    aria-hidden, so a screen reader hears the message once rather than twice.
 *  - Under `prefers-reduced-motion` the animation is dropped and the text is
 *    shown as one still, centred line. Motion like this is exactly what that
 *    setting is asking to avoid, and a visitor who cannot use it still gets the
 *    words.
 *
 * Nothing is drawn unless the admin has both switched it on and written
 * something, so an enabled-but-empty line cannot leave a bare strip behind.
 */
const HeaderMarquee = () => {
  const { t, lang } = useLanguage();
  const settings = useSiteSettings();

  const marquee = settings?.header?.marquee;
  const text = marquee ? localized(marquee.text, lang) : '';
  // While the settings are still loading this is undefined, so the line stays
  // hidden for that moment instead of appearing empty and then filling in.
  if (!settings || marquee?.enabled !== true || !text) return null;

  const seconds = Math.min(180, Math.max(10, Number(marquee.speed) || 40));
  const link = (marquee.link || '').trim();

  const line = (
    <span className="rt-marquee-line">
      <span className="rt-marquee-text">{text}</span>
      {/* the second copy, so the loop has no gap; never read out twice */}
      <span className="rt-marquee-text" aria-hidden="true">
        {text}
      </span>
    </span>
  );

  return (
    <div
      className="rt-marquee border-b border-line bg-maroon-deep text-white"
      style={{ '--marquee-duration': `${seconds}s` }}
    >
      <div className="mx-auto max-w-7xl overflow-hidden px-4 py-1.5 sm:px-6">
        <div className="text-[13px] font-medium">
          {link ? (
            <a
              href={link}
              className="block transition-opacity hover:opacity-80 focus:outline-none focus-visible:underline"
              target={/^https?:\/\//i.test(link) ? '_blank' : undefined}
              rel={/^https?:\/\//i.test(link) ? 'noopener noreferrer' : undefined}
            >
              {line}
            </a>
          ) : (
            line
          )}
        </div>
      </div>
    </div>
  );
};

export default HeaderMarquee;