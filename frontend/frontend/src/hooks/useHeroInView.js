import { useState, useEffect } from 'react';

/**
 * useHeroInView — is a hero banner currently on screen?
 *
 * `scope` narrows which heroes count: 'home' matches only the home page video
 * banner, 'any' matches every hero.
 *
 * Why this is a hook rather than an inline querySelector:
 *
 * SocialFloating, ScrollToTopButton and the chatbot are all mounted in App.jsx
 * *above* the router outlet, while the page itself is lazy-loaded. At mount time
 * the hero element does not exist in the DOM yet, so a one-shot
 * querySelectorAll finds nothing and the observer silently watches zero nodes —
 * which is exactly why the social icons kept appearing over the hero.
 *
 * A MutationObserver attaches as soon as the node is inserted, and re-attaches
 * on route change, so a late-rendered hero is still picked up.
 *
 * @param {'home'|'any'} [scope]
 * @returns {boolean}
 */
const useHeroInView = (scope = 'any') => {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;

    const selector =
      scope === 'home' ? '[data-hero-section="home"]' : '[data-hero-section]';

    let observer = null;

    const attach = () => {
      const nodes = document.querySelectorAll(selector);
      if (nodes.length === 0) return false;

      observer = new IntersectionObserver(
        (entries) => {
          // Multiple heroes can match at once on some routes; visible if any is.
          setInView(entries.some((e) => e.isIntersecting));
        },
        // A hero is full-viewport, so any sliver counts as "showing".
        { threshold: 0.01 }
      );

      nodes.forEach((node) => observer.observe(node));
      return true;
    };

    if (!attach()) {
      // Hero not rendered yet. Watch for it appearing, then stop watching.
      const mutations = new MutationObserver(() => {
        if (attach()) mutations.disconnect();
      });
      mutations.observe(document.body, { childList: true, subtree: true });

      return () => {
        mutations.disconnect();
        if (observer) observer.disconnect();
      };
    }

    return () => {
      if (observer) observer.disconnect();
    };
  }, [scope]);

  return inView;
};

export default useHeroInView;