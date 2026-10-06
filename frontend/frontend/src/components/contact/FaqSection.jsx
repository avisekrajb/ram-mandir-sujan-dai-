import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import SubTitle from '../common/SubTitle';
import { useLanguage } from '../../context/LanguageContext';
import { fillText } from '../../utils/rejectionMessage';
import api from '../../services/api';

const SENTENCE_END = { en: '.', ne: '।', hi: '।', zh: '。', ta: '.' };

const localized = (value, lang) => (value && (value[lang] || value.en)) || '';

/**
 * FAQ for the Contact page. Opening hours and aarti times are read from the
 * site settings (the same source as the footer and home page), so the answers
 * never disagree with the rest of the site.
 */
const FaqSection = ({ location }) => {
  const { t, lang } = useLanguage();
  const [settings, setSettings] = useState(null);
  const [openIndex, setOpenIndex] = useState(null);

  useEffect(() => {
    let alive = true;
    api
      .get('/admin/settings')
      .then((res) => {
        if (alive) setSettings(res.data?.data ?? res.data ?? null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const items = useMemo(() => {
    const stop = SENTENCE_END[lang] || '.';
    const timings = settings?.timings;
    const hours = timings?.open && timings?.close ? `${timings.open} – ${timings.close}` : '';

    const aartiList = (settings?.dailyAarti?.aartis || [])
      .filter((a) => a?.time)
      .map((a) => `${localized(a.name, lang)} ${a.time}`.trim());
    const special = localized(settings?.dailyAarti?.templeInfo?.specialAartis, lang);
    const aartiAnswer = aartiList.length
      ? `${aartiList.join(', ')}${stop}${special ? ` ${special}${stop}` : ''}`
      : t.ct_faq2aFallback;

    return [
      { q: t.ct_faq1q, a: hours ? fillText(t.ct_faq1a, { hours }) : t.ct_faq1aFallback },
      { q: t.ct_faq2q, a: aartiAnswer },
      { q: t.ct_faq3q, a: fillText(t.ct_faq3a, { location }) },
      { q: t.ct_faq4q, a: t.ct_faq4a, link: { to: '/donate', label: t.ct_faq4link } },
      { q: t.ct_faq5q, a: t.ct_faq5a, link: { to: '/booking', label: t.ct_faq5link } },
      { q: t.ct_faq6q, a: t.ct_faq6a },
      { q: t.ct_faq7q, a: t.ct_faq7a },
      { q: t.ct_faq8q, a: t.ct_faq8a },
    ];
  }, [settings, t, lang, location]);

  return (
    <section id="faq" aria-labelledby="faq-title" className="mt-16 sm:mt-20">
      <div className="mb-8 sm:mb-10 flex flex-col items-center text-center">
        <SubTitle align="center" as="h2">
          <span id="faq-title">{t.ct_faqTitle}</span>
        </SubTitle>
        <p className="mt-3 text-sm sm:text-base text-ink-soft max-w-xl">{t.ct_faqSub}</p>
      </div>

      <div
        className="max-w-3xl mx-auto rounded-3xl bg-white border border-[#EFEBE9] overflow-hidden"
        style={{ boxShadow: '0 12px 40px -20px rgba(0,0,0,0.12)' }}
      >
        {items.map((item, index) => {
          const open = openIndex === index;
          const buttonId = `faq-q-${index}`;
          const panelId = `faq-a-${index}`;
          return (
            <div key={buttonId} className={index > 0 ? 'border-t border-[#EFEBE9]' : ''}>
              <h3 className="m-0">
                <button
                  type="button"
                  id={buttonId}
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpenIndex(open ? null : index)}
                  className="w-full flex items-center justify-between gap-4 text-left px-5 sm:px-7 py-4 min-h-[56px]
                             text-sm sm:text-base font-semibold text-ink transition-colors duration-200
                             hover:bg-[#FBF8F8] focus-visible:outline-none focus-visible:bg-[#FBF8F8]
                             focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#A80808]/30"
                >
                  <span className="min-w-0 break-words">{item.q}</span>
                  <ChevronDown
                    size={18}
                    aria-hidden
                    className={`flex-shrink-0 text-[#A80808] transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                  />
                </button>
              </h3>

              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 sm:px-7 pb-5 text-sm sm:text-[15px] leading-relaxed text-gray-700">
                      <p className="m-0 break-words">{item.a}</p>
                      {item.link && (
                        <Link
                          to={item.link.to}
                          className="mt-3 inline-block text-sm font-semibold text-[#A80808] hover:underline"
                        >
                          {item.link.label} →
                        </Link>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-center text-sm text-ink-soft">{t.ct_faqStill}</p>
    </section>
  );
};

export default FaqSection;
