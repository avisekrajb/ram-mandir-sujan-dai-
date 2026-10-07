import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Check, X, Calendar, Tag, FileText,
  ChevronDown, ChevronUp, Plus, Trash2, Edit2,
  Eye, EyeOff, Settings, CalendarDays, AlertCircle,
    Search, Save, Printer,
  Image, Upload, Trash
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { handleImageError } from '../../utils/imageFallback';
import { formatDateTime } from '../../utils/formatDate';
import api from '../../services/api';
import DownloadMenu from './DownloadMenu';
import { PrintBooking, PrintRecordList } from './PrintRecords';

// Localized text helper: reads a { en, ne, hi, zh, ta } object
const getLocalizedValue = (obj, lang) => {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[lang] || obj.en || '';
};

/**
 * Column definitions shared by the CSV export and the "print all" sheet, so the
 * downloaded file and the printed page always line up.
 */
const BOOKING_CSV_COLUMNS = (t) => [
  { key: 'reference', label: t?.bookingReference || 'Reference No.', value: (b) => `BKG-${String(b._id || '').slice(-8).toUpperCase()}` },
  { key: 'name', label: t?.fullName || 'Full Name' },
  { key: 'phone', label: t?.phoneNumber || 'Phone', mono: true },
  { key: 'email', label: t?.yourEmail || 'Email' },
  { key: 'type', label: t?.pujaType || 'Puja Type' },
  { key: 'date', label: t?.pujaDate || 'Puja Date', value: (b) => b.date || '' },
  { key: 'status', label: t?.status || 'Status' },
  {
    key: 'description',
    label: t?.specialInstruction || 'Instruction',
    value: (b) => b.description || '',
  },
  {
    key: 'createdAt',
    label: t?.bookedOn || 'Booked On',
    value: (b) => formatDateTime(b.createdAt),
  },
];


