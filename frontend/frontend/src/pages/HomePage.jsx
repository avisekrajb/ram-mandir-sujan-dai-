import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useFullscreen } from '../context/FullscreenContext';
import { ArrowRight, X, Download, Tv, RefreshCw, Play, Pause, QuoteIcon, Clock, MapPin, Share2, Loader2, Heart, Calendar, Eye, Maximize, Minimize } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import api from '../services/api';
import { handleImageError } from '../utils/imageFallback';
import OmLoader from '../components/common/OmLoader';
import HeroShloka from '../components/common/HeroShloka';
import FacebookVideoSection from '../components/common/FacebookVideoSection';
import SectionTitle from '../components/common/SectionTitle';
import YoutubeFacade from '../components/common/YoutubeFacade';
import { optimizeImageCached } from '../utils/imageOptimize';
import { getSectionTitle } from '../utils/sectionTitle';
import { formatDate as formatLocaleDate } from '../utils/formatDate';
import { isGenericTitle, placeholderCaption } from '../utils/galleryPlaceholders';
import { extractFacebookVideoUrl, buildFacebookEmbedSrc } from '../utils/facebookVideo';
import { safeHttpUrl, VIDEO_HOSTS } from '../utils/safeUrl';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// ─── Fullscreen Toggle Button (Desktop only) ──────────────────────────────
function FullscreenToggle({ videoRef }) {
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isDesktop) return null;

  const handleToggle = (e) => {
    e.stopPropagation();
    // Toggle fullscreen on the entire document
    toggleFullscreen(document.documentElement);
  };

  return (
    <motion.button
      onClick={handleToggle}
      className="absolute bottom-24 left-20 z-30 flex items-center justify-center w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 hover:scale-110 transition-all duration-300 border border-white/30 shadow-lg pointer-events-auto"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
    >
      {isFullscreen ? (
        <Minimize className="w-4 h-4" />
      ) : (
        <Maximize className="w-4 h-4" />
      )}
    </motion.button>
  );
}

