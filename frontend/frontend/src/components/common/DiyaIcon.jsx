import React, { useId } from 'react';

/**
 * Diya: a clay oil lamp with a lit flame. The flame is two nested tongues that
 * sway out of step, with a soft glow behind them; the bowl is shaded in the logo
 * red so it sits on the theme. `animated={false}` draws it still (for small,
 * repeated uses such as chat avatars).
 *
 * Colours are fixed (the lamp does not follow the text colour), so use it on
 * light backgrounds. Gradient ids are unique per instance.
 */
const DiyaIcon = ({ size = 24, className = '', animated = true, ...rest }) => {
  const uid = useId().replace(/:/g, '');
  const ref = (name) => `url(#${name}-${uid})`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={`diya ${animated ? 'diya--lit' : ''} ${className}`}
      {...rest}
    >
      <defs>
        <radialGradient id={`halo-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#FFB48A" stopOpacity="0.55" />
          <stop offset="0.55" stopColor="#F2784B" stopOpacity="0.16" />
          <stop offset="1" stopColor="#F2784B" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`flame-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B92B2B" />
          <stop offset="0.5" stopColor="#F2784B" />
          <stop offset="1" stopColor="#FAC9A2" />
        </linearGradient>
        <linearGradient id={`core-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFD9B8" />
          <stop offset="1" stopColor="#FFF8EE" />
        </linearGradient>
        <linearGradient id={`bowl-${uid}`} x1="0" y1="0" x2="1" y2="0.5">
          <stop offset="0" stopColor="#C25B5B" />
          <stop offset="0.5" stopColor="#A80808" />
          <stop offset="1" stopColor="#660505" />
        </linearGradient>
        <linearGradient id={`rim-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#C9A9A9" />
          <stop offset="1" stopColor="#820606" />
        </linearGradient>
      </defs>

      {/* glow behind the flame */}
      <circle className="diya-halo" cx="32" cy="24" r="22" fill={ref('halo')} />

      {/* lamp: soft shadow, bowl, rim, oil, highlight */}
      <ellipse cx="32" cy="61.2" rx="17" ry="2.2" fill="#4A0404" opacity="0.14" />
      <path d="M7 43 C8 54 19 60 32 60 C45 60 56 54 57 43 Z" fill={ref('bowl')} />
      <ellipse cx="32" cy="43" rx="25" ry="6" fill={ref('rim')} />
      <ellipse cx="32" cy="43.7" rx="21.5" ry="4.2" fill="#8E1F17" />
      <ellipse cx="32" cy="44.3" rx="15" ry="2.1" fill="#F2784B" opacity="0.3" />
      <path d="M12 47.5 C15 54 22 57 29 57.6" stroke="#fff" strokeOpacity="0.3" strokeWidth="1.6" fill="none" strokeLinecap="round" />

      {/* wick */}
      <path d="M32 44 L32 37" stroke="#4A0A08" strokeWidth="2.2" strokeLinecap="round" />

      {/* flame: outer tongue, then the paler inner one */}
      <g className="diya-flame-outer">
        <path d="M32 4 C34 12 43.5 17 43.5 27 C43.5 34 38.5 38.5 32 38.5 C25.5 38.5 20.5 34 20.5 27 C20.5 17.5 29.5 13 32 4 Z" fill={ref('flame')} />
      </g>
      <g className="diya-flame-inner">
        <path d="M32 16 C33.4 21.5 38 24 38 29.5 C38 34 35.4 36.5 32 36.5 C28.6 36.5 26 34 26 29.5 C26 24 30.6 21.5 32 16 Z" fill={ref('core')} />
      </g>
    </svg>
  );
};

export default DiyaIcon;
