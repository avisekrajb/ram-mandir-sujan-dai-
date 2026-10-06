import React, { createContext, useContext, useState, useCallback } from 'react';
import api from '../services/api';
import { useToast } from './ToastContext';

const BackupContext = createContext(null);

export const useBackup = () => {
  const context = useContext(BackupContext);
  if (!context) {
    throw new Error('useBackup must be used within BackupProvider');
  }
  return context;
};

export const BackupProvider = ({ children }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [backups, setBackups] = useState([]);
  const [progress, setProgress] = useState(0);
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Create a new backup
  const createBackup = useCallback(async (options = {}) => {
    setIsBackingUp(true);
    setProgress(0);
    setLoading(true);

    try {
      const response = await api.post('/admin/backup/create', {
        description: options.description || 'Auto backup',
        type: options.type || 'full',
        includeDeleted: options.includeDeleted !== false,
        sections: options.sections || [],
      });

      // Simulate progress
      let progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const result = response.data;
      
      clearInterval(progressInterval);
      setProgress(100);

      // Refresh backup list
      await fetchBackups();

      showToast('Backup created successfully!', 'success');
      return result;
    } catch (error) {
      console.error('Backup error:', error);
      showToast(error.response?.data?.message || 'Failed to create backup', 'error');
      throw error;
    } finally {
      setLoading(false);
      setIsBackingUp(false);
      setTimeout(() => setProgress(0), 2000);
    }
    // fetchBackups is declared below (listing it here would hit the TDZ); both it and showToast are stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch all backups
  const fetchBackups = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/backup');
      setBackups(response.data.data || []);
    } catch (error) {
      console.error('Fetch backups error:', error);
      showToast('Failed to load backups', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Download backup
  const downloadBackup = useCallback(async (backupId) => {
    setLoading(true);
    try {
      const response = await api.get(`/admin/backup/${backupId}/download`, {
        responseType: 'blob',
      });

      const contentType = response.headers['content-type'] || '';
      const isZip = contentType.includes('zip');
      const extension = isZip ? 'zip' : 'json';
      const filename = `backup-${new Date().toISOString().split('T')[0]}.${extension}`;

      const url = window.URL.createObjectURL(new Blob([response.data], { type: contentType }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Free the (potentially large) ZIP blob once the download has started.
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);

      showToast(isZip ? 'Backup ZIP (with media) downloaded' : 'Backup downloaded successfully', 'success');
    } catch (error) {
      console.error('Download error:', error);
      showToast('Failed to download backup', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Download from Cloudinary
  const downloadFromCloudinary = useCallback(async (backupId) => {
    setLoading(true);
    try {
      const response = await api.get(`/admin/backup/${backupId}/cloudinary`);
      const { fileUrl } = response.data;
      
      if (fileUrl) {
        window.open(fileUrl, '_blank');
        showToast('Opening backup file...', 'success');
      } else {
        showToast('No file available for download', 'warning');
      }
    } catch (error) {
      console.error('Cloudinary download error:', error);
      showToast('Failed to download from Cloudinary', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Restore from backup
  const restoreBackup = useCallback(async (backupId) => {
    if (!window.confirm('Are you sure you want to restore this backup? This will overwrite current data.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(`/admin/backup/${backupId}/restore`);
      showToast('Backup restored successfully!', 'success');
      return response.data;
    } catch (error) {
      console.error('Restore error:', error);
      showToast(error.response?.data?.message || 'Failed to restore backup', 'error');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Delete backup
  const deleteBackup = useCallback(async (backupId) => {
    if (!window.confirm('Delete this backup?')) return;

    setLoading(true);
    try {
      await api.delete(`/admin/backup/${backupId}`);
      setBackups(prev => prev.filter(b => b._id !== backupId));
      showToast('Backup deleted successfully', 'success');
    } catch (error) {
      console.error('Delete backup error:', error);
      showToast('Failed to delete backup', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Get backup stats
  const getBackupStats = useCallback(async () => {
    try {
      const response = await api.get('/admin/backup/stats');
      return response.data.data;
    } catch (error) {
      console.error('Get stats error:', error);
      return null;
    }
  }, []);

  // Auto backup (called periodically)
  const autoBackup = useCallback(async () => {
    try {
      await createBackup({ 
        description: 'Automatic 30-day backup', 
        type: 'auto',
        includeDeleted: true,
      });
    } catch (error) {
      console.error('Auto backup failed:', error);
    }
  }, [createBackup]);

  return (
    <BackupContext.Provider
      value={{
        loading,
        backups,
        progress,
        isBackingUp,
        createBackup,
        fetchBackups,
        downloadBackup,
        downloadFromCloudinary,
        restoreBackup,
        deleteBackup,
        getBackupStats,
        autoBackup,
      }}
    >
      {children}
    </BackupContext.Provider>
  );
};