// ─── Fullscreen Image Modal ──────────────────────────────────────────────────
function ImageModal({ src, alt, caption, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleDownload = async () => {
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = src.split(".").pop()?.split("?")[0] || "jpg";
      a.download = `${alt.replace(/\s+/g, "-").toLowerCase() || "image"}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      const safe = safeHttpUrl(src);
      if (safe) window.open(safe, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      onClick={onClose}
      style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="absolute top-5 right-5 flex gap-3 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 text-white/80 hover:text-white text-xs uppercase tracking-widest px-3 py-2 border border-white/25 hover:border-white/60 transition-all rounded"
          title="Download"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Download</span>
        </button>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-9 h-9 border border-white/25 hover:border-white/60 text-white/80 hover:text-white transition-all rounded"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <motion.div
        className="relative max-w-[92vw] max-h-[90vh] flex items-center justify-center"
        initial={{ scale: 0.93, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex max-h-[90vh] max-w-full flex-col items-center">
          <img
            src={src}
            alt={alt}
            className={`max-w-full object-contain shadow-2xl ${caption?.title || caption?.desc ? 'max-h-[74vh]' : 'max-h-[90vh]'}`}
            style={{ borderRadius: 2 }}
          />
          {(caption?.title || caption?.desc) && (
            <div className="mt-4 max-w-2xl px-4 text-center text-white">
              {caption.title && <h3 className="font-serif text-xl font-semibold">{caption.title}</h3>}
              {caption.desc && <p className="mt-1.5 text-sm leading-relaxed text-white/80">{caption.desc}</p>}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// Hook to manage modal state
function useImageModal() {
  const [modal, setModal] = useState(null);
  const open = useCallback((src, alt, caption) => setModal({ src, alt, caption }), []);
  const close = useCallback(() => setModal(null), []);
  return { modal, open, close };
}

// ─── Helper Functions ──────────────────────────────────────────────────────────
// Records saved by an older build wrap a translated group in a one-element array
// (`verse: [{ en, ... }]`); read through it so the banner still shows the text.
const getLocalizedText = (obj, lang) => {
  const source = Array.isArray(obj)
    ? obj.find((entry) => entry && typeof entry === 'object')
    : obj;
  if (!source) return '';
  if (typeof source === 'string') return source;
  return source[lang] || source.en || '';
};

// ─── Hero Section ─────────────────────────────────────────────────────────────
function Hero({ settings }) {
  const { t, lang } = useLanguage();
  const ref = useRef(null);
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [imageError, setImageError] = useState(false);

  const rawHeroVideo = settings?.heroVideo;
  /*
   * The banner has one source: the admin picks a photo or a video from
   * Admin → Hero and uploading one retires the other (the server clears it), so
   * whichever is set wins. A video is asked for first; the photo is the fallback.
   */
  const rawHeroImage = settings?.heroImage;
  // Serve a right-sized rendition of Cloudinary videos (the original is ~25 MB
  // at 1080p) plus a first-frame poster so there is no black flash while loading.
  const isCloudVideo = !!rawHeroVideo && rawHeroVideo.includes('/video/upload/');
  const heroVidWidth = typeof window !== 'undefined' && window.innerWidth < 768 ? 720 : 1280;
  const heroVideo = isCloudVideo
    ? rawHeroVideo.replace('/video/upload/', `/video/upload/q_auto,w_${heroVidWidth},c_limit/`)
    : rawHeroVideo;
  const heroVideoPoster = isCloudVideo
    ? rawHeroVideo
        .replace('/video/upload/', `/video/upload/so_0,q_auto,w_${heroVidWidth},c_limit/`)
        .replace(/\.[a-z0-9]+$/i, '.jpg')
    : undefined;
  const heroImage = rawHeroImage || undefined;
  const heroEnabled = settings?.heroEnabled !== false;
  const heroPoster = settings?.heroPoster || 'linear-gradient(160deg,#A80808 0%,#820606 45%,#660505 100%)';
  const heroTitle = getLocalizedText(settings?.heroTitle, lang) || t.templeName || 'Shree Ramchandra Temple';
  // heroTagline is no longer rendered in the hero: the banner now shows the
  // invocation and stuti instead (see HeroShloka). The setting is still
  // available in Admin → Home should the tagline be wanted back.
  // All three banner lines are edited per language from Admin → Hero.
  const heroShloka = settings?.heroShloka;
  const shlokaProps = {
    enabled: heroShloka?.enabled !== false,
    invocation: getLocalizedText(heroShloka?.invocation, lang),
    stutiLabel: getLocalizedText(heroShloka?.stutiLabel, lang),
    verse: getLocalizedText(heroShloka?.verse, lang),
  };
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const smooth = useSpring(scrollYProgress, { stiffness: 60, damping: 20 });
  const videoScale = useTransform(smooth, [0, 1], [1, 1.1]);
  /*
   * The dark scrim over the banner exists so the title and the hymn stay
   * readable. Tuned for video, where the footage is usually dark and busy.
   *
   * A photo the admin has just chosen does not need that much: at rest the scrim
   * was already 35% black and reached 80% on scroll, which made a perfectly good
   * photograph look dim and soft. Photos therefore get a much lighter pair of
   * values — the lettering now carries its own shading behind it (see the radial
   * gradient in the text block), so the picture itself stays bright.
   */
  const heroIsPhoto = !heroVideo && !!heroImage && !videoError;
  const overlayOp = useTransform(smooth, [0, 0.7], heroIsPhoto ? [0.06, 0.28] : [0.35, 0.8]);
  const bottomScrim = heroIsPhoto
    ? 'linear-gradient(to top, rgba(0,0,0,0.34) 0%, rgba(0,0,0,0.04) 40%, transparent 72%)'
    : 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 40%, transparent 70%)';
  const textY = useTransform(smooth, [0, 1], ["0%", "-30%"]);
  const textOpacity = useTransform(smooth, [0, 0.5], [1, 0]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Show hero only if enabled
  if (!heroEnabled) {
    return (
      <section
        ref={ref}
        className="relative w-full overflow-hidden"
        data-hero-section="home"
        style={{ height: "100svh", minHeight: 560, background: heroPoster }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.35 }}
          >
            <HeroShloka templeName={heroTitle} {...shlokaProps} />
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={ref}
      className="relative w-full overflow-hidden"
      data-hero-section="home"
      style={{ height: "100svh", minHeight: 560 }}
    >
      <motion.div
        style={{ scale: videoScale }}
        className="absolute inset-0 w-full h-full origin-center"
      >
        {heroVideo && !videoError ? (
          /*
           * object-cover on every screen size, matching the previous
           * behaviour on both desktop and mobile.
           */
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster={heroVideoPoster}
            src={heroVideo}
            onError={() => setVideoError(true)}
          />
        ) : heroImage && !imageError ? (
          <img
            src={heroImage}
            alt={heroTitle}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: heroPoster }}
          />
        )}
      </motion.div>

      {/* Video Controls - only over a video; the photo needs no transport */}
      {heroVideo && !videoError && (
      <div className="absolute inset-0 pointer-events-none">
        <div className="relative w-full h-full">
          {/* Pause/Play Button - Bottom left */}
          <button
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause video' : 'Play video'}
            className="absolute bottom-24 left-6 z-20 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-all text-white pointer-events-auto border border-white/30"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          {/* Fullscreen Toggle Button - Bottom left, next to pause button */}
          <FullscreenToggle videoRef={videoRef} />
        </div>
      </div>
      )}

      <motion.div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,1)", opacity: overlayOp }}
      />

      <div
        className="absolute inset-0"
        style={{
          background: bottomScrim,
        }}
      />

      <motion.div
        style={{ y: textY, opacity: textOpacity }}
        className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-6"
      >
        {/*
          No panel behind the words. A dark shape drawn under the text made the
          photograph look stained, so the lettering now carries its own shadow
          (see .hero-shloka__line in index.css) and the banner keeps only the
          light full-bleed scrim above.
        */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.35 }}
        >
          <HeroShloka templeName={heroTitle} {...shlokaProps} />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        style={{ opacity: textOpacity }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
      >
        <span className="text-white/65 text-xs uppercase tracking-widest" style={{ fontFamily: "serif" }}>
          {t.a5_scrollHint || 'scroll'}
        </span>
        <motion.div
          animate={{ y: [0, 9, 0] }}
          transition={{ repeat: Infinity, duration: 1.7, ease: "easeInOut" }}
          style={{
            width: 1,
            height: 36,
            background: "linear-gradient(to bottom, rgba(255,255,255,0.5), transparent)",
          }}
        />
      </motion.div>
    </section>
  );
}

// ─── Quote Strip - FULLY LOCALIZED with Daily Quote API ────────────────────
function QuoteStrip({ quote }) {
  const { t, lang } = useLanguage();
  const [dailyQuote, setDailyQuote] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTodayQuote = async () => {
      try {
        setLoading(true);
        const response = await api.get('/admin/quotes/today');
        if (response.data.success) {
          setDailyQuote(response.data.data);
        }
      } catch (err) {
        console.error('Error fetching daily quote:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTodayQuote();
  }, []);

  // Localized quote, API first then the settings prop. No hardcoded default
  // text — if nothing is published the strip stays hidden.
  const getLocalizedQuote = () => {
    if (dailyQuote && dailyQuote.quote) {
      return dailyQuote.quote[lang] || dailyQuote.quote.en || '';
    }
    if (quote) {
      if (typeof quote === 'string') return quote;
      return quote[lang] || quote.en || '';
    }
    return '';
  };

  const localizedQuote = getLocalizedQuote();

  if (loading || !localizedQuote) return null;

  return (
    <div className="bg-panel text-ink flex items-start gap-3 px-4 md:px-6 py-4 md:py-5 max-w-7xl mx-auto rounded-xl border border-line">
      <QuoteIcon size={18} className="text-vermilion flex-shrink-0 mt-1" aria-hidden="true" />
      <div>
        <span className="text-xs md:text-xs uppercase tracking-widest text-vermilion font-bold">
          {t.quoteLabel || 'Thought for the Day'}
        </span>
        <p className="font-serif text-sm md:text-base text-ink mt-1 leading-relaxed">
          {localizedQuote}
        </p>
      </div>
    </div>
  );
}

// ─── About Preview (Homepage Only) - IMAGES NOT CLICKABLE ────────────────────
function AboutPreview({ settings }) {
  const { t, lang } = useLanguage();
  const sectionRef = useRef(null);
  const textRef = useRef(null);
  const imagesRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (textRef.current) {
        const children = textRef.current.querySelectorAll(
          ".about-reveal, p, a"
        );
        /*
         * The clip box is inset by a negative amount vertically: `inset(0 …)`
         * clips to the border box, which cuts the matras and ascenders that
         * sit above it in Devanagari (the ी of "श्री" in the Nepali title was
         * sliced off). The negative inset keeps the whole glyph box visible.
         */
        gsap.set(children, { opacity: 0, x: -52, clipPath: "inset(-0.45em 100% -0.45em 0)" });
        gsap.to(children, {
          opacity: 1,
          x: 0,
          clipPath: "inset(-0.45em 0% -0.45em 0)",
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.14,
          scrollTrigger: {
            trigger: textRef.current,
            start: "top 78%",
            once: true,
          },
        });
      }

      if (imagesRef.current) {
        const cards = imagesRef.current.querySelectorAll(".img-card");
        gsap.set(cards, { opacity: 0, x: 60, scale: 0.97 });
        gsap.to(cards, {
          opacity: 1,
          x: 0,
          scale: 1,
          duration: 1.0,
          ease: "expo.out",
          stagger: 0.12,
          scrollTrigger: {
            trigger: imagesRef.current,
            start: "top 78%",
            once: true,
          },
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  // ===== USE ABOUT PREVIEW SETTINGS (Homepage only) =====
  const aboutPreview = settings?.aboutPreview || {};

  // Check if about preview is enabled
  if (aboutPreview.enabled === false) return null;

  /*
 * getSectionTitle, not getLocalizedText: it discards a saved placeholder such as
 * "श्री रामचन्द्र मन्दिरको बारेमा" so the current default below is used instead.
 * A title the admin wrote by hand still wins.
 */
  const title = getSectionTitle(aboutPreview.title, lang) || t.aboutTitleDefault || 'Introduction to the Temple';
  const text = getLocalizedText(aboutPreview.text, lang) || t.aboutTextDefault || 'Nestled in the heart of Gaushala, Shree Ramchandra Temple has stood as a beacon of devotion for generations.';

  // Get about preview images (filter enabled)
  const aboutImages = aboutPreview.images?.filter(img => img.enabled) || [];

  // Get timings for display
  // If no images, use default fallback images
  const image1 = aboutImages[0]?.src || '/aboutusherosection.jpeg';
  const image2 = aboutImages[1]?.src || '/aboutusphoto.jpeg';
  const image3 = aboutImages[2]?.src || '/rammandir.jpeg';

  /*
   * Layout: the wide photo on top, the two squarer ones side by side underneath
   * (the reverse of the original order).
   */
  const aboutPhotos = [
    { src: image3, alt: 'Temple Architecture', wide: true },
    { src: image1, alt: 'Temple' },
    { src: image2, alt: 'Temple Deity' },
  ];

  return (
    <section ref={sectionRef} className="max-w-7xl mx-auto px-6 py-20">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div ref={textRef}>
          <div className="about-reveal">
            <SectionTitle animate={false} align="left">
              {title}
            </SectionTitle>
          </div>
          <p className="text-base sm:text-lg text-mute leading-relaxed mt-6 mb-8 text-justify about-text is-justified-mobile">
            {text}
          </p>
          <ul className="list-none p-0 m-0 flex flex-col gap-2 mb-6">
            <li className="flex items-center gap-2 text-sm text-ink-soft">
              <Clock size={14} className="text-vermilion" /> {t.openHours || 'Darshan Hours'}: 5:00 – 10:00 PM
            </li>
            <li className="flex items-center gap-2 text-sm text-ink-soft">
              <MapPin size={14} className="text-vermilion" /> {t.templeAddressLine}
            </li>
          </ul>
          <Link
  to="/about"
  className="btn-primary px-8"
>
  {t.viewMore || "View More"}
</Link>
        </div>

        {/*
          Wide photo on top, the two squarer ones side by side below. No box is
          given a fixed ratio and the images are not letter-boxed: each one is
          shown at its own size (`h-auto`), so there is no empty strip above or
          below a photo whose shape differs from its neighbours.
        */}
        <div ref={imagesRef} className="grid grid-cols-2 gap-4 items-start">
          {aboutPhotos.map((photo) => (
            <div
              key={photo.src}
              className={`img-card overflow-hidden rounded-lg border border-line shadow-lg ${
                photo.wide ? 'col-span-2' : ''
              }`}
            >
              <img
                src={optimizeImageCached(photo.src, { width: photo.wide ? 1280 : 640 })}
                alt={photo.alt}
                loading="lazy"
                decoding="async"
                className="block w-full h-auto"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Facebook Video Section (NEW - renders below About section) ────────────
// Videos (rectangle) on top, Reels (vertical) below, shown as horizontal
// sliders. Admin-editable via settings?.facebookVideos / settings?.facebookReels.
function FacebookVideoTeaser({ settings }) {
  const { t } = useLanguage();
  const fbEnabled = settings?.facebookVideo?.enabled !== false;
  if (!fbEnabled) return null;
  
  return (
    <section className="py-14 sm:py-16" style={{ background: "#ffffff" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <FacebookVideoSection settings={settings} t={t} hideReels />
      </div>
    </section>
  );
}

/*
 * ============================================================================
 *  VIDEO PERFORMANCE — WHY THE HOME PAGE WAS SLOW
 * ============================================================================
 *
 * FacebookVideoCard rendered a real <iframe> for every video, all at once, with
 * loading="eager". Each facebook.com/plugins/video.php frame pulls roughly
 * 1.5-2.5MB of player JavaScript plus video segments, and the origin only
 * coalesces duplicates when the response is still cacheable. A homepage with a
 * dozen videos was firing a dozen full players in parallel — which is exactly
 * the "requests through video.php?href=..." pattern and the "many resources at
 * once" symptom.
 *
 * The card now shows a lightweight cover and only creates the iframe on click,
 * so the initial page makes zero third-party video requests. The existing
 * VideoPopupModal (which autoplays with sound) is unchanged: clicking the card
 * opens that, and the click also activates this card's own inline player.
 *
 * A note on thumbnails: Facebook only exposes its preview image through the
 * player itself, so there is no free static URL to use as a cover. Rather than
 * keep loading the player to get one, the card renders a branded placeholder
 * built from the page's own palette — which is why `poster` is a CSS gradient
 * rather than an image request.
 */

// ─── Event Detail Modal ──────────────────────────────────────────────────────
function EventDetailModal({ event, onClose, lang, t, user, onInterested, isInterested, interestedCount }) {
  const { showToast } = useToast();
  const [sharing, setSharing] = useState(false);

  if (!event) return null;

  const titleText = getLocalizedText(event.title, lang);
  const descText = getLocalizedText(event.desc, lang);
  const dateText = getLocalizedText(event.dateNepali, lang);
  const gregText = getLocalizedText(event.greg, lang);

  const handleShare = async () => {
    setSharing(true);
    try {
      const shareData = {
        title: titleText || 'Event',
        text: `${titleText} - ${dateText || gregText || ''}`,
        url: `${window.location.origin}/events/${event._id}`,
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
        showToast('Event link copied to clipboard!', 'success');
      }

      // Track share
      try {
        await api.post(`/events/${event._id}/share`);
      } catch (e) {
        console.error('Share tracking error:', e);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Share error:', error);
        showToast('Failed to share event', 'error');
      }
    } finally {
      setSharing(false);
    }
  };

  const handleInterestedClick = () => {
    if (!user) {
      showToast('Please login to mark as interested', 'warning');
      return;
    }
    onInterested(event._id);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/30 backdrop-blur-sm transition-all"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Image - NOT CLICKABLE */}
        <div className="relative h-64 sm:h-80 overflow-hidden rounded-t-2xl">
          <img loading="lazy"
            src={event.photo || '/default-event.jpg'}
            alt={titleText}
            className="w-full h-full object-cover"
              onError={(e) => { handleImageError(e, '/default-event.jpg'); }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-4 left-6">
            <span className="text-white/90 text-sm font-medium">
              {dateText || gregText || ''}
            </span>
          </div>
          {/* Upcoming badge */}
          {event.upcoming && (
            <div className="absolute top-4 left-4 bg-red-900 text-white px-4 py-1.5 text-xs font-bold rounded-full shadow-lg z-10">
              Upcoming
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink mb-3">
            {titleText || 'Event'}
          </h2>

          <div className="flex flex-wrap items-center gap-4 text-sm text-ink-soft mb-4">
            {gregText && (
              <span className="flex items-center gap-1.5">
                <Calendar size={16} className="text-vermilion" />
                {gregText}
              </span>
            )}
            {event.date && (
              <span className="flex items-center gap-1.5">
                <Clock size={16} className="text-vermilion" />
                {event.date}
              </span>
            )}
          </div>

          <p className="text-base text-ink-soft leading-relaxed mb-6">
            {descText || 'No description available'}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={handleInterestedClick}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                isInterested
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-gray-100 text-ink hover:bg-gray-200'
              }`}
            >
              <Heart size={18} className={isInterested ? 'fill-white' : ''} />
              {isInterested ? (t.interested || 'Interested') : (t.markInterested || 'Mark Interested')}
              <span className="ml-1 text-xs bg-white/20 px-2 py-0.5 rounded-full">
                {interestedCount || 0}
              </span>
            </button>

            <button
              onClick={handleShare}
              disabled={sharing}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all"
            >
              {sharing ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Share2 size={18} />
              )}
              {t.share || 'Share'}
            </button>

            <div className="ml-auto flex items-center gap-2 text-xs text-ink-soft">
              <Eye size={14} />
              <span>Viewed</span>
              <span className="font-bold">{event.views || 0}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Events Teaser ────────────────────────────────────────────────────────────
function EventsTeaser({ onOpen }) {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [interestedEvents, setInterestedEvents] = useState({});
  const [interestedCounts, setInterestedCounts] = useState({});
  const [, setActionLoading] = useState({});
  const [selectedEvent, setSelectedEvent] = useState(null);

  const formatEventDate = (dateString) => {
    if (!dateString) return 'Coming Soon';
    const date = new Date(dateString);
    const options = { month: 'long', day: 'numeric' };
    const year = date.getFullYear();
    if (year >= 2026) {
      options.year = 'numeric';
    }
    return formatLocaleDate(date, lang, options);
  };

  // Fetch events and interested status
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // The events the admin placed on the home page, in slot order. The server
        // returns them already sorted by homeSlot and capped at 4, so the response
        // order is exactly the 1/2/3/4 order rendered below. See Admin -> Events.
        const response = await api.get('/events/home');
        const eventsData = Array.isArray(response.data) ? response.data : response.data?.data || [];
        setEvents(eventsData);

        // Initialize interested counts
        const counts = {};
        eventsData.forEach(e => {
          counts[e._id] = e.interestedCount || 0;
        });
        setInterestedCounts(counts);

        // If user is logged in, fetch their interested events
        if (user) {
          try {
            const interestedRes = await api.get('/events/interested');
            const interestedMap = {};
            interestedRes.data.forEach(e => {
              interestedMap[e._id] = true;
            });
            setInterestedEvents(interestedMap);
          } catch (error) {
            console.error('Error fetching interested events:', error);
          }
        }
      } catch (error) {
        console.error('Error fetching events:', error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [user]);

  const handleInterested = async (eventId) => {
    if (!user) {
      showToast('Please login to mark as interested', 'warning');
      return;
    }

    if (!eventId) {
      console.error('No event ID provided');
      showToast('Error: Event ID is missing', 'error');
      return;
    }

    setActionLoading(prev => ({ ...prev, [eventId]: true }));

    try {
      const isCurrentlyInterested = interestedEvents[eventId];
      const endpoint = isCurrentlyInterested
        ? `/events/${eventId}/uninterested`
        : `/events/${eventId}/interested`;

      const response = await api.post(endpoint);

      // Update interested state
      setInterestedEvents(prev => ({
        ...prev,
        [eventId]: !isCurrentlyInterested
      }));

      // Update count
      setInterestedCounts(prev => ({
        ...prev,
        [eventId]: response.data.count || (isCurrentlyInterested ? prev[eventId] - 1 : prev[eventId] + 1)
      }));

      showToast(
        isCurrentlyInterested
          ? 'Removed from interested'
          : 'Marked as interested!',
        'success'
      );
    } catch (error) {
      console.error('Error updating interest:', error);
      showToast(error.response?.data?.message || 'Failed to update interest', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [eventId]: false }));
    }
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    // Track view
    if (event && event._id) {
      api.post(`/events/${event._id}/view`).catch(() => {});
    }
  };

  if (loading) {
    return (
      <section className="py-24" style={{ background: "#ffffff" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <OmLoader size="md" color="vermilion" className="mx-auto" />
        </div>
      </section>
    );
  }

  if (events.length === 0) return null;

  // Keep the row full when there are fewer than 4 festivals, instead of leaving
  // empty grid columns on the right.
  const gridCols =
    events.length === 1 ? 'md:grid-cols-1 max-w-sm mx-auto'
      : events.length === 2 ? 'md:grid-cols-2'
      : events.length === 3 ? 'md:grid-cols-2 lg:grid-cols-3'
      : 'md:grid-cols-2 lg:grid-cols-4';

  return (
    <>
      <section className="py-24" style={{ background: "#ffffff" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mb-12 sm:mb-14">
            <SectionTitle eyebrow={t.tt_events || 'Join Us'}>{t.upcomingEvents || 'Upcoming Events'}</SectionTitle>
          </div>
          <div className={`grid ${gridCols} gap-6`}>
            {events.map((e, i) => {
              const titleText = getLocalizedText(e.title, lang);
              const descText = getLocalizedText(e.desc, lang);

              return (
                <motion.div
                  key={e._id || i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.1, ease: [0.25, 1, 0.5, 1] }}
                  className="group flex cursor-pointer flex-col rounded-3xl bg-white p-3 shadow-sm ring-1 ring-line transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  onClick={() => handleEventClick(e)}
                >
                  <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-panel">
                    <img
                      src={optimizeImageCached(e.photo || '/4.jpg', { width: 640 })}
                      alt={titleText}
                      loading="lazy"
                      decoding="async"
                      width={640}
                      height={480}
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      onError={(e) => { handleImageError(e, '/4.jpg'); }}
                    />
                  </div>

                  <div className="flex flex-1 flex-col px-2 pb-3 pt-4">
                    <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-vermilion">
                      <Calendar size={14} aria-hidden="true" />
                      {e.date ? formatEventDate(e.date) : 'Coming Soon'}
                    </span>
                    {/* Two lines reserved for the title, so descriptions line up across the row */}
                    <h3 className="mb-2 line-clamp-2 min-h-[2.6em] font-serif text-lg font-semibold leading-snug text-ink transition-colors group-hover:text-vermilion">
                      {titleText}
                    </h3>
                    <p className="line-clamp-2 text-sm leading-relaxed text-ink-soft">
                      {descText}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
          <div className="text-center mt-12">
          <Link
  to="/events"
  className="inline-flex items-center px-5 py-2 rounded-full font-medium text-sm text-white bg-gradient-to-r from-maroon to-maroon-deep hover:from-maroon-deep hover:to-maroon shadow-md shadow-black/10 hover:-translate-y-0.5 transition-all"
>
  {t.viewMore || "View More"}
</Link>
          </div>
        </div>
      </section>

      {/* Event Detail Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <EventDetailModal
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
            lang={lang}
            t={t}
            user={user}
            onInterested={handleInterested}
            isInterested={interestedEvents[selectedEvent._id] || false}
            interestedCount={interestedCounts[selectedEvent._id] || 0}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Gallery Teaser - IMAGES NOT CLICKABLE ────────────────────────────────────
// One row of the home-page gallery carousel. It drifts slowly on its own, can be
// swiped (touch) or dragged (mouse), and keeps looping because the cards are
// repeated three times and the scroll position is wrapped by one set width.
function MarqueeRow({ items, direction = -1, renderCard }) {
  const ref = useRef(null);
  const state = useRef({ paused: false, resumeAt: 0, acc: 0, drag: null, moved: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const setWidth = () => el.scrollWidth / 3;
    el.scrollLeft = setWidth(); // start in the middle copy so both directions can loop
    const wrap = () => {
      const w = setWidth();
      if (!w) return;
      if (el.scrollLeft >= w * 2) el.scrollLeft -= w;
      else if (el.scrollLeft <= 1) el.scrollLeft += w;
    };
    let raf;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(now - last, 64);
      last = now;
      const st = state.current;
      if (!reduced && !st.paused && now >= st.resumeAt) {
        st.acc += (-direction) * 0.045 * dt; // ~45px per second
        const step = Math.trunc(st.acc);
        if (step !== 0) {
          el.scrollLeft += step;
          st.acc -= step;
        }
      }
      wrap();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [direction, items.length]);

  const pause = (ms = 2000) => { state.current.resumeAt = performance.now() + ms; };
  const onPointerDown = (e) => {
    if (e.pointerType !== 'mouse') return; // touch scrolls natively
    const el = ref.current;
    state.current.drag = { x: e.clientX, left: el.scrollLeft };
    state.current.moved = 0;
    state.current.paused = true;
    el.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    const d = state.current.drag;
    if (!d) return;
    state.current.moved = Math.max(state.current.moved, Math.abs(e.clientX - d.x));
    ref.current.scrollLeft = d.left - (e.clientX - d.x);
  };
  const endDrag = () => {
    state.current.drag = null;
    state.current.paused = false;
    pause(1500);
  };

  return (
    <div
      ref={ref}
      className="scroll-hidden cursor-grab select-none overflow-x-auto overflow-y-hidden py-3 active:cursor-grabbing"
      style={{ touchAction: 'pan-x pan-y' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onClickCapture={(e) => {
        if (state.current.moved > 5) { e.stopPropagation(); e.preventDefault(); }
        state.current.moved = 0;
      }}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') state.current.paused = true; }}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse' && !state.current.drag) { state.current.paused = false; pause(600); } }}
      onTouchStart={() => { state.current.paused = true; }}
      onTouchEnd={() => { state.current.paused = false; pause(2000); }}
      onWheel={() => pause(2000)}
    >
      <div className="flex w-max gap-4 px-1">{items.map(renderCard)}</div>
    </div>
  );
}

function GalleryTeaser({ settings, onOpen }) {
  const { t, lang } = useLanguage();
  const [galleryPhotos, setGalleryPhotos] = useState([]);

  const getLocalizedAlt = (obj) => {
    if (!obj) return 'Gallery Image';
    if (typeof obj === 'string') return obj;
    return obj[lang] || obj.en || 'Gallery Image';
  };

  // Prefer the real gallery collection (admin uploads), fall back to
  // settings.galleryImages managed in Admin → Home.
  useEffect(() => {
    let mounted = true;
    api.get('/admin/gallery/all')
      .then(res => {
        if (!mounted) return;
        const photos = (res.data?.data || []).filter(it => it.type === 'photo' || !it.type);
        if (photos.length > 0) setGalleryPhotos(photos);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const settingsImgs = settings?.galleryImages?.filter(img => img.enabled) || [];

  const items = galleryPhotos.length > 0
    ? galleryPhotos.map((p, idx) => {
        const ph = placeholderCaption(idx, lang);
        const real = getLocalizedText(p.title, lang) || getLocalizedText(p.cap, lang);
        return {
          key: p._id,
          src: p.photo,
          title: isGenericTitle(real) ? ph.title : real,
          desc: getLocalizedText(p.description, lang) || ph.desc,
        };
      })
    : settingsImgs.slice(0, 8).map((img, idx) => {
        const ph = placeholderCaption(idx, lang);
        const real = getLocalizedAlt(img);
        return {
          key: img.id,
          src: img.src,
          title: isGenericTitle(real) ? ph.title : real,
          desc: ph.desc,
        };
      });

  if (items.length === 0) return null;

  // Two rows for a 360-style dual marquee
  const row1 = items;                    // top row  → right to left
  const row2 = [...items].reverse();     // bottom row → left to right
  const tripled1 = [...row1, ...row1, ...row1];
  const tripled2 = [...row2, ...row2, ...row2];

  const renderCard = (img, i) => (
    <div
      key={`${img.key}-${i}`}
      role="button"
      tabIndex={0}
      aria-label={img.title}
      onClick={() => onOpen && onOpen(img.src, img.title, { title: img.title, desc: img.desc })}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && onOpen) { e.preventDefault(); onOpen(img.src, img.title, { title: img.title, desc: img.desc }); } }}
      className="group relative flex-shrink-0 marquee-card cursor-pointer rounded-3xl bg-white p-1.5 shadow-lg ring-1 ring-brand-100 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl hover:ring-line"
    >
     <div className="relative h-full w-full overflow-hidden rounded-[1.25rem]">
      {/*
        Sized to the rendered slot (clamp tops out at 240px) and served through
        the optimiser, so a multi-megapixel upload no longer ships at full size.
        width/height give the browser an aspect ratio and prevent layout shift.
      */}
      <img
        src={optimizeImageCached(img.src, { width: 480, quality: 'medium' })}
        alt={img.title}
        loading="lazy"
        decoding="async"
        width={480}
        height={480}
        draggable={false}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          onError={(e) => { handleImageError(e, '/1.jpg'); }}
      />
      {/* Caption straight on the photo: no colour overlay, a soft text shadow keeps it readable. */}
      <div className="absolute bottom-0 left-0 right-0 p-3.5 text-left" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.7), 0 0 18px rgba(0,0,0,0.6)' }}>
        <p className="line-clamp-1 font-serif text-sm font-semibold leading-snug text-white">{img.title}</p>
        {img.desc && (
          <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-white">{img.desc}</p>
        )}
      </div>
     </div>
    </div>
  );

  return (
    <section className="py-20 overflow-hidden" style={{ background: 'linear-gradient(180deg, #FBF8F8 0%, #ffffff 100%)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-10 sm:mb-12">
          <SectionTitle eyebrow={t.tt_gallery || 'Divine Visions'}>{t.galleryTitle || 'Photo Gallery'}</SectionTitle>
        </div>

        <div className="relative space-y-3">
          {/* Row 1 drifts right to left, row 2 left to right; both can be swiped or dragged */}
          <MarqueeRow items={tripled1} direction={-1} renderCard={renderCard} />
          <MarqueeRow items={tripled2} direction={1} renderCard={renderCard} />
        </div>

        <style>{`
          .marquee-card {
            width: calc((100vw - 3rem - 1rem) / 2.15);
            height: calc((100vw - 3rem - 1rem) / 2.15);
          }
          @media (min-width: 640px) {
            .marquee-card {
              width: calc((min(100vw, 80rem) - 3rem - 2rem) / 3);
              height: calc((min(100vw, 80rem) - 3rem - 2rem) / 3);
            }
          }
          @media (min-width: 1024px) {
            .marquee-card {
              width: calc((min(100vw, 80rem) - 3rem - 3.5rem) / 4);
              height: calc((min(100vw, 80rem) - 3rem - 3.5rem) / 4);
            }
          }
        `}</style>

        <div className="text-center mt-10">
          <Link
            to="/gallery"
            className="inline-flex items-center px-5 py-2 rounded-full font-medium text-sm text-white bg-gradient-to-r from-maroon to-maroon-deep hover:from-maroon-deep hover:to-maroon shadow-md shadow-black/10 hover:-translate-y-0.5 transition-all"
          >
            {t.viewMore || "View More"}
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Live Darshan ────────────────────────────────────────────────────────────
// A live embed should play with sound and show YouTube's own controls (play/pause,
// volume, quality, fullscreen). Settings often contain mute=1 from an old default.
const withSoundAndControls = (u) => {
  try {
    const x = new URL(u);
    x.searchParams.delete('mute');
    x.searchParams.set('autoplay', '1');
    x.searchParams.set('controls', '1');
    x.searchParams.set('playsinline', '1');
    x.searchParams.set('rel', '0');
    x.searchParams.set('fs', '1');
    return x.toString();
  } catch {
    return u;
  }
};

/*
 * The same embed, but muted. This is the only form of autoplay a browser permits:
 * Chrome and Safari block an unmuted video that nobody asked for, but allow a
 * muted one straight away. YouTube's controls stay on, so the visitor lifts the
 * sound themselves.
 *
 * `enablejsapi=1` and a matching `origin` are not optional here: without them
 * YouTube ignores `autoplay=1` outright on an embed it did not load itself, which
 * is exactly this case, because the iframe is created after the page has loaded.
 */
const withMutedAutoplay = (u) => {
  try {
    const x = new URL(u);
    x.searchParams.set('autoplay', '1');
    x.searchParams.set('mute', '1');
    x.searchParams.set('controls', '1');
    x.searchParams.set('playsinline', '1');
    x.searchParams.set('rel', '0');
    x.searchParams.set('fs', '1');
    x.searchParams.set('enablejsapi', '1');
    if (typeof window !== 'undefined' && window.location?.origin) {
      x.searchParams.set('origin', window.location.origin);
    }
    return x.toString();
  } catch {
    return u;
  }
};

// ─── Facebook live player ─────────────────────────────────────────────────────
// A poster with a play button; the Facebook player (an iframe) is only created
// after the visitor clicks, so the home page doesn't pay for it up front.
function FacebookLivePlayer({ url, title, poster }) {
  const [active, setActive] = useState(false);
  const clean = extractFacebookVideoUrl(url) || url;

  if (active) {
    return (
      <iframe
        title={title}
        src={buildFacebookEmbedSrc(clean, true, false)}
        className="absolute inset-0 h-full w-full"
        style={{ border: 0 }}
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
        allowFullScreen
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setActive(true)}
      aria-label={title}
      className="group absolute inset-0 flex h-full w-full flex-col items-center justify-center gap-4 bg-brand-50 text-ink"
    >
      {poster ? (
        <img src={poster} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
      <span className="absolute inset-0 bg-white/30" aria-hidden="true" />
      <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-vermilion text-white shadow-xl ring-4 ring-white/80 transition-transform duration-300 group-hover:scale-110">
        <Play size={32} className="ml-1" fill="currentColor" aria-hidden="true" />
      </span>
      {!poster ? <span className="relative px-4 text-center font-serif text-lg font-semibold">{title}</span> : null}
    </button>
  );
}

function LiveDarshan({ settings }) {
  const { t, lang } = useLanguage();
  const [videoError, setVideoError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [useAlternativeEmbed, setUseAlternativeEmbed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // Becomes true once the visitor clicks the facade. The "Loading live
  // stream..." spinner is meaningless before that, since nothing is loading.
  const [playerActive, setPlayerActive] = useState(false);
  const loadedRef = useRef(false);
  // A slow connection is not a failure: keep the player mounted and just offer a way out.
  const [slow, setSlow] = useState(false);
  // The temple's Facebook page: on air now, and its recent past lives (see /api/live/facebook).
  const [fbLive, setFbLive] = useState(null);
  // The YouTube channel from Admin → Live Puja: the server decides whether a
  // broadcast is running and falls back to the saved video when it is not.
  const [livePuja, setLivePuja] = useState(null);
  const [pastIndex, setPastIndex] = useState(0);

  // Default live video with proper autoplay URL
  const liveVideo = settings?.liveVideo || {
    enabled: true,
    url: 'https://www.youtube.com/embed/aPGvK6tJMXk?autoplay=1&mute=1&playsinline=1&rel=0',
    title: { en: 'Live Darshan', ne: 'लाइभ दर्शन', hi: 'लाइव दर्शन', zh: '现场朝拜', ta: 'நேரடி தரிசனம்' },
    description: {
      en: 'Experience the divine presence of Lord Ram from anywhere in the world',
      ne: 'संसारको कुनै पनि स्थानबाट भगवान रामको दिव्य उपस्थिति अनुभव गर्नुहोस्',
      hi: 'दुनिया में कहीं से भी भगवान राम की दिव्य उपस्थिति का अनुभव करें',
      zh: '从世界任何地方体验罗摩神的神圣存在',
      ta: 'உலகில் எங்கிருந்தும் ராமரின் தெய்வீக இருப்பை அனுபவியுங்கள்'
    },
  };
  // ── YouTube URL Parser with Autoplay Support ──────────────────────────────
  const parseYouTubeUrl = (url) => {
    let videoId = null;
    let playlistId = null;
    let embedUrl = null;
    let watchUrl = null;
    let isLiveStream = false;

    // Clean the URL
    url = url.trim();

    // Check if it's already an embed URL with proper parameters
    if (url.includes('/embed/')) {
      embedUrl = url;
      const match = url.match(/\/embed\/([^?]+)/);
      if (match) videoId = match[1];
      watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

      // Check if URL already has autoplay and mute parameters
      if (!url.includes('autoplay=1')) {
        const separator = url.includes('?') ? '&' : '?';
        embedUrl = `${url}${separator}autoplay=1&mute=1&playsinline=1&rel=0`;
      }
      return { videoId, playlistId, embedUrl, watchUrl, isLiveStream };
    }

    // Extract video ID from youtube.com/watch?v=
    if (url.includes('youtube.com/watch?v=')) {
      const params = new URLSearchParams(url.split('?')[1]);
      videoId = params.get('v');
      playlistId = params.get('list');
      watchUrl = url;
    }
    // Extract from youtu.be/
    else if (url.includes('youtu.be/')) {
      const parts = url.split('youtu.be/')[1]?.split('?');
      videoId = parts?.[0];
      if (parts?.[1]) {
        const params = new URLSearchParams(parts[1]);
        playlistId = params.get('list');
      }
      watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    }
    // Extract from youtube.com/embed/
    else if (url.includes('youtube.com/embed/')) {
      const parts = url.split('youtube.com/embed/')[1]?.split('?');
      videoId = parts?.[0];
      if (parts?.[1]) {
        const params = new URLSearchParams(parts[1]);
        playlistId = params.get('list');
      }
      watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    }
    // Extract from youtube.com/shorts/
    else if (url.includes('youtube.com/shorts/')) {
      const parts = url.split('youtube.com/shorts/')[1]?.split('?');
      videoId = parts?.[0];
      watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    }
    // Extract from live stream URL
    else if (url.includes('/live/')) {
      const match = url.match(/\/live\/([^?]+)/);
      if (match) videoId = match[1];
      isLiveStream = true;
      watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    }
    // Extract from URL with v= parameter
    else if (url.includes('v=')) {
      const params = new URLSearchParams(url.split('?')[1]);
      videoId = params.get('v');
      playlistId = params.get('list');
      watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    }
    // Check if it's a live stream based on URL patterns
    else if (url.includes('live') || url.includes('stream')) {
      isLiveStream = true;
    }

    // ── BUILD EMBED URL WITH AUTOPLAY AND MUTE ──
    const origin = window.location.origin;

    if (playlistId) {
      embedUrl = `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1&mute=1&playsinline=1&rel=0&enablejsapi=1&origin=${origin}`;
    } else if (videoId) {
      embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1&rel=0&enablejsapi=1&origin=${origin}`;
    } else {
      embedUrl = 'https://www.youtube.com/embed/aPGvK6tJMXk?autoplay=1&mute=1&playsinline=1&rel=0';
      watchUrl = 'https://www.youtube.com/watch?v=aPGvK6tJMXk';
    }

    return { videoId, playlistId, embedUrl, watchUrl, isLiveStream };
  };

  // Ask the server whether the page is live; look again every 90 seconds so a stream that
  // starts while the page is open takes over.
  useEffect(() => {
    let alive = true;
    const load = () => api.get('/live/facebook')
      .then((res) => { if (alive) setFbLive(res.data); })
      .catch(() => { /* keep whatever is showing */ });
    load();
    const id = setInterval(load, 90000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // The Live Puja block, polled every 60 seconds. That is the same interval the
  // server caches its answer for, so a stream that starts or ends while the page
  // is open is picked up within about a minute without the site ever polling
  // YouTube harder than that.
  useEffect(() => {
    let alive = true;
    const load = () => api.get('/live/puja')
      .then((res) => { if (alive) setLivePuja(res.data); })
      .catch(() => { /* keep whatever is showing */ });
    load();
    const id = setInterval(load, 60000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // What to play: the live stream when on air, else a recent past live, else the link saved in Admin → Home.
  const fbNow = fbLive?.live || null;
  const fbPast = fbLive?.past || [];
  const pastPick = Math.min(pastIndex, Math.max(fbPast.length - 1, 0));
  const fbChoice = fbNow || fbPast[pastPick] || null;

  /*
   * Live Puja (Admin → Live Puja). The running broadcast when the server says the
   * channel is on air, otherwise the fallback video the admin saved, so a visitor
   * is never shown an empty block. Ids arrive from the server already extracted.
   */
  const puja = livePuja?.enabled ? livePuja : null;
  const pujaLiveId = puja?.live ? String(puja.liveVideoId || '') : '';
  const pujaOfflineId = String(puja?.offline?.videoId || '');
  const pujaId = pujaLiveId || pujaOfflineId;
  const pujaUrl = pujaId ? `https://www.youtube.com/watch?v=${pujaId}` : '';

  // The address ends up in an iframe / link, so it must be https on YouTube or Facebook: anything
  // else (`javascript:`, another site) is dropped and the default video plays instead.
  const sourceUrl = safeHttpUrl(fbChoice?.url || pujaUrl || liveVideo.url || '', VIDEO_HOSTS);
  // LIVE badge: a running broadcast on either platform, or the old "assume the
  // saved link is live" behaviour when the admin has configured neither.
  const isLiveNow = fbNow ? true : (pujaLiveId ? true : (pujaOfflineId ? false : fbPast.length === 0));

  const isFacebook = /facebook\.com|fb\.watch/i.test(sourceUrl);
  const { videoId, playlistId, embedUrl, watchUrl: ytWatchUrl } = parseYouTubeUrl(isFacebook ? '' : sourceUrl);
  const watchUrl = isFacebook ? sourceUrl : ytWatchUrl;
  const platform = isFacebook ? 'Facebook' : 'YouTube';

  /*
   * Slow-load hint, only once the visitor has asked for the player. It never
   * tears the player down: YouTube's embed is heavy and can take a while on a
   * slow connection, and the iframe keeps loading underneath the hint.
   */
  useEffect(() => {
    if (!playerActive) return undefined;

    const timeoutId = setTimeout(() => {
      if (!loadedRef.current) setSlow(true);
    }, 12000);

    return () => clearTimeout(timeoutId);
  }, [playerActive]);

  // Hidden only when the old setting is off AND Live Puja has not been set up.
  if (!liveVideo.enabled && !puja) return null;

  // A detected broadcast is captioned with the channel name; a fallback video
  // with the caption the admin wrote; otherwise the old saved title.
  const pujaCaption = pujaLiveId
    ? (puja?.channelName || '')
    : (pujaOfflineId ? (puja?.offline?.title || '') : '');
  const titleText = pujaCaption || getLocalizedText(liveVideo.title, lang) || 'Live Darshan';
  const descText = getLocalizedText(liveVideo.description, lang) || 'Experience the divine presence of Lord Ram from anywhere in the world';

  const handleIframeError = (e) => {
    console.error('YouTube iframe error:', e);
    setVideoError(true);
    setErrorMessage('Video playback error. Please try again or watch on YouTube directly.');
    setIsLoading(false);
  };

  const handleIframeLoad = () => {
    loadedRef.current = true;
    setSlow(false);
    setIsLoading(false);
    setVideoError(false);
    setErrorMessage('');
  };

  const handleRetry = () => {
    loadedRef.current = false;
    setSlow(false);
    const newRetryCount = retryCount + 1;
    setRetryCount(newRetryCount);
    setVideoError(false);
    setErrorMessage('');
    setIsLoading(true);
    setPlayerActive(true);

    if (newRetryCount >= 2) {
      setUseAlternativeEmbed(true);
    }

    if (newRetryCount >= 5) {
      setUseAlternativeEmbed(false);
      setRetryCount(0);
    }
  };

  const getEmbedUrl = () => {
    if (useAlternativeEmbed && videoId) {
      const origin = window.location.origin;
      return `https://www.youtube.com/embed/${videoId}?mute=1&playsinline=1&rel=0&enablejsapi=1&origin=${origin}`;
    }
    if (useAlternativeEmbed && playlistId) {
      const origin = window.location.origin;
      return `https://www.youtube.com/embed/videoseries?list=${playlistId}&mute=1&playsinline=1&rel=0&enablejsapi=1&origin=${origin}`;
    }
    return embedUrl;
  };

  const currentEmbedUrl = withSoundAndControls(getEmbedUrl());

  /*
   * Autoplay is read from the Live Puja setting whether or not the block's own
   * channel is set up. Otherwise turning autoplay on would do nothing until a
   * channel was configured, and the video actually playing (the one saved in
   * Admin → Home) would keep asking for a click.
   */
  const pujaAutoPlay = settings?.livePuja?.autoPlay !== false && !isFacebook;
  const playerUrl = pujaAutoPlay ? withMutedAutoplay(currentEmbedUrl) : currentEmbedUrl;

  // The player box. `cls` supplies the frame (corners, ring, shadow).
  const playerBox = (cls = '') => (
    <div className={`relative aspect-video w-full overflow-hidden bg-black ${cls}`}>
      {isLoading && !videoError && playerActive && (
        /*
         * A full-bleed black veil reads as "the video is not playing" when it sits
         * over a player that is already running. With autoplay the spinner is a
         * small corner badge that never covers the picture; on the click-to-play
         * path the veil is kept, because there the visitor is waiting for
         * something to happen.
         */
        <div
          className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center ${
            pujaAutoPlay ? 'bg-transparent' : 'bg-black/50'
          }`}
        >
          <div className="flex flex-col items-center gap-3">
            <OmLoader size={pujaAutoPlay ? "sm" : "lg"} color={pujaAutoPlay ? "vermilion" : "white"} />
            {!pujaAutoPlay && (
              <span className="text-white/70 text-sm">Loading live stream...</span>
            )}
            {slow && watchUrl && (
              <a
                href={watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="pointer-events-auto rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-vermilion"
              >
                Taking long? Watch on {platform}
              </a>
            )}
          </div>
        </div>
      )}

      {isFacebook ? (
        <FacebookLivePlayer key={sourceUrl} url={sourceUrl} title={titleText} poster={fbChoice?.thumbnail} />
      ) : !videoError ? (
        /*
         * Facade: the YouTube player is ~2MB of JS and is only mounted once
         * the visitor clicks. The section sits well below the fold, so
         * loading it eagerly was the single largest cost on the home page.
         */
        <YoutubeFacade
          videoId={videoId}
          playlistId={playlistId}
          embedUrl={playerUrl}
          title={titleText || 'Live Darshan'}
          hint={pujaAutoPlay
            ? (t.tt_liveMutedHint || 'Playing muted — use the player controls for sound')
            : (t.tt_liveHint || 'Tap play to watch with sound')}
          onLoaded={handleIframeLoad}
          onError={handleIframeError}
          onActivate={() => setPlayerActive(true)}
          autoPlay={pujaAutoPlay}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center flex-col gap-4 p-6 bg-black/90">
          <Tv size={40} className="mb-2 text-white/70" aria-hidden="true" />
          <div className="text-white/80 text-sm max-w-md text-center">
            <p className="font-semibold mb-1">Unable to load the live stream</p>
            <p className="text-white/60 text-xs">{errorMessage || 'The live stream may be unavailable or restricted in your region.'}</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-colors flex items-center gap-2"
            >
              <RefreshCw size={16} aria-hidden="true" /> Retry {retryCount > 0 && `(${retryCount})`}
            </button>

            {watchUrl && (
              <a
                href={watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm transition-colors inline-flex items-center gap-2"
              >
                <span>▶</span> Watch on YouTube
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );

  /*
   * A dot on its own marks a running broadcast: it pulses while the puja is on,
   * and nothing else is drawn. The word "LIVE" beside it was only ever decoration
   * — the player fills a large part of the block anyway, so a bare red dot reads
   * faster and keeps the header clean.
   *
   * Off air there is nothing to mark, so no badge is drawn at all. A "Previous
   * live" pill used to sit here instead, which said nothing the visitor could act
   * on and pushed the title down for no reason; the recent lives are already
   * listed below the title by `pastPicker`.
   */
  const liveBadge = isLiveNow ? (
    <div className="mb-4 flex items-center gap-3">
      <span
        className="relative flex h-3 w-3 shrink-0"
        title={t.tt_liveOnAirTitle || 'Live now'}
        aria-label={t.tt_liveOnAirTitle || 'Live now'}
        role="status"
      >
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-vermilion opacity-60" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-vermilion" />
      </span>
    </div>
  ) : null;

  // Not on air: let the visitor pick which of the recent lives to watch (newest first).
  const dateLocale = { en: 'en-GB', ne: 'ne-NP', hi: 'hi-IN', zh: 'zh-CN', ta: 'ta-IN' }[lang] || 'en-GB';
  const shortDate = (value) => {
    const d = value ? new Date(value) : null;
    return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' }) : '';
  };
  const pastPicker = !fbNow && fbPast.length > 1 ? (
    <div className="mt-6">
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-mute">{t.tt_recentLives || 'Recent lives'}</p>
      <div className="flex flex-wrap gap-2">
        {fbPast.slice(0, 6).map((item, i) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPastIndex(i)}
            aria-pressed={pastPick === i}
            className={`min-h-[40px] rounded-full border px-4 text-sm font-semibold transition-colors ${
              pastPick === i
                ? 'border-vermilion bg-vermilion text-white'
                : 'border-line bg-white text-ink hover:border-brand-300 hover:bg-brand-50'
            }`}
          >
            {shortDate(item.date) || i + 1}
          </button>
        ))}
      </div>
    </div>
  ) : null;

  /* Two halves: the video on a light logo-tinted half, a short text and two actions on the other. */
  return (
    <section className="border-t border-line bg-white">
      <div className="grid lg:grid-cols-2">
        <div className="flex items-center justify-center bg-brand-50 px-4 py-10 sm:px-8 sm:py-14 lg:px-12 lg:py-20">
          <div className="w-full max-w-2xl">
            {playerBox('rounded-2xl shadow-xl ring-1 ring-black/5')}
          </div>
        </div>

        <div className="flex items-center px-6 py-12 sm:px-10 sm:py-14 lg:px-14 lg:py-20">
          <div className="mx-auto w-full max-w-xl lg:mx-0">
            {liveBadge}
            <SectionTitle
              align="left"
              eyebrow={t.tt_live || 'Live Puja'}
              sub={descText}
              subClassName="!text-base sm:!text-lg leading-relaxed"
            >
              {titleText}
            </SectionTitle>

            {pastPicker}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/booking" className="btn-primary px-6">
                {t.heroCta2 || 'Book a Puja'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              {watchUrl && (
                <a href={watchUrl} target="_blank" rel="noopener noreferrer" className="btn-outline px-6">
                  <Play size={14} fill="currentColor" aria-hidden="true" />
                  {(t.tt_watchOn || 'Watch on {platform}').replace('{platform}', platform)}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Main Home Page ──────────────────────────────────────────────────────────
const HomePage = () => {
  const { modal, open, close } = useImageModal();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetched = useRef(false);
  const { t, lang } = useLanguage();

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    const fetchData = async () => {
      try {
        const settingsRes = await api.get('/admin/settings');
        setSettings(settingsRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  /*
 * Skeleton shown while settings load.
 *
 * A centred spinner made the page feel empty and forced a full reflow when the
 * real content replaced it. A skeleton that mirrors the actual layout gives the
 * content somewhere to land, so there is no layout shift on arrival.
 */
  if (loading) {
    return (
      <div aria-busy="true" aria-label="Loading">
        {/* Hero */}
        <div className="relative w-full overflow-hidden rt-skeleton" style={{ height: '100svh', minHeight: 560 }}>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6">
            <div className="h-14 sm:h-20 w-4/5 sm:w-3/5 rounded-2xl rt-shimmer" />
            <div className="h-5 w-2/3 sm:w-1/2 rounded-full rt-shimmer" />
            <div className="h-9 w-48 rounded-full rt-shimmer" />
          </div>
        </div>

        {/* Content sections, mirroring the real page rhythm */}
        <div className="max-w-7xl mx-auto px-6 py-14 sm:py-16 space-y-14">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-4">
              <div className="h-9 w-3/4 rounded-lg rt-shimmer" />
              <div className="h-4 w-full rounded rt-shimmer" />
              <div className="h-4 w-11/12 rounded rt-shimmer" />
              <div className="h-4 w-4/5 rounded rt-shimmer" />
              <div className="h-10 w-36 rounded-full rt-shimmer mt-4" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-64 rounded-lg rt-shimmer" />
              <div className="h-64 rounded-lg rt-shimmer" />
              <div className="col-span-2 h-64 rounded-lg rt-shimmer" />
            </div>
          </div>

          <div className="space-y-6">
            <div className="h-9 w-1/2 mx-auto rounded-lg rt-shimmer" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl overflow-hidden">
                  <div className="h-52 rt-shimmer" />
                  <div className="p-5 space-y-2">
                    <div className="h-4 w-3/4 rounded rt-shimmer" />
                    <div className="h-3 w-full rounded rt-shimmer" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Get the quote - supports both string and object with language keys
  const getQuote = () => {
    const quoteData = settings?.quotes;
    if (!quoteData) return t.dailyQuote || "Where there is righteousness in the heart, there is beauty in the character.";

    if (typeof quoteData === 'object' && !Array.isArray(quoteData)) {
      return quoteData[lang] || quoteData.en || t.dailyQuote || "Where there is righteousness in the heart, there is beauty in the character.";
    }

    return quoteData || t.dailyQuote || "Where there is righteousness in the heart, there is beauty in the character.";
  };

  const quote = getQuote();

  return (
    <>
      <Hero settings={settings} />
      <QuoteStrip quote={quote} />
      <AboutPreview settings={settings} />
      <EventsTeaser onOpen={open} />
      <LiveDarshan settings={settings} />
      <GalleryTeaser settings={settings} onOpen={open} />
      {/* Last section before the footer (whose first row is the Follow us on Facebook strip) */}
      <FacebookVideoTeaser settings={settings} />

      {modal && (
        <ImageModal src={modal.src} alt={modal.alt} caption={modal.caption} onClose={close} />
      )}
    </>
  );
};

export default HomePage;