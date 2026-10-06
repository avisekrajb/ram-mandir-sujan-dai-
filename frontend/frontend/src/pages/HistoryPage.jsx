// pages/HistoryPage.jsx
// A long read in twelve chapters: a sticky chapter index beside the text on large
// screens, one chapter per block (period, title, photo, text), bullet lists in a
// light panel, and the year-by-year list as a vertical timeline.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import OmLoader from '../components/common/OmLoader';
import PageHeader from '../components/common/PageHeader';
import getLocalizedYear from '../utils/localizedYear';
import { optimizeImageCached } from '../utils/imageOptimize';

// Helper to get localized text
const getLocalizedText = (obj, lang) => {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[lang] || obj.en || '';
};

const pageTitle = {
  ne: 'श्रीरामचन्द्रमन्दिरको इतिहास',
  en: 'History of Shree Ramchandra Temple',
  hi: 'श्री रामचंद्र मंदिर का इतिहास',
  zh: '什里·拉姆钱德拉神庙的历史',
  ta: 'ஸ்ரீ ராமச்சந்திர கோவிலின் வரலாறு',
};

const chaptersLabel = {
  ne: 'अध्यायहरू',
  en: 'Chapters',
  hi: 'अध्याय',
  zh: '章节',
  ta: 'அத்தியாயங்கள்',
};

const jumpLabel = {
  ne: 'अध्यायमा जानुहोस्',
  en: 'Jump to a chapter',
  hi: 'अध्याय पर जाएँ',
  zh: '跳转到章节',
  ta: 'அத்தியாயத்திற்குச் செல்',
};

const pad = (n) => String(n).padStart(2, '0');

/** One chapter's content, read out of an item (older records stored paragraphs as { p1..p4 }). */
const readChapter = (item, lang) => {
  const title =
    getLocalizedText(item.title, lang) ||
    getLocalizedText(item.period, lang) ||
    getLocalizedText(item.desc, lang);
  const desc = getLocalizedText(item.desc, lang) || '';

  const paragraphs = Array.isArray(item.paragraphs)
    ? item.paragraphs.map((p) => getLocalizedText(p, lang)).filter(Boolean)
    : item.paragraphs && typeof item.paragraphs === 'object'
      ? Object.keys(item.paragraphs)
          .filter((k) => /^p\d+$/i.test(k))
          .sort((a, b) => parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10))
          .map((k) => getLocalizedText(item.paragraphs[k], lang))
          .filter(Boolean)
      : [];
  if (paragraphs.length === 0 && desc) paragraphs.push(desc);

  return {
    title,
    period: getLocalizedText(item.period, lang) || '',
    year: item.year ? getLocalizedYear(item.year, lang) : '',
    photo: item.photo || '',
    paragraphs,
    listTitle: getLocalizedText(item.listTitle, lang),
    points: Array.isArray(item.points) ? item.points.map((p) => getLocalizedText(p, lang)).filter(Boolean) : [],
    entries: Array.isArray(item.entries)
      ? item.entries
          .map((e) => ({ year: getLocalizedYear(e.year, lang), text: getLocalizedText(e.text, lang) }))
          .filter((e) => e.text || e.year)
      : [],
  };
};

/** Chapter photo: a fixed 16:9 frame, hidden if the image fails to load. */
function ChapterPhoto({ src, alt, year }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    <figure className="relative overflow-hidden rounded-2xl border border-line bg-panel shadow-sm">
      <div className="aspect-[16/9] w-full">
        <img
          src={optimizeImageCached(src, { width: 1100 })}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      </div>
      {year ? (
        <figcaption className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-vermilion shadow-sm">
          {year}
        </figcaption>
      ) : null}
    </figure>
  );
}

