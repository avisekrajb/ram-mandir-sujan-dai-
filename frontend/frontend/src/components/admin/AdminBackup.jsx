import React, { useState, useEffect } from 'react';
import { 
  Database, Download, Upload, Trash2, RefreshCw, 
  Cloud, Clock, Users, CalendarDays, Gift, BookOpen,
  Image, ScrollText, Users as UsersIcon, Mail,
  Activity, Loader2, CheckCircle, XCircle, FileText,
  HardDrive, Server, Archive, X,
  Settings2, Layers, Check
} from 'lucide-react';
import { useBackup } from '../../context/BackupContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatDate as formatLocaleDate } from '../../utils/formatDate';
import OmLoader from '../../components/common/OmLoader';

const SECTIONS = [
  { key: 'users', label: 'Users', tKey: 'a1_backupSecUsers', icon: UsersIcon },
  { key: 'bookings', label: 'Bookings', tKey: 'a1_backupSecBookings', icon: CalendarDays },
  { key: 'donations', label: 'Donations', tKey: 'a1_backupSecDonations', icon: Gift },
  { key: 'events', label: 'Events', tKey: 'navEvents', icon: CalendarDays },
  { key: 'gallery', label: 'Gallery', tKey: 'navGallery', icon: Image },
  { key: 'history', label: 'History', tKey: 'navHistory', icon: BookOpen },
  { key: 'team', label: 'Team', tKey: 'navTeam', icon: Users },
  { key: 'contacts', label: 'Contacts', tKey: 'a1_backupSecContacts', icon: Mail },
  { key: 'visitors', label: 'Visitors', tKey: 'a1_backupSecVisitors', icon: Activity },
  { key: 'blogs', label: 'Blogs', tKey: 'navBlogs', icon: ScrollText },
];

