/**
 * The offline notice and its sound.
 *
 * Two separate things, deliberately not conflated:
 *
 *  - The *notice* is plain text about the lost connection. It is useful, polite,
 *    and safe.
 *  - The *sound* is a temple bell and Om, synthesised with the Web Audio API -
 *    the same source as the welcome greeting in templeSound.js, so there is no
 *    audio file to host, upload or go missing.
 *
 * Why the sound is gated this carefully:
 *
 *  - Browsers will not start audio without a prior interaction, so on a page that
 *    was just loaded and then went offline there may be no sound at all until the
 *    visitor taps or clicks. That is the browser's rule, not a bug here.
 *  - The site's own speaker switch is honoured by default. A visitor who has
 *    already muted the temple sounds should not be surprised by a new one; a super
 *    admin can turn that respect off, but it is on to begin with.
 *  - Nothing loops while the tab is hidden. A sound that carries on in a
 *    background tab is the sort of thing that gets a site complained about.
 *
 * The detection itself is deliberately plain: `navigator.onLine` plus the
 * browser's own online/offline events. That reports whether the device has *a*
 * network interface, not whether this site is reachable, so the notice says the
 * connection is lost rather than claiming the temple's server is down.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { WifiOff, Check } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import useSiteSettings from '../../hooks/useSiteSettings';
import { isSoundEnabled } from '../../utils/templeSound';
import { playOfflineSound } from '../../utils/offlineSound';

const localised = (obj, lang) => {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[lang] || obj.en || '';
};

const OfflineNotice = () => {
  const { lang } = useLanguage();
  const settings = useSiteSettings();
  const cfg = settings?.offlineNotice;

  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  // True for a few seconds after the connection returns, so the visitor is told
  // it is fixed rather than simply having the warning vanish.
  const [justCameBack, setJustCameBack] = useState(false);

  const stopRef = useRef(null);
  const comeBackTimer = useRef(0);
  // Whether the connection has actually been lost. Distinguishes "we just came
  // back" from "the page loaded while online", which is otherwise identical here.
  const hasBeenOffline = useRef(false);

  const enabled = cfg?.enabled !== false;
  const sound = cfg?.sound || 'temple';
  const volume = Number.isFinite(Number(cfg?.volume)) ? Number(cfg.volume) : 40;
  const repeat = cfg?.repeat !== false;
  const interval = Number(cfg?.interval) || 12;
  const respectToggle = cfg?.respectSoundToggle !== false;
  // The uploaded MP3, if the super admin chose one.
  const trackUrl = cfg?.track?.url || '';

  // Stop whatever is sounding and clear the "back online" note.
  const quiet = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
  }, []);

  useEffect(() => () => {
    quiet();
    window.clearTimeout(comeBackTimer.current);
  }, [quiet]);

  // Watch the connection. `online`/`offline` are the browser's own events, fired
  // by the OS rather than by any request failing, so this reacts the moment the
  // connection drops rather than when a page load finally times out.
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  /*
   * React to the connection changing: start the sound when it drops, stop it when
   * it returns.
   *
   * "Back online" is tied to an actual offline -> online transition. It used to be
   * set whenever the connection was up, which meant it appeared on every page load
   * as well - on a refresh the site claimed it had just recovered from something
   * that never happened. `hasBeenOffline` is what distinguishes the two.
   */
  useEffect(() => {
    window.clearTimeout(comeBackTimer.current);

    if (online) {
      // Silence the bell the moment the connection is back, as asked.
      quiet();
      if (!enabled || !hasBeenOffline.current) return undefined;
      // Only now - having genuinely been offline - is "Back online" true.
      hasBeenOffline.current = false;
      setJustCameBack(true);
      comeBackTimer.current = window.setTimeout(() => setJustCameBack(false), 4000);
      return undefined;
    }

    hasBeenOffline.current = true;
    setJustCameBack(false);
    if (!enabled || sound === 'none') return undefined;
    if (respectToggle && !isSoundEnabled()) return undefined;

    // A deleted track leaves the stored URL empty, so 'upload' falls back to the
    // synthesised sound rather than silence if settings are briefly out of date.
    stopRef.current = playOfflineSound({ sound, volume, repeat, interval, trackUrl });
    return quiet;
  }, [online, enabled, sound, volume, repeat, interval, respectToggle, trackUrl, quiet]);

  // Nothing at all to say while things are working.
  if (!enabled) return null;
  if (online && !justCameBack) return null;

  const title = localised(cfg?.title, lang) || 'You are offline';
  const message = localised(cfg?.message, lang);
  const back = localised(cfg?.backOnline, lang) || 'Back online';

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[70] flex justify-center px-4 pb-4 pointer-events-none sm:pb-6"
    >
      <div
        className={`pointer-events-auto w-full max-w-md rounded-2xl border px-4 py-3.5 shadow-lg backdrop-blur-sm transition-colors ${
          online
            ? 'border-emerald-200 bg-emerald-50/95 text-emerald-900'
            : 'border-amber-300 bg-amber-50/95 text-amber-900'
        }`}
      >
        <div className="flex items-start gap-3">
          {online ? (
            <Check size={18} className="mt-0.5 flex-shrink-0 text-emerald-600" aria-hidden="true" />
          ) : (
            <WifiOff size={18} className="mt-0.5 flex-shrink-0 text-amber-600" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold">{online ? back : title}</p>
            {!online && message && <p className="mt-0.5 text-xs leading-relaxed">{message}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfflineNotice;