import React from 'react';
import { motion } from 'framer-motion';
import { ChevronUp } from 'lucide-react';
import { useScroll } from '../../context/ScrollContext';
import useFooterOverlap from '../../hooks/useFooterOverlap';

// Space the button takes from the bottom of the screen, gap included (see the
// bottom-* and size classes below): 16 + 36 + 12 on phones, 24 + 40 + 12 above.
const reserve = () => (window.innerWidth < 640 ? 64 : 76);

/**
 * Scroll-to-top: a small, slightly see-through round button at the bottom left with
 * a thin progress ring. It fades out before the footer reaches it, so it never
 * sits on top of the footer.
 */
const ScrollToTopButton = () => {
  const { isVisible, scrollProgress, scrollToTop } = useScroll();
  const footerNear = useFooterOverlap(reserve);

  if (!isVisible || footerNear) return null;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      onClick={scrollToTop}
      aria-label="Scroll to top"
      title="Scroll to top"
      className="group fixed bottom-4 left-3 z-50 flex h-9 w-9 items-center justify-center rounded-full bg-white/75 text-vermilion shadow-md ring-1 ring-black/10 backdrop-blur-sm transition-colors hover:bg-white sm:bottom-6 sm:left-6 sm:h-10 sm:w-10"
    >
      {/* Progress ring */}
      <svg viewBox="0 0 40 40" className="pointer-events-none absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="2" />
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={Math.PI * 2 * 18}
          strokeDashoffset={Math.PI * 2 * 18 * (1 - scrollProgress / 100)}
          style={{ transition: 'stroke-dashoffset 0.1s ease' }}
        />
      </svg>
      <ChevronUp size={18} strokeWidth={2.5} aria-hidden="true" className="relative transition-transform duration-200 group-hover:-translate-y-0.5" />
    </motion.button>
  );
};

export default ScrollToTopButton;
