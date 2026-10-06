import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { Image as ImageIcon, Video as VideoIcon, Search, X, ChevronDown } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import OmLoader from '../components/common/OmLoader';
import FacebookVideoSection from '../components/common/FacebookVideoSection';
import PageHeader from '../components/common/PageHeader';
import GalleryCard from '../components/gallery/GalleryCard';
import GalleryLightbox from '../components/gallery/GalleryLightbox';
import { featuredFirst, itemDescription, itemTitle } from '../components/gallery/galleryText';

// Shown only if the gallery cannot be loaded at all.
const fallbackImages = [
  { _id: '1', photo: '/1.jpg', cap: { en: 'Temple View' }, type: 'photo', category: 'temple' },
  { _id: '2', photo: '/2.jpg', cap: { en: 'Temple Interior' }, type: 'photo', category: 'temple' },
  { _id: '3', photo: '/3.jpg', cap: { en: 'Temple Deity' }, type: 'photo', category: 'deity' },
  { _id: '4', photo: '/4.jpg', cap: { en: 'Festival Celebration' }, type: 'photo', category: 'festival' },
  { _id: '5', photo: '/6.jpg', cap: { en: 'Devotional Gathering' }, type: 'photo', category: 'devotion' },
  { _id: '6', photo: '/5.jpg', cap: { en: 'Temple Ceremony' }, type: 'photo', category: 'ceremony' },
];

const CATEGORY_ORDER = ['temple', 'deity', 'festival', 'aarti', 'ceremony', 'ritual', 'devotion', 'general'];
const CATEGORY_KEYS = {
  general: 'a2_galleryCatGeneral',
  temple: 'a2_galleryCatTemple',
  deity: 'a2_galleryCatDeity',
  festival: 'a2_galleryCatFestival',
  devotion: 'a2_galleryCatDevotion',
  ceremony: 'a2_galleryCatCeremony',
  ritual: 'a2_galleryCatRitual',
  aarti: 'a2_galleryCatAarti',
};
const PAGE_SIZE = 12;

const categoryLabel = (t, cat) => {
  const key = String(cat || '').toLowerCase();
  return t[CATEGORY_KEYS[key]] || (key ? key.charAt(0).toUpperCase() + key.slice(1) : '');
};

