import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';
import { formatDate as formatLocaleDate } from '../../utils/formatDate';
import {
  Plus, Pencil, Trash2, Save, X, Image, Upload, 
  Eye, EyeOff
} from 'lucide-react';
import LanguageSwitcher from '../common/LanguageSwitcher';
import OmLoader from '../../components/common/OmLoader';

const AdminBlogs = () => {
  const { t, lang } = useLanguage();
  const { showToast } = useToast();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [activeLang, setActiveLang] = useState('en');
  const [uploading, setUploading] = useState(false);
  const [validationError, setValidationError] = useState('');
  const fileInputRef = useRef(null);

  // Fetch blogs
  useEffect(() => {
    fetchBlogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once on mount
  }, []);

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/blogs');
      setBlogs(response.data.data || []);
    } catch (error) {
      console.error('Fetch blogs error:', error);
      showToast((t.a3_blog_fetchFailed || 'Failed to fetch blogs'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const blankBlog = () => ({
    title: { en: '', ne: '', hi: '', zh: '', ta: '' },
    excerpt: { en: '', ne: '', hi: '', zh: '', ta: '' },
    content: { en: '', ne: '', hi: '', zh: '', ta: '' },
    category: { en: 'General', ne: 'सामान्य', hi: 'सामान्य', zh: '一般', ta: 'பொது' },
    image: null,
    author: 'Shree Ramchandra Temple Trust',
    readTime: '5 min read',
    published: true,
  });

  const handleCreate = () => {
    setEditing(blankBlog());
    setValidationError('');
  };

  const handleEdit = (blog) => {
    setEditing(blog);
    setValidationError('');
  };

  const validateBlog = () => {
    const titleEn = editing.title?.en?.trim();
    const excerptEn = editing.excerpt?.en?.trim();
    const contentEn = editing.content?.en?.trim();

    if (!titleEn) {
      setValidationError((t.a3_blog_reqTitle || 'English title is required'));
      showToast((t.a3_blog_reqTitle || 'English title is required'), 'error');
      return false;
    }
    if (!excerptEn) {
      setValidationError((t.a3_blog_reqExcerpt || 'English excerpt is required'));
      showToast((t.a3_blog_reqExcerpt || 'English excerpt is required'), 'error');
      return false;
    }
    if (!contentEn) {
      setValidationError((t.a3_blog_reqContent || 'English content is required'));
      showToast((t.a3_blog_reqContent || 'English content is required'), 'error');
      return false;
    }
    setValidationError('');
    return true;
  };

  const handleSave = async () => {
    if (!validateBlog()) return;

    setLoading(true);
    try {
      // Ensure all language fields have at least empty strings
      const blogData = {
        ...editing,
        title: {
          en: editing.title?.en || '',
          ne: editing.title?.ne || '',
          hi: editing.title?.hi || '',
          zh: editing.title?.zh || '',
          ta: editing.title?.ta || '',
        },
        excerpt: {
          en: editing.excerpt?.en || '',
          ne: editing.excerpt?.ne || '',
          hi: editing.excerpt?.hi || '',
          zh: editing.excerpt?.zh || '',
          ta: editing.excerpt?.ta || '',
        },
        content: {
          en: editing.content?.en || '',
          ne: editing.content?.ne || '',
          hi: editing.content?.hi || '',
          zh: editing.content?.zh || '',
          ta: editing.content?.ta || '',
        },
        category: {
          en: editing.category?.en || 'General',
          ne: editing.category?.ne || 'सामान्य',
          hi: editing.category?.hi || 'सामान्य',
          zh: editing.category?.zh || '一般',
          ta: editing.category?.ta || 'பொது',
        },
      };

      if (editing._id) {
        const response = await api.put(`/admin/blogs/${editing._id}`, blogData);
        setBlogs(blogs.map(b => b._id === editing._id ? response.data.data : b));
        showToast((t.a3_blog_updated || 'Blog updated successfully'), 'success');
      } else {
        const response = await api.post('/admin/blogs', blogData);
        setBlogs([response.data.data, ...blogs]);
        showToast((t.a3_blog_created || 'Blog created successfully'), 'success');
      }
      setEditing(null);
      setValidationError('');
    } catch (error) {
      console.error('Save blog error:', error);
      const errorMsg = error.response?.data?.message || (t.a3_blog_saveFailed || 'Failed to save blog');
      showToast(errorMsg, 'error');
      setValidationError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm((t.a3_blog_deleteConfirm || 'Delete this blog?'))) return;
    setLoading(true);
    try {
      await api.delete(`/admin/blogs/${id}`);
      setBlogs(blogs.filter(b => b._id !== id));
      showToast((t.a3_blog_deleted || 'Blog deleted successfully'), 'success');
    } catch (error) {
      console.error('Delete blog error:', error);
      showToast((t.a3_blog_deleteFailed || 'Failed to delete blog'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublish = async (id) => {
    try {
      const response = await api.put(`/admin/blogs/${id}/toggle`);
      setBlogs(blogs.map(b => b._id === id ? response.data.data : b));
      showToast(response.data.message, 'success');
    } catch (error) {
      console.error('Toggle blog error:', error);
      showToast((t.a3_blog_toggleFailed || 'Failed to toggle blog status'), 'error');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast((t.uploadImageOnly || 'Please upload an image file'), 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast((t.a3_c_imageMaxSize || 'Image must be less than {size}MB').replace('{size}', '5'), 'error');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await api.post('/admin/upload/about', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setEditing({ ...editing, image: response.data.url });
      showToast((t.a3_blog_imageUploaded || 'Image uploaded successfully'), 'success');
    } catch (error) {
      console.error('Upload error:', error);
      showToast((t.a3_blog_imageFailed || 'Failed to upload image'), 'error');
    } finally {
      setUploading(false);
    }
    e.target.value = '';
  };

  const getLocalizedText = (obj) => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[activeLang] || obj.en || '';
  };

  const updateField = (field, value) => {
    setEditing({
      ...editing,
      [field]: {
        ...editing[field],
        [activeLang]: value,
      },
    });
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError('');
    }
  };

  const categories = {
    en: ['General', 'History', 'Festivals', 'Rituals', 'Community', 'Spiritual'],
    ne: ['सामान्य', 'इतिहास', 'चाडपर्व', 'अनुष्ठान', 'समुदाय', 'आध्यात्मिक'],
    hi: ['सामान्य', 'इतिहास', 'त्योहार', 'अनुष्ठान', 'समुदाय', 'आध्यात्मिक'],
    zh: ['一般', '历史', '节日', '仪式', '社区', '精神'],
    ta: ['பொது', 'வரலாறு', 'திருவிழாக்கள்', 'சடங்குகள்', 'சமூகம்', 'ஆன்மீகம்'],
  };

  if (editing) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-base font-serif font-semibold text-ink">
            {editing._id ? (t.a3_blog_edit || 'Edit Blog') : (t.a3_blog_createNew || 'Create New Blog')}
          </h4>
          <button
            onClick={() => setEditing(null)}
            aria-label={(t.close || 'Close')}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Validation Error */}
        {validationError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {validationError}
          </div>
        )}

        {/* Image Upload */}
        <div className="mb-4">
          <label className="text-xs font-bold text-ink block mb-1.5">{t.a3_blog_image || 'Blog Image'}</label>
          <div
            className="relative border-2 border-dashed border-gray-300 rounded-xl overflow-hidden h-40 flex items-center justify-center cursor-pointer bg-gray-50 hover:border-vermilion transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            {editing.image ? (
              <img src={editing.image} alt={(t.a3_blog_blog || 'Blog')} className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-ink-soft">
                <Image size={28} />
                <span className="text-sm font-medium">{t.a3_footer_clickUploadImage || 'Click to upload image'}</span>
                <span className="text-xs text-mute">JPG, PNG, WEBP • {(t.a5_maxFileSize || 'Max {size}').replace('{size}', '5MB')}</span>
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <OmLoader size="md" color="white" />
              </div>
            )}
            {editing.image && !uploading && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs font-bold py-1.5 flex items-center justify-center gap-1.5">
                <Upload size={13} /> {t.a3_blog_clickChange || 'Click to change image'}
              </div>
            )}
          </div>
        </div>

        {/* Language Switcher */}
        <LanguageSwitcher active={activeLang} onChange={setActiveLang} t={t} />

        {/* Title */}
        <div className="mb-3">
          <label className="text-xs font-bold text-ink block mb-1.5">
            {t.heroTitleLabel || 'Title'} {activeLang === 'en' && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            aria-label={(t.heroTitleLabel || 'Title')} value={getLocalizedText(editing.title)}
            onChange={(e) => updateField('title', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:border-vermilion focus:outline-none text-sm ${
              activeLang === 'en' && !editing.title?.en?.trim() && validationError
                ? 'border-red-400'
                : 'border-gray-200'
            }`}
            placeholder={activeLang === 'en' ? (t.a3_blog_titlePhReq || 'Blog title (required)...') : (t.a3_blog_titlePh || 'Blog title...')}
          />
        </div>

        {/* Category */}
        <div className="mb-3">
          <label className="text-xs font-bold text-ink block mb-1.5">{t.a3_blog_category || 'Category'}</label>
          <select
            aria-label={(t.a3_blog_category || 'Category')} value={getLocalizedText(editing.category)}
            onChange={(e) => {
              const newCategory = { ...editing.category, [activeLang]: e.target.value };
              setEditing({ ...editing, category: newCategory });
            }}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm"
          >
            {categories[activeLang]?.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Excerpt */}
        <div className="mb-3">
          <label className="text-xs font-bold text-ink block mb-1.5">
            {t.a3_blog_excerpt || 'Excerpt / Summary'} {activeLang === 'en' && <span className="text-red-500">*</span>}
          </label>
          <textarea
            rows={2}
            aria-label={(t.a3_blog_excerpt || 'Excerpt / Summary')} value={getLocalizedText(editing.excerpt)}
            onChange={(e) => updateField('excerpt', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:border-vermilion focus:outline-none text-sm resize-none ${
              activeLang === 'en' && !editing.excerpt?.en?.trim() && validationError
                ? 'border-red-400'
                : 'border-gray-200'
            }`}
            placeholder={activeLang === 'en' ? (t.a3_blog_excerptPhReq || 'Brief summary (required)...') : (t.a3_blog_excerptPh || 'Brief summary...')}
          />
        </div>

        {/* Content */}
        <div className="mb-3">
          <label className="text-xs font-bold text-ink block mb-1.5">
            {t.a3_blog_content || 'Content'} {activeLang === 'en' && <span className="text-red-500">*</span>}
          </label>
          <textarea
            rows={6}
            aria-label={(t.a3_blog_content || 'Content')} value={getLocalizedText(editing.content)}
            onChange={(e) => updateField('content', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:border-vermilion focus:outline-none text-sm resize-none ${
              activeLang === 'en' && !editing.content?.en?.trim() && validationError
                ? 'border-red-400'
                : 'border-gray-200'
            }`}
            placeholder={activeLang === 'en' ? (t.a3_blog_contentPhReq || 'Full blog content (required)...') : (t.a3_blog_contentPh || 'Full blog content...')}
          />
        </div>

        {/* Author and Read Time */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs font-bold text-ink block mb-1.5">{t.a3_blog_author || 'Author'}</label>
            <input
              type="text"
              aria-label={(t.a3_blog_author || 'Author')} value={editing.author || ''}
              onChange={(e) => setEditing({ ...editing, author: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-ink block mb-1.5">{t.a3_blog_readTime || 'Read Time'}</label>
            <input
              type="text"
              aria-label={(t.a3_blog_readTime || 'Read Time')} value={editing.readTime || ''}
              onChange={(e) => setEditing({ ...editing, readTime: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm"
              placeholder={t.a5_readTimePlaceholder || '5 min read'}
            />
          </div>
        </div>

        {/* Published Toggle */}
        <div className="mb-4">
          <label className="flex items-center gap-2 text-xs font-bold text-ink">
            <input
              type="checkbox"
              checked={editing.published !== false}
              onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-vermilion focus:ring-vermilion"
            />
            {t.a3_blog_published || 'Published'}
          </label>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={loading || uploading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-vermilion text-white font-semibold text-sm hover:bg-[#820606] transition-all disabled:opacity-50"
          >
            <Save size={15} /> {editing._id ? (t.a3_blog_update || 'Update') : (t.a3_blog_create || 'Create')}
          </button>
          <button
            onClick={() => setEditing(null)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 text-ink-soft font-semibold text-sm hover:bg-gray-50 transition-all"
          >
            <X size={15} /> {t.cancel || 'Cancel'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-base font-serif font-semibold text-ink">{t.a3_blog_management || 'Blog Management'}</h4>
          <p className="text-xs text-ink-soft mt-0.5">{t.a3_blog_managementHint || 'Create and manage blog posts'}</p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-vermilion text-white text-xs font-semibold hover:bg-[#820606] transition-all"
        >
          <Plus size={14} /> {t.a3_blog_new || 'New Blog'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <OmLoader size="md" color="vermilion" />
        </div>
      ) : blogs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-ink-soft">{t.a3_blog_none || 'No blogs created yet'}</p>
          <button
            onClick={handleCreate}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-vermilion text-white text-sm font-semibold hover:bg-[#820606] transition-all"
          >
            <Plus size={14} /> {t.a3_blog_createFirst || 'Create First Blog'}
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-200">
                <th className="pb-2 text-xs font-bold text-ink-soft uppercase tracking-wide">{t.a3_footer_image || 'Image'}</th>
                <th className="pb-2 text-xs font-bold text-ink-soft uppercase tracking-wide">{t.heroTitleLabel || 'Title'}</th>
                <th className="pb-2 text-xs font-bold text-ink-soft uppercase tracking-wide hidden md:table-cell">{t.a3_blog_category || 'Category'}</th>
                <th className="pb-2 text-xs font-bold text-ink-soft uppercase tracking-wide hidden lg:table-cell">{t.status || 'Status'}</th>
                <th className="pb-2 text-xs font-bold text-ink-soft uppercase tracking-wide hidden xl:table-cell">{t.a3_blog_date || 'Date'}</th>
                <th className="pb-2 text-xs font-bold text-ink-soft uppercase tracking-wide text-right">{t.actions || 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {blogs.map((blog) => {
                const titleText = blog.title?.en || (t.a3_c_untitled || 'Untitled');
                const categoryText = blog.category?.en || 'General';
                const isPublished = blog.published !== false;

                return (
                  <tr key={blog._id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="py-2.5">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                        {blog.image ? (
                          <img src={blog.image} alt={titleText} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-ink-soft/30">
                            <Image size={20} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 font-medium max-w-[150px] truncate">{titleText}</td>
                    <td className="py-2.5 hidden md:table-cell">
                      <span className="text-xs font-bold px-2 py-1 rounded-full bg-gray-100 text-ink-soft">
                        {categoryText}
                      </span>
                    </td>
                    <td className="py-2.5 hidden lg:table-cell">
                      <button
                        onClick={() => handleTogglePublish(blog._id)}
                        className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full transition-all ${
                          isPublished
                            ? 'bg-green-50 text-green-600 hover:bg-green-100'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {isPublished ? <Eye size={12} /> : <EyeOff size={12} />}
                        {isPublished ? (t.a3_blog_published || 'Published') : (t.a3_blog_draft || 'Draft')}
                      </button>
                    </td>
                    <td className="py-2.5 hidden xl:table-cell text-ink-soft text-xs">
                      {formatLocaleDate(blog.createdAt, lang)}
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(blog)}
                          aria-label={(t.edit || 'Edit')}
                          className="p-1.5 rounded-lg text-ink-soft hover:text-maroon hover:bg-gray-100 transition-all"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(blog._id)}
                          aria-label={(t.delete || 'Delete')}
                          className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminBlogs;