import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import TempleIcon from '../TempleIcon';

// Cloudinary rendition sized for the header mark (displayed at <= 80px).
const sizedLogo = (url) => (url && url.includes('/upload/') ? url.replace('/upload/', '/upload/w_200,q_auto,f_auto/') : url);

const SIZES = {
  // phones: slim bar
  default: {
    mark: 'h-12 w-12 lg:h-16 lg:w-16',
    name: 'text-[clamp(0.7rem,3.5vw,1rem)] sm:text-base lg:text-lg xl:text-xl',
    place: 'text-xs lg:text-sm',
  },
  // top row on desktop: the temple name is the headline
  hero: {
    mark: 'h-16 w-16',
    name: 'text-[clamp(1.25rem,1.9vw,1.6875rem)] leading-tight',
    place: 'text-sm',
  },
  // sticky nav row after the top row has scrolled away
  compact: {
    mark: 'h-9 w-9',
    name: 'text-base',
    place: 'hidden',
  },
};

/**
 * Logo mark + temple name (+ location). Admin → Logo settings can switch the
 * text/location off and choose the mark's shape. The name never wraps: it is
 * sized to fit, never cut.
 */
const SiteLogo = ({ settings, lang, t, onNavigate, variant = 'default', tabIndex }) => {
  const logo = settings?.logo || {};
  const logoPhoto = logo.photo || null;
  const name = logo.text?.[lang] || t.templeName || 'Shree Ramchandra Temple';
  const showText = logo.showText !== false;
  const showLocation = logo.showLocation !== false;
  const shape = logo.shape === 'rounded-lg' || logo.shape === 'rounded-xl' ? 'rounded-xl' : 'rounded-full';
  const size = SIZES[variant] || SIZES.default;

  return (
    <Link
      to="/"
      onClick={onNavigate}
      tabIndex={tabIndex}
      className="group flex min-w-0 items-center gap-2.5 sm:gap-3"
      aria-label={name}
    >
      <span
        className={`flex shrink-0 items-center justify-center overflow-hidden ${shape} bg-white ring-1 ring-line shadow-sm transition-transform duration-200 group-hover:scale-[1.03] ${size.mark}`}
      >
        {logoPhoto ? (
          <img src={sizedLogo(logoPhoto)} alt="" className="h-full w-full object-cover" width="72" height="72" />
        ) : (
          <TempleIcon size={variant === 'compact' ? 18 : 24} className="text-vermilion" />
        )}
      </span>
      {showText && (
        <span className="flex min-w-0 flex-col">
          <span data-logo-name={variant} className={`whitespace-nowrap temple-name font-serif font-bold leading-snug ${size.name}`}>
            {name}
          </span>
          {showLocation && (
            <span className={`mt-0.5 flex items-center gap-1 text-ink-soft ${size.place}`}>
              <MapPin size={variant === 'hero' ? 14 : 12} className="shrink-0 text-vermilion" aria-hidden="true" />
              <span className="whitespace-nowrap">{t.templeSub || 'Battisputali, Kathmandu'}</span>
            </span>
          )}
        </span>
      )}
    </Link>
  );
};

export default SiteLogo;
