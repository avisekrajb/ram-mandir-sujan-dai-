import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import SectionTitle from './SectionTitle';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import {
  extractFacebookVideoUrl,
  resolveFacebookVideoUrl,
  isUnresolvedFacebookUrl,
  buildFacebookEmbedSrc,
  isYouTubeUrl,
  buildYouTubeEmbedSrc,
} from '../../utils/facebookVideo';

const REELS_PAGE_SIZE = 12;

/* ============================================================
   SLIDER ARROW
   Sits in the side gutter of the row (the row is padded from sm up), level with
   the middle of the cards, so it never covers a video. On phones the row is
   swiped instead. `hidden` fades it out when there is nothing left on that side.
============================================================ */
function SliderArrow({ direction = 'right', onClick, hidden = false }) {
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === 'left' ? 'Previous' : 'Next'}
      aria-hidden={hidden || undefined}
      tabIndex={hidden ? -1 : 0}
      className={`
        absolute z-20 hidden -translate-y-1/2 sm:flex
        h-10 w-10 items-center justify-center rounded-full
        border border-line bg-white text-vermilion shadow-md shadow-black/10
        transition-all duration-200
        hover:border-vermilion hover:bg-vermilion hover:text-white
        ${direction === 'left' ? 'left-0' : 'right-0'}
        ${hidden ? 'pointer-events-none opacity-0' : 'opacity-100'}
      `}
      style={{ top: 'calc(50% - 1.5rem)' }}
    >
      <Icon size={20} aria-hidden="true" />
    </button>
  );
}

