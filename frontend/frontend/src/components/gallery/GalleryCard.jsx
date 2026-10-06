import React from 'react';
import { Play } from 'lucide-react';
import { handleImageError } from '../../utils/imageFallback';
import { optimizeImageCached } from '../../utils/imageOptimize';
import { videoPoster } from './galleryText';

/**
 * One picture or video: the image, then its title and description. Nothing is laid over the
 * image, so what the visitor reads is exactly what was entered in Admin → Gallery.
 */
export default function GalleryCard({ item, title, description, onOpen, eager = false }) {
  const isVideo = item.type === 'video';
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={title || description || 'Open'}
      className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-line bg-white text-left shadow-sm transition-shadow duration-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vermilion"
    >
      <span className="relative block aspect-[4/3] w-full overflow-hidden bg-panel">
        {isVideo ? (
          <video
            src={item.photo}
            poster={videoPoster(item.photo)}
            preload="none"
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <img
            src={optimizeImageCached(item.photo, { width: 800 })}
            alt={title || ''}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            onError={(e) => { handleImageError(e, '/1.jpg'); }}
          />
        )}
        {isVideo && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-vermilion shadow-md">
              <Play size={20} className="ml-0.5 fill-current" aria-hidden="true" />
            </span>
          </span>
        )}
      </span>

      {(title || description) && (
        <span className="flex flex-1 flex-col gap-1.5 p-4 sm:p-5">
          {title && <span className="line-clamp-2 font-serif text-lg font-semibold leading-snug text-ink">{title}</span>}
          {description && <span className="line-clamp-3 text-[15px] leading-relaxed text-ink-soft">{description}</span>}
        </span>
      )}
    </button>
  );
}
