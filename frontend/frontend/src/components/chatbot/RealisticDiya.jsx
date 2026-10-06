import React, { useId } from 'react';

/**
 * A clay oil lamp (diya) drawn to look like the real thing: a terracotta bowl lit
 * from the upper left, a dark rim with golden oil and a sheen on it, a charred
 * wick and a teardrop flame (hot white core, orange body, a blue root) with a warm
 * glow behind it. Used for the assistant: the launcher, its avatar and the
 * welcome card.
 *
 * `animated={false}` draws the flame still (for small repeated uses). The flame
 * and glow reuse the .diya-* classes of DiyaIcon for the slow flicker. Gradient
 * ids are unique per instance.
 */
const RealisticDiya = ({ size = 28, className = '', animated = true }) => {
  const uid = useId().replace(/:/g, '');
  const ref = (name) => `url(#${name}-${uid})`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={`diya ${animated ? 'diya--lit' : ''} ${className}`}
    >
      <defs>
        <radialGradient id={`glow-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#FFD58A" stopOpacity="0.8" />
          <stop offset="0.5" stopColor="#FF9A3C" stopOpacity="0.26" />
          <stop offset="1" stopColor="#FF9A3C" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`clay-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#E9A468" />
          <stop offset="0.42" stopColor="#C4622B" />
          <stop offset="1" stopColor="#6B2B10" />
        </linearGradient>
        <linearGradient id={`shade-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.28" />
        </linearGradient>
        <linearGradient id={`oil-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F7CB63" />
          <stop offset="1" stopColor="#B87420" />
        </linearGradient>
        <linearGradient id={`flame-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF6A1A" stopOpacity="0.92" />
          <stop offset="0.55" stopColor="#FFB02E" />
          <stop offset="1" stopColor="#FFE7A0" />
        </linearGradient>
        <linearGradient id={`core-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFF0B8" />
          <stop offset="1" stopColor="#FFFFFF" />
        </linearGradient>
      </defs>

      {/* glow, then the shadow on the ground */}
      <circle className="diya-halo" cx="32" cy="22" r="21" fill={ref('glow')} />
      <ellipse cx="32" cy="60.6" rx="19" ry="2.4" fill="#2A1208" opacity="0.22" />

      {/* bowl: terracotta, lit from the left, darker under the rim */}
      <path d="M6 41 C6 53 18 59.5 32 59.5 C46 59.5 58 53 58 41 Z" fill={ref('clay')} />
      <path d="M6 41 C6 53 18 59.5 32 59.5 C46 59.5 58 53 58 41 Z" fill={ref('shade')} />
      <path d="M11 46.5 C13.5 52.5 20 56 28 57.4" stroke="#FFD9B5" strokeOpacity="0.5" strokeWidth="1.8" fill="none" strokeLinecap="round" />

      {/* rim, the dark hollow and the oil in it */}
      <ellipse cx="32" cy="41" rx="26" ry="7" fill="#D17B3F" stroke="#8A3A14" strokeWidth="0.8" />
      <ellipse cx="32" cy="41.6" rx="22.5" ry="5.2" fill="#55200B" />
      <ellipse cx="32" cy="42.2" rx="20.5" ry="4.2" fill={ref('oil')} />
      <ellipse cx="25" cy="41.2" rx="6.5" ry="1.1" fill="#fff" opacity="0.55" />

      {/* wick, charred at the tip */}
      <path d="M32 42 C32 40 32.4 38.2 32 36" stroke="#2B1A12" strokeWidth="2.2" strokeLinecap="round" fill="none" />

      {/* flame: body, bright core, cool blue root */}
      <g className="diya-flame-outer">
        <path d="M32 3 C34.5 11 42 16 42 26 C42 33 37.5 37.5 32 37.5 C26.5 37.5 22 33 22 26 C22 16 29.5 11 32 3 Z" fill={ref('flame')} />
      </g>
      <g className="diya-flame-inner">
        <path d="M32 15 C33.6 20 37 23 37 28.5 C37 33 34.8 35.5 32 35.5 C29.2 35.5 27 33 27 28.5 C27 23 30.4 20 32 15 Z" fill={ref('core')} />
      </g>
      <path d="M29 35.2 C30.2 37.6 33.8 37.6 35 35.2 C34 34 30 34 29 35.2 Z" fill="#6AA7FF" opacity="0.55" />
    </svg>
  );
};

export default RealisticDiya;
