import React, { useState, useEffect, useRef } from 'react';
import SubTitle from '../components/common/SubTitle';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import { handleImageError } from '../utils/imageFallback';
import OmLoader from '../components/common/OmLoader';
import { getSectionTitle } from '../utils/sectionTitle';
import { optimizeImageCached } from '../utils/imageOptimize';

const getLocalizedText = (obj, lang) => {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[lang] || obj.en || '';
};

// ===== HERO COMPONENT =====
function AboutHero({ hero }) {
  const { t, lang } = useLanguage();
  const ref = useRef(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const smooth = useSpring(scrollYProgress, { stiffness: 60, damping: 20 });
  const imgScale = useTransform(smooth, [0, 1], [1, 1.16]);
  const overlayOp = useTransform(smooth, [0, 0.7], [0.32, 0.72]);
  const textY = useTransform(smooth, [0, 1], ["0%", "-26%"]);
  const textOpacity = useTransform(smooth, [0, 0.5], [1, 0]);

  /*
 * The hero banner title comes from Admin → About, so a saved empty value
 * would otherwise fall back to the generic 'About Us'. Fall back to the
 * localized "Shree Ramchandra Temple — introduction" line instead so the
 * banner always names the temple in the visitor's own language.
 *
 * getSectionTitle also discards an older placeholder saved before the rename
 * (e.g. "श्री रामचन्द्र मन्दिरको बारेमा"), so this shows the current wording
 * without waiting for the backend backfill to run.
 */
  const titleText =
    getSectionTitle(hero?.title, lang) || t.aboutHeroTitle;
  const imageSrc = hero?.image || '/aboutusphoto.jpeg';

  return (
    <div
      ref={ref}
      className="relative w-full overflow-hidden"
      data-hero-section="about"
      style={{ height: "100svh", minHeight: 520 }}
    >
      <motion.img
        src={imageSrc}
        alt=""
        aria-hidden
        style={{ scale: imgScale }}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none origin-center"
           onError={(e) => { handleImageError(e, '/aboutusphoto.jpeg'); }}
      />
      <motion.div className="absolute inset-0" style={{ background: "rgba(0,0,0,1)", opacity: overlayOp }} />
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.08) 45%, transparent 70%)" }} />
      
      <motion.div style={{ y: textY, opacity: textOpacity }} className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-6">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          className="temple-heading"
        >
          {titleText}
        </motion.h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        style={{ opacity: textOpacity }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
      >
        <span className="text-white/65 text-xs uppercase tracking-widest" style={{ fontFamily: "serif" }}>scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
          style={{ width: 1, height: 32, background: "linear-gradient(to bottom, rgba(255,255,255,0.5), transparent)" }}
        />
      </motion.div>
    </div>
  );
}

// ===== INTRO TEXT COMPONENT - VISIBLE BELOW HERO =====
function IntroText({ introText }) {
  const { t, lang } = useLanguage();

  const text = getLocalizedText(introText, lang);

  if (!text) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
      className="bg-white py-16 px-6 border-b border-gray-100"
    >
      <div className="max-w-4xl mx-auto text-center">
        {/* Sits directly below the hero banner and introduces the intro text: a plain section heading. */}
        <h2 className="mb-6 font-serif text-3xl font-semibold text-maroon">
          {t.aboutIntroduction || 'Introduction'}
        </h2>

        <p className="font-serif text-base sm:text-lg md:text-xl lg:text-2xl leading-relaxed text-gray-700 max-w-3xl mx-auto text-justify about-text is-centered-mobile">
          {text}
        </p>

        <div className="mt-8 flex justify-center items-center gap-3">
          <div className="h-px w-8 bg-gradient-to-r from-transparent to-maroon/40" />
          <div className="w-1.5 h-1.5 rounded-full bg-maroon/50" />
          <div className="h-px w-8 bg-gradient-to-l from-transparent to-maroon/40" />
        </div>
      </div>
    </motion.div>
  );
}

