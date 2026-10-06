import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';
import { formatDate as formatLocaleDate } from '../../utils/formatDate';
import OmLoader from '../../components/common/OmLoader';
import { localized } from '../gallery/galleryText';
import { isGenericTitle } from '../../utils/galleryPlaceholders';
import { GalleryUploadModal, GalleryEditModal, hasDetails } from './GalleryForms';
import {
  Image, Video, Plus, Trash2, Download, Share2,
  Calendar, Search,
  CheckSquare, Square, RefreshCw,
  ChevronLeft, ChevronRight, Star, Pencil, AlertCircle
} from 'lucide-react';

const AdminGallery = ({ gallery, setGallery, galleryVideos, setGalleryVideos, t }) => {
  const { showToast } = useToast();
  const { lang } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('photos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedItems, setSelectedItems] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [items, setItems] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [categories, setCategories] = useState(['all']);

  const itemsPerPage = 20;

  // Fetch all gallery items
  useEffect(() => {
    fetchGalleryItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once on mount
  }, []);

  const fetchGalleryItems = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/gallery/all');
      setAllItems(response.data.data || []);
      setItems(response.data.data || []);
      // Extract categories
      const cats = ['all', ...new Set((response.data.data || []).map(item => item.category).filter(Boolean))];
      setCategories(cats);
    } catch (error) {
      console.error('Fetch gallery items error:', error);
      showToast(t.a2_galleryFetchFailed || 'Failed to fetch gallery items', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter items
  useEffect(() => {
    let filtered = allItems;
    
    // Filter by type
    if (activeTab === 'photos') {
      filtered = filtered.filter(item => item.type === 'photo');
    } else if (activeTab === 'videos') {
      filtered = filtered.filter(item => item.type === 'video');
    }
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }
    
    // Only the ones still missing a title or description
    if (onlyMissing) {
      filtered = filtered.filter(item => !hasDetails(item));
    }

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
        const text = [item.title, item.cap, item.description].map((field) => localized(field, lang)).join(' ');
        return text.toLowerCase().includes(term);
      });
    }

    setItems(filtered);
    setCurrentPage(1);
  }, [allItems, activeTab, selectedCategory, searchTerm, lang, onlyMissing]);

  // A real title, or nothing: a stand-in caption such as "Gallery Image" is not a title.
  const adminTitle = (item) => {
    const title = localized(item.title, lang);
    if (title) return title;
    const cap = localized(item.cap, lang);
    return isGenericTitle(cap) ? '' : cap;
  };
  const missingCount = allItems.filter((item) => !hasDetails(item)).length;

  // Featured photos come first on the public Gallery page.
  const handleToggleFeatured = async (item) => {
    const next = !item.featured;
    try {
      await api.put(`/admin/gallery/${item._id}`, { featured: next });
      setAllItems((items) => items.map((it) => (it._id === item._id ? { ...it, featured: next } : it)));
      showToast(next ? (t.a2_galleryFeaturedOn || 'Added to featured') : (t.a2_galleryFeaturedOff || 'Removed from featured'), 'success');
    } catch (error) {
      console.error('Featured toggle error:', error);
      showToast(t.a2_galleryFeaturedFailed || 'Could not update featured', 'error');
    }
  };

  // Delete handlers
  const handleDelete = async (id) => {
    if (!window.confirm(t.a2_galleryDeleteConfirm || 'Delete this item?')) return;
    setLoading(true);
    try {
      await api.delete(`/admin/gallery/${id}`);
      setAllItems(allItems.filter(item => item._id !== id));
      showToast(t.a2_galleryDeleted || 'Item deleted successfully', 'success');
    } catch (error) {
      console.error('Delete error:', error);
      showToast(t.a2_galleryDeleteFailed || 'Failed to delete item', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) {
      showToast(t.a2_gallerySelectToDelete || 'Please select items to delete', 'warning');
      return;
    }
    if (!window.confirm((t.a2_galleryBulkDeleteConfirm || 'Delete {n} items?').replace('{n}', selectedItems.length))) return;
    
    setLoading(true);
    try {
      await api.delete('/admin/gallery/bulk', { data: { ids: selectedItems } });
      setAllItems(allItems.filter(item => !selectedItems.includes(item._id)));
      setSelectedItems([]);
      showToast(t.a2_galleryBulkDeleted || 'Items deleted successfully', 'success');
    } catch (error) {
      console.error('Bulk delete error:', error);
      showToast(t.a2_galleryBulkDeleteFailed || 'Failed to delete items', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Selection handlers
  const toggleSelect = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === pageItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(pageItems.map(item => item._id));
    }
  };

  // Download handler
  const handleDownload = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename || 'download';
      a.click();
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      window.open(url, '_blank');
    }
  };

  // Share handler
  const handleShare = (item) => {
    if (navigator.share) {
      navigator.share({
        title: item.cap?.[lang] || item.cap?.en || t.a2_galleryShareTitle || 'Temple Gallery',
        url: item.photo,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(item.photo);
      showToast(t.a2_galleryLinkCopied || 'Link copied to clipboard', 'success');
    }
  };

  const handleShareAll = () => {
    const urls = pageItems.map(item => item.photo).join('\n');
    if (navigator.share) {
      navigator.share({
        title: t.a2_galleryShareTitle || 'Temple Gallery',
        text: t.a2_galleryShareText || 'Check out these temple photos!',
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(urls);
      showToast(t.a2_galleryAllLinksCopied || 'All links copied to clipboard', 'success');
    }
  };

  // Format date
  const formatDate = (date) => {
    return formatLocaleDate(date, lang, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Display label for a stored category value (the value itself is never changed)
  const CATEGORY_LABELS = {
    general: t.a2_galleryCatGeneral || 'General',
    temple: t.a2_galleryCatTemple || 'Temple',
    deity: t.a2_galleryCatDeity || 'Deity',
    festival: t.a2_galleryCatFestival || 'Festival',
    devotion: t.a2_galleryCatDevotion || 'Devotion',
    ceremony: t.a2_galleryCatCeremony || 'Ceremony',
    ritual: t.a2_galleryCatRitual || 'Ritual',
    aarti: t.a2_galleryCatAarti || 'Aarti',
  };
  const categoryLabel = (cat) => CATEGORY_LABELS[String(cat || '').toLowerCase()] || cat;

  // Format file size
  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Pagination
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const pageItems = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading && allItems.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <OmLoader size="lg" color="vermilion" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h4 className="text-base font-serif font-semibold text-ink">{t.a2_galleryManagement || 'Gallery Management'}</h4>
          <p className="text-xs text-ink-soft">{t.a2_galleryManageDesc || 'Manage photos and videos in the gallery'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchGalleryItems}
            className="p-2 rounded-lg hover:bg-gray-100 transition-all"
            title={t.a2_galleryRefresh || 'Refresh'}
          >
            <RefreshCw size={18} className="text-ink-soft" />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-vermilion text-white text-sm font-semibold hover:bg-[#820606] transition-all"
          >
            <Plus size={16} /> {t.add || 'Add New'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('photos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'photos' ? 'bg-white text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
            }`}
          >
            <Image size={14} className="inline mr-1" /> {t.a2_galleryPhotos || 'Photos'}
          </button>
          <button
            onClick={() => setActiveTab('videos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'videos' ? 'bg-white text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
            }`}
          >
            <Video size={14} className="inline mr-1" /> {t.a2_galleryVideos || 'Videos'}
          </button>
        </div>

        <div className="w-full sm:w-auto sm:flex-1 flex items-center gap-2 min-w-0">
          <div className="relative flex-1 min-w-0 sm:max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              type="text"
              aria-label={t.a2_search || 'Search'} value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t.a2_gallerySearchPlaceholder || 'Search by caption...'}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm"
            />
          </div>
          <select
            aria-label={t.a2_galleryFilterCategory || 'Filter by category'} value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="shrink-0 max-w-[40%] sm:max-w-none px-3 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm bg-white"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat === 'all' ? (t.a2_galleryAllCategories || 'all') : categoryLabel(cat)}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-brand-50 text-vermilion' : 'text-ink-soft'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-brand-50 text-vermilion' : 'text-ink-soft'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Items that still have no title or description */}
      {missingCount > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertCircle size={18} className="shrink-0" aria-hidden="true" />
          <p className="min-w-0 flex-1">
            {(t.gl_missingBanner || '{n} still need a title and a description. Visitors see them without text until you add it.').replace('{n}', missingCount)}
          </p>
          <button type="button" onClick={() => setOnlyMissing((v) => !v)} className="font-semibold underline underline-offset-2 hover:text-amber-950">
            {onlyMissing ? (t.gl_showAll || 'Show all') : (t.gl_showMissing || 'Show them')}
          </button>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedItems.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-vermilion/5 rounded-xl border border-line">
          <span className="text-sm font-medium">{(t.a2_gallerySelectedCount || '{n} selected').replace('{n}', selectedItems.length)}</span>
          <button
            onClick={toggleSelectAll}
            className="text-sm text-ink-soft hover:text-ink transition-colors"
          >
            {selectedItems.length === pageItems.length ? (t.a2_galleryDeselectAll || 'Deselect All') : (t.a2_gallerySelectAll || 'Select All')}
          </button>
          <div className="flex-1" />
          <button
            onClick={handleBulkDelete}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all text-sm font-semibold"
          >
            <Trash2 size={14} /> {t.a2_galleryDeleteSelected || 'Delete Selected'}
          </button>
        </div>
      )}

      {/* Gallery Grid/List */}
      {pageItems.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
          <Image size={48} className="mx-auto text-ink-soft/30 mb-4" />
          <p className="text-ink-soft">{activeTab === 'photos' ? (t.a2_galleryNoPhotos || 'No photos found') : (t.a2_galleryNoVideos || 'No videos found')}</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-2 text-sm text-vermilion hover:text-[#820606] transition-colors"
          >
            {activeTab === 'photos' ? (t.a2_galleryUploadFirstPhoto || 'Upload your first photo') : (t.a2_galleryUploadFirstVideo || 'Upload your first video')}
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {pageItems.map((item) => (
            <div key={item._id} className="group relative bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg transition-all">
              <div className="aspect-square bg-gray-100 relative">
                {item.type === 'video' ? (
                  <video src={item.photo} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={item.photo} alt={item.cap?.[lang] || item.cap?.en} className="w-full h-full object-cover" />
                )}
                {item.type === 'video' ? (
                  <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
                    <Video size={12} /> {t.a2_galleryVideo || 'Video'}
                  </div>
                ) : (
                  <button
                    onClick={() => handleToggleFeatured(item)}
                    aria-pressed={Boolean(item.featured)}
                    title={item.featured ? (t.a2_galleryUnfeature || 'Remove from featured') : (t.a2_galleryFeature || 'Feature on the gallery page')}
                    className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-white/90 hover:bg-white transition-all shadow-sm"
                  >
                    <Star size={16} className={item.featured ? 'fill-vermilion text-vermilion' : 'text-mute'} />
                  </button>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => handleShare(item)}
                    className="p-2 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-all"
                    title={t.share || 'Share'}
                  >
                    <Share2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDownload(item.photo, item.cap?.[lang] || item.cap?.en || 'download')}
                    className="p-2 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-all"
                    title={t.download || 'Download'}
                  >
                    <Download size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(item._id)}
                    className="p-2 rounded-lg bg-red-500/70 text-white hover:bg-red-500 transition-all"
                    title={t.delete || 'Delete'}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <button
                  onClick={() => toggleSelect(item._id)}
                  className="absolute top-2 left-2 p-1 rounded-lg bg-white/90 hover:bg-white transition-all shadow-sm"
                >
                  {selectedItems.includes(item._id) ? (
                    <CheckSquare size={16} className="text-vermilion" />
                  ) : (
                    <Square size={16} className="text-mute" />
                  )}
                </button>
              </div>
              <div className="p-3">
                <p className="text-xs font-medium text-ink truncate">
                  {adminTitle(item) || t.a2_untitled || 'Untitled'}
                </p>
                <div className="flex items-center justify-between mt-1 text-xs text-ink-soft">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} /> {formatDate(item.createdAt)}
                  </span>
                  <span>{formatSize(item.size)}</span>
                </div>
                {item.category && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 rounded-full text-xs text-ink-soft">
                    {categoryLabel(item.category)}
                  </span>
                )}
                <div className="mt-2 flex items-center justify-between gap-2">
                  {hasDetails(item) ? <span /> : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                      <AlertCircle size={12} aria-hidden="true" /> {t.gl_missingOne || 'Needs a title and description'}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditItem(item)}
                    title={t.gl_edit || 'Edit title and description'}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-ink-soft transition-colors hover:border-vermilion hover:text-vermilion"
                  >
                    <Pencil size={12} aria-hidden="true" /> {t.edit || 'Edit'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left w-10">
                  <button onClick={toggleSelectAll}>
                    {selectedItems.length === pageItems.length ? (
                      <CheckSquare size={18} className="text-vermilion" />
                    ) : (
                      <Square size={18} className="text-mute" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-ink-soft uppercase tracking-wider">{t.a2_galleryColPreview || 'Preview'}</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-ink-soft uppercase tracking-wider">{t.a2_galleryColCaption || 'Caption'}</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-ink-soft uppercase tracking-wider hidden md:table-cell">{t.a2_category || 'Category'}</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-ink-soft uppercase tracking-wider hidden lg:table-cell">{t.a2_date || 'Date'}</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-ink-soft uppercase tracking-wider hidden sm:table-cell">{t.a2_galleryColSize || 'Size'}</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-ink-soft uppercase tracking-wider">{t.actions || 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((item) => (
                <tr key={item._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <button onClick={() => toggleSelect(item._id)}>
                      {selectedItems.includes(item._id) ? (
                        <CheckSquare size={18} className="text-vermilion" />
                      ) : (
                        <Square size={18} className="text-mute" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                      {item.type === 'video' ? (
                        <video src={item.photo} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={item.photo} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium max-w-[150px] truncate">
                    {adminTitle(item) || t.a2_untitled || 'Untitled'}
                    {!hasDetails(item) && (
                      <span title={t.gl_missingOne || 'Needs a title and description'} className="ml-1.5 inline-block align-middle text-amber-600">
                        <AlertCircle size={14} aria-hidden="true" />
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                      {categoryLabel(item.category || 'general')}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-ink-soft text-xs">
                    {formatDate(item.createdAt)}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-ink-soft text-xs">
                    {formatSize(item.size)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditItem(item)}
                        className="p-1.5 rounded-lg hover:bg-gray-200 transition-all"
                        title={t.gl_edit || 'Edit title and description'}
                        aria-label={t.gl_edit || 'Edit title and description'}
                      >
                        <Pencil size={14} className="text-ink-soft" />
                      </button>
                      <button
                        onClick={() => handleShare(item)}
                        className="p-1.5 rounded-lg hover:bg-gray-200 transition-all"
                        title={t.share || 'Share'}
                      >
                        <Share2 size={14} className="text-ink-soft" />
                      </button>
                      <button
                        onClick={() => handleDownload(item.photo, item.cap?.[lang] || item.cap?.en || 'download')}
                        className="p-1.5 rounded-lg hover:bg-gray-200 transition-all"
                        title={t.download || 'Download'}
                      >
                        <Download size={14} className="text-ink-soft" />
                      </button>
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-all"
                        title={t.delete || 'Delete'}
                      >
                        <Trash2 size={14} className="text-red-400 hover:text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-gray-200 hover:border-vermilion transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2)
              .map((page, index, array) => (
                <React.Fragment key={page}>
                  {index > 0 && array[index - 1] !== page - 1 && (
                    <span className="px-2 text-ink-soft">…</span>
                  )}
                  <button
                    onClick={() => goToPage(page)}
                    className={`w-9 h-9 rounded-lg text-sm font-semibold transition-all ${
                      page === currentPage
                        ? 'bg-vermilion text-white shadow-lg shadow-black/10'
                        : 'hover:bg-gray-100 text-ink-soft'
                    }`}
                  >
                    {page}
                  </button>
                </React.Fragment>
              ))}
          </div>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border border-gray-200 hover:border-vermilion transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Share All Button */}
      {pageItems.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleShareAll}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:border-vermilion transition-all text-sm font-medium"
          >
            <Share2 size={16} className="text-vermilion" />
            {t.a2_galleryShareAll || 'Share All'}
          </button>
        </div>
      )}

      {/* Upload and edit */}
      {showAddModal && (
        <GalleryUploadModal
          t={t}
          onClose={() => setShowAddModal(false)}
          onUploaded={(newItem) => { setAllItems((prev) => [newItem, ...prev]); setShowAddModal(false); }}
        />
      )}
      {editItem && (
        <GalleryEditModal
          item={editItem}
          t={t}
          onClose={() => setEditItem(null)}
          onSaved={(saved) => {
            setAllItems((prev) => prev.map((it) => (it._id === saved._id ? { ...it, ...saved } : it)));
            setEditItem(null);
          }}
        />
      )}
    </div>
  );
};

export default AdminGallery;