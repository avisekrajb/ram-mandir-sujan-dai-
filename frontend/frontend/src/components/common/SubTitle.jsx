import React from 'react';

/**
 * SubTitle — the compact heading for sub-sections and cards (the level under
 * SectionTitle / PageHeader): an optional small label above one plain title in
 * the logo red. Sizes follow the site type
 * scale (size "lg" is the section scale, "md" the card scale).
 */
const SubTitle = ({
  as: Tag = 'h2',
  size = 'lg',
  align = 'left',
  tone = 'light',
  eyebrow,
  className = '',
  children,
}) => (
  <div className={`rt-sub rt-sub--${align} rt-sub--${tone} ${className}`}>
    {eyebrow && <p className="rt-sub-eyebrow">{eyebrow}</p>}
    <Tag className={`rt-sub-h font-serif ${size === 'md' ? 'text-xl' : 'text-3xl'}`}>{children}</Tag>
  </div>
);

export default SubTitle;
