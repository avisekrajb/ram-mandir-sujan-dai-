import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Play } from 'lucide-react';

/**
 * YoutubeFacade — a YouTube embed that does not load until it is clicked.
 *
 * A bare <iframe src="youtube.com/embed/..."> costs roughly 1.5-2.5MB on first
 * paint: the iframe document, the player JS, then the video segments. On a page
 * where the live stream sits far below the fold, all of that is downloaded and
 * parsed before the visitor ever scrolls to it, competing with the images that
 * are actually visible.
 *
 * The facade shows YouTube's own thumbnail (a ~20-40KB JPEG from i.ytimg.com)
 * with a play button, and only creates the iframe once the visitor asks for it.
 * The iframe is then mounted with autoplay, so the experience is unchanged.
 *
 * `autoPlay` skips the click: the iframe is mounted straight away with the sound
 * off, which is the only form of autoplay a browser will allow. Visitors turn the
 * sound on with YouTube's own controls.
 */

/** Thumbnail for a video id. hqdefault is the smallest reliable size. */
export const youtubeThumbnail = (videoId, quality = 'hqdefault') =>
  videoId ? `https://i.ytimg.com/vi/${videoId}/${quality}.jpg` : null;

/** Playlist cover fallback when there is no single video id. */
export const youtubePlaylistThumbnail = (playlistId) =>
  playlistId ? `https://i.ytimg.com/vi/${playlistId}/hqdefault.jpg` : null;

/**
 * @param {object} props
 * @param {string} [props.videoId]        single video id
 * @param {string} [props.playlistId]     playlist id (used when no videoId)
 * @param {string} props.embedUrl         the iframe src to mount on click
 * @param {string} [props.title]
 * @param {Function} [props.onLoaded]     called once the iframe reports load
 * @param {Function} [props.onError]
 * @param {string} [props.hint]           short caption shown over the thumbnail
 * @param {string} [props.className]      wrapper
 * @param {boolean} [props.eager]         load the thumbnail eagerly (above fold)
 * @param {boolean} [props.autoPlay]      mount at once, muted (no click needed)
 */
/**
 * Loads YouTube's IFrame API once, and resolves when `YT.Player` is ready.
 *
 * The API script is only needed when a player has to be started
 * programmatically, so it is fetched the first time that happens rather than on
 * every page that merely shows a thumbnail.
 */
let apiPromise = null;
const loadIframeApi = () => {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previous === 'function') previous();
      resolve(window.YT);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => {
      apiPromise = null;
      reject(new Error('YouTube IFrame API failed to load'));
    };
    document.head.appendChild(script);
  });
  return apiPromise;
};

const YoutubeFacade = ({
  videoId,
  playlistId,
  embedUrl,
  title = 'YouTube video',
  onLoaded,
  onError,
  onActivate,
  hint,
  className = '',
  eager = false,
  autoPlay = false,
}) => {
  const [activated, setActivated] = useState(autoPlay);
  const frameRef = useRef(null);

  // A stream that starts after the page settled turns autoplay back on, so the
  // visitor does not have to find the block and press play themselves.
  useEffect(() => {
    if (autoPlay) {
      setActivated(true);
      if (typeof onActivate === 'function') onActivate();
    }
  }, [autoPlay, onActivate]);

  /*
   * The player is only ever driven through the IFrame API. Reaching into the
   * embed's own `contentWindow` is not an option: it is cross-origin, so
   * reading anything off it throws a SecurityError rather than returning
   * undefined, and there is no way to guard the read with try/catch.
   */

  /** Wires up the IFrame API once the embed document is ready. */
  const handleFrameLoad = useCallback(async () => {
    if (typeof onLoaded === 'function') onLoaded();
    if (!autoPlay) return;

    try {
      const YT = await loadIframeApi();
      const frame = frameRef.current;
      if (!frame || typeof YT?.Player !== 'function') return;
      // The embed is already in the DOM with its own src; binding a YT.Player to
      // it is what gives us playVideo() / mute().
      new YT.Player(frame, {
        events: {
          onReady: (event) => {
            try {
              event.target.mute();
              event.target.playVideo();
            } catch {
              /* the browser refused; the visitor can press play */
            }
          },
        },
      });
    } catch {
      /* no API: the autoplay=1 & mute=1 URL parameters are all we have */
    }
  }, [autoPlay, onLoaded]);

  const activate = useCallback(() => {
    setActivated(true);
    if (typeof onActivate === 'function') onActivate();
  }, [onActivate]);

  // Once activated the iframe owns the box; the thumbnail unmounts entirely.
  if (activated && embedUrl) {
    return (
      <iframe
        ref={frameRef}
        src={embedUrl}
        title={title}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={handleFrameLoad}
        onError={onError}
        className={`w-full h-full ${className}`}
        style={{ border: 'none' }}
      />
    );
  }

  const thumb = youtubeThumbnail(videoId) || youtubePlaylistThumbnail(playlistId);

  return (
    <button
      type="button"
      onClick={activate}
      aria-label={`Play ${title}`}
      className={`relative w-full h-full overflow-hidden bg-black group ${
        onError ? '' : 'cursor-pointer'
      } ${className}`}
    >
      {thumb ? (
        <img
          src={thumb}
          alt=""
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          // The thumbnail is only a stand-in; the real content is the player.
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-maroon to-maroon-deep" />
      )}

      {/* A light shade so the play button reads clearly over any thumbnail */}
      <div className="absolute inset-0 bg-black/20 transition-colors duration-300 group-hover:bg-black/5" />

      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-vermilion shadow-lg transition-transform duration-300 group-hover:scale-105 sm:h-20 sm:w-20">
          <Play size={26} className="ml-1 fill-current" />
        </span>
      </span>

      {hint && (
        <span className="absolute bottom-3 left-3 max-w-[70%] rounded-full bg-white/90 px-3 py-1 text-left text-xs font-semibold text-vermilion sm:text-sm">
          {hint}
        </span>
      )}

      {/* YouTube attribution is required when showing their thumbnails */}
      <span className="absolute bottom-3 right-3 text-xs text-white/80">
        YouTube
      </span>
    </button>
  );
};

export default YoutubeFacade;