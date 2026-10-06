import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const ScrollContext = createContext(null);

export const useScroll = () => {
  const context = useContext(ScrollContext);
  if (!context) {
    throw new Error('useScroll must be used within ScrollProvider');
  }
  return context;
};

export const ScrollProvider = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  /*
   * Scroll state without forced reflows.
   *
   * The previous version ran every frame and called setScrollProgress with a
   * new float each time. Because scrollY changes on every pixel scrolled, that
   * re-rendered ScrollToTopButton (and its framer-motion SVG ring) 60+ times a
   * second on top of the main-thread scroll work, which is what made the page
   * feel sticky while scrolling.
   *
   * Two changes:
   *  - Reading scroll metrics inside requestAnimationFrame means all layout is
   *    read once per frame before any state is written, so the browser can lay
   *    out once instead of thrashing read/write/read.
   *  - State is only written when a value actually changes. Progress is
   *    quantised to whole percent, so it stops updating once the ring is
   *    visually indistinguishable.
   */
  const lastProgress = useRef(0);

  const checkScrollPosition = useCallback(() => {
    const scrollY = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollableHeight = documentHeight - windowHeight;

    // Show arrow when scrolled down more than 300px
    setIsVisible((prev) => {
      const next = scrollY > 300;
      return prev === next ? prev : next;
    });

    // Within 150px of the bottom counts as the bottom
    const atBottom = scrollY + windowHeight >= documentHeight - 150;
    setIsAtBottom((prev) => (prev === atBottom ? prev : atBottom));

    // Whole-percent granularity: enough for the progress ring, and it stops
    // re-rendering once the value has stopped meaningfully changing.
    const rawProgress = scrollableHeight > 0 ? (scrollY / scrollableHeight) * 100 : 0;
    const progress = Math.round(Math.min(100, Math.max(0, rawProgress)));
    if (progress !== lastProgress.current) {
      lastProgress.current = progress;
      setScrollProgress(progress);
    }
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  }, []);

  useEffect(() => {
    // Check position on mount
    setTimeout(checkScrollPosition, 100);

    // Coalesce to one update per animation frame. The listener itself does no
    // work, so scrolling stays on the compositor and the main thread is free.
    let frame = 0;
    const handleScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        checkScrollPosition();
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    /*
     * Footer visibility used to be polled every 500ms with a
     * querySelector + getBoundingClientRect, both of which force layout. An
     * IntersectionObserver is answered by the browser off the main thread and
     * wakes us only when the answer changes.
     */
    const footer = document.querySelector('footer');
    let observer = null;

    if (footer && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsAtBottom((prev) => (prev ? prev : true));
          } else {
            // Re-check: leaving the footer can mean we are no longer at bottom.
            requestAnimationFrame(() => {
              const nearBottom =
                window.scrollY + window.innerHeight >=
                document.documentElement.scrollHeight - 150;
              setIsAtBottom((prev) => (prev === nearBottom ? prev : nearBottom));
            });
          }
        },
        // A sliver of the footer is enough; we only need to know it is reached.
        { rootMargin: '0px 0px -100px 0px', threshold: 0.01 }
      );
      observer.observe(footer);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (frame) window.cancelAnimationFrame(frame);
      if (observer) observer.disconnect();
    };
  }, [checkScrollPosition]);

  return (
    <ScrollContext.Provider value={{ isVisible, isAtBottom, scrollProgress, scrollToTop }}>
      {children}
    </ScrollContext.Provider>
  );
};