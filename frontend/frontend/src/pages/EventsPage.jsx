import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import { handleImageError } from '../utils/imageFallback';
import OmLoader from '../components/common/OmLoader';
import ProgramSections from '../components/events/ProgramSections';
import PageHeader from '../components/common/PageHeader';
import SectionTitle from '../components/common/SectionTitle';
import { optimizeImageCached } from '../utils/imageOptimize';

const getLocalizedText = (obj, lang) => {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[lang] || obj.en || obj.ne || '';
};

// Fallbacks used when Admin → Events has not published a row for a slot yet.
const TEXT_FALLBACK = {
  'page-title': { ne: 'आयोजना तथा कार्यक्रम', en: 'Events and Programs' },
  'page-subtitle': { ne: 'मन्दिरमा नियमित रूपमा सञ्चालन हुने कार्यक्रमहरूको विवरण।', en: 'Details of the programs regularly conducted at the temple.' },
  'festivals-title': { ne: 'पर्व तथा उत्सव', en: 'Festivals and Events' },
  'programs-title': { ne: 'आयोजन गरिने कार्यक्रमहरू', en: 'Programs Conducted' },
  'footer-note': { ne: 'कार्यक्रमको विवरणमा परिवर्तन हुन सक्छ।', en: 'Program details are subject to change.' },
};

const buildTextLookup = (rows) => {
  const map = {};
  (Array.isArray(rows) ? rows : [])
    .filter((r) => r && r.enabled !== false && r.key)
    .forEach((r) => {
      map[r.key] = r.text;
    });
  return map;
};

const readSlot = (map, key, lang) => {
  const custom = map[key];
  const text = getLocalizedText(custom, lang);
  if (text) return text;
  return getLocalizedText(TEXT_FALLBACK[key], lang);
};

/* ===== Festivals added from Admin -> Events ==============================
 * Plain cards: photo, date as a small label, title and a short description.
 * No icons, numbers, shadows or hover motion (owner request, Oct 2026).
 * ====================================================================== */
const FestivalCards = ({ events, lang, title }) => {
  if (!events || events.length === 0) return null;

  return (
    <section className="w-full">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
        <SectionTitle align="left">{title}</SectionTitle>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e, i) => {
            const name = getLocalizedText(e.title, lang);
            const desc = getLocalizedText(e.desc, lang);
            const dateNepali = getLocalizedText(e.dateNepali, lang);
            return (
              <article key={e._id || i} className="flex flex-col overflow-hidden rounded-xl border border-line bg-white">
                <div className="aspect-[16/10] overflow-hidden bg-panel">
                  <img
                    src={optimizeImageCached(e.photo, { width: 640 }) || '/default-event.jpg'}
                    loading="lazy"
                    alt={name}
                    className="h-full w-full object-cover"
                    onError={(ev) => { handleImageError(ev, '/default-event.jpg'); }}
                  />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  {dateNepali && <p className="text-sm font-medium text-brand-600">{dateNepali}</p>}
                  <h3 className="mt-1 font-serif text-xl font-semibold leading-snug text-ink">{name}</h3>
                  {desc && <p className="mt-2 line-clamp-4 text-base leading-relaxed text-ink-soft">{desc}</p>}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// Main Events Page
const EventsPage = () => {
  const { lang } = useLanguage();
  const [events, setEvents] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const [eventsRes, settingsRes] = await Promise.all([
          api.get('/events'),
          api.get('/admin/settings').catch(() => null),
        ]);
        const payload = eventsRes.data;
        setEvents(Array.isArray(payload) ? payload : payload?.data || []);
        setSettings(settingsRes?.data || null);
      } catch (error) {
        console.error('Error fetching events:', error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  // Festival cards are the dated events an admin added; the program sections
  // below them are the temple's standing programs, managed separately.
  const adminAdded = useMemo(() => {
    const byHomeSlotThenDate = (a, b) => {
      const sa = a.homeSlot || 0;
      const sb = b.homeSlot || 0;
      if (sa !== sb) {
        if (sa < 1) return 1;
        if (sb < 1) return -1;
        return sa - sb;
      }
      return new Date(a.date) - new Date(b.date);
    };
    return events.filter((e) => !e.seedKey).sort(byHomeSlotThenDate);
  }, [events]);

  const pageText = useMemo(() => buildTextLookup(settings?.eventsPageText), [settings]);
  const txt = (key) => readSlot(pageText, key, lang);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <OmLoader size="lg" color="vermilion" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Heading */}
      <section className="w-full pt-10 sm:pt-14 pb-6">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <PageHeader>{txt('page-title')}</PageHeader>
        </div>
      </section>

      <FestivalCards events={adminAdded} lang={lang} title={txt('festivals-title')} />

      <ProgramSections sections={settings?.programSections} lang={lang} title={txt('programs-title')} />
    </div>
  );
};

export default EventsPage;
