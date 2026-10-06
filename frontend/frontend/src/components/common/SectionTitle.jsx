import React from 'react';
import { motion } from 'framer-motion';
import TitleBlock from './TitleBlock';

/**
 * SectionTitle — single source of truth for every section heading on the
 * public site (home teasers, gallery, videos, blogs, events, ...).
 *
 * Why this exists:
 *  - Headings used to be hand-written per section, so the same word rendered at
 *    four different sizes and two different weights across the site.
 *  - Nothing scaled with the language, so a long Devanagari/Tamil heading and a
 *    short English one looked like they came from different pages.
 *
 * One component fixes both: identical markup, identical responsive scale and
 * identical weight no matter which language `children` holds. The heading is a
 * plain line of text; there is no ornament under it.
 *
 * `tone="dark"` is for headings that sit on the maroon/vermilion sections.
 */

const SUB_TONE = {
  light: 'text-ink-soft',
  dark: 'text-white/70',
};

const SectionTitle = ({
  children,
  sub,
  tone = 'light',
  align = 'center',
  eyebrow,
  className = '',
  subClassName = '',
  delay = 0,
  animate = true,
}) => {
  const isCenter = align === 'center';

  const heading = (
    <>
      <TitleBlock as="h2" tone={tone} align={align} eyebrow={eyebrow} headingClassName={`text-3xl ${className}`}>
        {children}
      </TitleBlock>

      {sub && (
        <p className={`mt-3 text-sm sm:text-base ${SUB_TONE[tone] || SUB_TONE.light} ${subClassName}`}>
          {sub}
        </p>
      )}
    </>
  );

  const alignCls = isCenter ? 'text-center' : 'text-left';

  if (!animate) {
    return <div className={`rt-section-title ${alignCls}`}>{heading}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`rt-section-title ${alignCls}`}
    >
      {heading}
    </motion.div>
  );
};

export default SectionTitle;