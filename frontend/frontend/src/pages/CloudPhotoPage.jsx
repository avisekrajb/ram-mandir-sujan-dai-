import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { formatDate as formatLocaleDate } from '../utils/formatDate';
import OmLoader from '../components/common/OmLoader';
import {
  Image, Video, Search, X, Download, Trash2, 
  FolderOpen, File, HardDrive,
  ChevronLeft, ChevronRight, RefreshCw,
  CheckSquare, Square, Loader2,
  Grid, List, Eye, AlertCircle
} from 'lucide-react';

const CloudPhotoPage = () => {
  const { t, lang } = useLanguage();
  const { showToast } = useToast();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [, setNextCursor] = useState(null);
  const [, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [error, setError] = useState(null);
  const [deletingIds, setDeletingIds] = useState([]);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 24;

  const fetched = useRef(false);

  // Helper to get the correct resource type from Cloudinary URL or ID
  const getResourceType = (resource) => {
    if (!resource) return 'image';
    
    // Check if it's a video based on type property
    if (resource.type === 'video') return 'video';
    
    // Check based on format
    if (resource.format) {
      const videoFormats = ['mp4', 'mov', 'avi', 'webm', 'mkv'];
      if (videoFormats.includes(resource.format.toLowerCase())) {
        return 'video';
      }
    }
    
    // Check based on URL
    if (resource.url) {
      const url = resource.url.toLowerCase();
      if (url.includes('/video/') || url.includes('.mp4') || url.includes('.mov')) {
        return 'video';
      }
    }
    
    return 'image';
  };

  const fetchResources = useCallback(async (cursor = null, search = '', type = 'all') => {
    setLoading(true);
    setError(null);
    try {
      let url = `/admin/cloud/resources?maxResults=50`;
      if (cursor) url += `&nextCursor=${cursor}`;
      if (type !== 'all') url += `&type=${type}`;
      
      const response = await api.get(url);
      
      if (response.data.success) {
        setResources(prev => cursor ? [...prev, ...response.data.resources] : response.data.resources);
        setNextCursor(response.data.nextCursor);
        setHasMore(response.data.hasMore);
        setTotalCount(response.data.total);
        setCurrentPage(prev => cursor ? prev : 1);
        
        if (response.data.message) {
          showToast(response.data.message, 'warning');
        }
      } else {
        setError(response.data.message || t.a1_cloudFetchFailed || 'Failed to fetch resources');
        showToast(response.data.message || t.a1_cloudFetchFailed || 'Failed to fetch resources', 'error');
        setResources([]);
      }
    } catch (error) {
      console.error('Fetch resources error:', error);
      setError(error.response?.data?.message || t.a1_cloudFetchFailed || 'Failed to fetch resources');
      showToast(error.response?.data?.message || t.a1_cloudFetchFailed || 'Failed to fetch resources', 'error');
      setResources([]);
    } finally {
      setLoading(false);
    }
  }, [showToast, t]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/admin/cloud/stats');
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Fetch stats error:', error);
      setStats({
        totalResources: 0,
        totalImages: 0,
        totalVideos: 0,
        totalSizeMB: 0,
        totalSizeGB: 0,
      });
    }
  }, []);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    fetchResources();
    fetchStats();
  }, [fetchResources, fetchStats]);

  // Refresh when forceRefresh changes
  useEffect(() => {
    if (forceRefresh > 0) {
      fetchResources();
      fetchStats();
    }
  }, [forceRefresh, fetchResources, fetchStats]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setLoading(true);
      setError(null);
      setCurrentPage(1);
      api.get(`/admin/cloud/search?q=${encodeURIComponent(searchQuery)}&type=${filterType}`)
        .then(response => {
          if (response.data.success) {
            setResources(response.data.resources || []);
            setTotalCount(response.data.total || 0);
            setHasMore(false);
            setNextCursor(null);
            if (response.data.message) {
              showToast(response.data.message, 'warning');
            }
          }
        })
        .catch(error => {
          console.error('Search error:', error);
          showToast(t.a1_cloudSearchFailed || 'Search failed', 'error');
          setResources([]);
        })
        .finally(() => setLoading(false));
    } else {
      fetchResources();
    }
  };

  const handleFilterChange = (type) => {
    setFilterType(type);
    setResources([]);
    setSelectedIds([]);
    setCurrentPage(1);
    fetchResources(null, '', type);
  };

  // Numbered pagination
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
  const getPageNumbers = () => {
    if (totalPages <= 7) return pageNumbers;
    const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
    return [...pages].filter(p => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  };
  const displayResources = resources.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const goToPage = (page) => {
    const target = Math.min(Math.max(1, page), totalPages);
    setCurrentPage(target);
    const el = document.getElementById('cloud-resources-top');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === resources.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(resources.map(r => r.id));
    }
  };

  const handleDeleteSingle = async (id) => {
    // Check if already deleting
    if (deletingIds.includes(id)) return;

    if (!window.confirm(t.a1_cloudDeleteConfirm || 'Delete this resource? This action cannot be undone.')) {
      return;
    }

    setDeletingIds(prev => [...prev, id]);
    try {
      const resource = resources.find(r => r.id === id);
      
      // IMPORTANT FIX: Use the ID directly from the resource
      // The backend expects the full public_id including any folders
      const publicId = resource.id; // Use the full ID from the resource
      const type = getResourceType(resource);
      
      console.log(`🗑️ Attempting to delete: ${publicId} (${type})`);
      console.log(`🔗 DELETE /admin/cloud/resource/${encodeURIComponent(publicId)}?resourceType=${type}`);
      
      // CORRECT: Use the ID in the URL path
      const response = await api.delete(`/admin/cloud/resource/${encodeURIComponent(publicId)}`, {
        params: { resourceType: type }
      });
      
      if (response.data.success) {
        showToast(`✅ ${t.a1_cloudDeleted || 'Resource deleted successfully from Cloudinary'}`, 'success');
        // Remove from local state immediately
        setResources(prev => prev.filter(r => r.id !== id));
        setSelectedIds(prev => prev.filter(i => i !== id));
        // Force refresh to update the list
        setTimeout(() => {
          setForceRefresh(prev => prev + 1);
        }, 500);
        fetchStats();
      } else {
        showToast(response.data.message || t.a1_cloudDeleteFailed || 'Failed to delete resource', 'error');
      }
    } catch (deleteError) {
      console.error('Delete error:', deleteError);
      console.error('Error response:', deleteError.response);
      
      // Check if resource was not found (404)
      if (deleteError.response?.status === 404) {
        showToast(`⚠️ ${t.a1_cloudNotFound || 'Resource not found in Cloudinary - removing from list'}`, 'warning');
        // Remove from local state anyway
        setResources(prev => prev.filter(r => r.id !== id));
        setSelectedIds(prev => prev.filter(i => i !== id));
        // Force refresh
        setTimeout(() => {
          setForceRefresh(prev => prev + 1);
        }, 500);
        fetchStats();
      } else {
        const errorMsg = deleteError.response?.data?.message || t.a1_cloudDeleteFailed || 'Failed to delete resource';
        showToast(`❌ ${errorMsg}`, 'error');
      }
    } finally {
      setDeletingIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      showToast(t.a1_cloudSelectToDelete || 'Please select resources to delete', 'warning');
      return;
    }

    if (!window.confirm((t.a1_cloudDeleteManyConfirm || 'Are you sure you want to delete {count} resources? This action cannot be undone.').replace('{count}', selectedIds.length))) {
      return;
    }

    setDeleteLoading(true);
    try {
      // IMPORTANT FIX: Use the full IDs from the resources
      const resourcesToDelete = resources.filter(r => selectedIds.includes(r.id));
      const publicIds = resourcesToDelete.map(r => r.id).filter(Boolean);
      
      console.log(`🗑️ Bulk deleting: ${publicIds.length} resources`);
      console.log('Public IDs:', publicIds);
      
      const response = await api.post('/admin/cloud/resources/delete', {
        publicIds: publicIds,
        resourceType: 'all',
      });
      
      if (response.data.success) {
        const successCount = response.data.successCount || 0;
        const notFoundCount = response.data.notFoundCount || 0;
        const failedCount = response.data.failedCount || 0;
        
        let message = `✅ ${(t.a1_cloudDeletedCount || 'Deleted {count} resources successfully').replace('{count}', successCount)}`;
        if (notFoundCount > 0) {
          message += `, ${(t.a1_cloudNotFoundCount || '{count} not found (removed from list)').replace('{count}', notFoundCount)}`;
        }
        if (failedCount > 0) {
          message += `, ${(t.a1_cloudFailedCount || '{count} failed').replace('{count}', failedCount)}`;
        }
        showToast(message, successCount > 0 ? 'success' : 'warning');
        
        // Remove deleted resources from state
        const deletedIds = response.data.results
          .filter(r => r.success || r.notFound)
          .map(r => r.publicId);
        
        setResources(prev => prev.filter(r => !deletedIds.includes(r.id)));
        setSelectedIds([]);
        // Force refresh
        setTimeout(() => {
          setForceRefresh(prev => prev + 1);
        }, 500);
        fetchStats();
      } else {
        showToast(response.data.message || t.a1_cloudDeleteManyFailed || 'Failed to delete resources', 'error');
      }
    } catch (error) {
      console.error('Delete selected error:', error);
      const errorMsg = error.response?.data?.message || t.a1_cloudDeleteManyFailed || 'Failed to delete resources';
      showToast(`❌ ${errorMsg}`, 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDownload = (url, filename) => {
    if (!url) {
      showToast(t.a1_cloudNoUrl || 'No URL available for download', 'error');
      return;
    }
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'download';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewDetail = (resource) => {
    setSelectedResource(resource);
    setShowDetailModal(true);
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return t.a1_cloudNA || 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return t.a1_cloudNA || 'N/A';
      return formatLocaleDate(date, lang, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return t.a1_cloudNA || 'N/A';
    }
  };

  const getFileType = (resource) => {
    if (!resource) return 'other';
    if (resource.type === 'video') return 'video';
    if (resource.format === 'svg') return 'svg';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(resource.format?.toLowerCase())) {
      return 'image';
    }
    return 'other';
  };

  const getFileIcon = (resource) => {
    const type = getFileType(resource);
    if (type === 'video') return <Video size={24} className="text-brand-500" />;
    if (type === 'svg') return <File size={24} className="text-brand-500" />;
    if (type === 'image') return <Image size={24} className="text-green-500" />;
    return <File size={24} className="text-gray-500" />;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div id="cloud-resources-top" className="scroll-mt-4" />
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-serif font-bold text-ink">{t.a1_cloudTitle || 'Cloud Storage Manager'}</h1>
          <p className="text-sm text-ink-soft">{t.a1_cloudSubtitle || 'Manage all photos and videos stored in Cloudinary'}</p>
        </div>
        <button
          onClick={() => { 
            setForceRefresh(prev => prev + 1);
            showToast(`🔄 ${t.a1_cloudRefreshing || 'Refreshing...'}`, 'info');
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-vermilion text-white font-semibold text-sm hover:bg-[#820606] transition-all"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {t.a1_cloudRefresh || 'Refresh'}
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center">
                <FolderOpen size={20} />
              </div>
              <div>
                <div className="text-xl font-bold">{stats.totalResources || 0}</div>
                <div className="text-xs text-ink-soft">{t.a1_cloudTotalFiles || 'Total Files'}</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 text-green-500 flex items-center justify-center">
                <Image size={20} />
              </div>
              <div>
                <div className="text-xl font-bold">{stats.totalImages || 0}</div>
                <div className="text-xs text-ink-soft">{t.a1_cloudImages || 'Images'}</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center">
                <Video size={20} />
              </div>
              <div>
                <div className="text-xl font-bold">{stats.totalVideos || 0}</div>
                <div className="text-xs text-ink-soft">{t.a1_cloudVideos || 'Videos'}</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center">
                <HardDrive size={20} />
              </div>
              <div>
                <div className="text-xl font-bold">{stats.totalSizeGB || 0} GB</div>
                <div className="text-xs text-ink-soft">{t.a1_cloudTotalSize || 'Total Size'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              aria-label={t.a1_cloudSearch || 'Search'} value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={t.a1_cloudSearchPlaceholder || 'Search by filename...'}
              className="w-full px-4 py-2.5 pl-10 border border-gray-200 rounded-xl focus:border-vermilion focus:outline-none transition-colors text-sm"
            />
            <Search size={18} className="absolute left-3 top-3 text-ink-soft" />
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2.5 rounded-xl bg-vermilion text-white font-semibold text-sm hover:bg-[#820606] transition-all"
          >
            {t.a1_cloudSearch || 'Search'}
          </button>
        </div>

        <div className="flex gap-2">
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => handleFilterChange('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                filterType === 'all' ? 'bg-white text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {t.a1_cloudAll || 'All'}
            </button>
            <button
              onClick={() => handleFilterChange('image')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                filterType === 'image' ? 'bg-white text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {t.a1_cloudImages || 'Images'}
            </button>
            <button
              onClick={() => handleFilterChange('video')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                filterType === 'video' ? 'bg-white text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {t.a1_cloudVideos || 'Videos'}
            </button>
          </div>

          <div className="flex bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              aria-label={t.a1_cloudGridView || 'Grid view'}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'grid' ? 'bg-white text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
              }`}
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              aria-label={t.a1_cloudListView || 'List view'}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'list' ? 'bg-white text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
              }`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-600">
          <AlertCircle size={20} />
          <span className="text-sm font-medium">{error}</span>
          <button
            onClick={() => setError(null)}
            aria-label={t.a1_cloudDismissError || 'Dismiss error'}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Selection Actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
          <span className="text-sm font-medium">{(t.a1_cloudSelectedCount || '{count} selected').replace('{count}', selectedIds.length)}</span>
          <button
            onClick={handleSelectAll}
            className="text-sm text-ink-soft hover:text-ink transition-colors"
          >
            {selectedIds.length === resources.length ? (t.a1_cloudDeselectAll || 'Deselect All') : (t.a1_cloudSelectAll || 'Select All')}
          </button>
          <div className="flex-1" />
          <button
            onClick={handleDeleteSelected}
            disabled={deleteLoading}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all disabled:opacity-50 text-sm font-semibold"
          >
            {deleteLoading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            {t.a1_cloudDeleteSelected || 'Delete Selected'}
          </button>
        </div>
      )}

      {/* Resources Grid */}
      {loading && resources.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <OmLoader size="lg" color="vermilion" />
        </div>
      ) : resources.length === 0 ? (
        <div className="text-center py-20">
          <FolderOpen size={64} className="mx-auto text-ink-soft/30 mb-4" />
          <p className="text-ink-soft">{t.a1_cloudNoResources || 'No resources found'}</p>
          <p className="text-sm text-mute mt-2">{t.a1_cloudUploadHint || 'Upload some files to get started'}</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {displayResources.map((resource) => {
            const isSelected = selectedIds.includes(resource.id);
            const isVideo = resource.type === 'video';
            const isDeleting = deletingIds.includes(resource.id);
            
            return (
              <div
                key={resource.id || Math.random()}
                className={`group relative bg-white rounded-xl overflow-hidden shadow-sm border-2 transition-all ${
                  isSelected ? 'border-vermilion shadow-md' : 'border-gray-100 hover:border-gray-200'
                } ${isDeleting ? 'opacity-50' : ''}`}
              >
                {/* Thumbnail */}
                <div 
                  className="aspect-square bg-gray-100 cursor-pointer relative"
                  onClick={() => handleViewDetail(resource)}
                >
                  {resource.url ? (
                    isVideo ? (
                      <video
                        src={resource.url}
                        className="w-full h-full object-cover"
                        muted
                      />
                    ) : (
                      <img
                        src={resource.url}
                        alt={resource.filename || t.a1_cloudResource || 'Resource'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-ink-soft/30">
                      <Image size={32} />
                    </div>
                  )}
                  {isVideo && (
                    <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
                      <Video size={12} /> {t.a1_cloudVideo || 'Video'}
                    </div>
                  )}
                  {isDeleting && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 size={24} className="animate-spin text-white" />
                    </div>
                  )}
                </div>

                {/* Selection checkbox */}
                <button
                  onClick={() => handleSelect(resource.id)}
                  aria-label={isSelected ? (t.a1_cloudDeselect || 'Deselect') : (t.a1_cloudSelect || 'Select')}
                  className="absolute top-2 left-2 p-1 rounded-lg bg-white/90 hover:bg-white transition-all shadow-sm"
                  disabled={isDeleting}
                >
                  {isSelected ? (
                    <CheckSquare size={18} className="text-vermilion" />
                  ) : (
                    <Square size={18} className="text-mute" />
                  )}
                </button>

                {/* Actions overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => handleViewDetail(resource)}
                    aria-label={t.a1_cloudViewDetails || 'View details'}
                    className="p-2 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-all"
                    disabled={isDeleting}
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    onClick={() => handleDownload(resource.url, resource.filename)}
                    aria-label={t.download || 'Download'}
                    className="p-2 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-all"
                    disabled={isDeleting}
                  >
                    <Download size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteSingle(resource.id)}
                    aria-label={t.delete || 'Delete'}
                    className="p-2 rounded-lg bg-red-500/70 text-white hover:bg-red-500 transition-all"
                    disabled={isDeleting}
                  >
                    {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                  </button>
                </div>

                {/* Info footer */}
                <div className="p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-ink-soft truncate flex-1" title={resource.filename || t.a1_cloudUnknown || 'Unknown'}>
                      {resource.filename || t.a1_cloudUnknown || 'Unknown'}
                    </span>
                    <span className="text-xs text-mute whitespace-nowrap ml-1">
                      {formatFileSize(resource.size)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-bold text-ink-soft uppercase tracking-wide w-10">
                  <button onClick={handleSelectAll} aria-label={selectedIds.length === resources.length ? (t.a1_cloudDeselectAll || 'Deselect All') : (t.a1_cloudSelectAll || 'Select All')}>
                    {selectedIds.length === resources.length ? (
                      <CheckSquare size={18} className="text-vermilion" />
                    ) : (
                      <Square size={18} className="text-mute" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-ink-soft uppercase tracking-wide">{t.a1_cloudFile || 'File'}</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-ink-soft uppercase tracking-wide hidden md:table-cell">{t.a1_cloudType || 'Type'}</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-ink-soft uppercase tracking-wide hidden lg:table-cell">{t.a1_cloudSize || 'Size'}</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-ink-soft uppercase tracking-wide hidden xl:table-cell">{t.a1_cloudDate || 'Date'}</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-ink-soft uppercase tracking-wide">{t.actions || 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {displayResources.map((resource) => {
                const isSelected = selectedIds.includes(resource.id);
                const isVideo = resource.type === 'video';
                const isDeleting = deletingIds.includes(resource.id);
                
                return (
                  <tr key={resource.id || Math.random()} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${isDeleting ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <button onClick={() => handleSelect(resource.id)} disabled={isDeleting} aria-label={isSelected ? (t.a1_cloudDeselect || 'Deselect') : (t.a1_cloudSelect || 'Select')}>
                        {isSelected ? (
                          <CheckSquare size={18} className="text-vermilion" />
                        ) : (
                          <Square size={18} className="text-mute" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {getFileIcon(resource)}
                        <div>
                          <div className="font-medium text-ink truncate max-w-[150px] md:max-w-[200px]">
                            {resource.filename || t.a1_cloudUnknown || 'Unknown'}
                          </div>
                          <div className="text-xs text-ink-soft md:hidden">
                            {formatFileSize(resource.size)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
                        isVideo ? 'bg-brand-50 text-brand-600' : 'bg-green-50 text-green-600'
                      }`}>
                        {isVideo ? <Video size={12} /> : <Image size={12} />}
                        {isVideo ? (t.a1_cloudVideo || 'Video') : (t.a1_cloudImage || 'Image')}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-ink-soft">
                      {formatFileSize(resource.size)}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell text-ink-soft text-xs">
                      {formatDate(resource.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleViewDetail(resource)}
                          aria-label={t.a1_cloudViewDetails || 'View details'}
                          className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                          disabled={isDeleting}
                        >
                          <Eye size={16} className="text-ink-soft" />
                        </button>
                        <button
                          onClick={() => handleDownload(resource.url, resource.filename)}
                          aria-label={t.download || 'Download'}
                          className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                          disabled={isDeleting}
                        >
                          <Download size={16} className="text-ink-soft" />
                        </button>
                        <button
                          onClick={() => handleDeleteSingle(resource.id)}
                          aria-label={t.delete || 'Delete'}
                          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          disabled={isDeleting}
                        >
                          {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} className="text-red-400 hover:text-red-600" />}
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

      {/* Pagination */}
      {resources.length > 0 && totalPages > 1 && (
        <div className="flex flex-col items-center justify-center gap-3 mt-8">
          <div className="flex items-center gap-1 flex-wrap justify-center">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-ink-soft hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              aria-label={t.a1_cloudPrevPage || 'Previous page'}
            >
              <ChevronLeft size={16} />
              {t.a1_cloudPrev || 'Prev'}
            </button>

            {getPageNumbers().map((page, idx, arr) => (
              <React.Fragment key={page}>
                {idx > 0 && page - arr[idx - 1] > 1 && (
                  <span className="px-1 text-mute">…</span>
                )}
                <button
                  onClick={() => goToPage(page)}
                  className={`min-w-[40px] px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    currentPage === page
                      ? 'bg-vermilion text-white shadow-md shadow-black/10'
                      : 'border border-gray-200 text-ink-soft hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              </React.Fragment>
            ))}

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-ink-soft hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              aria-label={t.a1_cloudNextPage || 'Next page'}
            >
              {t.a1_cloudNext || 'Next'}
              <ChevronRight size={16} />
            </button>
          </div>
          <p className="text-xs text-ink-soft">
            {(t.a1_cloudPageInfo || 'Page {page} of {pages} · {shown} of {total} resources')
              .replace('{page}', currentPage)
              .replace('{pages}', totalPages)
              .replace('{shown}', resources.length)
              .replace('{total}', totalCount)}
          </p>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedResource && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
              <h3 className="text-lg font-serif font-semibold">{t.a1_cloudFileDetails || 'File Details'}</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                aria-label={t.close || 'Close'}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {/* Preview */}
              <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden mb-4">
                {selectedResource.type === 'video' ? (
                  selectedResource.url ? (
                    <video
                      src={selectedResource.url}
                      className="w-full h-full object-cover"
                      controls
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-ink-soft/30">
                      <Video size={48} />
                    </div>
                  )
                ) : (
                  selectedResource.url ? (
                    <img
                      src={selectedResource.url}
                      alt={selectedResource.filename || t.a1_cloudResource || 'Resource'}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-ink-soft/30">
                      <Image size={48} />
                    </div>
                  )
                )}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-bold text-ink-soft uppercase tracking-wide">{t.a1_cloudFilename || 'Filename'}</label>
                    <p className="text-sm font-medium break-all">{selectedResource.filename || t.a1_cloudUnknown || 'Unknown'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-ink-soft uppercase tracking-wide">{t.a1_cloudType || 'Type'}</label>
                    <p className="text-sm font-medium capitalize">{selectedResource.type === 'video' ? (t.a1_cloudVideo || 'Video') : selectedResource.type === 'image' ? (t.a1_cloudImage || 'Image') : (selectedResource.type || t.a1_cloudUnknown || 'Unknown')}</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-ink-soft uppercase tracking-wide">{t.a1_cloudFormat || 'Format'}</label>
                    <p className="text-sm font-medium uppercase">{selectedResource.format || t.a1_cloudUnknown || 'Unknown'}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-bold text-ink-soft uppercase tracking-wide">{t.a1_cloudSize || 'Size'}</label>
                    <p className="text-sm font-medium">{formatFileSize(selectedResource.size)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-ink-soft uppercase tracking-wide">{t.a1_cloudDimensions || 'Dimensions'}</label>
                    <p className="text-sm font-medium">{selectedResource.width || 0} × {selectedResource.height || 0} px</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-ink-soft uppercase tracking-wide">{t.a1_cloudUploaded || 'Uploaded'}</label>
                    <p className="text-sm font-medium">{formatDate(selectedResource.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleDownload(selectedResource.url, selectedResource.filename)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-vermilion text-white font-semibold text-sm hover:bg-[#820606] transition-all"
                >
                  <Download size={16} />
                  {t.download || 'Download'}
                </button>
                <button
                  onClick={() => {
                    handleDeleteSingle(selectedResource.id);
                    setShowDetailModal(false);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-red-500 font-semibold text-sm hover:bg-red-100 transition-all"
                >
                  <Trash2 size={16} />
                  {t.delete || 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CloudPhotoPage;