const AdminBookings = ({ bookings, setBookings, t }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sortBy, setSortBy] = useState('newest');

  // Row selection for bulk delete
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleting, setDeleting] = useState(false);
  
  const [pujaTypes, setPujaTypes] = useState([]);
  const [newPujaType, setNewPujaType] = useState('');
  const [editingPujaType, setEditingPujaType] = useState(null);
  const [showPujaModal, setShowPujaModal] = useState(false);
  
  const [dateLimits, setDateLimits] = useState({});
  const [newDateLimit, setNewDateLimit] = useState({ date: '', limit: 10 });
  
  const [bookingAvailable, setBookingAvailable] = useState(true);
  const [availabilityMessage, setAvailabilityMessage] = useState('');
  const [savingMessage, setSavingMessage] = useState(false);

  // Booking page content ("पूजा तथा धार्मिक कार्यक्रम बुकिङ")
  const [bookingContent, setBookingContent] = useState([]);
  const [contentLang, setContentLang] = useState('ne');
  const [savingContent, setSavingContent] = useState(false);
  /*
   * Which content section's editor is open.
   *
   * Every section used to render its full editor at once - four paragraph
   * boxes plus a bullet list per section - so the panel became a wall of forms
   * that was slow to scan. Now the table shows one summary line per section and
   * only the expanded row reveals its editor.
   */
  const [expandedSection, setExpandedSection] = useState(null);
  
  // Background Photo State
  const [bookingBgPhoto, setBookingBgPhoto] = useState('/4.jpg');
  const [uploadingBg, setUploadingBg] = useState(false);
  const fileInputRef = useRef(null);
  const [previewImages, setPreviewImages] = useState([]);

  // Printing: a single booking, or every row currently visible after filtering
  const [printBooking, setPrintBooking] = useState(null);
  const [printAllBookings, setPrintAllBookings] = useState(false);

  const statusColors = {
    pending: '#F59E0B',
    confirmed: '#10B981',
    completed: '#7A7171', // neutral: finished, needs no action
    cancelled: '#EF4444',
  };

  const statusBadgeClasses = {
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    confirmed: 'bg-green-50 text-green-700 border-green-200',
    completed: 'bg-gray-50 text-gray-700 border-gray-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/admin/settings');
        const settings = response.data;
        if (settings?.pujaTypes) {
          setPujaTypes(settings.pujaTypes);
        } else {
          setPujaTypes(['Ram Puja', 'Satyanarayan Puja', 'Griha Pravesh Puja', 'Birthday Puja', 'General Darshan Booking']);
        }
        if (settings?.dateLimits) {
          setDateLimits(settings.dateLimits);
        }
        if (settings?.bookingAvailable !== undefined) {
          setBookingAvailable(settings.bookingAvailable);
        }
        if (settings?.availabilityMessage) {
          setAvailabilityMessage(settings.availabilityMessage);
        } else {
          setAvailabilityMessage('Bookings are currently unavailable. Please check back later.');
        }
        if (settings?.bookingBgPhoto) {
          setBookingBgPhoto(settings.bookingBgPhoto);
        }
        if (Array.isArray(settings?.bookingContent)) {
          setBookingContent(settings.bookingContent);
        }
        // Initialize preview images with the current photo
        if (settings?.bookingBgPhoto && settings.bookingBgPhoto !== '/4.jpg') {
          setPreviewImages([settings.bookingBgPhoto]);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        setPujaTypes(['Ram Puja', 'Satyanarayan Puja', 'Griha Pravesh Puja', 'Birthday Puja', 'General Darshan Booking']);
        setAvailabilityMessage('Bookings are currently unavailable. Please check back later.');
      }
    };
    fetchSettings();
  }, []);

  // Handle Background Photo Upload
  const handleBgPhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast(t?.a1_bookImageOnly || 'Please upload an image file', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast(t?.a1_bookImageTooLarge || 'Image must be less than 5MB', 'error');
      return;
    }

    setUploadingBg(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await api.post('/admin/upload/booking-bg', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setBookingBgPhoto(response.data.url);
      await api.put('/admin/settings', { bookingBgPhoto: response.data.url });
      // Add to preview images
      setPreviewImages(prev => [...prev, response.data.url]);
      showToast(t?.a1_bookBgUploaded || 'Background photo uploaded successfully', 'success');
    } catch (error) {
      console.error('Upload error:', error);
      showToast(error.response?.data?.message || t?.a1_bookUploadFailed || 'Upload failed', 'error');
    } finally {
      setUploadingBg(false);
    }
    e.target.value = '';
  };

  // Remove Background Photo
  const handleRemoveBgPhoto = async (imageToRemove) => {
    if (!window.confirm(t?.a1_bookRemoveBgConfirm || 'Remove this background photo?')) return;
    setUploadingBg(true);
    try {
      // If removing the current active photo
      if (imageToRemove === bookingBgPhoto) {
        setBookingBgPhoto('/4.jpg');
        await api.put('/admin/settings', { bookingBgPhoto: '/4.jpg' });
      }
      // Remove from preview list
      setPreviewImages(prev => prev.filter(img => img !== imageToRemove));
      showToast(t?.a1_bookPhotoRemoved || 'Photo removed', 'success');
    } catch (error) {
      console.error('Error removing photo:', error);
      showToast(t?.a1_bookPhotoRemoveFailed || 'Failed to remove photo', 'error');
    } finally {
      setUploadingBg(false);
    }
  };

  // Set as active background
  const handleSetAsActive = async (imageUrl) => {
    setUploadingBg(true);
    try {
      setBookingBgPhoto(imageUrl);
      await api.put('/admin/settings', { bookingBgPhoto: imageUrl });
      showToast(t?.a1_bookBgUpdated || 'Background photo updated', 'success');
    } catch (error) {
      console.error('Error setting active photo:', error);
      showToast(t?.a1_bookBgUpdateFailed || 'Failed to update background', 'error');
    } finally {
      setUploadingBg(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    setLoading(true);
    try {
      await api.put(`/admin/bookings/${id}/status`, { status });
      setBookings(bookings.map(b => b._id === id ? { ...b, status } : b));
      showToast(t?.a1_bookStatusUpdated || 'Booking status updated', 'success');
    } catch (error) {
      console.error('Update status error:', error);
      showToast(t?.statusUpdateFailed || 'Failed to update status', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    return statusBadgeClasses[status] || statusBadgeClasses.pending;
  };

  // Puja Type Functions

  /*
   * Re-read the list from the server instead of trusting the array we just sent.
   * If a save was rejected the chips then stay exactly as stored (rather than
   * showing a change that never happened), and the admin's next action starts
   * from the truth.
   */
  const syncPujaTypes = async () => {
    try {
      const response = await api.get('/admin/settings');
      const stored = response.data?.pujaTypes;
      if (Array.isArray(stored)) setPujaTypes(stored);
    } catch {
      /* keep what is on screen */
    }
  };

  // The server's own message is the useful part: a 403 (no Bookings area), a
  // validation error or a 500 all used to arrive as a bare "Failed to delete".
  const saveError = (error, fallback) =>
    error?.response?.data?.message || fallback;

  const handleAddPujaType = async () => {
    if (!newPujaType.trim()) {
      showToast(t?.a1_bookEnterPujaType || 'Please enter a puja type name', 'error');
      return;
    }
    if (pujaTypes.includes(newPujaType.trim())) {
      showToast(t?.a1_bookPujaTypeExists || 'Puja type already exists', 'error');
      return;
    }
    setLoading(true);
    try {
      const updatedTypes = [...pujaTypes, newPujaType.trim()];
      await api.put('/admin/settings', { pujaTypes: updatedTypes });
      setPujaTypes(updatedTypes);
      setNewPujaType('');
      await syncPujaTypes();
      showToast(t?.a1_bookPujaTypeAdded || 'Puja type added successfully', 'success');
    } catch (error) {
      showToast(saveError(error, t?.a1_bookPujaTypeAddFailed || 'Failed to add puja type'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePujaType = async (typeToDelete) => {
    if (!window.confirm((t?.a1_bookDeleteItemConfirm || 'Delete "{name}"?').replace('{name}', typeToDelete))) return;
    setLoading(true);
    // The chip goes from the screen straight away. It is put back if the server
    // refuses, so a failed delete is visible rather than silent - but on success
    // nothing here reads the list back, which is what used to make a deleted
    // type reappear on the next load.
    const previous = pujaTypes;
    const updatedTypes = pujaTypes.filter(pt => pt !== typeToDelete);
    setPujaTypes(updatedTypes);
    try {
      await api.put('/admin/settings', { pujaTypes: updatedTypes });
      showToast(t?.a1_bookPujaTypeDeleted || 'Puja type deleted', 'success');
    } catch (error) {
      showToast(saveError(error, t?.a1_bookDeleteFailed || 'Failed to delete'), 'error');
      // The server still holds it.
      setPujaTypes(previous);
      await syncPujaTypes();
    } finally {
      setLoading(false);
    }
  };

  const handleEditPujaType = async (oldType, newType) => {
    if (!newType.trim() || oldType === newType.trim()) {
      setEditingPujaType(null);
      return;
    }
    if (pujaTypes.includes(newType.trim())) {
      showToast(t?.a1_bookPujaTypeExists || 'Puja type already exists', 'error');
      return;
    }
    setLoading(true);
    try {
      const updatedTypes = pujaTypes.map(pt => pt === oldType ? newType.trim() : pt);
      await api.put('/admin/settings', { pujaTypes: updatedTypes });
      setPujaTypes(updatedTypes);
      setEditingPujaType(null);
      await syncPujaTypes();
      showToast(t?.a1_bookPujaTypeUpdated || 'Puja type updated', 'success');
    } catch (error) {
      showToast(saveError(error, t?.a1_bookUpdateFailed || 'Failed to update'), 'error');
      await syncPujaTypes();
    } finally {
      setLoading(false);
    }
  };

  // Date Limit Functions
  const handleAddDateLimit = async () => {
    if (!newDateLimit.date) {
      showToast(t?.a1_bookSelectDate || 'Please select a date', 'error');
      return;
    }
    setLoading(true);
    try {
      const updatedLimits = { ...dateLimits, [newDateLimit.date]: newDateLimit.limit };
      await api.put('/admin/settings', { dateLimits: updatedLimits });
      setDateLimits(updatedLimits);
      setNewDateLimit({ date: '', limit: 10 });
      showToast(t?.a1_bookDateLimitAdded || 'Date limit added', 'success');
    } catch (error) {
      showToast(t?.a1_bookDateLimitAddFailed || 'Failed to add date limit', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDateLimit = async (date) => {
    if (!window.confirm((t?.a1_bookDeleteLimitConfirm || 'Delete limit for {date}?').replace('{date}', date))) return;
    setLoading(true);
    try {
      const updatedLimits = { ...dateLimits };
      delete updatedLimits[date];
      await api.put('/admin/settings', { dateLimits: updatedLimits });
      setDateLimits(updatedLimits);
      showToast(t?.a1_bookDateLimitDeleted || 'Date limit deleted', 'success');
    } catch (error) {
      showToast(t?.a1_bookDeleteFailed || 'Failed to delete', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Toggle Booking Availability
  const toggleBookingAvailability = async () => {
    setLoading(true);
    try {
      const newStatus = !bookingAvailable;
      await api.put('/admin/settings', { 
        bookingAvailable: newStatus,
        availabilityMessage: availabilityMessage || 'Bookings are currently unavailable. Please check back later.'
      });
      setBookingAvailable(newStatus);
      showToast(newStatus ? (t?.a1_bookBookingsEnabled || 'Bookings enabled') : (t?.a1_bookBookingsDisabled || 'Bookings disabled'), 'success');
    } catch (error) {
      console.error('Error toggling booking availability:', error);
      showToast(t?.a1_bookUpdateFailed || 'Failed to update', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Save Availability Message
  const saveAvailabilityMessage = async () => {
    setSavingMessage(true);
    try {
      await api.put('/admin/settings', { 
        availabilityMessage: availabilityMessage || 'Bookings are currently unavailable. Please check back later.'
      });
      showToast(t?.a1_bookMessageSaved || 'Availability message saved successfully', 'success');
    } catch (error) {
      console.error('Error saving message:', error);
      showToast(t?.a1_bookMessageSaveFailed || 'Failed to save message', 'error');
    } finally {
      setSavingMessage(false);
    }
  };

  // ===== Booking page content =====
  const emptyLocalized = () => ({ en: '', ne: '', hi: '', zh: '', ta: '' });

  const patchContent = (index, fn) =>
    setBookingContent((prev) => prev.map((s, i) => (i === index ? fn(s) : s)));

  const addContentSection = () => {
    const next = {
      key: `booking_${Date.now()}`,
      title: emptyLocalized(),
      paragraphs: {
        p1: emptyLocalized(),
        p2: emptyLocalized(),
        p3: emptyLocalized(),
        p4: emptyLocalized()
      },
      listTitle: emptyLocalized(),
      points: [],
      group: emptyLocalized(),
      showForm: false,
      order: bookingContent.length,
      enabled: true
    };
    setBookingContent([...bookingContent, next]);
  };

  const removeContentSection = (index) => {
    if (!window.confirm(t?.a1_bookRemoveSectionConfirm || 'Remove this section?')) return;
    setBookingContent(bookingContent.filter((_, i) => i !== index));
  };

  const moveContentSection = (index, dir) => {
    const next = [...bookingContent];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setBookingContent(next.map((s, i) => ({ ...s, order: i })));
  };

  const toggleContentSection = (index, field) => {
    patchContent(index, (s) => ({ ...s, [field]: field === 'showForm' ? !s.showForm : s[field] === false }));
  };

  const updateContentField = (index, field, value) => {
    patchContent(index, (s) => ({ ...s, [field]: { ...(s[field] || {}), [contentLang]: value } }));
  };

  const updateContentParagraph = (index, pKey, value) => {
    patchContent(index, (s) => ({
      ...s,
      paragraphs: {
        ...(s.paragraphs || {}),
        [pKey]: { ...(s.paragraphs?.[pKey] || {}), [contentLang]: value }
      }
    }));
  };

  const addContentPoint = (index) => {
    patchContent(index, (s) => ({ ...s, points: [...(s.points || []), emptyLocalized()] }));
  };

  const updateContentPoint = (index, pointIndex, value) => {
    patchContent(index, (s) => ({
      ...s,
      points: (s.points || []).map((p, i) =>
        i === pointIndex ? { ...(p || {}), [contentLang]: value } : p
      )
    }));
  };

  const removeContentPoint = (index, pointIndex) => {
    patchContent(index, (s) => ({
      ...s,
      points: (s.points || []).filter((_, i) => i !== pointIndex)
    }));
  };

  const moveContentPoint = (index, pointIndex, dir) => {
    patchContent(index, (s) => {
      const points = [...(s.points || [])];
      const target = pointIndex + dir;
      if (target < 0 || target >= points.length) return s;
      [points[pointIndex], points[target]] = [points[target], points[pointIndex]];
      return { ...s, points };
    });
  };

  const saveContent = async () => {
    setSavingContent(true);
    try {
      await api.put('/admin/settings', {
        bookingContent: bookingContent.map((s, i) => ({ ...s, order: i }))
      });
      showToast(t?.a1_bookContentSaved || 'Booking page content saved', 'success');
    } catch (error) {
      console.error('Error saving booking content:', error);
      showToast(t?.a1_bookContentSaveFailed || 'Failed to save booking content', 'error');
    } finally {
      setSavingContent(false);
    }
  };

  const getBookingsForDate = (date) => bookings.filter(b => b.date === date).length;

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          booking.phone?.includes(searchTerm) ||
                          booking.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          booking.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || booking.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const sortedBookings = useMemo(() => {
    const list = [...filteredBookings];
    const byName = (a, b) => (a.name || '').localeCompare(b.name || '');
    switch (sortBy) {
      case 'oldest':
        return list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'name':
        return list.sort(byName);
      case 'date':
        return list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      case 'status':
        return list.sort((a, b) => (a.status || '').localeCompare(b.status || ''));
      default:
        return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  }, [filteredBookings, sortBy]);

  // Counts for the summary chips, computed from everything (not the filtered
  // set) so the chips stay a stable overview while a filter is active.
  const statusCounts = useMemo(() => {
    const counts = { all: bookings.length, pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
    bookings.forEach((b) => {
      if (counts[b.status] !== undefined) counts[b.status] += 1;
    });
    return counts;
  }, [bookings]);

  const totalPages = Math.max(1, Math.ceil(sortedBookings.length / perPage));

  // Keep the page in range when a search or filter shrinks the result set.
  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterStatus, perPage]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedBookings = useMemo(() => {
    const start = (page - 1) * perPage;
    return sortedBookings.slice(start, start + perPage);
  }, [sortedBookings, page, perPage]);

  const toggleSort = (key) => setSortBy(sortBy === key ? 'newest' : key);

  // ===== Bulk delete =====
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const toggleSelect = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  // Selects every booking on the current page, not just the filtered view.
  const allOnPageSelected =
    pagedBookings.length > 0 && pagedBookings.every((b) => selectedSet.has(b._id));
  const someOnPageSelected =
    pagedBookings.some((b) => selectedSet.has(b._id)) && !allOnPageSelected;

  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        pagedBookings.forEach((b) => next.delete(b._id));
      } else {
        pagedBookings.forEach((b) => next.add(b._id));
      }
      return Array.from(next);
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (
      !window.confirm(
        (t?.a1_bookBulkDeleteConfirm || 'Delete {count} booking(s)? This cannot be undone.').replace('{count}', selectedIds.length)
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const res = await api.delete('/admin/bookings', { data: { ids: selectedIds } });
      const removed =
        res.data?.deletedCount ?? selectedIds.length;

      // Drop the deleted rows locally so the table reflects the change without
      // waiting for a refetch, and reconcile the current page after removal.
      const remaining = bookings.filter((b) => !selectedSet.has(b._id));
      setBookings(remaining);
      setSelectedIds([]);

      showToast((t?.a1_bookBulkDeleted || '{count} booking(s) deleted').replace('{count}', removed), 'success');
    } catch (error) {
      console.error('Bulk delete error:', error);
      showToast(
        error.response?.data?.message || t?.a1_bookBulkDeleteFailed || 'Failed to delete bookings',
        'error'
      );
    } finally {
      setDeleting(false);
    }
  };

  // Clear a selection that points at rows no longer on screen (e.g. filtered out).
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.length === 0) return prev;
      const live = new Set(bookings.map((b) => b._id));
      const next = prev.filter((id) => live.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [bookings]);

  return (
    <div className="space-y-6">
      {/* Background Photo Management - Mini Square Grid */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
        <div className="px-6 py-4 bg-gradient-to-r from-[#A80808]/10 to-[#A80808]/5 border-b border-gray-100 flex items-center justify-between">
          <h4 className="text-gray-700 font-semibold flex items-center gap-2">
            <Image size={18} className="text-[#A80808]" />
            {t?.a1_bookBgPhotosTitle || 'Booking Page Background Photos'}
          </h4>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingBg}
              className="px-3 py-1.5 bg-[#A80808] text-white rounded-lg text-xs font-semibold hover:bg-[#660505] transition-all disabled:opacity-50 flex items-center gap-1"
            >
              <Upload size={14} />
              {t?.a1_bookUpload || 'Upload'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleBgPhotoUpload}
              className="hidden"
            />
          </div>
        </div>
        
        {/* Mini Square Grid */}
        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {/* Default Image */}
            <div className="relative group">
              <div className={`aspect-square rounded-xl overflow-hidden border-2 ${bookingBgPhoto === '/4.jpg' ? 'border-[#A80808] ring-2 ring-[#A80808]/20' : 'border-gray-200'}`}>
                <img
                  src="/4.jpg"
                  alt={t?.a1_bookDefaultBgAlt || 'Default Background'}
                  className="w-full h-full object-cover"
                />
                {bookingBgPhoto === '/4.jpg' && (
                  <div className="absolute top-1 right-1 bg-[#A80808] text-white text-xs font-bold px-1.5 py-0.5 rounded">
                    {t?.a1_bookActive || 'Active'}
                  </div>
                )}
              </div>
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                {bookingBgPhoto !== '/4.jpg' && (
                  <button
                    onClick={() => handleSetAsActive('/4.jpg')}
                    className="p-1 bg-white/90 rounded text-[#A80808] hover:bg-white transition-all text-xs font-semibold"
                  >
                    {t?.a1_bookSet || 'Set'}
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 text-center mt-0.5 truncate">{t?.a1_bookDefault || 'Default'}</p>
            </div>

            {/* Uploaded Images */}
            {previewImages.map((img, index) => (
              <div key={index} className="relative group">
                <div className={`aspect-square rounded-xl overflow-hidden border-2 ${bookingBgPhoto === img ? 'border-[#A80808] ring-2 ring-[#A80808]/20' : 'border-gray-200'}`}>
                  <img
                    src={img}
                    alt={(t?.a1_bookBgAlt || 'Background {n}').replace('{n}', index + 1)}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      handleImageError(e, '/4.jpg');
                    }}
                  />
                  {bookingBgPhoto === img && (
                    <div className="absolute top-1 right-1 bg-[#A80808] text-white text-xs font-bold px-1.5 py-0.5 rounded">
                      {t?.a1_bookActive || 'Active'}
                    </div>
                  )}
                  {uploadingBg && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  {bookingBgPhoto !== img && (
                    <button
                      onClick={() => handleSetAsActive(img)}
                      className="p-1 bg-white/90 rounded text-[#A80808] hover:bg-white transition-all text-xs font-semibold"
                    >
                      {t?.a1_bookSet || 'Set'}
                    </button>
                  )}
                  <button
                    onClick={() => handleRemoveBgPhoto(img)}
                    aria-label={t?.a1_bookDeletePhoto || 'Delete photo'}
                    className="p-1 bg-red-500/90 rounded text-white hover:bg-red-600 transition-all"
                  >
                    <Trash size={12} />
                  </button>
                </div>
                <p className="text-xs text-gray-400 text-center mt-0.5 truncate">
                  {(t?.a1_bookPhotoN || 'Photo {n}').replace('{n}', index + 1)}
                </p>
              </div>
            ))}
          </div>

          {previewImages.length === 0 && (
            <div className="text-center py-4 text-gray-400 text-sm">
              {t?.a1_bookNoCustomPhotos || 'No custom photos uploaded. Upload images to use as booking page background.'}
            </div>
          )}

          <p className="text-xs text-gray-400 mt-3">
            <span className="font-medium">{t?.a1_bookActiveLabel || 'Active:'}</span> {bookingBgPhoto === '/4.jpg' ? (t?.a1_bookDefaultBackground || 'Default background') : (t?.a1_bookCustomPhoto || 'Custom photo')} •
            <span className="ml-1">{(t?.a1_bookUploadedCount || 'Uploaded: {count} photos').replace('{count}', previewImages.length)}</span>
          </p>
        </div>
      </div>

      {/* Booking Availability Toggle */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
        <div className="px-6 py-4 bg-gradient-to-r from-[#A80808]/10 to-[#A80808]/5 border-b border-gray-100">
          <h4 className="text-gray-700 font-semibold flex items-center gap-2">
            <Settings size={18} className="text-[#A80808]" />
            {t?.a1_bookSettingsTitle || 'Booking Settings'}
          </h4>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">{t?.a1_bookAvailableLabel || 'Booking Available:'}</span>
              <button
                onClick={toggleBookingAvailability}
                aria-label={t?.a1_bookAvailableAria || 'Booking Available'}
                disabled={loading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  bookingAvailable ? 'bg-brand-500' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  bookingAvailable ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
              <span className={`text-sm font-semibold ${bookingAvailable ? 'text-brand-600' : 'text-red-500'}`}>
                {bookingAvailable ? (t?.a1_bookEnabled || 'Enabled') : (t?.a1_bookDisabled || 'Disabled')}
              </span>
            </div>
          </div>

          {/* Availability Message Input with Save Button */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-gray-600 block mb-1">
                {t?.a1_bookAvailabilityMessage || 'Availability Message'} <span className="text-gray-400">{t?.a1_bookAvailabilityMessageHint || '(shown to users when booking is disabled)'}</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  aria-label={t?.a1_bookAvailabilityMessage || 'Availability Message'} value={availabilityMessage}
                  onChange={(e) => setAvailabilityMessage(e.target.value)}
                  placeholder={t?.a1_bookAvailabilityPlaceholder || 'Enter availability message...'}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:border-[#A80808] focus:outline-none text-sm"
                  disabled={bookingAvailable}
                />
                <button
                  onClick={saveAvailabilityMessage}
                  disabled={savingMessage || bookingAvailable}
                  className="px-4 py-2 bg-[#A80808] text-white rounded-xl text-sm font-semibold hover:bg-[#660505] transition-all disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
                >
                  {savingMessage ? (
                    <span className="flex items-center gap-1">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t?.a1_bookSaving || 'Saving...'}
                    </span>
                  ) : (
                    <>
                      <Save size={14} />
                      {t?.a1_bookSave || 'Save'}
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {bookingAvailable
                  ? (t?.a1_bookMessageShownHint || 'Message will be shown when booking is disabled')
                  : (t?.a1_bookCurrentMessage || 'Current message: "{message}"').replace('{message}', availabilityMessage || t?.a1_bookNoMessageSet || 'No message set')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Page Content */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
        <div className="px-6 py-4 bg-gradient-to-r from-[#A80808]/10 to-[#A80808]/5 border-b border-gray-100 flex items-center justify-between">
          <h4 className="text-gray-700 font-semibold flex items-center gap-2">
            <FileText size={18} className="text-[#A80808]" />
            {t?.a1_bookPageContentTitle || 'Booking Page Content'}
          </h4>
          <div className="flex items-center gap-2">
            <button
              onClick={addContentSection}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#A80808] text-white text-xs font-semibold hover:bg-[#660505] transition-all"
            >
              <Plus size={14} /> {t?.a1_bookAddSection || 'Add Section'}
            </button>
            <button
              onClick={saveContent}
              disabled={savingContent}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#A80808] text-white text-xs font-semibold hover:bg-[#660505] transition-all disabled:opacity-50"
            >
              {savingContent ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t?.a1_bookSaving || 'Saving...'}
                </>
              ) : (
                <>
                  <Save size={14} /> {t?.a1_bookSaveContent || 'Save Content'}
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              aria-label={t?.a1_bookContentLanguage || 'Content language'} value={contentLang === 'ne' ? 'नेपाली' : contentLang.toUpperCase()}
              readOnly
              className="w-24 px-3 py-1.5 border border-gray-200 rounded-lg bg-gray-50 text-xs font-semibold text-gray-600"
            />
            <p className="text-xs text-gray-500 self-center">
              {t?.a1_bookSectionsHintBefore || 'Sections shown on the booking page, in order. The section marked'}
              <span className="font-semibold text-[#A80808]"> {t?.a1_bookSectionsHintForm || 'booking form'} </span>
              {t?.a1_bookSectionsHintAfter || 'renders the real form there.'}
            </p>
          </div>

          <div className="flex gap-1.5 mb-4 flex-wrap">
            {['ne', 'en', 'hi', 'zh', 'ta'].map((l) => (
              <button
                key={l}
                onClick={() => setContentLang(l)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                  contentLang === l
                    ? 'bg-[#A80808] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-[#A80808]/10'
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          {bookingContent.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">{t?.a1_bookNoSections || 'No content sections yet.'}</p>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm border-collapse min-w-[720px]">
                <thead>
                  <tr className="bg-gray-50 border-y border-gray-100">
                    <th className="w-10 py-2.5 pl-2 pr-0" />
                    <th className="text-left py-2.5 px-3 text-xs font-bold text-gray-500 uppercase tracking-wider w-14">
                      #
                    </th>
                    <th className="text-left py-2.5 px-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      {t?.a1_bookColTitle || 'Title'}
                    </th>
                    <th className="text-left py-2.5 px-3 text-xs font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                      {t?.a1_bookColHeadings || 'Headings'}
                    </th>
                    <th className="text-left py-2.5 px-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-16">
                      {t?.a1_bookColParas || 'Paras'}
                    </th>
                    <th className="text-left py-2.5 px-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-16">
                      {t?.a1_bookColPoints || 'Points'}
                    </th>
                    <th className="text-left py-2.5 px-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-32">
                      {t?.a1_bookColFlags || 'Flags'}
                    </th>
                    <th className="text-left py-2.5 pl-3 pr-2 text-xs font-bold text-gray-500 uppercase tracking-wider text-right w-36">
                      {t?.a1_bookColOrder || 'Order'}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {bookingContent.map((section, i) => {
                    const titleText =
                      getLocalizedValue(section.title, contentLang) ||
                      (t?.a1_bookUntitledSection || 'Untitled section');
                    const paragraphsFilled = ['p1', 'p2', 'p3', 'p4'].filter(
                      (k) => getLocalizedValue(section.paragraphs?.[k], contentLang).trim()
                    ).length;
                    const pointsFilled = (section.points || []).filter((p) =>
                      getLocalizedValue(p, contentLang).trim()
                    ).length;

                    return (
                      <React.Fragment key={section.key || i}>
                        {/* Summary row - always visible, one line per section */}
                        <tr
                          key={section.key || i}
                          className="border-b border-gray-100 hover:bg-gray-50/70 transition-colors cursor-pointer"
                          onClick={() =>
                            setExpandedSection(
                              expandedSection === (section.key || i) ? null : section.key || i
                            )
                          }
                        >
                          <td className="py-2.5 pl-2 pr-0">
                            <ChevronDown
                              size={15}
                              className={`text-gray-400 transition-transform ${
                                expandedSection === (section.key || i)
                                  ? 'rotate-0'
                                  : '-rotate-90'
                              }`}
                            />
                          </td>
                          <td className="py-2.5 px-3 font-mono text-xs text-gray-400">
                            {i + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-gray-700 block truncate max-w-[260px]">
                              {titleText}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 hidden lg:table-cell">
                            <span className="text-xs text-gray-500 truncate block max-w-[160px]">
                              {getLocalizedValue(section.listTitle, contentLang) || '—'}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-flex items-center justify-center min-w-[26px] px-1.5 py-0.5 rounded-full text-xs font-bold ${
                                paragraphsFilled > 0
                                  ? 'bg-gray-100 text-gray-700'
                                  : 'bg-gray-50 text-gray-300'
                              }`}
                            >
                              {paragraphsFilled}/4
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-flex items-center justify-center min-w-[26px] px-1.5 py-0.5 rounded-full text-xs font-bold ${
                                pointsFilled > 0
                                  ? 'bg-[#A80808]/10 text-[#A80808]'
                                  : 'bg-gray-50 text-gray-300'
                              }`}
                            >
                              {pointsFilled}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {section.showForm && (
                              <span className="inline-block text-xs font-bold uppercase tracking-wider text-[#A80808] bg-[#A80808]/10 rounded-full px-2 py-0.5 mr-1">
                                {t?.a1_bookFlagForm || 'form'}
                              </span>
                            )}
                            {section.enabled === false && (
                              <span className="inline-block text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                                {t?.a1_bookFlagHidden || 'hidden'}
                              </span>
                            )}
                            {!section.showForm && section.enabled !== false && (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </td>

                          <td className="py-2.5 pl-3 pr-2">
                            <div className="flex items-center justify-end gap-0.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveContentSection(i, -1);
                                }}
                                disabled={i === 0}
                                className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                                title={t?.a1_bookMoveUp || 'Move up'}
                              >
                                <ChevronUp size={14} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveContentSection(i, 1);
                                }}
                                disabled={i === bookingContent.length - 1}
                                className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                                title={t?.a1_bookMoveDown || 'Move down'}
                              >
                                <ChevronDown size={14} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleContentSection(i, 'enabled');
                                }}
                                className="p-1 rounded hover:bg-gray-100"
                                title={section.enabled === false ? (t?.a1_bookShow || 'Show') : (t?.a1_bookHide || 'Hide')}
                              >
                                {section.enabled === false ? (
                                  <Eye size={14} />
                                ) : (
                                  <EyeOff size={14} />
                                )}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleContentSection(i, 'showForm');
                                }}
                                className="p-1 rounded hover:bg-gray-100"
                                title={t?.a1_bookRenderFormHere || 'Render the booking form at this section'}
                              >
                                <CalendarDays size={14} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeContentSection(i);
                                }}
                                className="p-1 rounded hover:bg-red-100 text-red-500"
                                title={t?.remove || 'Remove'}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Editor row - only for the expanded section, so the list
                            stays scannable instead of being a wall of forms */}
                        {expandedSection === (section.key || i) && (
                          <tr className="border-b border-gray-100 bg-[#A80808]/[0.03]">
                            <td colSpan={8} className="px-4 py-4">
                              <div className="grid md:grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs font-semibold text-gray-600 block mb-1">
                                    {t?.a1_bookSectionTitle || 'Section title'}
                                  </label>
                                  <input
                                    type="text"
                                    aria-label={t?.a1_bookSectionTitle || 'Section title'} value={getLocalizedValue(section.title, contentLang)}
                                    onChange={(e) =>
                                      updateContentField(i, 'title', e.target.value)
                                    }
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm"
                                    placeholder={t?.a1_bookSectionTitlePlaceholder || 'Section title...'}
                                  />
                                </div>

                                <div>
                                  <label className="text-xs font-semibold text-gray-600 block mb-1">
                                    {t?.a1_bookParentHeading || 'Parent heading (optional)'}
                                  </label>
                                  <input
                                    type="text"
                                    aria-label={t?.a1_bookParentHeading || 'Parent heading (optional)'} value={getLocalizedValue(section.group, contentLang)}
                                    onChange={(e) =>
                                      updateContentField(i, 'group', e.target.value)
                                    }
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm"
                                    placeholder={t?.a1_bookParentHeadingPlaceholder || 'Parent heading'}
                                  />
                                </div>

                                <div className="md:col-span-2">
                                  <label className="text-xs font-semibold text-gray-600 block mb-1">
                                    {t?.a1_bookListHeading || 'List heading (optional)'}
                                  </label>
                                  <input
                                    type="text"
                                    aria-label={t?.a1_bookListHeading || 'List heading (optional)'} value={getLocalizedValue(section.listTitle, contentLang)}
                                    onChange={(e) =>
                                      updateContentField(i, 'listTitle', e.target.value)
                                    }
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm"
                                    placeholder={t?.a1_bookListHeadingPlaceholder || 'List heading'}
                                  />
                                </div>
                              </div>

                              {/* Paragraphs as a compact 2-column grid rather
                                  than four full-width stacked boxes */}
                              <div className="mt-3 grid md:grid-cols-2 gap-2">
                                {['p1', 'p2', 'p3', 'p4'].map((pKey) => (
                                  <div key={pKey}>
                                    <label className="text-xs font-semibold text-gray-500 block mb-1">
                                      {(t?.a1_bookParagraphN || 'Paragraph {n}').replace('{n}', pKey.slice(1))}
                                    </label>
                                    <textarea
                                      rows={3}
                                      value={getLocalizedValue(
                                        section.paragraphs?.[pKey],
                                        contentLang
                                      )}
                                      onChange={(e) =>
                                        updateContentParagraph(i, pKey, e.target.value)
                                      }
                                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm resize-y"
                                      aria-label={(t?.a1_bookParagraphN || 'Paragraph {n}').replace('{n}', pKey.slice(1))} placeholder={(t?.a1_bookParagraphPlaceholder || 'Paragraph {n}...').replace('{n}', pKey.slice(1))}
                                    />
                                  </div>
                                ))}
                              </div>

                              <div className="flex items-center justify-between mt-3 mb-1.5">
                                <label className="text-xs font-bold text-gray-600">
                                  {t?.a1_bookBulletPoints || 'Bullet Points'}
                                </label>
                                <button
                                  onClick={() => addContentPoint(i)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#A80808]/10 text-[#A80808] text-xs font-semibold hover:bg-[#A80808]/20 transition-all"
                                >
                                  <Plus size={12} /> {t?.a1_bookAddPoint || 'Add Point'}
                                </button>
                              </div>

                              {(section.points || []).length === 0 ? (
                                <p className="text-xs text-gray-400">{t?.a1_bookNoBulletPoints || 'No bullet points.'}</p>
                              ) : (
                                <div className="space-y-1.5">
                                  {(section.points || []).map((point, pi) => (
                                    <div
                                      key={pi}
                                      className="flex items-start gap-1.5"
                                    >
                                      <input
                                        type="text"
                                        aria-label={(t?.a1_bookBulletPointN || 'Bullet Point {n}').replace('{n}', pi + 1)} value={getLocalizedValue(point, contentLang)}
                                        onChange={(e) =>
                                          updateContentPoint(i, pi, e.target.value)
                                        }
                                        className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm"
                                        placeholder={(t?.a1_bookPointN || 'Point {n}...').replace('{n}', pi + 1)}
                                      />
                                      <button
                                        onClick={() => moveContentPoint(i, pi, -1)}
                                        disabled={pi === 0}
                                        className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"
                                        title={t?.a1_bookMoveUp || 'Move up'}
                                      >
                                        <ChevronUp size={13} />
                                      </button>
                                      <button
                                        onClick={() => moveContentPoint(i, pi, 1)}
                                        disabled={pi === section.points.length - 1}
                                        className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"
                                        title={t?.a1_bookMoveDown || 'Move down'}
                                      >
                                        <ChevronDown size={13} />
                                      </button>
                                      <button
                                        onClick={() => removeContentPoint(i, pi)}
                                        className="p-1.5 rounded hover:bg-red-100 text-red-500"
                                        title={t?.remove || 'Remove'}
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Puja Type Management */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
        <div className="px-6 py-4 bg-gradient-to-r from-[#A80808]/10 to-[#A80808]/5 border-b border-gray-100 flex items-center justify-between">
          <h4 className="text-gray-700 font-semibold flex items-center gap-2">
            <Tag size={18} className="text-[#A80808]" />
            {t?.a1_bookManagePujaTypes || 'Manage Puja Types'}
          </h4>
          <button
            onClick={() => setShowPujaModal(!showPujaModal)}
            className="text-gray-500 hover:text-[#A80808] text-sm flex items-center gap-1 transition-colors"
          >
            {showPujaModal ? <EyeOff size={16} /> : <Eye size={16} />}
            {showPujaModal ? (t?.a1_bookHide || 'Hide') : (t?.a1_bookManage || 'Manage')}
          </button>
        </div>

        {showPujaModal && (
          <div className="p-6">
            <div className="flex gap-3 mb-4">
              <input
                type="text"
                aria-label={t?.a1_bookNewPujaType || 'New puja type'} value={newPujaType}
                onChange={(e) => setNewPujaType(e.target.value)}
                placeholder={t?.a1_bookNewPujaTypePlaceholder || 'Enter new puja type...'}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:border-[#A80808] focus:outline-none text-sm"
              />
              <button
                onClick={handleAddPujaType}
                disabled={loading || !newPujaType.trim()}
                className="px-4 py-2 bg-[#A80808] text-white rounded-xl text-sm font-semibold hover:bg-[#660505] transition-all disabled:opacity-50 flex items-center gap-1"
              >
                <Plus size={16} /> {t?.a1_bookAdd || 'Add'}
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {pujaTypes.map((type) => (
                <div key={type} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5">
                  {editingPujaType === type ? (
                    <input
                      type="text"
                      aria-label={t?.a1_bookEditPujaType || 'Edit puja type'} defaultValue={type}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditPujaType(type, e.target.value);
                        if (e.key === 'Escape') setEditingPujaType(null);
                      }}
                      onBlur={(e) => handleEditPujaType(type, e.target.value)}
                      className="w-32 px-2 py-0.5 border border-[#A80808] rounded focus:outline-none text-sm"
                      autoFocus
                    />
                  ) : (
                    <span className="text-sm text-gray-700">{type}</span>
                  )}
                  <button onClick={() => setEditingPujaType(type)} aria-label={t?.edit || 'Edit'} className="text-gray-400 hover:text-[#A80808] transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDeletePujaType(type)} aria-label={t?.delete || 'Delete'} className="text-gray-400 hover:text-red-600 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">{t?.a1_bookPujaTypesHint || 'Manage puja types that appear in the booking form'}</p>
          </div>
        )}
      </div>

      {/* Date Limits */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
        <div className="px-6 py-4 bg-gradient-to-r from-[#A80808]/10 to-[#A80808]/5 border-b border-gray-100">
          <h4 className="text-gray-700 font-semibold flex items-center gap-2">
            <CalendarDays size={18} className="text-[#A80808]" />
            {t?.a1_bookDateLimitsTitle || 'Date Booking Limits'}
          </h4>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap gap-3 mb-4">
            <input
              type="date"
              aria-label={t?.a1_bookDate || 'Date'} value={newDateLimit.date}
              onChange={(e) => setNewDateLimit({ ...newDateLimit, date: e.target.value })}
              className="px-4 py-2 border border-gray-200 rounded-xl focus:border-[#A80808] focus:outline-none text-sm"
            />
            <input
              type="number"
              aria-label={t?.a1_bookLimit || 'Limit'} value={newDateLimit.limit}
              onChange={(e) => setNewDateLimit({ ...newDateLimit, limit: parseInt(e.target.value) || 0 })}
              min="0"
              className="w-24 px-4 py-2 border border-gray-200 rounded-xl focus:border-[#A80808] focus:outline-none text-sm"
              placeholder={t?.a1_bookLimit || 'Limit'}
            />
            <button
              onClick={handleAddDateLimit}
              disabled={loading || !newDateLimit.date}
              className="px-4 py-2 bg-[#A80808] text-white rounded-xl text-sm font-semibold hover:bg-[#660505] transition-all disabled:opacity-50 flex items-center gap-1"
            >
              <Plus size={16} /> {t?.a1_bookSetLimit || 'Set Limit'}
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {Object.entries(dateLimits).map(([date, limit]) => {
              const booked = getBookingsForDate(date);
              const isFull = booked >= limit;
              const isZero = limit <= 0;
              return (
                <div key={date} className={`flex items-center gap-2 border rounded-full px-3 py-1.5 ${
                  isZero ? 'bg-red-50 border-red-300' :
                  isFull ? 'bg-brand-50 border-brand-300' : 'bg-brand-50 border-brand-300'
                }`}>
                  <span className="text-sm font-medium">{date}</span>
                  <span className="text-xs text-gray-500">{booked}/{limit}</span>
                  {isZero && <AlertCircle size={14} className="text-red-500" />}
                  {isFull && !isZero && <AlertCircle size={14} className="text-brand-500" />}
                  <button onClick={() => handleDeleteDateLimit(date)} aria-label={t?.a1_bookRemoveDateLimit || 'Remove date limit'} className="text-gray-400 hover:text-red-600 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
          {Object.keys(dateLimits).length === 0 && (
            <p className="text-sm text-gray-400">{t?.a1_bookNoDateLimits || 'No date limits set. All dates are unlimited.'}</p>
          )}
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#A80808]/10 to-[#A80808]/5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Calendar size={18} className="text-[#A80808]" />
            <h4 className="text-gray-700 font-semibold">{t?.bookingsListTitle || 'All Bookings'}</h4>
            <span className="text-xs text-gray-400 bg-white px-2.5 py-0.5 rounded-full border border-gray-200">
              {bookings?.length || 0}
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                aria-label={t?.a1_bookSearch || 'Search'} value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t?.a1_bookSearchPlaceholder || 'Search name, phone, email, puja...'}
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:border-[#A80808] focus:outline-none text-sm w-44 sm:w-64 bg-white transition-shadow"
              />
            </div>
            <select
              aria-label={t?.a1_bookSortBy || 'Sort by'} value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-xl focus:border-[#A80808] focus:outline-none text-sm bg-white cursor-pointer"
            >
              <option value="newest">{t?.a1_bookNewestFirst || 'Newest first'}</option>
              <option value="oldest">{t?.a1_bookOldestFirst || 'Oldest first'}</option>
              <option value="date">{t?.a1_bookPujaDate || 'Puja date'}</option>
              <option value="name">{t?.a1_bookSortName || 'Name (A-Z)'}</option>
              <option value="status">{t?.status || 'Status'}</option>
            </select>

            <button
              type="button"
              onClick={() => setPrintAllBookings(true)}
              disabled={!sortedBookings.length}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl bg-white text-sm font-semibold text-gray-700 hover:border-[#A80808] hover:text-[#A80808] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Printer size={15} className="text-[#A80808]" />
              <span className="hidden sm:inline">{t?.printAll || 'Print All'}</span>
            </button>

            <DownloadMenu
              rows={sortedBookings}
              baseName="bookings"
              dateField="createdAt"
              t={t}
              columns={BOOKING_CSV_COLUMNS(t)}
            />
          </div>
        </div>

        {/* Status summary chips - also act as filters */}
        <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2">
          {[
            { key: 'all', label: t?.a1_bookAll || 'All', color: '#A80808' },
            { key: 'pending', label: t?.statusPending || 'Pending', color: statusColors.pending },
            { key: 'confirmed', label: t?.statusConfirmed || 'Confirmed', color: statusColors.confirmed },
            { key: 'completed', label: t?.statusCompleted || 'Completed', color: statusColors.completed },
            { key: 'cancelled', label: t?.statusCancelled || 'Cancelled', color: statusColors.cancelled },
          ].map((chip) => {
            const active = filterStatus === chip.key;
            return (
              <button
                key={chip.key}
                onClick={() => setFilterStatus(chip.key)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  active
                    ? 'text-white shadow-sm'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                style={active ? { background: chip.color, borderColor: chip.color } : undefined}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: active ? 'rgba(255,255,255,0.85)' : chip.color }}
                />
                {chip.label}
                <span className={active ? 'text-white/85' : 'text-gray-400'}>
                  {statusCounts[chip.key] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bulk action bar - only present while rows are selected */}
        {selectedIds.length > 0 && (
          <div className="px-6 py-3 bg-[#A80808]/[0.06] border-b border-[#A80808]/20 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Check size={16} className="text-[#A80808]" />
              <span className="font-semibold text-gray-700">
                {(t?.a1_bookSelectedCount || '{count} selected').replace('{count}', selectedIds.length)}
              </span>
              <button
                onClick={() => setSelectedIds([])}
                className="text-xs text-gray-500 hover:text-[#A80808] underline underline-offset-2 transition-colors"
              >
                {t?.clear || 'Clear'}
              </button>
            </div>

            <button
              onClick={handleBulkDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-all disabled:opacity-50"
            >
              {deleting ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
              {deleting ? (t?.a1_bookDeleting || 'Deleting...') : (t?.a1_bookDeleteSelected || 'Delete selected')}
            </button>
          </div>
        )}

        {/* Body */}
        {sortedBookings.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#A80808]/5 flex items-center justify-center">
              <Calendar size={26} className="text-[#A80808]/40" />
            </div>
            <p className="text-sm font-semibold text-gray-600">
              {bookings.length === 0 ? (t?.a1_bookNoBookings || 'No bookings yet') : (t?.a1_bookNoMatches || 'No bookings match your filters')}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {bookings.length === 0
                ? (t?.a1_bookNoBookingsHint || 'New puja bookings will appear here automatically.')
                : (t?.a1_bookNoMatchesHint || 'Try a different search term or status filter.')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-y border-gray-100">
                  <th className="py-3 pl-4 pr-0 w-10">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      ref={(el) => {
                        // Third state: checked-looking but indeterminate when
                        // only some rows on the page are selected.
                        if (el) el.indeterminate = someOnPageSelected;
                      }}
                      onChange={toggleSelectAllOnPage}
                      disabled={pagedBookings.length === 0}
                      aria-label={t?.a1_bookSelectAllPage || 'Select all on this page'}
                      className="w-4 h-4 rounded border-gray-300 text-[#A80808] focus:ring-[#A80808]/30 cursor-pointer disabled:opacity-40"
                    />
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {t?.a1_bookColDevotee || 'Devotee'}
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    {t?.a1_bookColContact || 'Contact'}
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {t?.a1_bookColPuja || 'Puja'}
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    <button
                      onClick={() => toggleSort('date')}
                      className="inline-flex items-center gap-1 hover:text-[#A80808] transition-colors"
                    >
                      {t?.a1_bookDate || 'Date'}
                      {sortBy === 'date' && <ChevronDown size={12} className="text-[#A80808]" />}
                    </button>
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {t?.status || 'Status'}
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">
                    {t?.details || 'Details'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagedBookings.map((booking) => {
                  const isOpen = expandedId === booking._id;
                  return (
                    <React.Fragment key={booking._id}>
                      <tr
                        onClick={() => setExpandedId(isOpen ? null : booking._id)}
                        className={`border-b border-gray-100 cursor-pointer transition-colors ${
                          selectedSet.has(booking._id)
                            ? 'bg-[#A80808]/[0.07]'
                            : isOpen
                            ? 'bg-[#A80808]/[0.04]'
                            : 'hover:bg-gray-50/70'
                        }`}
                      >
                        {/* Select */}
                        <td
                          className="py-3 pl-4 pr-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedSet.has(booking._id)}
                            onChange={() => toggleSelect(booking._id)}
                            aria-label={(t?.a1_bookSelectBookingFor || 'Select booking for {name}').replace('{name}', booking.name || '')}
                            className="w-4 h-4 rounded border-gray-300 text-[#A80808] focus:ring-[#A80808]/30 cursor-pointer"
                          />
                        </td>

                        {/* Devotee */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-[#A80808] to-[#A80808] text-white text-xs font-bold flex items-center justify-center">
                              {booking.name?.charAt(0).toUpperCase() || '?'}
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-800 truncate max-w-[160px]">
                                {booking.name}
                              </p>
                              <p className="text-xs text-gray-400 font-mono">
                                #{booking._id?.slice(-6)}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="py-3 px-4 hidden md:table-cell">
                          <p className="text-gray-700">{booking.phone || '—'}</p>
                          {booking.email && (
                            <p className="text-xs text-gray-400 truncate max-w-[180px]">{booking.email}</p>
                          )}
                        </td>

                        {/* Puja */}
                        <td className="py-3 px-4">
                          <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-[#A80808]/10 text-[#A80808] border border-[#A80808]/20 max-w-[160px] truncate">
                            {booking.type}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="py-3 px-4 text-gray-600 hidden sm:table-cell whitespace-nowrap">
                          {booking.date || '—'}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <select
                            aria-label={(t?.a1_bookStatusFor || 'Status for {name}').replace('{name}', booking.name || t?.a1_bookBookingWord || 'booking')} value={booking.status}
                            onChange={(e) => handleStatusChange(booking._id, e.target.value)}
                            disabled={loading}
                            className={`text-xs font-bold px-2.5 py-1 rounded-full border focus:outline-none focus:ring-2 focus:ring-[#A80808]/20 disabled:opacity-50 cursor-pointer ${getStatusBadge(
                              booking.status
                            )}`}
                          >
                            <option value="pending">{t?.statusPending || 'Pending'}</option>
                            <option value="confirmed">{t?.statusConfirmed || 'Confirmed'}</option>
                            <option value="completed">{t?.statusCompleted || 'Completed'}</option>
                            <option value="cancelled">{t?.statusCancelled || 'Cancelled'}</option>
                          </select>
                        </td>

                        {/* Expand toggle */}
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-lg transition-all ${
                              isOpen
                                ? 'bg-[#A80808] text-white'
                                : 'text-gray-400 hover:bg-gray-100 hover:text-[#A80808]'
                            }`}
                          >
                            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </span>
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {isOpen && (
                        <tr className="bg-[#A80808]/[0.02]">
                          <td colSpan={7} className="px-4 pb-5 pt-1">
                            <div className="rounded-xl border border-[#A80808]/15 bg-white p-5 shadow-sm">
                              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                                <div>
                                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    {t?.fullName || 'Full name'}
                                  </p>
                                  <p className="text-sm text-gray-800">{booking.name || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    {t?.phoneNumber || 'Phone'}
                                  </p>
                                  <p className="text-sm text-gray-800">{booking.phone || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    {t?.email || 'Email'}
                                  </p>
                                  <p className="text-sm text-gray-800 break-all">{booking.email || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    {t?.pujaType || 'Puja type'}
                                  </p>
                                  <p className="text-sm text-gray-800">{booking.type || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    {t?.a1_bookPujaDate || 'Puja date'}
                                  </p>
                                  <p className="text-sm text-gray-800">{booking.date || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    {t?.bookedOn || 'Booked on'}
                                  </p>
                                  <p className="text-sm text-gray-800">
                                    {booking.createdAt
                                      ? new Date(booking.createdAt).toLocaleString()
                                      : '—'}
                                  </p>
                                </div>
                                <div className="sm:col-span-2 lg:col-span-2">
                                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    {t?.specialInstruction || 'Special Instruction'}
                                  </p>
                                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                                    {booking.description || '—'}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
                                <button
                                  type="button"
                                  onClick={() => setPrintBooking(booking)}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:border-[#A80808] hover:text-[#A80808] transition-colors"
                                >
                                  <Printer size={13} /> {t?.print || 'Print'}
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {sortedBookings.length > 0 && (
          <div className="px-6 py-3.5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>
                {t?.a1_bookShowing || 'Showing'}{' '}
                <span className="font-semibold text-gray-700">
                  {(page - 1) * perPage + 1}
                </span>
                -
                <span className="font-semibold text-gray-700">
                  {Math.min(page * perPage, sortedBookings.length)}
                </span>{' '}
                {t?.a1_bookOf || 'of'} <span className="font-semibold text-gray-700">{sortedBookings.length}</span>
              </span>
              <select
                aria-label={t?.a1_bookRowsPerPage || 'Rows per page'} value={perPage}
                onChange={(e) => setPerPage(Number(e.target.value))}
                className="px-2 py-1 border border-gray-200 rounded-lg text-xs bg-white focus:border-[#A80808] focus:outline-none cursor-pointer"
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {(t?.a1_bookPerPage || '{n} / page').replace('{n}', n)}
                  </option>
                ))}
              </select>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {t?.a1_bookPrevious || 'Previous'}
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                      page === n
                        ? 'bg-[#A80808] text-white shadow-sm'
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {t?.a1_bookNext || 'Next'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============ Printable bookings ============ */}
      {printBooking && (
        <PrintBooking
          booking={printBooking}
          onClose={() => setPrintBooking(null)}
          t={t}
        />
      )}

      {printAllBookings && (
        <PrintRecordList
          title={t?.bookingsListTitle || 'All Bookings'}
          columns={BOOKING_CSV_COLUMNS(t)}
          rows={sortedBookings}
          onClose={() => setPrintAllBookings(false)}
          t={t}
        />
      )}
    </div>
  );
};

export default AdminBookings;
