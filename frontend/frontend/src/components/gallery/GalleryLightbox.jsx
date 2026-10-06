import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Download, Play, Pause, Maximize, Minimize, Share2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { handleImageError } from '../../utils/imageFallback';
import { optimizeImageCached } from '../../utils/imageOptimize';
import { addWatermarkToImage, addWatermarkToVideo } from '../../utils/galleryWatermark';
import { itemDescription, itemTitle } from './galleryText';

const barBtn = 'flex h-10 items-center gap-1.5 rounded-lg border border-white/20 px-3 text-sm text-white/80 transition-colors hover:border-white/50 hover:text-white disabled:opacity-50';

/** Full-screen viewer: the picture, its title and description, previous/next, slideshow, share, download. */
export default function GalleryLightbox({ items, index, t, lang, onClose, onPrev, onNext, onJump }) {
  const { showToast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [zoom, setZoom] = useState(null); // null, or the transform origin of the zoomed picture
  const [playing, setPlaying] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const rootRef = useRef(null);
  const stripRef = useRef(null);
  const touchX = useRef(null);
  const item = items[index];

  useEffect(() => { setZoom(null); }, [index]);

  // Slideshow: advance every four seconds.
  useEffect(() => {
    if (!playing || items.length < 2) return undefined;
    const id = setInterval(onNext, 4000);
    return () => clearInterval(id);
  }, [playing, onNext, items.length]);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    };
  }, []);

  // Keep the current thumbnail in view.
  useEffect(() => {
    const current = stripRef.current && stripRef.current.querySelector('[aria-current="true"]');
    if (current && current.scrollIntoView) current.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [index]);

  if (!item) return null;

  const isVideo = item.type === 'video';
  const title = itemTitle(item, lang);
  const description = itemDescription(item, lang);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else if (rootRef.current && rootRef.current.requestFullscreen) {
      rootRef.current.requestFullscreen().catch(() => {});
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/gallery?photo=${item._id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        showToast(t.galleryLinkCopied || 'Link copied', 'success');
      }
    } catch (error) {
      if (error && error.name !== 'AbortError') showToast(url, 'info');
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const blob = isVideo ? await addWatermarkToVideo(item.photo) : await addWatermarkToImage(item.photo);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const base = (title || (isVideo ? 'video' : 'image')).replace(/\s+/g, '-').toLowerCase();
      a.download = `${base}-watermarked.${isVideo ? 'webm' : 'jpg'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download with watermark failed:', error);
      window.open(item.photo, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  const onTouchEnd = (e) => {
    if (touchX.current == null || zoom) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) > 50) (dx < 0 ? onNext : onPrev)();
  };

  const toggleZoom = (e) => {
    if (zoom) { setZoom(null); return; }
    const r = e.currentTarget.getBoundingClientRect();
    setZoom(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
  };

  return (
    <motion.div
      ref={rootRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      role="dialog"
      aria-modal="true"
      aria-label={title || t.galleryTitle || 'Gallery'}
      className="fixed inset-0 z-[9999] flex flex-col bg-black/95 backdrop-blur-sm"
    >
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-end gap-2 px-3 py-3 sm:px-5">
        {items.length > 1 && (
          <button type="button" onClick={() => setPlaying((p) => !p)} className={barBtn} aria-pressed={playing} title={playing ? (t.gallerySlideshowStop || 'Pause slideshow') : (t.gallerySlideshow || 'Start slideshow')}>
            {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
            <span className="hidden sm:inline">{playing ? (t.gallerySlideshowStop || 'Pause slideshow') : (t.gallerySlideshow || 'Start slideshow')}</span>
          </button>
        )}
        <button type="button" onClick={handleShare} className={barBtn} title={t.galleryShare || 'Share'}>
          <Share2 size={16} aria-hidden="true" />
          <span className="hidden sm:inline">{t.galleryShare || 'Share'}</span>
        </button>
        <button type="button" onClick={handleDownload} disabled={isDownloading} className={barBtn} title={t.galleryDownload || 'Download'}>
          <Download size={16} aria-hidden="true" />
          <span className="hidden sm:inline">{isDownloading ? (t.galleryProcessing || 'Processing...') : (t.galleryDownload || 'Download')}</span>
        </button>
        <button type="button" onClick={toggleFullscreen} className={`${barBtn} hidden sm:flex`} title={t.galleryFullscreen || 'Full screen'}>
          {fullscreen ? <Minimize size={16} aria-hidden="true" /> : <Maximize size={16} aria-hidden="true" />}
        </button>
        <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 text-white/80 transition-colors hover:border-white/50 hover:text-white">
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {/* Picture */}
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-3 sm:px-16"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={onTouchEnd}
      >
        {items.length > 1 && (
          <>
            <button type="button" onClick={onPrev} aria-label="Previous" className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white sm:left-4">
              <ChevronLeft size={22} aria-hidden="true" />
            </button>
            <button type="button" onClick={onNext} aria-label="Next" className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white sm:right-4">
              <ChevronRight size={22} aria-hidden="true" />
            </button>
          </>
        )}
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="flex max-h-full max-w-full items-center justify-center"
        >
          {isVideo ? (
            <video src={item.photo} className="max-h-[calc(100vh-17rem)] max-w-full rounded-lg" controls autoPlay playsInline />
          ) : (
            <img
              src={optimizeImageCached(item.photo, { width: 1600, quality: 'high' })}
              alt={title}
              decoding="async"
              onClick={toggleZoom}
              style={zoom ? { transformOrigin: zoom, transform: 'scale(2)' } : undefined}
              className={`max-h-[calc(100vh-17rem)] max-w-full rounded-lg object-contain transition-transform duration-300 ${zoom ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
              onError={(e) => { handleImageError(e, '/1.jpg'); }}
            />
          )}
        </motion.div>
      </div>

      {/* Title and description */}
      {(title || description) && (
        <div className="shrink-0 px-4 pb-2 pt-4 text-center">
          {title && <p className="font-serif text-xl font-semibold text-white">{title}</p>}
          {description && <p className="mx-auto mt-1.5 max-h-24 max-w-2xl overflow-y-auto text-base leading-relaxed text-white/75">{description}</p>}
        </div>
      )}

      {/* Thumbnails */}
      {items.length > 1 && (
        <div ref={stripRef} className="flex shrink-0 gap-2 overflow-x-auto px-4 pb-4 pt-2 scrollbar-hide sm:justify-center" style={{ scrollbarWidth: 'none' }}>
          {items.map((it, i) => (
            <button
              key={it._id || i}
              type="button"
              onClick={() => onJump(i)}
              aria-label={itemTitle(it, lang) || 'Picture'}
              aria-current={i === index ? 'true' : undefined}
              className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white/10 transition-all sm:h-16 sm:w-16 ${i === index ? 'opacity-100 ring-2 ring-white' : 'opacity-50 hover:opacity-90'}`}
            >
              {it.type === 'video' ? (
                <span className="flex h-full w-full items-center justify-center text-white"><Play size={16} aria-hidden="true" /></span>
              ) : (
                <img src={optimizeImageCached(it.photo, { width: 160 })} alt="" loading="lazy" draggable={false} className="h-full w-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
