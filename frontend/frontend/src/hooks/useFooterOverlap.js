import { useEffect, useRef, useState } from 'react';

/**
 * useFooterOverlap — is the footer far enough up the screen to touch a fixed control?
 *
 * `reserve()` returns how many px from the bottom of the viewport the control
 * occupies, gap included (for a button at bottom: 16px and 36px tall, about 64).
 * The footer counts as overlapping as soon as its top edge rises above that line,
 * so the control fades out before the two ever meet instead of sitting on top of
 * the footer.
 *
 * It uses an IntersectionObserver whose root is shrunk by `reserve()` px, so the
 * browser answers off the main thread and nothing runs on every scroll. The
 * margin is measured again on resize (the reserve can differ per breakpoint).
 * The footer is looked up once a second so one that renders late, or is replaced,
 * is still picked up.
 *
 * This hook must never throw: it runs for the whole site from App.jsx, and an
 * error here would take every page down. A viewport with no height (a hidden or
 * not-yet-laid-out window) or an observer the browser rejects just means "not
 * overlapping".
 *
 * @param {() => number} reserve
 * @returns {boolean}
 */
const useFooterOverlap = (reserve) => {
  const [overlap, setOverlap] = useState(false);
  const reserveRef = useRef(reserve);
  reserveRef.current = reserve;

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;

    let observer = null;
    let watched = null;

    const observe = (footer) => {
      if (observer) observer.disconnect();
      observer = null;
      watched = footer;
      if (!footer) {
        setOverlap(false);
        return;
      }
      const room = Math.max(0, window.innerHeight - 1);
      const wanted = Number(reserveRef.current());
      const px = Math.min(Math.max(0, Number.isFinite(wanted) ? Math.round(wanted) : 0), room);
      try {
        observer = new IntersectionObserver(
          // Several changes can arrive in one batch on a busy page; the last one is the current state.
          (entries) => setOverlap(entries[entries.length - 1].isIntersecting),
          { rootMargin: `0px 0px ${px > 0 ? `-${px}px` : '0px'} 0px`, threshold: 0 }
        );
        observer.observe(footer);
      } catch {
        observer = null;
        setOverlap(false);
      }
    };

    const sync = () => {
      const footer = document.querySelector('footer');
      if (footer !== watched) observe(footer);
    };

    sync();
    const poll = setInterval(sync, 1000);
    const onResize = () => observe(document.querySelector('footer'));
    window.addEventListener('resize', onResize);

    return () => {
      clearInterval(poll);
      window.removeEventListener('resize', onResize);
      if (observer) observer.disconnect();
    };
  }, []);

  return overlap;
};

export default useFooterOverlap;
