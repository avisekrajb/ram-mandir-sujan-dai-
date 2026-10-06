import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import PageHeader from '../components/common/PageHeader';
import api from '../services/api';
import { formatDate as formatLocaleDate } from '../utils/formatDate';
import OmLoader from '../components/common/OmLoader';
import { optimizeImageCached } from '../utils/imageOptimize';
import {
  Calendar,
  User, 
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Share2
} from 'lucide-react';

const BlogsPage = () => {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const blogsPerPage = 6;

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/blogs');
      const publishedBlogs = response.data.data?.filter(b => b.published !== false) || [];
      // Sort by createdAt - newest first
      const sortedBlogs = publishedBlogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setBlogs(sortedBlogs);
    } catch (error) {
      console.error('Fetch blogs error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLocalizedText = (obj) => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[lang] || obj.en || '';
  };

  const filteredPosts = blogs.filter(post => {
    const titleText = getLocalizedText(post.title).toLowerCase();
    const excerptText = getLocalizedText(post.excerpt).toLowerCase();
    const contentText = getLocalizedText(post.content).toLowerCase();
    const matchesSearch = titleText.includes(searchTerm.toLowerCase()) || 
                          excerptText.includes(searchTerm.toLowerCase()) ||
                          contentText.includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredPosts.length / blogsPerPage);
  const currentPosts = filteredPosts.slice(
    (currentPage - 1) * blogsPerPage,
    currentPage * blogsPerPage
  );

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBlogClick = (blog) => {
    navigate(`/blogs/${blog._id}`);
  };

  const handleShare = async (blog, e) => {
    e.stopPropagation();
    const titleText = getLocalizedText(blog.title);
    const shareData = {
      title: titleText || 'Blog Post',
      text: titleText,
      url: `${window.location.origin}/blogs/${blog._id}`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.title}\n${shareData.url}`);
        alert('Blog link copied to clipboard!');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Share error:', error);
      }
    }
  };

  const formatDate = (dateString) => {
    return formatLocaleDate(dateString, lang, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen" style={{ background: '#ffffff' }}>
      {/* Header */}
      <div className="relative pt-10 sm:pt-14 pb-8 text-center px-4 sm:px-6 overflow-hidden">
        <div className="relative z-10">
          <PageHeader sub={t.blogsSubtitle || 'Stories and spiritual reflections from Shree Ramchandra Temple'}>
            {t.blogsTitle || 'Temple Blogs'}
          </PageHeader>
        </div>
      </div>

      {/* Search Bar - Only search, no box wrapper */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-8">
        <div className="flex justify-end">
          <div className="relative w-full lg:w-80">
            <input
              type="text"
              placeholder={t.blogsSearch || 'Search blogs...'}
              aria-label={t.blogsSearch || 'Search blogs...'}
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full px-4 py-2.5 pl-10 rounded-xl border border-gray-200 focus:border-vermilion focus:ring-2 focus:ring-line focus:outline-none text-sm transition-all bg-white/80 backdrop-blur-sm"
            />
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            {searchTerm && (
              <button
                onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Blog Posts Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <OmLoader size="lg" color="vermilion" className="mx-auto mb-4" />
              <p className="text-ink-soft text-sm">{t.loading || 'Loading blogs...'}</p>
            </div>
          </div>
        ) : currentPosts.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen size={64} className="mx-auto text-ink-soft/20 mb-4" />
            <p className="text-lg text-ink-soft">{t.blogsNoPosts || 'No blog posts found'}</p>
            <p className="text-sm text-mute mt-2">
              {searchTerm 
                ? t.blogsTryDifferent || 'Try a different search'
                : t.blogsCheckLater || 'Check back later for new posts'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {currentPosts.map((post, index) => {
              const titleText = getLocalizedText(post.title);
              const excerptText = getLocalizedText(post.excerpt);

              return (
                <motion.article
                  key={post._id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.08 }}
                  className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-gray-100 cursor-pointer"
                  onClick={() => handleBlogClick(post)}
                >
                  {/* Image - No date or share on image */}
                  <div className="relative h-56 overflow-hidden bg-gray-100">
                    {post.image ? (
                      <img
                        src={optimizeImageCached(post.image, { width: 640 })}
                        alt={titleText}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-vermilion/10 to-maroon/10">
                        <BookOpen size={48} className="text-vermilion/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="font-serif text-xl font-semibold text-ink mb-3 group-hover:text-vermilion transition-colors line-clamp-2">
                      {titleText}
                    </h3>
                    <p className="text-mute text-sm leading-relaxed line-clamp-3 mb-4">
                      {excerptText}
                    </p>

                    {/* Bottom Section - Date, Author, Share */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-4 text-xs text-ink-soft">
                        <span className="flex items-center gap-1.5">
                          <User size={14} className="text-vermilion" />
                          {post.author || 'Temple Trust'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-vermilion" />
                          {formatDate(post.createdAt)}
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleShare(post, e)}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-all text-ink-soft hover:text-vermilion"
                        title={t.share || 'Share'}
                      >
                        <Share2 size={16} />
                      </button>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-12">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              aria-label="Previous page"
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-xl border border-gray-200 text-ink-soft hover:border-vermilion hover:text-vermilion transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`w-10 h-10 rounded-xl font-semibold text-sm transition-all ${
                  currentPage === page
                    ? 'bg-vermilion text-white shadow-md shadow-black/10'
                    : 'text-ink-soft hover:bg-gray-100'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              aria-label="Next page"
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded-xl border border-gray-200 text-ink-soft hover:border-vermilion hover:text-vermilion transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

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

export default BlogsPage;