/* ============================================================
   CLEAN VIDEO URL HOOK
   Gives the address to embed, or '' while it is being looked up. A Facebook
   share link is never returned as is (the embed shows "Video Unavailable" for
   it): the lookup is retried a few times, and if it still fails `failed` is
   true so the caller can offer a plain link instead.
============================================================ */
const RESOLVE_RETRY_MS = [0, 2500, 6000];
function useCleanVideoUrl(url) {
  const [state, setState] = useState({ cleanUrl: '', failed: false });

  useEffect(() => {
    let active = true;
    let timer = 0;
    const clean = extractFacebookVideoUrl(url);

    if (!clean) {
      setState({ cleanUrl: '', failed: false });
      return undefined;
    }
    if (!isUnresolvedFacebookUrl(clean)) {
      setState({ cleanUrl: clean, failed: false });
      return undefined;
    }

    setState({ cleanUrl: '', failed: false });
    const attempt = async (n) => {
      const resolved = await resolveFacebookVideoUrl(clean);
      if (!active) return;
      if (!isUnresolvedFacebookUrl(resolved)) {
        setState({ cleanUrl: resolved, failed: false });
      } else if (n + 1 < RESOLVE_RETRY_MS.length) {
        timer = window.setTimeout(() => attempt(n + 1), RESOLVE_RETRY_MS[n + 1]);
      } else {
        setState({ cleanUrl: '', failed: true });
      }
    };
    attempt(0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [url]);

  return state;
}

/* ============================================================
   VIDEO POPUP MODAL
   - Autoplays with SOUND as soon as the modal opens
   - When the modal is hidden/unmounted the iframe is destroyed,
     which stops both video playback and sound.
============================================================ */
function VideoPopupModal({ video, total, onClose, onPrev, onNext }) {
  const { t } = useLanguage();
  const { cleanUrl, failed } = useCleanVideoUrl(video?.url || '');
  const isYT = isYouTubeUrl(cleanUrl);

  // Autoplay with sound: auto=true, muted=false
  const embedSrc = cleanUrl
    ? isYT
      ? buildYouTubeEmbedSrc(cleanUrl, true, false)
      : buildFacebookEmbedSrc(cleanUrl, true, false)
    : '';

  // Lock body scroll while the modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!video) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 video-modal-backdrop"
      onClick={onClose}
    >
      {/* Controls - Prev / Next / Close (glass style) */}
      {onPrev && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          aria-label="Previous"
          className="
            video-modal-nav absolute left-2 sm:left-5 top-1/2 -translate-y-1/2 z-30
            w-11 h-11 sm:w-12 sm:h-12 rounded-full
            bg-white/10 border border-white/20 backdrop-blur-md
            flex items-center justify-center text-white/90
            hover:bg-vermilion hover:border-transparent
            active:scale-95 transition-all duration-200
            shadow-lg shadow-black/20
          "
        >
          <ChevronLeft size={24} aria-hidden="true" />
        </button>
      )}

      {onNext && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          aria-label="Next"
          className="
            video-modal-nav absolute right-2 sm:right-5 top-1/2 -translate-y-1/2 z-30
            w-11 h-11 sm:w-12 sm:h-12 rounded-full
            bg-white/10 border border-white/20 backdrop-blur-md
            flex items-center justify-center text-white/90
            hover:bg-vermilion hover:border-transparent
            active:scale-95 transition-all duration-200
            shadow-lg shadow-black/20
          "
        >
          <ChevronRight size={24} aria-hidden="true" />
        </button>
      )}

      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="
          absolute top-4 right-4 sm:top-5 sm:right-5 z-30
          w-11 h-11 rounded-full
          bg-white/10 border border-white/20 backdrop-blur-md
          flex items-center justify-center
          text-white/90 hover:bg-white/20 hover:rotate-90
          active:scale-95 transition-all duration-300
        "
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-lg video-modal-overlay"
        onClick={onClose}
      />

      {/* Player Card */}
      <div
        className={`relative z-10 video-modal-card ${video.reel ? 'w-auto' : 'w-full max-w-4xl'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="
            relative bg-black overflow-hidden
            rounded-2xl sm:rounded-3xl
            ring-1 ring-white/15
            shadow-2xl shadow-black/60
          "
          style={
            video.reel
              ? {
                  aspectRatio: '9 / 16',
                  height: 'min(80vh, 640px)',
                  width: 'auto',
                  maxWidth: '92vw',
                }
              : {
                  aspectRatio: '16 / 9',
                  width: '100%',
                  maxHeight: '78vh',
                }
          }
        >
          {embedSrc ? (
            <iframe
              key={embedSrc}
              src={embedSrc}
              title={video.reel ? 'Facebook Reel' : 'Facebook Video'}
              className="absolute inset-0 w-full h-full"
              style={{ border: 'none', overflow: 'hidden' }}
              scrolling="no"
              frameBorder="0"
              allow="
                autoplay;
                automaticPicrtureInPicture;
                clipboard-write;
                encrypted-media;
                picture-in-picture;
                web-share
              "
              allowFullScreen
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center text-sm text-white/70">
              {failed ? (
                <a
                  href={extractFacebookVideoUrl(video.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-vermilion transition-colors hover:bg-brand-50"
                >
                  {t.facebookVideoTitle || 'Watch on Facebook'}
                </a>
              ) : (
                t.a5_loadingVideo || 'Loading video...'
              )}
            </div>
          )}

          {/* Top bar */}
          <div className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
          <div className="absolute top-3 left-4 z-20 flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-white/15 border border-white/20 backdrop-blur-md text-white text-xs font-semibold uppercase tracking-widest">
              {video.reel ? 'Reel' : 'Video'}
            </span>
            {total > 1 && (
              <span className="text-white/70 text-xs font-medium drop-shadow">
                {video.index != null ? video.index + 1 : ''} / {total}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SINGLE FACEBOOK VIDEO CARD
============================================================ */
function FacebookVideoCard({
  url,
  reel = false,
  onPlay,
  bare = false, // no outer chrome: the caller supplies the frame
  alwaysPlay = false, // show the play button without hovering
  noPlay = false, // no play button at all (the caller draws its own)
}) {
  const { t } = useLanguage();
  const { cleanUrl, failed } = useCleanVideoUrl(url);
  const loaded = Boolean(extractFacebookVideoUrl(url));
  /*
   * Lazy activation.
   *
   * Every card used to mount a live iframe immediately with loading="eager".
   * A Facebook/YouTube embed frame is ~1.5-2.5MB of player JS plus segments,
   * and a dozen cards on the home page meant a dozen of those in parallel.
   *
   * The iframe is now mounted only once the card is within 300px of the
   * viewport, so off-screen cards cost nothing. It stays mounted afterwards:
   * once a card has loaded, keeping it is cheaper than tearing down and
   * rebuilding on every scroll pass.
   */
  const [inView, setInView] = useState(false);
  const cardRef = useRef(null);

  const isYT = isYouTubeUrl(cleanUrl);

  /*
   * Mount the embed only when the card is close to the viewport.
   *
   * The rootMargin gives a 300px head start, so the player has finished
   * fetching by the time the card is actually visible rather than popping in
   * after it appears.
   */
  useEffect(() => {
    if (inView) return undefined;

    const node = cardRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      // No observer support: fall back to loading immediately.
      setInView(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [inView]);

  /*
   * IMPORTANT:
   * Do not use a fake image/thumbnail here.
   * Facebook itself provides the video preview.
   *
   * That preview only arrives with the player itself, so it cannot be shown
   * before the embed loads. The placeholder below is a plain gradient from the
   * site palette, which costs no network request.
   */
  const embedSrc =
    loaded && cleanUrl && inView
      ? isYT
        ? buildYouTubeEmbedSrc(cleanUrl, false)
        : buildFacebookEmbedSrc(cleanUrl, false)
      : '';

  const handlePlay = () => {
    if (typeof onPlay === 'function') {
      onPlay();
    }
  };

  return (
    <div
      ref={cardRef}
      // (The old class string contained a literal "${reel ? ...}" that never became a
      // class; dropped here. The embed stays non-interactive through its inline style.)
      className={
        bare
          ? 'relative w-full overflow-hidden bg-black group cursor-pointer'
          : 'relative w-full overflow-hidden rounded-2xl bg-black shadow-lg ring-1 ring-gray-200/80 group cursor-pointer transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl hover:ring-brand-300'
      }
      onClick={handlePlay}
    >
      <div
        className="relative w-full bg-black"
        style={{ aspectRatio: reel ? '9 / 16' : '16 / 9' }}
      >
        {embedSrc ? (
          <iframe
            key={embedSrc}
            src={embedSrc}
            title={reel ? 'Facebook Reel' : 'Facebook Video'}
            className="
              absolute
              inset-0
              w-full
              h-full
              block
            "
            style={{
              border: 'none',
              background: '#000',
              pointerEvents: 'none',
            }}
            scrolling="no"
            frameBorder="0"
            allow="
              automaticPicrtureInPicture;
              clipboard-write;
              encrypted-media;
              picture-in-picture;
              web-share
            "
            allowFullScreen
            loading="lazy"
          />
        ) : (
          /*
           * Placeholder cover. Shown until the card scrolls near the viewport
           * and its embed has loaded. Pure CSS, so it adds no requests.
           */
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(145deg, #2a1015 0%, #4a1a1a 45%, #1a0a0e 100%)',
              }}
            />
            {/* Regular videos already get a large play button drawn over the card, so only the label is needed, kept clear of it. */}
            <div className={`relative flex flex-col items-center gap-2 ${!reel && !noPlay ? 'mt-24' : ''}`}>
              {(reel || noPlay) && (
                <span className="w-11 h-11 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M8 5v14l11-7z" fill="#E2DBD8" />
                  </svg>
                </span>
              )}
              <span className="text-white/65 text-xs">
                {loaded && !failed ? (t.a5_loadingVideo || 'Loading video...') : (t.a5_tapToWatch || 'Tap to watch')}
              </span>
            </div>
          </div>
        )}

        {/* Slight tint to quiet the Facebook embed's own controls (not interactive) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'rgba(0,0,0,0.12)' }}
        />

        {/* Play overlay: shown on hover for regular videos, hidden for modern reels */}
        {!reel && !noPlay && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className={`relative flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-vermilion shadow-xl backdrop-blur-sm transition-all duration-300 ${
                alwaysPlay ? 'scale-100 opacity-100 group-hover:scale-110' : 'scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100'
              }`}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="translate-x-0.5">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}

        {/* Reels: no play/pause icons - a subtle hover shade is the only signal */}
        {reel && (
          <div
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: 'rgba(0,0,0,0.25)' }}
          />
        )}

      </div>
    </div>
  );
}

/* ============================================================
   VIDEO ROW
   A swipeable row of plain video cards: a thin border, rounded corners and a
   soft shadow, nothing else. Each tile is a FacebookVideoCard (lazy embed;
   a click opens the sound-on popup).
============================================================ */
const FbGlyph = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H8v3h2.7V21h2.8z" />
  </svg>
);

const DATE_LOCALES = { en: 'en-GB', ne: 'ne-NP', hi: 'hi-IN', zh: 'zh-CN', ta: 'ta-IN' };

const shortDate = (value, lang) => {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime())
    ? d.toLocaleDateString(DATE_LOCALES[lang] || 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
};

/**
 * A video card: the embed, then a caption row. The row shows the page's avatar,
 * the video's title (when the Graph API supplied one, otherwise the page name),
 * a small "Reel / Video · date" line, and a play chip that fills on hover.
 */
function FbTile({ url, onPlay, reel = false, meta, pageName, avatar }) {
  const { t, lang } = useLanguage();
  const title = meta?.title || pageName || 'Facebook';
  const kind = reel ? (t.tt_reel || 'Reel') : (t.tt_video || 'Video');
  const date = shortDate(meta?.date, lang);
  return (
    <div className="group/tile overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md">
      <FacebookVideoCard url={url} reel={reel} bare alwaysPlay={!reel} onPlay={onPlay} />
      <div className="flex items-center gap-3 border-t border-line px-3.5 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-50 text-vermilion ring-1 ring-line">
          {avatar ? <img src={avatar} alt="" loading="lazy" className="h-full w-full object-cover" /> : <FbGlyph size={15} />}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[15px] font-semibold text-ink">{title}</span>
          <span className="mt-0.5 block truncate text-xs text-mute">{[kind, date || 'Facebook'].join(' · ')}</span>
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-vermilion transition-colors duration-200 group-hover/tile:bg-vermilion group-hover/tile:text-white" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="translate-x-px"><path d="M8 5v14l11-7z" /></svg>
        </span>
      </div>
    </div>
  );
}

/* ---- Carousel ---- */
function VideoCarousel({ videos, onPlay, sliderRef, cardClass, reel = false, metaFor, pageName, avatar }) {
  // How far the row is scrolled (0..1) and which sides still have cards.
  const [scroll, setScroll] = useState({ progress: 0, canPrev: false, canNext: false });

  const measure = useCallback(() => {
    const el = sliderRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const next = {
      progress: max > 0 ? el.scrollLeft / max : 0,
      canPrev: el.scrollLeft > 4,
      canNext: el.scrollLeft < max - 4,
    };
    setScroll((prev) =>
      prev.progress === next.progress && prev.canPrev === next.canPrev && prev.canNext === next.canNext ? prev : next
    );
  }, [sliderRef]);

  // Whether the row fits depends on the screen and on how many videos there
  // are, so measure before the first paint and again whenever it is resized.
  useLayoutEffect(() => {
    const el = sliderRef.current;
    if (!el) return undefined;
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, sliderRef, videos.length]);

  // Arrows move the row by exactly one card.
  const step = (dir) => {
    const el = sliderRef.current;
    const card = el?.firstElementChild;
    if (!card) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    el.scrollBy({ left: dir * (card.getBoundingClientRect().width + gap), behavior: 'smooth' });
  };

  // When every card fits there is nothing to scroll: no arrows and no progress
  // line. (The auto margins on the first and last card centre such a row; they
  // collapse to nothing once the row overflows, so no card becomes unreachable.)
  const overflowing = scroll.canPrev || scroll.canNext;

  return (
    <div>
      {/* From sm up the wrapper is padded so the arrows sit beside the cards, not on top of them. */}
      <div className="relative sm:px-14">
        <SliderArrow direction="left" hidden={!scroll.canPrev} onClick={() => step(-1)} />
        <SliderArrow direction="right" hidden={!scroll.canNext} onClick={() => step(1)} />
        {/* The padding leaves room for the cards' shadow, which a scrolling row would otherwise cut off. */}
        <div
          ref={sliderRef}
          onScroll={measure}
          className="flex snap-x snap-mandatory scroll-px-2 gap-5 overflow-x-auto scroll-smooth px-2 pb-5 pt-1 scrollbar-hide"
          style={{ scrollbarWidth: 'none' }}
        >
          {videos.map((url, index) => (
            <div key={`${url}-${index}`} className={`flex-shrink-0 snap-start first:ml-auto last:mr-auto ${cardClass}`}>
              <FbTile url={url} reel={reel} meta={metaFor ? metaFor(url) : undefined} pageName={pageName} avatar={avatar} onPlay={() => onPlay(url, index)} />
            </div>
          ))}
        </div>
      </div>
      {overflowing && (
        <div className="mx-auto mt-2 h-1 w-40 overflow-hidden rounded-full bg-brand-100" aria-hidden="true">
          <div
            className="h-full rounded-full bg-vermilion transition-[width] duration-200"
            style={{ width: `${Math.max(12, scroll.progress * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

/* ============================================================
   MAIN FACEBOOK VIDEO SECTION
============================================================ */
function FacebookVideoSection({
  settings,
  t,
  showViewMoreReels = true,
  containerClass = '',
  onlyReels = false,
  hideReels = false,
  reelsLimit = REELS_PAGE_SIZE, // how many reels the row shows; "View More Reels" appears when there are more
}) {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const videoSliderRef = useRef(null);
  const reelSliderRef = useRef(null);

  // The page card and latest videos, from the Graph API through our server (see
  // /api/live/facebook/page). Without a token it carries only the page link.
  const [fbPage, setFbPage] = useState(null);
  useEffect(() => {
    let alive = true;
    api.get('/live/facebook/page')
      .then((res) => { if (alive) setFbPage(res.data); })
      .catch(() => { /* the section works without it */ });
    return () => { alive = false; };
  }, []);

  /*
   * Active in-modal video.
   * activeVideo = { url, reel, index } | null
   * When null the modal is unmounted (playback + sound stop).
   */
  const [activeVideo, setActiveVideo] = useState(null);

  const closePlayer = () => setActiveVideo(null);

  const stepPlayer = (dir) => {
    if (!activeVideo) return;
    if (activeVideo.reel) {
      const idx = visibleReels.indexOf(activeVideo.url);
      const next = (idx + dir + visibleReels.length) % visibleReels.length;
      setActiveVideo({ url: visibleReels[next], reel: true, index: next });
    } else {
      const idx = videos.indexOf(activeVideo.url);
      const next = (idx + dir + videos.length) % videos.length;
      setActiveVideo({ url: videos[next], reel: false, index: next });
    }
  };

  const prevInline = () => stepPlayer(-1);
  const nextInline = () => stepPlayer(1);

  /* ==========================================================
     SETTINGS
  ========================================================== */

  const fbEnabled =
    settings?.facebookVideo?.enabled !== false;

  const curatedVideos = Array.isArray(settings?.facebookVideos)
    ? settings.facebookVideos
        .filter((item) => item?.enabled !== false)
        .map((item) => item?.url)
        .filter(Boolean)
    : [];

  // The videos picked in Admin → Home come first; with none picked, the page's latest
  // uploads (when the Graph API is set up) fill the row. Their titles and dates caption the cards.
  const graphVideos = fbPage?.videos || [];
  const videos = curatedVideos.length ? curatedVideos : graphVideos.map((v) => v.url);
  const videoMeta = new Map(graphVideos.map((v) => [v.url, v]));
  const metaFor = (url) => videoMeta.get(url);
  const pageUrl = fbPage?.page?.link || fbPage?.pageUrl || '';
  // The caption row of each card shows the page's avatar and name.
  const pageName = fbPage?.page?.name || settings?.logo?.text?.[lang] || settings?.logo?.text?.en || '';
  const rawAvatar = fbPage?.page?.picture || settings?.logo?.photo || '';
  const pageAvatar = rawAvatar.includes('/upload/') ? rawAvatar.replace('/upload/', '/upload/w_80,h_80,c_fill,q_auto,f_auto/') : rawAvatar;

  const reels = Array.isArray(settings?.facebookReels)
    ? settings.facebookReels
        .filter((item) => item?.enabled !== false)
        .map((item) => item?.url)
        .filter(Boolean)
    : [];

  const visibleReels = reels.slice(0, reelsLimit);

  const hasMoreReels =
    reels.length > reelsLimit;

  const goToGalleryVideos = () => {
    navigate('/gallery?tab=videos');
  };

  /*
   * Do NOT return before hooks.
   * All hooks are already declared above.
   */
  if (!fbEnabled) {
    return null;
  }

  if (videos.length === 0 && reels.length === 0) {
    return null;
  }

  return (
    <>
      <div className={containerClass}>

        {/* ======================================================
            FACEBOOK VIDEOS
        ====================================================== */}

        {!onlyReels && videos.length > 0 && (
          <section className={hideReels ? '' : 'mb-14'}>

            <div className="mb-8 sm:mb-10">
              <SectionTitle>
                {t?.facebookVideoTitle || 'Watch on Facebook'}
              </SectionTitle>
            </div>

            <VideoCarousel
              videos={videos}
              metaFor={metaFor}
              pageName={pageName}
              avatar={pageAvatar}
              sliderRef={videoSliderRef}
              // One card and a peek of the next on phones, two across on tablets,
              // three on desktop (the row's gap is 1.25rem).
              cardClass="w-[84%] sm:w-[calc((100%-1.25rem)/2)] lg:w-[calc((100%-2.5rem)/3)]"
              onPlay={(url, index) => setActiveVideo({ url, reel: false, index })}
            />

            {pageUrl && (
              <div className="mt-6 flex justify-center">
                <a
                  href={`${pageUrl.replace(/\/+$/, '')}/videos`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline px-6"
                >
                  {t?.tt_allVideos || 'All videos on Facebook'}
                </a>
              </div>
            )}
          </section>
        )}

        {/* ======================================================
            REELS
        ====================================================== */}

        {!hideReels && reels.length > 0 && (
          <section>

            <div className="mb-8 sm:mb-10">
              <SectionTitle>
                {t?.facebookReelsTitle ||
                  'Reels & Short Videos'}
              </SectionTitle>
            </div>

            <VideoCarousel
              reel
              pageName={pageName}
              avatar={pageAvatar}
              videos={visibleReels}
              sliderRef={reelSliderRef}
              cardClass="w-[220px] sm:w-[240px] lg:w-[250px]"
              onPlay={(url, index) => setActiveVideo({ url, reel: true, index })}
            />

            {/* ==================================================
                VIEW MORE
            ================================================== */}

            {hasMoreReels &&
              showViewMoreReels && (
                <div className="flex justify-center mt-10">

                  <button
                    type="button"
                    onClick={goToGalleryVideos}
                    className="
                      inline-flex
                      items-center
                      gap-2
                      px-7
                      py-3
                      rounded-full
                      text-sm
                      font-semibold
                      text-white
                      bg-vermilion
                      shadow-lg shadow-black/10
                      transition-all
                      duration-200
                      hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/10
                    "
                  >
                    {t?.viewMoreReels ||
                      'View More Reels'}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>

                </div>
              )}
          </section>
        )}
      </div>

      {/* ==================================================
          POPUP VIDEO MODAL  (autoplay with sound)
      ================================================== */}
      {activeVideo && (
        <VideoPopupModal
          video={activeVideo}
          total={activeVideo.reel ? visibleReels.length : videos.length}
          onClose={closePlayer}
          onPrev={prevInline}
          onNext={nextInline}
        />
      )}

      <style>{`
        @keyframes videoModalBackdropIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes videoModalCardIn {
          from { opacity: 0; transform: scale(0.92) translateY(18px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes videoModalNavIn {
          from { opacity: 0; transform: translateY(-50%) translateX(-14px); }
          to { opacity: 1; transform: translateY(-50%) translateX(0); }
        }
        @keyframes videoModalNavInRight {
          from { opacity: 0; transform: translateY(-50%) translateX(14px); }
          to { opacity: 1; transform: translateY(-50%) translateX(0); }
        }
        .video-modal-backdrop { animation: videoModalBackdropIn 0.25s ease-out forwards; }
        .video-modal-overlay { animation: videoModalBackdropIn 0.3s ease-out forwards; }
        .video-modal-card { animation: videoModalCardIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .video-modal-nav { animation: videoModalNavIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .video-modal-nav + .video-modal-nav { animation-name: videoModalNavInRight; }
      `}</style>
    </>
  );
}

export default FacebookVideoSection;