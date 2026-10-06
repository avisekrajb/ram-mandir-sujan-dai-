import React from 'react';
import { motion } from 'framer-motion';
import TitleBlock from './TitleBlock';

/**
 * PageHeader — the single top-of-page heading for every public page.
 *
 * Before this existed each page hand-rolled its own <h1>: About/History/Terms
 * used text-3xl, Events/Calendar/Videos/Blogs jumped to text-6xl, some were
 * font-light and some font-bold, and each picked a different maroon shade. The
 * result was that moving between pages felt like moving between sites.
 *
 * One component locks the scale, weight and colour so every page title matches,
 * and it renders identically for every language because only `children` changes.
 *
 * `tone="dark"` is for pages that sit on the maroon banner.
 */

const SUB_TONE = {
  light: 'text-ink-soft',
  dark: 'text-white/75',
};

const PageHeader = ({
  children,
  sub,
  tone = 'light',
  eyebrow,
  className = '',
  subClassName = '',
  animate = true,
}) => {
  const content = (
    <>
      <TitleBlock as="h1" tone={tone} eyebrow={eyebrow} headingClassName={`text-4xl ${className}`}>
        {children}
      </TitleBlock>

      {sub && (
        <p className={`mt-4 text-sm sm:text-base ${SUB_TONE[tone] || SUB_TONE.light} max-w-2xl mx-auto leading-relaxed ${subClassName}`}>
          {sub}
        </p>
      )}
    </>
  );

  if (!animate) {
    return <div className="text-center">{content}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="text-center"
    >
      {content}
    </motion.div>
  );
};

export default PageHeader;