// ===== SECTION COMPONENT =====
function AboutSection({ section, index }) {
  const { lang } = useLanguage();
  const isEven = index % 2 === 0;
  const titleText = getLocalizedText(section.title, lang) || 'Section Title';
  const defaultImages = ['/1.jpg', '/2.jpg', '/3.jpg'];

  // Prefer the structured paragraphs; fall back to the single `body` field.
  const paragraphs = section.paragraphs
    ? Object.keys(section.paragraphs)
        .map((pKey) => getLocalizedText(section.paragraphs[pKey], lang))
        .filter(Boolean)
    : [];
  if (paragraphs.length === 0) {
    const bodyText = getLocalizedText(section.body, lang);
    if (bodyText) paragraphs.push(bodyText);
  }

  const listTitleText = getLocalizedText(section.listTitle, lang);
  const points = Array.isArray(section.points)
    ? section.points.map((p) => getLocalizedText(p, lang)).filter(Boolean)
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6 }}
      className={`grid md:grid-cols-2 gap-12 items-center ${!isEven ? "md:[&>*:first-child]:order-2" : ""}`}
    >
      <div className="rounded-xl overflow-hidden shadow-lg">
        {/*
          The photo is shown whole rather than cropped to a fixed height. A
          `h-80 object-cover` box trims the top and the bottom of every photo
          whose shape is not exactly that ratio, so a portrait shot lost its
          head and a wide one lost its sides — the picture looked broken rather
          than framed. `h-auto` lets each one keep its own proportions, and the
          grid's `items-center` keeps the shorter column centred instead of
          stretching it.
        */}
        <img
          src={optimizeImageCached(section.image, { width: 960 }) || defaultImages[index % defaultImages.length]}
          alt={titleText}
          loading="lazy"
          decoding="async"
          className="block w-full h-auto"
            onError={(e) => { handleImageError(e, defaultImages[index % defaultImages.length]); }}
        />
      </div>
      <div className="flex flex-col justify-center">
        <SubTitle className="mb-5">{titleText}</SubTitle>

        {paragraphs.map((text, i) => (
          <p key={i} className="text-mute leading-relaxed text-base sm:text-lg text-justify about-text mb-4 last:mb-0">
            {text}
          </p>
        ))}

        {points.length > 0 && (
          <div className="mt-5">
            {listTitleText && (
              <p className="font-semibold text-base sm:text-lg mb-3" style={{ color: "#A80808" }}>
                {listTitleText}
              </p>
            )}
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
              {points.map((point, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span
                    className="shrink-0 mt-2 w-1.5 h-1.5 rounded-full"
                    style={{ background: "linear-gradient(135deg, #E2DBD8, #820606)" }}
                  />
                  <span className="text-base sm:text-lg text-mute leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ===== BANNER TEXT COMPONENT =====
function BannerText({ bannerText }) {
  const { lang } = useLanguage();
  
  if (!bannerText) return null;
  
  const text = getLocalizedText(bannerText, lang);
  if (!text) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="bg-gray-50 py-12 px-6 border-y border-gray-100"
    >
      <div className="max-w-4xl mx-auto text-center">
        <p className="font-serif text-lg sm:text-xl md:text-2xl leading-relaxed text-gray-700 italic text-center">
          "{text}"
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <span className="inline-block w-12 h-px bg-brand-300/60" />
          <span className="inline-block w-2 h-2 rounded-full bg-brand-300/60" />
          <span className="inline-block w-12 h-px bg-brand-300/60" />
        </div>
      </div>
    </motion.div>
  );
}

// ===== MAIN ABOUT PAGE =====
const AboutPage = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [aboutData, setAboutData] = useState(null);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [aboutRes, settingsRes] = await Promise.all([
          api.get('/about'),
          api.get('/admin/settings').catch(() => null),
        ]);
        setAboutData(aboutRes.data.data);
        setSettings(settingsRes?.data || null);
      } catch (error) {
        console.error('Error fetching about data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <OmLoader size="md" color="maroon" />
      </div>
    );
  }

  const sections = aboutData?.sections?.filter(s => s.enabled !== false).sort((a, b) => (a.order || 0) - (b.order || 0)) || [];

  return (
    <div className="w-full min-h-screen bg-white">
      <AboutHero hero={aboutData?.hero} />
      <IntroText introText={aboutData?.introText} />

      {aboutData?.bannerText && (
        <BannerText bannerText={aboutData.bannerText} />
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 space-y-24">
        {sections.map((section, index) => (
          <AboutSection key={section.key || index} section={section} index={index} />
        ))}
      </div>
    </div>
  );
};

export default AboutPage;