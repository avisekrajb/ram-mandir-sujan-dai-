import React, { useEffect } from 'react';

/**
 * OmLoader — the ॐ loading mark used across the site.
 *
 * The ring rotates; the ॐ never does. The arc sweeps through a red-brown into
 * orange, which reads as movement without the ring strobing, and the glyph stays
 * fixed in the centre so it remains legible while the animation runs.
 *
 * Every moving part is transform-only, so it runs on the compositor and does
 * not compete with scrolling for main-thread time.
 */

const SIZES = {
  sm: { box: 'h-9 w-9', om: 'text-xl', ring: 2, arc: 2 },
  md: { box: 'h-14 w-14', om: 'text-3xl', ring: 2, arc: 3 },
  lg: { box: 'h-[4.5rem] w-[4.5rem]', om: 'text-4xl', ring: 2.5, arc: 3.5 },
  xl: { box: 'h-24 w-24', om: 'text-5xl', ring: 3, arc: 4 },
};

/*
 * Ring arc: [red-brown, gold, orange]. The temple's own maroon and marigold,
 * with a warmer orange at the leading edge so the direction of travel is clear.
 */
const ARC_COLORS = {
  maroon: ['#A80808', '#E2DBD8', '#820606'],
  white: ['#820606', '#E2DBD8', '#C25B5B'],
  vermilion: ['#820606', '#E2DBD8', '#C25B5B'],
  green: ['#660505', '#E2DBD8', '#C25B5B'],
};

// Accent used for the ring glow.
const ACCENT = {
  maroon: '#A80808',
  white: '#ff3b3b',
  vermilion: '#820606',
  green: '#10b981',
};

// Solid colour of the ॐ glyph.
const GLYPH = {
  maroon: '#A80808',
  white: '#ffffff',
  vermilion: '#820606',
  green: '#660505',
};

// The big loader is the page's loading state. While one is on screen the footer stays hidden (see index.css), so it does not
// sit in view and then jump below the content when that arrives (the main cause of layout shift while loading).
let pageLoaders = 0;

const OmLoader = ({ size = 'md', color = 'maroon', className = '' }) => {
  const s = SIZES[size] || SIZES.md;
  const pageLevel = size === 'lg' || size === 'xl';
  useEffect(() => {
    if (!pageLevel) return undefined;
    pageLoaders += 1;
    document.documentElement.setAttribute('data-page-loading', '');
    return () => {
      pageLoaders = Math.max(0, pageLoaders - 1);
      if (pageLoaders === 0) document.documentElement.removeAttribute('data-page-loading');
    };
  }, [pageLevel]);
  const accent = ACCENT[color] || ACCENT.maroon;
  const glyph = GLYPH[color] || GLYPH.maroon;
  const [dark, gold, orange] = ARC_COLORS[color] || ARC_COLORS.maroon;

  const onDark = color === 'white';
  const ringColor = onDark ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.95)';

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Loading</span>

      <div className={`relative ${s.box}`}>
        {/* Soft glow behind the mark, so it reads on light and dark */}
        <span
          aria-hidden
          className="absolute -inset-2 rounded-full"
          style={{
            background: `radial-gradient(circle, ${accent}22 0%, transparent 70%)`,
          }}
        />

        {/* Static outer ring */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            border: `${s.ring}px solid ${ringColor}`,
            boxShadow: `0 0 12px ${accent}44, inset 0 0 8px rgba(255,255,255,0.35)`,
          }}
        />

        {/*
          The rotating arc. Masked into a thin ring so it reads as a stroke
          rather than a filled pie, and rotated by a class rather than an
          inline animation so it stays on the compositor.
        */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-full rt-om-spin"
          style={{
            background: `conic-gradient(from 0deg, transparent 0deg 235deg, ${dark} 280deg, ${gold} 320deg, ${orange} 348deg, transparent 360deg)`,
            WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${s.arc}px), #000 calc(100% - ${s.arc - 1}px))`,
            mask: `radial-gradient(farthest-side, transparent calc(100% - ${s.arc}px), #000 calc(100% - ${s.arc - 1}px))`,
          }}
        />

        {/* ॐ stays still while the arc moves around it */}
        <span className="absolute inset-0 flex items-center justify-center">
          <span
            aria-hidden
            className={`leading-none font-serif font-bold select-none ${s.om}`}
            style={{
              color: glyph,
              textShadow: onDark ? '0 0 12px rgba(255,255,255,0.85)' : 'none',
            }}
          >
            ॐ
          </span>
        </span>
      </div>
    </div>
  );
};

export default OmLoader;