const GalleryPage = () => {
  const { t, lang } = useLanguage();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => (searchParams.get('tab') === 'videos' ? 'videos' : 'photos'));
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lbState, setLbState] = useState(null);
  const [settings, setSettings] = useState(null);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const fetched = useRef(false);
  const deepLinked = useRef(false);

  // Keep the tab in sync with the ?tab= query param (used by "View More Reels")
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'videos' || tab === 'photos') setActiveTab(tab);
  }, [searchParams]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCategory('all');
    setSearchParams(tab === 'videos' ? { tab: 'videos' } : {}, { replace: true });
  };

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    const fetchGallery = async () => {
      try {
        const response = await api.get('/admin/gallery/all');
        const list = response.data && response.data.data;
        setItems(list && list.length > 0 ? list : fallbackImages);
      } catch (error) {
        console.error('Fetch gallery error:', error);
        setItems(fallbackImages);
        showToast('Using sample images', 'warning');
      } finally {
        setLoading(false);
      }
    };
    fetchGallery();
  }, [showToast]);

  // Admin settings feed the Facebook videos section
  useEffect(() => {
    api.get('/admin/settings')
      .then((response) => setSettings(response.data))
      .catch((error) => console.error('Error fetching settings:', error));
  }, []);

  const photos = useMemo(() => featuredFirst(items.filter((item) => item.type === 'photo' || !item.type)), [items]);
  const videos = useMemo(() => items.filter((item) => item.type === 'video'), [items]);
  const tabItems = activeTab === 'photos' ? photos : videos;

  // Only the categories that have pictures, in a sensible order.
  const categories = useMemo(() => {
    if (activeTab !== 'photos') return [];
    const present = new Set(photos.map((item) => item.category || 'general'));
    const rank = (c) => { const i = CATEGORY_ORDER.indexOf(c); return i === -1 ? CATEGORY_ORDER.length : i; };
    return [...present].sort((a, b) => rank(a) - rank(b));
  }, [activeTab, photos]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = tabItems;
    if (category !== 'all') list = list.filter((item) => (item.category || 'general') === category);
    if (q) {
      list = list.filter((item) => {
        const words = [
          ...Object.values(item.title || {}), ...Object.values(item.cap || {}), ...Object.values(item.description || {}),
          categoryLabel(t, item.category),
        ];
        return words.some((w) => typeof w === 'string' && w.toLowerCase().includes(q));
      });
    }
    return list;
  }, [tabItems, category, query, t]);

  useEffect(() => { setVisible(PAGE_SIZE); }, [activeTab, category, query]);

  const shown = filteredItems.slice(0, visible);
  const filtersActive = category !== 'all' || query.trim() !== '';

  const openLb = useCallback((idx, source) => {
    setLbState({ items: source, index: idx });
    document.body.style.overflow = 'hidden';
  }, []);

  const closeLb = useCallback(() => {
    setLbState(null);
    document.body.style.overflow = '';
    setSearchParams((prev) => {
      if (!prev.has('photo')) return prev;
      const next = new URLSearchParams(prev);
      next.delete('photo');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Leaving the page with the viewer open must not leave the site unscrollable.
  useEffect(() => () => { document.body.style.overflow = ''; }, []);

  // A shared link (/gallery?photo=ID) opens that picture once the gallery has loaded.
  useEffect(() => {
    if (deepLinked.current || loading) return;
    deepLinked.current = true;
    const id = searchParams.get('photo');
    if (!id) return;
    const idx = photos.findIndex((item) => item._id === id);
    if (idx >= 0) {
      setActiveTab('photos');
      openLb(idx, photos);
    }
  }, [loading, photos, searchParams, openLb]);

  const lbPrev = useCallback(() => {
    setLbState((s) => (s ? { ...s, index: (s.index - 1 + s.items.length) % s.items.length } : null));
  }, []);
  const lbNext = useCallback(() => {
    setLbState((s) => (s ? { ...s, index: (s.index + 1) % s.items.length } : null));
  }, []);
  const lbJump = useCallback((i) => {
    setLbState((s) => (s ? { ...s, index: i } : null));
  }, []);

  useEffect(() => {
    if (!lbState) return undefined;
    const handler = (e) => {
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft') lbPrev();
      if (e.key === 'ArrowRight') lbNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lbState, closeLb, lbPrev, lbNext]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-white">
        <div className="text-center">
          <OmLoader size="lg" color="vermilion" className="mx-auto mb-4" />
          <p className="text-sm text-ink-soft">{t.gl_loading || 'Loading the gallery…'}</p>
        </div>
      </div>
    );
  }

  const tabBtn = (tab) => `inline-flex min-h-[2.75rem] items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors duration-200 ${
    activeTab === tab ? 'bg-vermilion text-white' : 'text-ink-soft hover:bg-brand-50 hover:text-vermilion'
  }`;

  return (
    <div className="min-h-screen bg-panel">
      <div className="bg-white px-4 pb-8 pt-10 sm:pt-14">
        <PageHeader eyebrow={t.tt_gallery || 'Divine Visions'}>{t.galleryTitle || 'Photo Gallery'}</PageHeader>
      </div>

      {/* Photos / Videos, then search and the category dropdown */}
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        <div className="mx-auto flex w-max items-center gap-1 rounded-full border border-line bg-white p-1">
          <button type="button" onClick={() => handleTabChange('photos')} className={tabBtn('photos')} aria-pressed={activeTab === 'photos'}>
            <ImageIcon size={16} aria-hidden="true" />
            {t.galleryPhotos || 'Photos'}
          </button>
          <button type="button" onClick={() => handleTabChange('videos')} className={tabBtn('videos')} aria-pressed={activeTab === 'videos'}>
            <VideoIcon size={16} aria-hidden="true" />
            {t.galleryVideos || 'Videos'}
          </button>
        </div>

        <div className="mx-auto mt-6 flex max-w-3xl flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mute" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.gallerySearch || 'Search the gallery'}
              aria-label={t.gallerySearch || 'Search the gallery'}
              className="h-12 w-full rounded-full border border-line bg-white pl-11 pr-10 text-base text-ink placeholder:text-mute focus:border-vermilion focus:outline-none focus:ring-4 focus:ring-vermilion/10"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label={t.galleryClearFilters || 'Clear filters'} className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-mute hover:text-vermilion">
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>

          {categories.length > 1 && (
            <div className="relative sm:w-60">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                aria-label={t.gl_category || 'Category'}
                className="h-12 w-full appearance-none rounded-full border border-line bg-white pl-5 pr-11 text-base text-ink focus:border-vermilion focus:outline-none focus:ring-4 focus:ring-vermilion/10"
              >
                <option value="all">{t.gl_allCategories || 'All categories'}</option>
                {categories.map((key) => <option key={key} value={key}>{categoryLabel(t, key)}</option>)}
              </select>
              <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-mute" aria-hidden="true" />
            </div>
          )}
        </div>
      </div>

      {/* The pictures, each with its title and description */}
      {filteredItems.length > 0 ? (
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {shown.map((item, index) => (
              <GalleryCard
                key={item._id || index}
                item={item}
                eager={index < 3}
                title={itemTitle(item, lang)}
                description={itemDescription(item, lang)}
                onOpen={() => openLb(index, filteredItems)}
              />
            ))}
          </div>
          {visible < filteredItems.length && (
            <div className="mt-10 flex justify-center">
              <button type="button" onClick={() => setVisible((v) => v + PAGE_SIZE)} className="btn-outline px-8">
                {t.galleryLoadMore || 'Load more'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="px-4 py-20 text-center">
          <ImageIcon size={48} className="mx-auto mb-4 text-ink-soft/30" aria-hidden="true" />
          <p className="text-base text-ink-soft">{t.galleryNoResults || 'Nothing matches your search'}</p>
          {filtersActive && (
            <button type="button" onClick={() => { setCategory('all'); setQuery(''); }} className="btn-outline mt-5 px-6">
              {t.galleryClearFilters || 'Clear filters'}
            </button>
          )}
        </div>
      )}

      {/* Facebook Videos + Reels: Videos tab only */}
      {activeTab === 'videos' && (
        <FacebookVideoSection settings={settings} t={t} showViewMoreReels={false} containerClass="max-w-7xl mx-auto px-4 sm:px-6 pb-16" />
      )}

      <AnimatePresence>
        {lbState && (
          <GalleryLightbox
            items={lbState.items}
            index={lbState.index}
            t={t}
            lang={lang}
            onClose={closeLb}
            onPrev={lbPrev}
            onNext={lbNext}
            onJump={lbJump}
          />
        )}
      </AnimatePresence>

      {/* Hide scrollbar */}
      <style>{`
        html {
          overflow-y: scroll;
          scrollbar-width: none;
        }
        html::-webkit-scrollbar {
          width: 0;
          display: none;
        }
        body {
          -ms-overflow-style: none;
        }
      `}</style>
    </div>
  );
};

export default GalleryPage;
