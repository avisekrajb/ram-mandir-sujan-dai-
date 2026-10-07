/**
 * Om, left behind along the path the pointer has taken, in the reader's script.
 *
 * The design: no words. Nothing follows or chases the cursor - a mark is only
 * *deposited* where the pointer has just passed, then drifts up and fades. An earlier
 * version deposited the whole three-word mantra each time, which meant up to seven
 * long phrases crowding within a few dozen pixels of the pointer and blurring over
 * whatever the visitor was reading. One glyph per deposit fixes that: it reads
 * immediately, it covers almost nothing, and a short run of them still spells out
 * the repetition it replaced.
 *
 * How it is built, and why:
 *
 * - The browser's own cursor is left alone. The trail is an overlay above the
 *   page, so the pointer stays exactly as precise as the visitor's system cursor.
 *   Replacing it outright is the usual reason custom cursors annoy people,
 *   because text fields and small buttons become hard to aim at.
 * - `pointer-events: none` on the overlay, so the trail can never swallow a click
 *   or block a text selection.
 * - Touch devices are skipped: there is no pointer to leave a trail from.
 * - Under `prefers-reduced-motion` nothing is drawn at all. A visitor who has
 *   asked for less motion gets their normal cursor and nothing following it.
 *
 * Performance notes, since this runs on every pointer move:
 * - There is no animation loop. Each mark rises and fades purely in CSS and hands
 *   itself back to the pool by its own `animationend`. Pointer movement therefore
 *   costs one class flip, and an idle pointer costs nothing at all.
 * - The trail is a small fixed pool of nodes, reused rather than created and
 *   destroyed per move.
 * - Only transform, opacity and filter are animated, so the browser keeps the
 *   whole thing on the compositor and never triggers layout.
 */

import { useEffect, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';

/*
 * Om in the site's five languages.
 *
 * Nepali and Hindi share the Devanagari ॐ. Tamil uses its own ௐ. Chinese uses 唵,
 * which is the established Chinese character for the syllable. English has no
 * native glyph for it, so it is written out - matching how the site already
 * romanises other Sanskrit terms for English readers.
 */
const OM = {
  en: 'Om',
  ne: 'ॐ',
  hi: 'ॐ',
  zh: '唵',
  ta: 'ௐ',
};

const omFor = (lang) => OM[lang] || OM.en;

// How far behind the pointer hotspot each mark is laid down.
const OFFSET_X = 22;
const OFFSET_Y = 20;

// Ribbon timing: one mark deposited this often while moving, how long it takes to
// fade, and how many are kept at once. Fewer and slower than the word version -
// the point is a quiet trail, not a stream.
const RIBBON_STEP_MS = 190;
const RIBBON_LIFE_MS = 1100;
const RIBBON_MAX = 5;

// The same number as CSS, so the pool and the animation cannot disagree about how
// long a mark lives. This one is the source of truth; the stylesheet reads it.
const lifeStyle = { '--rt-om-life': `${RIBBON_LIFE_MS}ms` };

const OmTrail = () => {
  const layerRef = useRef(null);
  const trailRef = useRef(null);
  const lang = useLanguage()?.lang;

  useEffect(() => {
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (coarse || reduced) return undefined;

    const layer = layerRef.current;
    const trail = trailRef.current;
    if (!layer || !trail) return undefined;

    let lastAt = 0;
    let visible = false;
    let placed = 0;

    const setVisible = (on) => {
      if (visible === on) return;
      visible = on;
      layer.dataset.visible = on ? 'true' : 'false';
    };

    const retireAll = () => {
      pool.forEach((g) => {
        g.busy = false;
        g.node.classList.remove('rt-om-mark--live');
      });
    };

    /*
     * A small pool of pre-made nodes. Recycling means nothing is created or
     * destroyed while the pointer moves; the animation replays by removing and
     * re-adding the class.
     */
    const pool = Array.from({ length: RIBBON_MAX }, () => {
      const node = document.createElement('span');
      node.className = 'rt-om-mark';
      node.textContent = omFor(lang);
      trail.appendChild(node);

      const mark = { node, busy: false };
      // The animation hands the node back when it has finished, so no timer is
      // needed and an idle pointer costs nothing.
      node.addEventListener('animationend', () => {
        node.classList.remove('rt-om-mark--live');
        mark.busy = false;
      });
      return mark;
    });

    const onMove = (e) => {
      setVisible(true);
      const now = performance.now();
      if (now - lastAt < RIBBON_STEP_MS) return;
      lastAt = now;

      const m = pool.find((p) => !p.busy);
      if (!m) return; // every mark is still fading; drop this one rather than queue

      // A gentle sideways lean, alternating, so the trail scatters like embers
      // rather than stacking into one vertical line.
      const lean = (placed % 2 === 0 ? -1 : 1) * (9 + (placed % 3) * 5);
      placed += 1;

      m.node.style.setProperty('--rt-om-x', `${Math.round(e.clientX + OFFSET_X)}px`);
      m.node.style.setProperty('--rt-om-y', `${Math.round(e.clientY + OFFSET_Y)}px`);
      m.node.style.setProperty('--rt-om-lean', `${lean}px`);
      // Every third mark is set larger, so the run of them has some rhythm
      // instead of reading as one uniform smear.
      m.node.style.setProperty('--rt-om-scale', placed % 3 === 0 ? 1.15 : 0.92);

      m.busy = true;
      // Force a reflow between removing and re-adding, otherwise the browser
      // treats the re-add as no change and the animation does not replay.
      void m.node.offsetWidth;
      m.node.classList.add('rt-om-mark--live');
    };

    const onLeave = () => {
      setVisible(false);
      retireAll();
      placed = 0;
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    document.addEventListener('mouseleave', onLeave);

    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('mouseleave', onLeave);
      pool.forEach((m) => m.node.remove());
    };
  }, [lang]);

  return (
    <div
      ref={layerRef}
      className="rt-om-layer"
      data-visible="false"
      style={lifeStyle}
      aria-hidden="true"
    >
      {/* The marks are created and recycled by the effect above. */}
      <div ref={trailRef} className="rt-om-trail" />
    </div>
  );
};

export default OmTrail;
export { OM, omFor };