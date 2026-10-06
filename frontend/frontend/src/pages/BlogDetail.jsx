import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import { formatDate as formatLocaleDate } from '../utils/formatDate';
import OmLoader from '../components/common/OmLoader';
import Seo from '../components/common/Seo';
import { 
  Calendar, 
  User, 
  BookOpen,
  ArrowLeft,
  Share2
} from 'lucide-react';

const BlogDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBlog = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/admin/blogs/${encodeURIComponent(id)}`);
        const blogData = response.data.data || response.data;
        setBlog(blogData);
      } catch (error) {
        console.error('Fetch blog error:', error);
        setError(error.response?.data?.message || 'Blog not found');
      } finally {
        setLoading(false);
      }
    };
    fetchBlog();
  }, [id]);

  const getLocalizedText = (obj) => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[lang] || obj.en || '';
  };

  const formatDate = (dateString) => {
    return formatLocaleDate(dateString, lang, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleShare = async () => {
    const shareData = {
      title: getLocalizedText(blog?.title) || 'Blog Post',
      text: getLocalizedText(blog?.title),
      url: window.location.href,
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#ffffff' }}>
        <div className="text-center">
          <OmLoader size="lg" color="vermilion" className="mx-auto mb-4" />
          <p className="text-ink-soft text-sm">Loading blog...</p>
        </div>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#ffffff' }}>
        <div className="text-center max-w-md mx-auto px-6">
          <BookOpen size={64} className="mx-auto text-ink-soft/20 mb-4" />
          <h2 className="text-2xl font-serif font-semibold text-ink mb-2">Blog Not Found</h2>
          <p className="text-mute text-sm mb-6">{error || 'The blog post you are looking for does not exist.'}</p>
          <button
            onClick={() => navigate('/blogs')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-vermilion text-white font-semibold hover:bg-[#820606] transition-all"
          >
            <ArrowLeft size={18} />
            Back to Blogs
          </button>
        </div>
      </div>
    );
  }

  const titleText = getLocalizedText(blog.title);
  const contentText = getLocalizedText(blog.content);

  return (
    <div className="min-h-screen" style={{ background: '#ffffff' }}>
      <Seo
        title={titleText}
        description={getLocalizedText(blog.excerpt) || contentText}
        image={blog.image}
        type="article"
        published={blog.createdAt}
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Back Button */}
        <button
          onClick={() => navigate('/blogs')}
          className="inline-flex items-center gap-2 text-ink-soft hover:text-vermilion transition-colors mb-6 text-sm font-medium"
        >
          <ArrowLeft size={18} />
          Back to Blogs
        </button>

        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-3xl overflow-hidden shadow-lg border border-gray-100"
        >
          {/* Image */}
          <div className="relative h-64 sm:h-80 md:h-96 overflow-hidden">
            {blog.image ? (
              <img
                src={blog.image}
                alt={titleText}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-vermilion/10 to-maroon/10">
                <BookOpen size={64} className="text-vermilion/30" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          </div>

          {/* Content */}
          <div className="p-6 sm:p-8 md:p-10">
            {/* Meta Info */}
            <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-ink-soft mb-6 pb-6 border-b border-gray-100">
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-2">
                  <User size={16} className="text-vermilion" />
                  {blog.author || 'Temple Trust'}
                </span>
                <span className="flex items-center gap-2">
                  <Calendar size={16} className="text-vermilion" />
                  {formatDate(blog.createdAt)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all text-sm font-medium"
                >
                  <Share2 size={16} />
                  {t.share || 'Share'}
                </button>
              </div>
            </div>

            {/* Title */}
            <h1 className="font-serif text-4xl font-bold text-ink mb-6">
              {titleText}
            </h1>

            {/* Content */}
            <div className="prose prose-lg max-w-none">
              {contentText.split('\n').map((paragraph, i) => (
                <p key={i} className="text-mute leading-relaxed mb-4 text-base">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between items-center">
              <span className="text-xs text-mute">
                Published on {formatDate(blog.createdAt)}
              </span>
              <button
                onClick={() => navigate('/blogs')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-vermilion text-white font-semibold hover:bg-[#820606] transition-all shadow-lg shadow-black/10 text-sm"
              >
                <ArrowLeft size={16} />
                Back to Blogs
              </button>
            </div>
          </div>
        </motion.article>
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

export default BlogDetail;