const AdminBackup = ({ t }) => {
  const { lang } = useLanguage();
  const {
    backups,
    loading,
    progress,
    isBackingUp,
    fetchBackups,
    createBackup,
    downloadBackup,
    downloadFromCloudinary,
    restoreBackup,
    deleteBackup,
    getBackupStats,
  } = useBackup();

  const [stats, setStats] = useState(null);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backupOptions, setBackupOptions] = useState({
    description: '',
    type: 'full',
    includeDeleted: true,
    sections: SECTIONS.map(s => s.key),
  });

  useEffect(() => {
    fetchBackups();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  const loadStats = async () => {
    const statsData = await getBackupStats();
    setStats(statsData);
  };

  const handleCreateBackup = async () => {
    setIsSubmitting(true);
    try {
      const options = {
        description: backupOptions.description || (backupOptions.type === 'partial' ? 'Partial system backup' : 'Full system backup'),
        type: backupOptions.type,
        includeDeleted: backupOptions.includeDeleted,
      };
      if (backupOptions.type === 'partial') {
        options.sections = backupOptions.sections;
      }
      await createBackup(options);
      setShowCreateModal(false);
      loadStats();
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSection = (key) => {
    setBackupOptions(prev => ({
      ...prev,
      sections: prev.sections.includes(key)
        ? prev.sections.filter(s => s !== key)
        : [...prev.sections, key],
    }));
  };

  const toggleAllSections = () => {
    setBackupOptions(prev => ({
      ...prev,
      sections: prev.sections.length === SECTIONS.length
        ? []
        : SECTIONS.map(s => s.key),
    }));
  };

  const formatDate = (dateString) => {
    return formatLocaleDate(dateString, lang, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      processing: 'bg-gray-100 text-gray-700 border-gray-200',
      completed: 'bg-green-100 text-green-700 border-green-200',
      failed: 'bg-red-100 text-red-700 border-red-200',
    };
    return colors[status] || colors.pending;
  };

  const statusLabels = {
    pending: t.statusPending || 'Pending',
    processing: t.a1_backupStatusProcessing || 'Processing',
    completed: t.statusCompleted || 'Completed',
    failed: t.a1_backupStatusFailed || 'Failed',
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'completed': return <CheckCircle size={14} className="text-green-500" />;
      case 'failed': return <XCircle size={14} className="text-red-500" />;
      case 'processing': return <Loader2 size={14} className="animate-spin text-gray-500" />;
      default: return <Clock size={14} className="text-yellow-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-ink flex items-center gap-2">
            <Database size={24} className="text-[#A80808]" />
            {t.a1_backupTitle || 'Backup & Restore'}
          </h2>
          <p className="text-sm text-ink-soft">{t.a1_backupSubtitle || 'Manage your data backups securely'}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={isBackingUp}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#A80808] text-white rounded-xl text-sm font-semibold hover:bg-[#660505] transition-all disabled:opacity-50"
          >
            {isBackingUp ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {t.a1_backupCreating || 'Creating Backup...'}
              </>
            ) : (
              <>
                <Cloud size={16} />
                {t.a1_backupCreate || 'Create Backup'}
              </>
            )}
          </button>
          <button
            onClick={() => { fetchBackups(); loadStats(); }}
            aria-label={t.a1_backupRefresh || 'Refresh'}
            className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
          >
            <RefreshCw size={18} className="text-ink-soft" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {isBackingUp && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-ink">{t.a1_backupProgress || 'Creating backup...'}</span>
            <span className="text-sm text-ink-soft">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#A80808] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Create Backup Options Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-[#A80808]/10 to-[#A80808]/5 px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10 bg-white/95 backdrop-blur-sm">
              <h3 className="text-lg font-serif font-bold text-[#A80808] flex items-center gap-2">
                <Settings2 size={18} />
                {t.a1_backupOptions || 'Backup Options'}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                aria-label={t.close || 'Close'}
                className="p-2 rounded-xl hover:bg-gray-100 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  {t.description || 'Description'}
                </label>
                <textarea
                  aria-label={t.description || 'Description'} value={backupOptions.description}
                  onChange={(e) => setBackupOptions(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t.a1_backupDescPlaceholder || 'e.g. Before Diwali event - full snapshot'}
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-ink focus:border-[#A80808] focus:ring-2 focus:ring-[#A80808]/20 outline-none transition-all resize-none"
                />
              </div>

              {/* Backup type */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  {t.a1_backupType || 'Backup Type'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBackupOptions(prev => ({ ...prev, type: 'full' }))}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      backupOptions.type === 'full'
                        ? 'border-[#A80808] bg-[#A80808]/5 ring-2 ring-[#A80808]/20'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Database size={16} className={backupOptions.type === 'full' ? 'text-[#A80808]' : 'text-gray-400'} />
                      <span className="text-sm font-semibold text-ink">{t.a1_backupFull || 'Full backup'}</span>
                      {backupOptions.type === 'full' && <Check size={14} className="text-[#A80808] ml-auto" />}
                    </div>
                    <p className="text-xs text-ink-soft">{t.a1_backupFullHint || 'Capture every data section in a single snapshot.'}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBackupOptions(prev => ({ ...prev, type: 'partial' }))}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      backupOptions.type === 'partial'
                        ? 'border-[#A80808] bg-[#A80808]/5 ring-2 ring-[#A80808]/20'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Layers size={16} className={backupOptions.type === 'partial' ? 'text-[#A80808]' : 'text-gray-400'} />
                      <span className="text-sm font-semibold text-ink">{t.a1_backupPartial || 'Partial backup'}</span>
                      {backupOptions.type === 'partial' && <Check size={14} className="text-[#A80808] ml-auto" />}
                    </div>
                    <p className="text-xs text-ink-soft">{t.a1_backupPartialHint || 'Choose only the data sections you need.'}</p>
                  </button>
                </div>
              </div>

              {/* Sections (partial only) */}
              {backupOptions.type === 'partial' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                      {t.a1_backupDataSections || 'Data Sections'}
                    </label>
                    <button
                      type="button"
                      onClick={toggleAllSections}
                      className="text-xs font-semibold text-[#A80808] hover:text-[#660505] transition-colors"
                    >
                      {backupOptions.sections.length === SECTIONS.length ? (t.a1_backupClearAll || 'Clear all') : (t.a1_backupSelectAll || 'Select all')}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {SECTIONS.map((section) => {
                      const Icon = section.icon;
                      const isSelected = backupOptions.sections.includes(section.key);
                      return (
                        <button
                          key={section.key}
                          type="button"
                          onClick={() => toggleSection(section.key)}
                          className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                            isSelected
                              ? 'border-[#A80808] bg-[#A80808]/5 text-[#A80808]'
                              : 'border-gray-200 text-ink-soft hover:border-gray-300'
                          }`}
                        >
                          <Icon size={15} />
                          <span className="truncate">{t[section.tKey] || section.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Include deleted */}
              <div>
                <button
                  type="button"
                  onClick={() => setBackupOptions(prev => ({ ...prev, includeDeleted: !prev.includeDeleted }))}
                  className="w-full flex items-center gap-3 rounded-xl border border-gray-200 p-4 text-left transition-all hover:border-gray-300"
                >
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${backupOptions.includeDeleted ? 'bg-[#A80808] border-[#A80808]' : 'border-gray-300'}`}>
                    {backupOptions.includeDeleted && <Check size={13} className="text-white" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink">{t.a1_backupIncludeDeleted || 'Include deleted items'}</p>
                    <p className="text-xs text-ink-soft">{t.a1_backupIncludeDeletedHint || 'Preserve recently deleted records (last 30 days)'}</p>
                  </div>
                </button>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                >
                  {t.cancel || 'Cancel'}
                </button>
                <button
                  onClick={handleCreateBackup}
                  disabled={isSubmitting || (backupOptions.type === 'partial' && backupOptions.sections.length === 0)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#A80808] text-white rounded-xl text-sm font-semibold hover:bg-[#660505] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {t.a1_backupCreatingShort || 'Creating...'}
                    </>
                  ) : (
                    <>
                      <Cloud size={16} />
                      {t.a1_backupCreate || 'Create Backup'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium">{t.a1_backupTotalBackups || 'Total Backups'}</p>
                <p className="text-2xl font-bold text-ink">{stats.total}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                <Archive size={18} className="text-brand-500" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium">{t.a1_backupTotalSize || 'Total Size'}</p>
                <p className="text-2xl font-bold text-ink">{formatFileSize(stats.totalSize)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                <HardDrive size={18} className="text-green-500" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium">{t.a1_backupLatest || 'Latest Backup'}</p>
                <p className="text-sm font-bold text-ink">
                  {stats.recent ? formatDate(stats.recent.createdAt) : (t.a1_backupNoBackups || 'No backups')}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                <Clock size={18} className="text-brand-500" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium">{t.a1_backupStorage || 'Storage'}</p>
                <p className="text-sm font-bold text-ink">Cloudinary</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <Cloud size={18} className="text-amber-500" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backups Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-[#A80808]/10 to-[#A80808]/5 border-b border-gray-100 flex items-center justify-between">
          <h4 className="text-sm font-serif font-semibold text-ink flex items-center gap-2">
            <Database size={16} className="text-[#A80808]" />
            {t.a1_backupHistory || 'Backup History'}
          </h4>
          <span className="text-xs text-ink-soft">{(t.a1_backupCount || '{count} backups').replace('{count}', backups.length)}</span>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <OmLoader size="md" color="maroon" />
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-12">
              <Database size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">{t.a1_backupEmpty || 'No backups created yet'}</p>
              <p className="text-sm text-gray-400 mt-1">{t.a1_backupEmptyHint || 'Click "Create Backup" to start'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-200">
                    <th className="pb-3 text-xs font-bold text-gray-500 uppercase tracking-wide">{t.a1_backupName || 'Name'}</th>
                    <th className="pb-3 text-xs font-bold text-gray-500 uppercase tracking-wide hidden md:table-cell">{t.a1_backupDate || 'Date'}</th>
                    <th className="pb-3 text-xs font-bold text-gray-500 uppercase tracking-wide hidden lg:table-cell">{t.a1_backupSize || 'Size'}</th>
                    <th className="pb-3 text-xs font-bold text-gray-500 uppercase tracking-wide hidden sm:table-cell">{t.status || 'Status'}</th>
                    <th className="pb-3 text-xs font-bold text-gray-500 uppercase tracking-wide text-right">{t.actions || 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((backup) => (
                    <tr key={backup._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3">
                        <div>
                          <p className="font-medium text-ink">{backup.name}</p>
                          <p className="text-xs text-ink-soft truncate max-w-[150px]">
                            {backup.description || t.a1_backupFull || 'Full backup'}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 hidden md:table-cell text-gray-500 text-xs">
                        {formatDate(backup.createdAt)}
                      </td>
                      <td className="py-3 hidden lg:table-cell text-gray-500 text-xs">
                        {formatFileSize(backup.fileSize)}
                      </td>
                      <td className="py-3 hidden sm:table-cell">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full border ${getStatusBadge(backup.status)}`}>
                          {getStatusIcon(backup.status)}
                          {statusLabels[backup.status] || backup.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => downloadBackup(backup._id)}
                            className="p-1.5 rounded-lg text-brand-400 hover:text-brand-600 hover:bg-brand-50 transition-all"
                            title={t.download || 'Download'}
                          >
                            <Download size={16} />
                          </button>
                          {backup.fileUrl && (
                            <button
                              onClick={() => downloadFromCloudinary(backup._id)}
                              className="p-1.5 rounded-lg text-amber-400 hover:text-amber-600 hover:bg-amber-50 transition-all"
                              title={t.a1_backupDownloadCloudinary || 'Download from Cloudinary'}
                            >
                              <Cloud size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedBackup(backup);
                              setShowDetailModal(true);
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#A80808] hover:bg-gray-50 transition-all"
                            title={t.a1_backupViewDetails || 'View Details'}
                          >
                            <FileText size={16} />
                          </button>
                          <button
                            onClick={() => restoreBackup(backup._id)}
                            className="p-1.5 rounded-lg text-green-500 hover:text-green-700 hover:bg-green-50 transition-all"
                            title={t.a1_backupRestore || 'Restore'}
                          >
                            <Upload size={16} />
                          </button>
                          <button
                            onClick={() => deleteBackup(backup._id)}
                            className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
                            title={t.delete || 'Delete'}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Backup Detail Modal */}
      {showDetailModal && selectedBackup && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-[#A80808]/10 to-[#A80808]/5 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-serif font-bold text-[#A80808] flex items-center gap-2">
                <Database size={18} />
                {t.a1_backupDetails || 'Backup Details'}
              </h3>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedBackup(null);
                }}
                aria-label={t.close || 'Close'}
                className="p-2 rounded-xl hover:bg-gray-100 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 font-medium">{t.a1_backupName || 'Name'}</p>
                  <p className="font-semibold text-ink">{selectedBackup.name}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 font-medium">{t.a1_backupCreated || 'Created'}</p>
                  <p className="font-semibold text-ink">{formatDate(selectedBackup.createdAt)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 font-medium">{t.status || 'Status'}</p>
                  <p className={`font-semibold capitalize ${selectedBackup.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}`}>
                    {statusLabels[selectedBackup.status] || selectedBackup.status}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 font-medium">{t.a1_backupSize || 'Size'}</p>
                  <p className="font-semibold text-ink">{formatFileSize(selectedBackup.fileSize)}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 font-medium">{t.description || 'Description'}</p>
                <p className="text-ink">{selectedBackup.description || t.a1_backupNoDescription || 'No description'}</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 font-medium">{t.a1_backupStatistics || 'Statistics'}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                  {selectedBackup.stats && Object.entries(selectedBackup.stats).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-xs text-ink-soft capitalize">{key}:</span>
                      <span className="text-xs font-bold text-ink">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 font-medium">{t.a1_backupStorage || 'Storage'}</p>
                <div className="flex items-center gap-2 mt-1">
                  {selectedBackup.fileUrl ? (
                    <>
                      <Cloud size={14} className="text-amber-500" />
                      <span className="text-sm text-ink">{t.a1_backupStoredCloudinary || 'Stored in Cloudinary'}</span>
                      <a 
                        href={selectedBackup.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-brand-500 hover:underline ml-auto"
                      >
                        {t.a1_backupView || 'View'}
                      </a>
                    </>
                  ) : (
                    <>
                      <Server size={14} className="text-gray-400" />
                      <span className="text-sm text-ink-soft">{t.a1_backupStoredDb || 'Stored in database'}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedBackup(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                >
                  {t.close || 'Close'}
                </button>
                <button
                  onClick={() => {
                    downloadBackup(selectedBackup._id);
                    setShowDetailModal(false);
                    setSelectedBackup(null);
                  }}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#A80808] text-white rounded-xl text-sm font-semibold hover:bg-[#660505] transition-all"
                >
                  <Download size={16} />
                  {t.download || 'Download'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBackup;