import React from 'react';

/**
 * TitleBlock — the shared title typography for SectionTitle and PageHeader: one
 * plain heading in the logo red (white on dark), with an optional small label
 * above it. Sizes come from the site type scale in index.css (h1 / h2), so the
 * text-size control and every language follow it.
 */
// The serif's "&" is a showy swash that reads oddly in a heading ("Reels & Short Videos"),
// so an ampersand in a plain-text title is set in the body face.
const plainAmpersand = (children) => {
  if (typeof children !== 'string' || !children.includes('&')) return children;
  return children.split(/(&)/).map((part, i) => (
    part === '&' ? <span key={i} className="rt-amp">&amp;</span> : part
  ));
};

const TitleBlock = ({
  as: Tag = 'h2',
  tone = 'light',
  align = 'center',
  eyebrow,
  children,
  className = '',
  headingClassName = '',
}) => (
  <div className={`rt-title rt-title--${tone} rt-title--${align} ${className}`}>
    {eyebrow && <p className="rt-title-eyebrow">{eyebrow}</p>}
    <Tag className={`rt-title-h font-serif ${headingClassName}`}>{plainAmpersand(children)}</Tag>
  </div>
);

export default TitleBlock;
