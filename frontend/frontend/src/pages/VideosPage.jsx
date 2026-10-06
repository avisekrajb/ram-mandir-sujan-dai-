import React, { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { ArrowRight, X, Youtube, Play, Calendar } from 'lucide-react';
import { handleImageError } from '../utils/imageFallback';
import PageHeader from '../components/common/PageHeader';
import SectionTitle from '../components/common/SectionTitle';

const PER_PAGE = 6;

// Default videos - replace with your actual video IDs
const defaultVideos = [
  { id: 'v1', ytId: 'dQw4w9WgXcQ', title: { en: 'Morning Aarti at Temple', ne: 'मन्दिरमा बिहानको आरती', hi: 'मंदिर में सुबह की आरती' }, date: '2024-01-15', views: '12.5K' },
  { id: 'v2', ytId: 'dQw4w9WgXcQ', title: { en: 'Ram Navami Celebration', ne: 'राम नवमी महोत्सव', hi: 'राम नवमी महोत्सव' }, date: '2024-01-10', views: '8.2K' },
  { id: 'v3', ytId: 'dQw4w9WgXcQ', title: { en: 'Evening Bhajan Sandhya', ne: 'साँझको भजन सन्ध्या', hi: 'शाम की भजन संध्या' }, date: '2024-01-05', views: '5.7K' },
  { id: 'v4', ytId: 'dQw4w9WgXcQ', title: { en: 'Special Puja Ceremony', ne: 'विशेष पूजा समारोह', hi: 'विशेष पूजा समारोह' }, date: '2023-12-28', views: '3.4K' },
  { id: 'v5', ytId: 'dQw4w9WgXcQ', title: { en: 'Temple Architecture Tour', ne: 'मन्दिर वास्तुकला भ्रमण', hi: 'मंदिर वास्तुकला यात्रा' }, date: '2023-12-20', views: '2.1K' },
  { id: 'v6', ytId: 'dQw4w9WgXcQ', title: { en: 'Festival Celebrations', ne: 'महोत्सव मनाउँदै', hi: 'त्योहार मनाते हुए' }, date: '2023-12-15', views: '9.8K' },
  { id: 'v7', ytId: 'dQw4w9WgXcQ', title: { en: 'Daily Rituals', ne: 'दैनिक अनुष्ठान', hi: 'दैनिक अनुष्ठान' }, date: '2023-12-10', views: '4.3K' },
  { id: 'v8', ytId: 'dQw4w9WgXcQ', title: { en: 'Temple History Documentary', ne: 'मन्दिर इतिहास वृत्तचित्र', hi: 'मंदिर इतिहास वृत्तचित्र' }, date: '2023-12-05', views: '6.7K' },
  { id: 'v9', ytId: 'dQw4w9WgXcQ', title: { en: 'Ganga Aarti Ceremony', ne: 'गंगा आरती समारोह', hi: 'गंगा आरती समारोह' }, date: '2023-11-28', views: '15.2K' },
  { id: 'v10', ytId: 'dQw4w9WgXcQ', title: { en: 'Temple Renovation', ne: 'मन्दिर जीर्णोद्धार', hi: 'मंदिर जीर्णोद्धार' }, date: '2023-11-20', views: '1.8K' },
  { id: 'v11', ytId: 'dQw4w9WgXcQ', title: { en: 'Satyanarayan Puja', ne: 'सत्यनारायण पूजा', hi: 'सत्यनारायण पूजा' }, date: '2023-11-15', views: '7.1K' },
  { id: 'v12', ytId: 'dQw4w9WgXcQ', title: { en: 'Hanuman Chalisa', ne: 'हनुमान चालीसा', hi: 'हनुमान चालीसा' }, date: '2023-11-10', views: '22.3K' },
];

// Helper to get text in current language
const getLocalizedText = (obj, lang) => {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[lang] || obj.en || '';
};

// Video Card Component
const VideoCard = ({ video, onClick, lang, featured = false }) => {
  const titleText = getLocalizedText(video.title, lang);
  
  return (
    <motion.div
      className={`group cursor-pointer overflow-hidden rounded-xl bg-white shadow-md hover:shadow-xl transition-all duration-500 ${featured ? '' : 'hover:-translate-y-1'}`}
      onClick={() => onClick(video.ytId)}
    >
      <div className="relative aspect-video overflow-hidden bg-black">
        <img
          src={`https://img.youtube.com/vi/${video.ytId}/hqdefault.jpg`}
          alt={titleText}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-all duration-300 group-hover:scale-110">
            <Play size={24} className="text-white ml-1" fill="white" />
          </div>
        </div>

        {/* Duration Badge */}
        <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {video.duration || '5:32'}
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-sm sm:text-base font-semibold text-gray-900 line-clamp-2 group-hover:text-vermilion transition-colors">
          {titleText}
        </h3>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Calendar size={12} />
            {video.date || '2024-01-01'}
          </span>
          <span className="flex items-center gap-1">
            <Youtube size={12} className="text-red-500" />
            {video.views || '1.2K'} views
          </span>
        </div>
      </div>
    </motion.div>
  );
};

// Featured Video Component
const FeaturedVideo = ({ video, lang, onPlay }) => {
  const titleText = getLocalizedText(video.title, lang);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="mb-12"
    >
      <div className="flex items-center gap-3 mb-4">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-vermilion">
          Featured Video
        </span>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Video */}
        <div className="lg:col-span-2 bg-black rounded-2xl overflow-hidden shadow-2xl">
          <div className="aspect-video relative cursor-pointer" onClick={() => onPlay(video.ytId)}>
            <img
              src={`https://img.youtube.com/vi/${video.ytId}/maxresdefault.jpg`}
              alt={titleText}
              className="w-full h-full object-cover"
                 onError={(e) => {
                   handleImageError(e, `https://img.youtube.com/vi/${video.ytId}/hqdefault.jpg`);
                 }}
            />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center group cursor-pointer hover:bg-black/40 transition-all">
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all hover:scale-110">
                <Play size={32} className="text-white ml-1.5" fill="white" />
              </div>
            </div>
          </div>
          <div className="p-5 bg-gradient-to-r from-gray-900 to-gray-800">
            <h2 className="text-white text-lg sm:text-xl font-semibold">
              {titleText}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {video.views || '1.2K'} views • {video.date || '2024-01-01'}
            </p>
          </div>
        </div>

        {/* Video List */}
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 hidden lg:block">
            More Videos
          </h3>
          <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:max-h-[400px] pb-2 lg:pb-0 scrollbar-hide">
            {defaultVideos.slice(0, 6).map((v) => (
              <button
                key={v.id}
                onClick={() => onPlay(v.ytId)}
                className={`shrink-0 flex gap-3 items-start text-left rounded-xl p-2 transition-all duration-200 w-64 lg:w-full ${
                  video.id === v.id ? 'bg-brand-50 border border-line' : 'hover:bg-gray-50'
                }`}
              >
                <div className="relative w-24 lg:w-28 shrink-0 rounded-lg overflow-hidden">
                  <img
                    src={`https://img.youtube.com/vi/${v.ytId}/mqdefault.jpg`}
                    alt={getLocalizedText(v.title, lang)}
                    className="w-full aspect-video object-cover"
                  />
                  {video.id === v.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Play size={16} className="text-white" fill="white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs leading-snug line-clamp-2 ${
                    video.id === v.id ? 'font-semibold text-vermilion' : 'text-gray-700'
                  }`}>
                    {getLocalizedText(v.title, lang)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {v.views || '1.2K'} views
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const VideosPage = () => {
  const { t, lang } = useLanguage();
  const [vids] = useState(defaultVideos);
  const [playing, setPlaying] = useState(null);
  const [page, setPage] = useState(0);
  const [featured] = useState(vids[0]);

  const totalPages = Math.max(1, Math.ceil(vids.length / PER_PAGE));
  const pageVids = useMemo(() => vids.slice(page * PER_PAGE, (page + 1) * PER_PAGE), [vids, page]);

  const goPage = (p) => {
    setPage(Math.max(0, Math.min(p, totalPages - 1)));
    window.scrollTo({ top: 500, behavior: 'smooth' });
  };

  const handlePlay = (ytId) => {
    setPlaying(ytId);
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setPlaying(null);
    document.body.style.overflow = 'auto';
  };

  return (
    <div className="min-h-screen" style={{ background: '#ffffff' }}>
      {/* Header */}
      <div className="pt-28 pb-8 px-6">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Youtube size={28} className="text-red-600" />
          <span className="text-xs font-semibold uppercase tracking-widest text-vermilion bg-brand-50 px-4 py-1 rounded-full">
            {t.videosTag || 'Temple Videos'}
          </span>
        </div>
        <PageHeader sub={t.videosSubtitle || 'Watch devotional videos, aartis, and temple ceremonies'}>
          {t.videosTitle || 'Temple Videos'}
        </PageHeader>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        {/* Featured Video */}
        <FeaturedVideo video={featured} lang={lang} onPlay={handlePlay} />

        {/* Recent Videos Section */}
        <div className="mb-6">
          <SectionTitle sub="Watch our latest temple videos and ceremonies">
            {t.videosRecent || 'Recent Videos'}
          </SectionTitle>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {pageVids.map((v, i) => (
              <VideoCard
                key={v.id}
                video={v}
                onClick={handlePlay}
                lang={lang}
              />
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-12">
            <button
              onClick={() => goPage(page - 1)}
              disabled={page === 0}
              className="px-4 py-2 text-sm font-medium rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ color: '#A80808', borderColor: page === 0 ? '#e5e5e5' : '#A80808' }}
            >
              <span className="flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                {t.videosPrev || 'Prev'}
              </span>
            </button>

            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => goPage(i)}
                  className="w-9 h-9 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background: i === page ? '#A80808' : 'transparent',
                    color: i === page ? '#fff' : '#A80808',
                    border: i === page ? 'none' : '1px solid #e5e5e5',
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <button
              onClick={() => goPage(page + 1)}
              disabled={page >= totalPages - 1}
              className="px-4 py-2 text-sm font-medium rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ color: '#A80808', borderColor: page >= totalPages - 1 ? '#e5e5e5' : '#A80808' }}
            >
              <span className="flex items-center gap-1.5">
                {t.videosNext || 'Next'}
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </button>

            <span className="text-xs text-mute ml-2 hidden sm:inline">
              {t.videosPage || 'Page'} {page + 1} {t.videosOf || 'of'} {totalPages}
            </span>
          </div>
        )}
      </div>

      {/* Video Player Modal */}
      <AnimatePresence>
        {playing && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
            style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)' }}
          >
            <button
              onClick={closeModal}
              aria-label="Close"
              className="absolute top-5 right-5 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-4xl aspect-video mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <iframe
                className="w-full h-full rounded-2xl shadow-2xl"
                src={`https://www.youtube.com/embed/${playing}?autoplay=1&rel=0`}
                title="Video Player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </motion.div>
          </motion.div>
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
        .scrollbar-hide::-webkit-scrollbar {
          width: 0;
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default VideosPage;