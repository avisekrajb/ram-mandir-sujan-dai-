import React from 'react';
import useTextSize, { TEXT_SIZES } from '../../../hooks/useTextSize';

// Preview "A" sizes (px, independent of the page scale)
const PREVIEW_PX = { normal: 15, large: 18, xlarge: 22 };

/**
 * Text-size control for older visitors: a labelled row of three "A" buttons.
 * Lives in the Tools menu (desktop) and the mobile menu; it is not part of the
 * navbar row, which never scales.
 */
const TextSizeButtons = ({ t, className = '' }) => {
  const [size, setSize] = useTextSize();
  const title = t.textSize || 'Text size';
  const labels = {
    normal: t.textSizeNormal || 'Normal',
    large: t.textSizeLarge || 'Large',
    xlarge: t.textSizeXLarge || 'Extra large',
  };

  return (
    <div className={className}>
      <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">{title}</p>
      <div className="flex gap-2" role="radiogroup" aria-label={title}>
        {TEXT_SIZES.map(({ key }) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={size === key}
            aria-label={labels[key]}
            title={labels[key]}
            onClick={() => setSize(key)}
            className={`flex min-h-[2.75rem] flex-1 items-center justify-center rounded-full border font-serif font-semibold transition-colors ${
              size === key ? 'border-vermilion bg-vermilion text-white' : 'border-line text-ink hover:border-vermilion'
            }`}
            style={{ fontSize: PREVIEW_PX[key] }}
          >
            A
          </button>
        ))}
      </div>
    </div>
  );
};

const MINI_PX = { normal: 12, large: 15, xlarge: 18 };

/** Small "A  A  A" control for the utility strip (temple-site style). */
export const TextSizeMini = ({ t }) => {
  const [size, setSize] = useTextSize();
  const title = t.textSize || 'Text size';
  const labels = {
    normal: t.textSizeNormal || 'Normal',
    large: t.textSizeLarge || 'Large',
    xlarge: t.textSizeXLarge || 'Extra large',
  };
  return (
    <div role="group" aria-label={title} className="flex items-center gap-1">
      {TEXT_SIZES.map(({ key }) => (
        <button
          key={key}
          type="button"
          aria-pressed={size === key}
          aria-label={`${title}: ${labels[key]}`}
          title={`${title}: ${labels[key]}`}
          onClick={() => setSize(key)}
          className={`flex h-8 w-8 items-center justify-center rounded-md font-serif font-semibold leading-none transition-colors ${
            size === key ? 'bg-vermilion text-white' : 'text-ink hover:bg-white hover:text-vermilion'
          }`}
          style={{ fontSize: MINI_PX[key] }}
        >
          A
        </button>
      ))}
    </div>
  );
};

export default TextSizeButtons;