// ===== CHAPTER =====
function Chapter({ id, number, data }) {
  return (
    <motion.article
      id={id}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.45 }}
      className="max-w-3xl scroll-mt-28"
    >
      <header className="mb-6">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <span className="font-mono text-sm font-semibold text-mute">{pad(number)}</span>
          {data.period ? (
            <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-vermilion ring-1 ring-brand-100">
              {data.period}
            </span>
          ) : null}
        </div>
        <h2 className="font-serif text-3xl font-semibold leading-tight text-ink">{data.title}</h2>
      </header>

      <ChapterPhoto src={data.photo} alt={data.title} year={data.year} />

      <div className={`space-y-5 ${data.photo ? 'mt-7' : ''}`}>
        {data.paragraphs.map((text, i) => (
          <p key={i} className="text-base !leading-[1.85] text-ink-soft sm:text-lg about-text">
            {text}
          </p>
        ))}

        {data.points.length > 0 && (
          <div className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
            {data.listTitle ? <p className="mb-3 text-base font-semibold text-ink sm:text-lg">{data.listTitle}</p> : null}
            <ul className="space-y-2.5">
              {data.points.map((point, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-vermilion" aria-hidden="true" />
                  <span className="text-base !leading-[1.8] text-ink-soft sm:text-lg">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.entries.length > 0 && (
          <ol className="relative mt-2 space-y-5 border-l-2 border-line pl-6">
            {data.entries.map((entry, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[1.95rem] top-[0.45rem] h-3 w-3 rounded-full bg-vermilion ring-4 ring-white" aria-hidden="true" />
                {entry.year ? <p className="text-sm font-bold text-vermilion">{entry.year}</p> : null}
                {entry.text ? <p className="text-base !leading-[1.8] text-ink-soft sm:text-lg">{entry.text}</p> : null}
              </li>
            ))}
          </ol>
        )}
      </div>
    </motion.article>
  );
}

// ===== CHAPTER INDEX (large screens) =====
function ChapterIndex({ chapters, activeId, label }) {
  const go = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <nav aria-label={label} className="hidden lg:block">
      <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-mute">{label}</p>
        <ol className="space-y-0.5 border-l border-line">
          {chapters.map((c) => {
            const active = c.id === activeId;
            return (
              <li key={c.id}>
                <a
                  href={`#${c.id}`}
                  onClick={(e) => go(e, c.id)}
                  aria-current={active ? 'true' : undefined}
                  className={`-ml-px flex gap-3 border-l-2 py-2 pl-4 pr-1 text-sm leading-snug transition-colors ${
                    active
                      ? 'border-vermilion font-semibold text-vermilion'
                      : 'border-transparent text-ink-soft hover:border-brand-300 hover:text-ink'
                  }`}
                >
                  <span className="font-mono text-xs leading-snug opacity-70">{pad(c.number)}</span>
                  <span className="line-clamp-2">{c.title}</span>
                </a>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

// ===== CHAPTER PICKER (below lg, where the side index is hidden) =====
function ChapterPicker({ chapters, activeId, label, jump }) {
  const go = (e) => {
    const el = document.getElementById(e.target.value);
    if (!el) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };
  return (
    <div className="lg:hidden">
      <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-mute" htmlFor="history-chapter-picker">
        {label}
      </label>
      <select
        id="history-chapter-picker"
        value={activeId}
        onChange={go}
        aria-label={jump}
        className="h-12 w-full truncate rounded-xl border border-[#D9D0CE] bg-white px-4 text-base text-ink focus:border-vermilion focus:outline-none focus:ring-2 focus:ring-vermilion/15"
      >
        {chapters.map((c) => (
          <option key={c.id} value={c.id}>{pad(c.number)} · {c.title}</option>
        ))}
      </select>
    </div>
  );
}

// ===== TIMELINE PAGE BODY =====
function HistoryBody({ items, lang, heading }) {
  const chapters = items
    .filter((item) => item.enabled !== false)
    .map((item, i) => ({ id: `chapter-${item._id || i}`, number: i + 1, data: readChapter(item, lang) }));
  const [activeId, setActiveId] = useState(chapters[0]?.id || '');
  const idsKey = chapters.map((c) => c.id).join('|');

  // The chapter being read is the last one whose top has passed a line a third of the way down
  // the screen (the first one before any has). Worked out from the scroll position, so it is
  // right on load, when scrolling back up, and after a jump.
  useEffect(() => {
    if (!idsKey) return undefined;
    const ids = idsKey.split('|');
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.33;
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      setActiveId((prev) => (prev === current ? prev : current));
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [idsKey]);

  if (chapters.length === 0) return null;

  return (
    <div className="px-4 pb-24 pt-10 sm:px-6 sm:pt-14">
      <div className="mx-auto max-w-6xl">
        {heading && (
          <div className="mb-10 sm:mb-14">
            <PageHeader>{heading}</PageHeader>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16">
          <ChapterPicker
            chapters={chapters.map((c) => ({ id: c.id, number: c.number, title: c.data.title }))}
            activeId={activeId}
            label={getLocalizedText(chaptersLabel, lang)}
            jump={getLocalizedText(jumpLabel, lang)}
          />
          <ChapterIndex
            chapters={chapters.map((c) => ({ id: c.id, number: c.number, title: c.data.title }))}
            activeId={activeId}
            label={getLocalizedText(chaptersLabel, lang)}
          />

          <div className="min-w-0 space-y-20 sm:space-y-24">
            {chapters.map((c) => (
              <Chapter key={c.id} id={c.id} number={c.number} data={c.data} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== MAIN HISTORY PAGE =====
const HistoryPage = () => {
  const { lang } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [historyData, setHistoryData] = useState([]);
  const fetched = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      const response = await api.get('/admin/history');
      const historyItems = response.data || [];
      const sorted = historyItems
        .filter(item => item.enabled !== false)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      setHistoryData(sorted);
    } catch (error) {
      console.error('Error fetching history data:', error);
      setHistoryData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <OmLoader size="lg" color="vermilion" className="mx-auto mb-4" />
          <p className="text-ink-soft text-sm">
            {lang === 'ne' ? 'इतिहास लोड हुँदैछ...' : lang === 'hi' ? 'इतिहास लोड हो रहा है...' : lang === 'zh' ? '正在加载历史...' : lang === 'ta' ? 'வரலாறு ஏற்றப்படுகிறது...' : 'Loading history...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white">
      <HistoryBody items={historyData} lang={lang} heading={getLocalizedText(pageTitle, lang)} />
    </div>
  );
};

export default HistoryPage;
