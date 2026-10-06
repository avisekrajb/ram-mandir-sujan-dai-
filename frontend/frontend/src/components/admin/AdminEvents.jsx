import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, Pencil, Trash2, Save, X, Upload, Calendar, 
  Image, Heart, Share2, Users, Search,
  Check, XCircle, ChevronDown, ChevronUp, Loader2, BarChart3,
  Eye as EyeIcon, Clock
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import LanguageSwitcher from '../common/LanguageSwitcher';
import api from '../../services/api';
import OmLoader from '../../components/common/OmLoader';

// Render a translated sentence with a JSX node in place of its "{n}" placeholder.
const withNode = (text, node) => {
  const [before, after = ''] = String(text).split('{n}');
  return <>{before}{node}{after}</>;
};

const AdminEvents = ({ events, setEvents, t, settings, updateSettings }) => {
  const { showToast } = useToast();
  const [editing, setEditing] = useState(null);
  const [activeLang, setActiveLang] = useState('en');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [interestedUsers, setInterestedUsers] = useState([]);
  const [loadingInterested, setLoadingInterested] = useState(false);
  const [engagementStats, setEngagementStats] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [filterUpcoming, setFilterUpcoming] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const fileInputRef = useRef(null);

  // /events page headings (AdminSettings.eventsPageText)
  const [pageText, setPageText] = useState([]);
  const [textLang, setTextLang] = useState('ne');
  const [savingText, setSavingText] = useState(false);

  useEffect(() => {
    if (Array.isArray(settings?.eventsPageText)) {
      setPageText(settings.eventsPageText);
    }
  }, [settings]);

  const emptyLocRow = () => ({ en: '', ne: '', hi: '', zh: '', ta: '' });

  const addTextRow = () =>
    setPageText((prev) => [
      ...prev,
      { key: `custom_${Date.now()}`, label: 'Custom text', text: emptyLocRow(), order: prev.length, enabled: true }
    ]);

  const patchTextRow = (index, fn) =>
    setPageText((prev) => prev.map((r, i) => (i === index ? fn(r) : r)));

  const setTextValue = (index, value) =>
    patchTextRow(index, (r) => ({ ...r, text: { ...(r.text || {}), [textLang]: value } }));

  const removeTextRow = (index) => {
    if (!window.confirm(t.a2_eventsRemoveRowConfirm || 'Remove this text row?')) return;
    setPageText((prev) => prev.filter((_, i) => i !== index));
  };

  const moveTextRow = (index, dir) =>
    setPageText((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((r, i) => ({ ...r, order: i }));
    });

  const savePageText = async () => {
    setSavingText(true);
    try {
      const payload = { eventsPageText: pageText.map((r, i) => ({ ...r, order: i })) };
      // updateSettings (from AdminPage) does the PUT, refreshes the shared
      // settings state and shows the toast; calling api.put here as well sent
      // the save twice, the second time from a stale settings snapshot.
      if (updateSettings) {
        await updateSettings(payload);
      } else {
        await api.put('/admin/settings', payload);
        showToast(t.a2_eventsPageTextSaved || 'Events page text saved', 'success');
      }
    } catch (error) {
      console.error('Error saving events page text:', error);
      if (!updateSettings) {
        showToast(error.response?.data?.message || t.a2_eventsPageTextSaveFailed || 'Failed to save events page text', 'error');
      }
    } finally {
      setSavingText(false);
    }
  };

  // Fetch engagement stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/events/stats/engagement');
        setEngagementStats(response.data.data);
      } catch (error) {
        console.error('Error fetching engagement stats:', error);
      }
    };
    fetchStats();
  }, []);

  const blank = () => ({
    date: '',
    photo: null,
    upcoming: true,
    order: events.length,
    homeSlot: 0,
    yearText: '',
    title: { en: '', ne: '', hi: '', zh: '', ta: '' },
    desc: { en: '', ne: '', hi: '', zh: '', ta: '' },
    dateNepali: { en: '', ne: '', hi: '', zh: '', ta: '' },
    greg: { en: '', ne: '', hi: '', zh: '', ta: '' },
    period: { en: '', ne: '', hi: '', zh: '', ta: '' },
    paragraphs: [],
    listTitle: { en: '', ne: '', hi: '', zh: '', ta: '' },
    points: [],
    interestedCount: 0,
    views: 0,
    shareCount: 0,
    interestedBy: [],
  });

  // paragraphs is a free-length list; older records stored a fixed { p1..p4 } object
  const normalizeParagraphs = (raw) => {
    if (Array.isArray(raw)) return raw.map((p) => ({ ...(p || {}) }));
    if (raw && typeof raw === 'object') {
      return Object.keys(raw)
        .filter((k) => /^p\d+$/i.test(k))
        .sort((a, b) => parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10))
        .map((k) => ({ ...(raw[k] || {}) }));
    }
    return [];
  };

  const openEvent = (e) =>
    setEditing({ ...e, homeSlot: e.homeSlot || 0, paragraphs: normalizeParagraphs(e.paragraphs), points: e.points || [] });

  const setParagraph = (index, value) => {
    setEditing((prev) => {
      const paragraphs = normalizeParagraphs(prev.paragraphs);
      while (paragraphs.length <= index) paragraphs.push({ en: '', ne: '', hi: '', zh: '', ta: '' });
      paragraphs[index] = { ...(paragraphs[index] || {}), [activeLang]: value };
      return { ...prev, paragraphs };
    });
  };

  const addParagraph = () =>
    setEditing((prev) => ({
      ...prev,
      paragraphs: [...normalizeParagraphs(prev.paragraphs), { en: '', ne: '', hi: '', zh: '', ta: '' }]
    }));

  const removeParagraph = (index) =>
    setEditing((prev) => ({
      ...prev,
      paragraphs: normalizeParagraphs(prev.paragraphs).filter((_, i) => i !== index)
    }));

  const moveParagraph = (index, dir) =>
    setEditing((prev) => {
      const paragraphs = normalizeParagraphs(prev.paragraphs);
      const target = index + dir;
      if (target < 0 || target >= paragraphs.length) return prev;
      [paragraphs[index], paragraphs[target]] = [paragraphs[target], paragraphs[index]];
      return { ...prev, paragraphs };
    });

  const addPoint = () =>
    setEditing((prev) => ({
      ...prev,
      points: [...(prev.points || []), { en: '', ne: '', hi: '', zh: '', ta: '' }]
    }));

  const setPoint = (index, value) =>
    setEditing((prev) => ({
      ...prev,
      points: (prev.points || []).map((p, i) => (i === index ? { ...(p || {}), [activeLang]: value } : p))
    }));

  const removePoint = (index) =>
    setEditing((prev) => ({ ...prev, points: (prev.points || []).filter((_, i) => i !== index) }));

  const movePoint = (index, dir) =>
    setEditing((prev) => {
      const points = [...(prev.points || [])];
      const target = index + dir;
      if (target < 0 || target >= points.length) return prev;
      [points[index], points[target]] = [points[target], points[index]];
      return { ...prev, points };
    });

  const handleSave = async () => {
    // Validate required fields
    if (!editing.title?.en?.trim()) {
      showToast(t.a2_eventsTitleRequired || 'Title is required (English)', 'error');
      return;
    }
    if (!editing.desc?.en?.trim()) {
      showToast(t.a2_eventsDescRequired || 'Description is required (English)', 'error');
      return;
    }
    if (!editing.date) {
      showToast(t.a2_eventsDateRequired || 'Date is required', 'error');
      return;
    }

    setLoading(true);
    try {
      if (editing._id) {
        const response = await api.put(`/admin/events/${editing._id}`, editing);
        // The controller replies with a { success, data, message } envelope.
        setEvents(events.map(e => e._id === editing._id ? response.data.data : e));
        showToast(t.a2_eventsUpdated || 'Event updated successfully', 'success');
      } else {
        const response = await api.post('/admin/events', editing);
        setEvents([...events, response.data.data]);
        showToast(t.a2_eventsCreated || 'Event created successfully', 'success');
      }
      setEditing(null);
    } catch (error) {
      console.error('Save event error:', error);
      showToast(error.response?.data?.message || t.a2_eventsSaveFailed || 'Failed to save event', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t.a2_eventsDeleteConfirm || 'Delete this event?')) return;
    setLoading(true);
    try {
      await api.delete(`/admin/events/${id}`);
      setEvents(events.filter(e => e._id !== id));
      showToast(t.a2_eventsDeleted || 'Event deleted successfully', 'success');
    } catch (error) {
      console.error('Delete event error:', error);
      showToast(error.response?.data?.message || t.a2_eventsDeleteFailed || 'Failed to delete event', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEventPhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast(t.a2_uploadImageFile || 'Please upload an image file', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast((t.a2_imageTooLarge || 'Image must be less than {size}MB').replace('{size}', '5'), 'error');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);
    // Only send eventId for an event that already exists. Sending the literal
    // string 'new' for an unsaved event made the backend call findById('new'),
    // which throws BSONError. The photo URL is kept in the form and persisted by
    // the create/update call instead.
    if (editing._id) {
      formData.append('eventId', editing._id);
    }

    try {
      const response = await api.post('/admin/upload/event', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setEditing({ ...editing, photo: response.data.url });
      showToast(t.a2_photoUploaded || 'Photo uploaded successfully', 'success');
    } catch (error) {
      console.error('Upload error:', error);
      showToast(error.response?.data?.message || t.a2_uploadFailed || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
    e.target.value = '';
  };

  const handleViewInterested = async (eventId) => {
    setLoadingInterested(true);
    setShowModal(true);
    try {
      const response = await api.get(`/events/${eventId}/interested-users`);
      setInterestedUsers(response.data.users || []);
      setSelectedEvent(events.find(e => e._id === eventId));
    } catch (error) {
      console.error('Error fetching interested users:', error);
      showToast(t.a2_eventsFetchInterestedFailed || 'Failed to fetch interested users', 'error');
    } finally {
      setLoadingInterested(false);
    }
  };

  const getLocalizedText = (obj) => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[activeLang] || obj.en || '';
  };

  // Which other events already claim each home slot, so the editor can warn
  // before two events end up fighting over the same position.
  const slotConflicts = useMemo(() => {
    const map = {};
    for (const e of events) {
      const slot = e.homeSlot || 0;
      if (slot < 1) continue;
      map[e._id] = events
        .filter((o) => o._id !== e._id && (o.homeSlot || 0) === slot)
        .map((o) => getLocalizedText(o.title) || t.a2_untitled || 'Untitled');
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getLocalizedText only reads activeLang, which is listed
  }, [events, activeLang, t]);

  // Filter events
  const filteredEvents = events.filter(e => {
    const title = e.title?.en?.toLowerCase() || '';
    const desc = e.desc?.en?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    
    let matchesSearch = title.includes(search) || desc.includes(search);
    
    if (filterUpcoming === 'upcoming') {
      matchesSearch = matchesSearch && e.upcoming === true;
    } else if (filterUpcoming === 'past') {
      matchesSearch = matchesSearch && e.upcoming === false;
    }
    
    return matchesSearch;
  });

  // Sort events by date (newest first)
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    const oa = a.order ?? 999;
    const ob = b.order ?? 999;
    if (oa !== ob) return oa - ob;
    return new Date(a.date) - new Date(b.date);
  });

  const getStatusBadge = (upcoming) => {
    if (upcoming) {
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700"><Check size={12} /> {t.a2_eventsUpcoming || 'Upcoming'}</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600"><Clock size={12} /> {t.a2_eventsPast || 'Past'}</span>;
  };

  // Shows which home page position (if any) this event occupies.
  const getHomeSlotBadge = (slot) => {
    if (!slot || slot < 1) {
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500">{t.a2_eventsNotOnHome || 'Not on home'}</span>;
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-vermilion text-white">
        {(t.a2_eventsHomeSlot || 'Home #{n}').replace('{n}', slot)}
      </span>
    );
  };

  if (editing) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-lg font-serif font-semibold text-ink">
            {editing._id ? (t.a2_eventsEditEvent || 'Edit Event') : (t.a2_eventsCreateNew || 'Create New Event')}
          </h4>
          <button 
            onClick={() => setEditing(null)} 
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Photo Upload */}
          <div>
            <label className="text-xs font-bold text-ink block mb-1.5">{t.a2_eventsPhoto || 'Event Photo'}</label>
            <div 
              className="relative border-2 border-dashed border-gray-300 rounded-xl overflow-hidden h-48 flex items-center justify-center cursor-pointer bg-gray-50 hover:border-vermilion transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                onChange={handleEventPhotoUpload} 
                className="hidden" 
              />
              {editing.photo ? (
                <>
                  <img src={editing.photo} alt={t.a2_eventsEvent || 'Event'} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs font-bold py-2 flex items-center justify-center gap-1.5">
                    <Upload size={14} /> {t.a2_eventsChangePhoto || 'Click to change photo'}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-ink-soft">
                  <Image size={40} />
                  <span className="text-sm font-medium">{t.a2_eventsUploadPhoto || 'Click to upload event photo'}</span>
                  <span className="text-xs text-mute">{(t.a2_imageFormatsMax || 'JPG, PNG, WEBP • Max {size}MB').replace('{size}', '5')}</span>
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <OmLoader size="lg" color="white" />
                </div>
              )}
            </div>
          </div>

          <LanguageSwitcher active={activeLang} onChange={setActiveLang} t={t} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-ink block mb-1.5">{t.a2_title || 'Title'} *</label>
              <input
                type="text"
                aria-label={t.a2_title || 'Title'} value={editing.title[activeLang] || ''}
                onChange={(e) => setEditing({ ...editing, title: { ...editing.title, [activeLang]: e.target.value } })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm bg-gray-50 hover:bg-white transition-colors"
                placeholder={t.a2_eventsTitlePlaceholder || 'Enter event title...'}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-ink block mb-1.5">{t.a2_date || 'Date'} *</label>
              <input
                type="date"
                aria-label={t.a2_date || 'Date'} value={editing.date || ''}
                onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm bg-gray-50 hover:bg-white transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-ink block mb-1.5">{t.description || 'Description'} *</label>
            <textarea
              rows={3}
              aria-label={t.description || 'Description'} value={editing.desc[activeLang] || ''}
              onChange={(e) => setEditing({ ...editing, desc: { ...editing.desc, [activeLang]: e.target.value } })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm bg-gray-50 hover:bg-white transition-colors resize-none"
              placeholder={t.a2_eventsDescPlaceholder || 'Enter event description...'}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-ink block mb-1.5">{t.a2_eventsNepaliDate || 'Nepali Date'}</label>
              <input
                type="text"
                aria-label={t.a2_eventsNepaliDate || 'Nepali Date'} value={editing.dateNepali[activeLang] || ''}
                onChange={(e) => setEditing({ ...editing, dateNepali: { ...editing.dateNepali, [activeLang]: e.target.value } })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm bg-gray-50 hover:bg-white transition-colors"
                placeholder={t.a2_eventsNepaliDatePlaceholder || 'Enter Nepali date...'}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-ink block mb-1.5">{t.a2_eventsGregDate || 'Gregorian Date'}</label>
              <input
                type="text"
                aria-label={t.a2_eventsGregDate || 'Gregorian Date'} value={editing.greg[activeLang] || ''}
                onChange={(e) => setEditing({ ...editing, greg: { ...editing.greg, [activeLang]: e.target.value } })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm bg-gray-50 hover:bg-white transition-colors"
                placeholder={t.a2_eventsGregDatePlaceholder || 'Enter Gregorian date...'}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-ink block mb-1.5">{t.a2_eventsPeriod || 'Period / Recurrence'}</label>
              <input
                type="text"
                aria-label={t.a2_eventsPeriod || 'Period / Recurrence'} value={editing.period?.[activeLang] || ''}
                onChange={(e) => setEditing({ ...editing, period: { ...(editing.period || {}), [activeLang]: e.target.value } })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm bg-gray-50 hover:bg-white transition-colors"
                placeholder={`${t.a2_eg || 'e.g.'} प्रत्येक शनिबार`}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-ink block mb-1.5">{t.a2_eventsYearLabel || 'Year Label'}</label>
              <input
                type="text"
                aria-label={t.a2_eventsYearLabel || 'Year Label'} value={editing.yearText || ''}
                onChange={(e) => setEditing({ ...editing, yearText: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm bg-gray-50 hover:bg-white transition-colors"
                placeholder={`${t.a2_eg || 'e.g.'} २०७६–२०८० (${t.a2_eventsLeaveBlank || 'leave blank if none'})`}
              />
            </div>
          </div>

          {/* Paragraphs */}
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-ink">{t.a2_eventsParagraphs || 'Paragraphs'}</label>
              <button
                type="button"
                onClick={addParagraph}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-50 text-vermilion text-xs font-semibold hover:bg-vermilion/20 transition-all"
              >
                <Plus size={12} /> {t.a2_eventsAddParagraph || 'Add Paragraph'}
              </button>
            </div>
            <p className="text-xs text-ink-soft mb-2.5">
              {t.a2_eventsParagraphsHelp || 'Add as many as you need. Empty ones are skipped on the public page.'}
            </p>
            {normalizeParagraphs(editing.paragraphs).length === 0 ? (
              <p className="text-xs text-ink-soft">{t.a2_eventsNoParagraphs || 'No paragraphs yet.'}</p>
            ) : (
              normalizeParagraphs(editing.paragraphs).map((para, pi) => (
                <div key={pi} className="mb-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs font-mono text-ink-soft w-4 shrink-0">{pi + 1}</span>
                    <span className="text-xs text-ink-soft flex-1">{(t.a2_eventsParagraphN || 'Paragraph {n}').replace('{n}', pi + 1)}</span>
                    <button
                      type="button"
                      onClick={() => moveParagraph(pi, -1)}
                      disabled={pi === 0}
                      className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"
                      title={t.a2_moveUp || 'Move up'}
                    >
                      <ChevronUp size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveParagraph(pi, 1)}
                      disabled={pi === normalizeParagraphs(editing.paragraphs).length - 1}
                      className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"
                      title={t.a2_moveDown || 'Move down'}
                    >
                      <ChevronDown size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeParagraph(pi)}
                      className="p-1.5 rounded hover:bg-red-100 text-red-500"
                      title={t.remove || 'Remove'}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    aria-label={(t.a2_eventsParagraphN || 'Paragraph {n}').replace('{n}', pi + 1)} value={(para || {})[activeLang] || ''}
                    onChange={(e) => setParagraph(pi, e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm bg-gray-50 hover:bg-white transition-colors resize-none"
                    placeholder={`${(t.a2_eventsParagraphN || 'Paragraph {n}').replace('{n}', pi + 1)}...`}
                  />
                </div>
              ))
            )}
          </div>

          {/* List heading + bullet points */}
          <div className="pt-4 border-t border-gray-100">
            <label className="text-xs font-bold text-ink block mb-1.5">{t.a2_eventsListHeading || 'List Heading (optional)'}</label>
            <input
              type="text"
              aria-label={t.a2_eventsListHeading || 'List Heading (optional)'} value={editing.listTitle?.[activeLang] || ''}
              onChange={(e) => setEditing({ ...editing, listTitle: { ...(editing.listTitle || {}), [activeLang]: e.target.value } })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm bg-gray-50 hover:bg-white transition-colors"
              placeholder={`${t.a2_eg || 'e.g.'} मुख्य धार्मिक अनुष्ठानहरू`}
            />

            <div className="flex items-center justify-between mt-4 mb-2">
              <label className="text-xs font-bold text-ink">
                {t.a2_eventsBulletPoints || 'Bullet Points'} ({(editing.points || []).length})
              </label>
              <button
                type="button"
                onClick={addPoint}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-50 text-vermilion text-xs font-semibold hover:bg-vermilion/20 transition-all"
              >
                <Plus size={12} /> {t.a2_eventsAddPoint || 'Add Point'}
              </button>
            </div>

            {(editing.points || []).length === 0 ? (
              <p className="text-xs text-ink-soft">{t.a2_eventsNoPoints || 'No bullet points.'}</p>
            ) : (
              (editing.points || []).map((point, pi) => (
                <div key={pi} className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-xs font-mono text-ink-soft w-4 shrink-0">{pi + 1}</span>
                  <input
                    type="text"
                    aria-label={(t.a2_eventsPointN || 'Point {n}').replace('{n}', pi + 1)} value={(point || {})[activeLang] || ''}
                    onChange={(e) => setPoint(pi, e.target.value)}
                    className="flex-1 min-w-0 px-4 py-2.5 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm bg-gray-50 hover:bg-white transition-colors"
                    placeholder={`${(t.a2_eventsPointN || 'Point {n}').replace('{n}', pi + 1)}...`}
                  />
                  <button
                    type="button"
                    onClick={() => movePoint(pi, -1)}
                    disabled={pi === 0}
                    className="p-2 rounded hover:bg-gray-100 disabled:opacity-30"
                    title={t.a2_moveUp || 'Move up'}
                  >
                    <ChevronUp size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => movePoint(pi, 1)}
                    disabled={pi === editing.points.length - 1}
                    className="p-2 rounded hover:bg-gray-100 disabled:opacity-30"
                    title={t.a2_moveDown || 'Move down'}
                  >
                    <ChevronDown size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removePoint(pi)}
                    className="p-2 rounded hover:bg-red-100 text-red-500"
                    title={t.remove || 'Remove'}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm font-medium text-ink">
              <input
                type="checkbox"
                checked={editing.upcoming !== false}
                onChange={(e) => setEditing({ ...editing, upcoming: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-vermilion focus:ring-vermilion"
              />
              {t.a2_eventsUpcomingEvent || 'Upcoming Event'}
            </label>

            <label className="flex items-center gap-2 text-sm font-medium text-ink">
              <span className="whitespace-nowrap">{t.a2_eventsHomePage || 'Home Page'}</span>
              <select
                value={String(editing.homeSlot || 0)}
                onChange={(e) => setEditing({ ...editing, homeSlot: Number(e.target.value) })}
                className="px-2.5 py-1.5 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm bg-gray-50 hover:bg-white transition-colors"
              >
                <option value="0">{t.a2_eventsNotOnHomePage || 'Not on home page'}</option>
                <option value="1">{(t.a2_eventsPositionN || 'Position {n}').replace('{n}', 1)}</option>
                <option value="2">{(t.a2_eventsPositionN || 'Position {n}').replace('{n}', 2)}</option>
                <option value="3">{(t.a2_eventsPositionN || 'Position {n}').replace('{n}', 3)}</option>
                <option value="4">{(t.a2_eventsPositionN || 'Position {n}').replace('{n}', 4)}</option>
              </select>
            </label>
          </div>

          {(editing.homeSlot || 0) > 0 && (
            <p className="text-xs leading-relaxed text-ink-soft bg-vermilion/5 border border-line rounded-lg px-3 py-2">
              {withNode(t.a2_eventsHomeNotice || 'This event will show on the home page as number {n} of 4.', <strong>{editing.homeSlot}</strong>)}
              {slotConflicts[editing._id]?.length > 0 && (
                <span className="block text-vermilion font-semibold mt-1">
                  {(t.a2_eventsSlotConflict || 'Position {n} is also used by: {names}').replace('{n}', editing.homeSlot).replace('{names}', slotConflicts[editing._id].join(', '))}
                </span>
              )}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={loading || uploading}
            className="w-full py-3 rounded-xl bg-vermilion text-white font-semibold text-sm hover:bg-[#820606] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {t.a2_saving || 'Saving...'}
              </>
            ) : (
              <>
                <Save size={18} />
                {editing._id ? (t.a2_eventsUpdateEvent || 'Update Event') : (t.a2_eventsCreateEvent || 'Create Event')}
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Engagement Stats */}
      {engagementStats && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-serif font-semibold text-ink flex items-center gap-2">
              <BarChart3 size={18} className="text-vermilion" />
              {t.a2_eventsEngagementStats || 'Event Engagement Stats'}
            </h4>
            <button
              onClick={() => setShowStats(!showStats)}
              className="text-xs text-ink-soft hover:text-vermilion transition-colors"
            >
              {showStats ? (t.a2_eventsHide || 'Hide') : (t.a2_eventsViewDetails || 'View Details')}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-red-700">{engagementStats.totalEvents || 0}</div>
              <div className="text-xs text-red-600 font-medium">{t.a2_eventsTotalEvents || 'Total Events'}</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-700">{engagementStats.upcomingEvents || 0}</div>
              <div className="text-xs text-green-600 font-medium">{t.a2_eventsUpcoming || 'Upcoming'}</div>
            </div>
            <div className="bg-gradient-to-br from-brand-50 to-brand-100 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-brand-700">{engagementStats.totalInterested || 0}</div>
              <div className="text-xs text-brand-600 font-medium">{t.a2_eventsTotalInterested || 'Total Interested'}</div>
            </div>
            <div className="bg-gradient-to-br from-brand-50 to-brand-100 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-brand-700">{engagementStats.totalViews || 0}</div>
              <div className="text-xs text-brand-600 font-medium">{t.a2_eventsTotalViews || 'Total Views'}</div>
            </div>
          </div>

          {showStats && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-ink-soft">{t.a2_eventsAvgInterested || 'Avg Interested:'}</span>
                  <span className="ml-2 font-bold text-ink">{Math.round(engagementStats.avgInterested || 0)}</span>
                </div>
                <div>
                  <span className="text-ink-soft">{t.a2_eventsAvgViews || 'Avg Views:'}</span>
                  <span className="ml-2 font-bold text-ink">{Math.round(engagementStats.avgViews || 0)}</span>
                </div>
                <div>
                  <span className="text-ink-soft">{t.a2_eventsTotalShares || 'Total Shares:'}</span>
                  <span className="ml-2 font-bold text-ink">{engagementStats.totalShares || 0}</span>
                </div>
                <div>
                  <span className="text-ink-soft">{t.a2_eventsPastEvents || 'Past Events:'}</span>
                  <span className="ml-2 font-bold text-ink">{engagementStats.pastEvents || 0}</span>
                </div>
              </div>
              
              {engagementStats.mostInterested?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-2">{t.a2_eventsMostPopular || 'Most Popular Events'}</p>
                  <div className="flex flex-wrap gap-2">
                    {engagementStats.mostInterested.map((e, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 rounded-full text-xs">
                        <Heart size={12} className="text-red-400 fill-red-400" />
                        {e.title?.en} ({e.interestedCount})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Events List */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 border-b border-gray-100 gap-4">
          <div>
            <h4 className="text-lg font-serif font-semibold text-ink flex items-center gap-2">
              <Calendar size={20} className="text-vermilion" />
              {t.manageEvents || 'Events'}
            </h4>
            <p className="text-xs text-ink-soft">
              {withNode(t.a2_eventsTotalCount || 'Total: {n} events', <span className="font-bold text-ink">{events?.length || 0}</span>)}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            {/* Search Bar */}
            <div className="relative w-full sm:w-48">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
              <input
                type="text"
                aria-label={t.a2_search || 'Search'} value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t.a2_eventsSearchPlaceholder || 'Search events...'}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm bg-gray-50 hover:bg-white transition-colors"
              />
            </div>
            {/* Filter */}
            <select
              aria-label={t.a2_eventsFilter || 'Filter events'} value={filterUpcoming}
              onChange={(e) => setFilterUpcoming(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm bg-gray-50 hover:bg-white transition-colors"
            >
              <option value="all">{t.a2_eventsAll || 'All Events'}</option>
              <option value="upcoming">{t.a2_eventsUpcoming || 'Upcoming'}</option>
              <option value="past">{t.a2_eventsPast || 'Past'}</option>
            </select>
            {/* View mode */}
            <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 text-xs font-semibold transition-colors ${
                  viewMode === 'grid' ? 'bg-vermilion text-white' : 'bg-gray-50 text-ink-soft hover:bg-white'
                }`}
              >
                {t.a2_eventsCards || 'Cards'}
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 text-xs font-semibold transition-colors ${
                  viewMode === 'table' ? 'bg-vermilion text-white' : 'bg-gray-50 text-ink-soft hover:bg-white'
                }`}
              >
                {t.a2_eventsTable || 'Table'}
              </button>
            </div>
            <button
              onClick={() => setEditing(blank())}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-vermilion text-white text-sm font-semibold hover:bg-[#820606] transition-all whitespace-nowrap"
            >
              <Plus size={16} /> {t.add || 'Add Event'}
            </button>
          </div>
        </div>

        {/* Events Grid / Table */}
        {sortedEvents?.length === 0 ? (
          <div className="text-center py-12">
            <Calendar size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-ink-soft">{searchTerm ? (t.a2_eventsNoMatch || 'No events found matching your search') : (t.a2_eventsNoneYet || 'No events added yet')}</p>
          </div>
        ) : viewMode === 'table' ? (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm table-fixed">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                  <th className="w-8 text-center font-bold py-2.5">#</th>
                  <th className="w-12 text-center font-bold py-2.5">{t.a2_eventsColPhoto || 'Photo'}</th>
                  <th className="text-left font-bold py-2.5 px-2">{t.a2_title || 'Title'}</th>
                  <th className="hidden lg:table-cell w-40 text-left font-bold py-2.5 px-2">{t.a2_eventsColPeriod || 'Period'}</th>
                  <th className="hidden md:table-cell w-20 text-left font-bold py-2.5 px-2">{t.a2_eventsColYear || 'Year'}</th>
                  <th className="w-12 text-center font-bold py-2.5">{t.a2_eventsColParas || 'Paras'}</th>
                  <th className="w-12 text-center font-bold py-2.5">{t.a2_eventsColPoints || 'Points'}</th>
                  <th className="hidden xl:table-cell w-16 text-center font-bold py-2.5">{t.status || 'Status'}</th>
                  <th className="hidden lg:table-cell w-24 text-center font-bold py-2.5">{t.a2_eventsColHome || 'Home'}</th>
                  <th className="w-28 text-center font-bold py-2.5">{t.actions || 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {sortedEvents.map((event, i) => {
                  const tText = getLocalizedText(event.title);
                  const paras = normalizeParagraphs(event.paragraphs).filter(
                    (p) => (p?.[activeLang] || p?.en || p?.ne || '').trim()
                  ).length;
                  const pts = (event.points || []).filter(
                    (p) => (p?.[activeLang] || p?.en || p?.ne || '').trim()
                  ).length;
                  return (
                    <tr key={event._id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-2 text-center text-xs font-mono text-gray-400">{i + 1}</td>
                      <td className="py-2">
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 mx-auto">
                          {event.photo ? (
                            <img src={event.photo} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <Image size={14} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td
                        className="py-2 px-2 cursor-pointer"
                        onClick={() => openEvent(event)}
                      >
                        <div className="font-medium text-gray-800 truncate">{tText || t.a2_eventsUntitled || 'Untitled Event'}</div>
                        <div className="text-xs text-gray-400 truncate">{event.date || ''}</div>
                      </td>
                      <td className="py-2 px-2 hidden lg:table-cell text-xs text-gray-500">
                        <div className="truncate">{getLocalizedText(event.period) || '—'}</div>
                      </td>
                      <td className="py-2 px-2 hidden md:table-cell text-xs text-gray-500">{event.yearText || '—'}</td>
                      <td className="py-2 text-center text-xs text-gray-500">{paras || '—'}</td>
                      <td className="py-2 text-center text-xs text-gray-500">{pts || '—'}</td>
                      <td className="py-2 hidden xl:table-cell text-center">{getStatusBadge(event.upcoming)}</td>
                      <td className="py-2 hidden lg:table-cell text-center">{getHomeSlotBadge(event.homeSlot)}</td>
                      <td className="py-2">
                        <div className="flex items-center justify-center gap-0.5">
                          <button
                            onClick={() => openEvent(event)}
                            className="p-1.5 rounded hover:bg-gray-100"
                            title={t.edit || 'Edit'}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleViewInterested(event._id)}
                            className="p-1.5 rounded hover:bg-gray-100"
                            title={t.a2_eventsViewInterested || 'View Interested Users'}
                          >
                            <Users size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(event._id)}
                            className="p-1.5 rounded hover:bg-red-100 text-red-500"
                            title={t.delete || 'Delete'}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 max-h-[600px] overflow-y-auto scroll-smooth">
            {sortedEvents.map((event) => {
              const titleText = getLocalizedText(event.title);
              const descText = getLocalizedText(event.desc);
              
              return (
                <div
                  key={event._id}
                  className="group bg-white rounded-xl border border-gray-100 hover:border-vermilion/30 hover:shadow-lg transition-all duration-300 overflow-hidden"
                >
                  {/* Photo */}
                  <div className="relative aspect-[16/10] bg-gradient-to-br from-vermilion/10 to-maroon-deep/5">
                    {event.photo ? (
                      <img 
                        src={event.photo} 
                        alt={titleText} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image size={40} className="text-ink-soft/30" />
                      </div>
                    )}
                    
                    {/* Status Badge */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                      {getStatusBadge(event.upcoming)}
                      {(event.homeSlot || 0) > 0 && getHomeSlotBadge(event.homeSlot)}
                    </div>

                    {/* Engagement badges */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1">
                      {event.interestedCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                          <Heart size={10} className="fill-red-400" />
                          {event.interestedCount}
                        </span>
                      )}
                      {event.views > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-brand-100 text-brand-700">
                          <EyeIcon size={10} />
                          {event.views}
                        </span>
                      )}
                    </div>

                    {/* Actions on hover */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEvent(event)}
                        className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all"
                        title={t.edit || 'Edit'}
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleViewInterested(event._id)}
                        className="p-2 rounded-lg bg-brand-500/70 hover:bg-brand-500 text-white transition-all"
                        title={t.a2_eventsViewInterested || 'View Interested Users'}
                      >
                        <Users size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(event._id)}
                        className="p-2 rounded-lg bg-red-500/70 hover:bg-red-500 text-white transition-all"
                        title={t.delete || 'Delete'}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h5 className="font-serif font-semibold text-ink text-sm truncate">
                      {titleText || t.a2_eventsUntitled || 'Untitled Event'}
                    </h5>
                    <p className="text-xs text-ink-soft line-clamp-2 mt-1">
                      {descText || t.a2_eventsNoDescription || 'No description'}
                    </p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                      <span className="text-xs text-ink-soft">
                        {event.date || t.a2_eventsNoDate || 'No date'}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-ink-soft">
                        <span className="flex items-center gap-0.5">
                          <Heart size={10} className="text-red-400" />
                          {event.interestedCount || 0}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <EyeIcon size={10} />
                          {event.views || 0}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Share2 size={10} />
                          {event.shareCount || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Interested Users Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-serif font-semibold text-ink">
                  {t.a2_eventsInterestedUsers || 'Interested Users'}
                </h3>
                <p className="text-sm text-ink-soft">
                  {selectedEvent?.title?.en || t.a2_eventsEvent || 'Event'} • {(t.a2_eventsUsersCount || '{n} users').replace('{n}', interestedUsers.length)}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {loadingInterested ? (
                <div className="flex items-center justify-center py-12">
                  <OmLoader size="md" color="vermilion" />
                </div>
              ) : interestedUsers.length === 0 ? (
                <div className="text-center py-12">
                  <Users size={48} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-ink-soft">{t.a2_eventsNoInterested || 'No users have marked this event as interested yet'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {interestedUsers.map((user, index) => (
                    <div key={user._id || index} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-vermilion to-maroon-deep text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {user.profilePhoto ? (
                          <img src={user.profilePhoto} alt={user.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          user.name?.charAt(0).toUpperCase() || 'U'
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-ink">{user.name || t.a2_eventsAnonymous || 'Anonymous'}</p>
                        <p className="text-xs text-ink-soft">{user.email || t.a2_eventsNoEmail || 'No email'}</p>
                        {user.phone && <p className="text-xs text-mute">{user.phone}</p>}
                      </div>
                      <span className="text-xs text-mute">#{index + 1}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Events Page Text — table form */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
        <div className="px-6 py-4 bg-gradient-to-r from-vermilion/10 to-vermilion/5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-gray-700 font-semibold flex items-center gap-2">
              <Pencil size={18} className="text-vermilion" />
              {t.a2_eventsPageText || 'Events Page Text'}
            </h4>
            <p className="text-xs text-gray-400">
              {t.a2_eventsPageTextHelp || 'Every heading and note on the public events page. The key decides where the row is printed; rows with an unknown key are saved but not shown.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={addTextRow}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-vermilion text-white text-xs font-semibold hover:bg-[#820606] transition-all"
            >
              <Plus size={14} /> {t.a2_eventsAddRow || 'Add Row'}
            </button>
            <button
              onClick={savePageText}
              disabled={savingText}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-vermilion text-white text-xs font-semibold hover:bg-[#820606] transition-all disabled:opacity-50"
            >
              {savingText ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t.a2_saving || 'Saving...'}
                </>
              ) : (
                <>
                  <Save size={14} /> {t.a2_eventsSaveText || 'Save Text'}
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="flex gap-1.5 mb-4 flex-wrap">
            {['ne', 'en', 'hi', 'zh', 'ta'].map((l) => (
              <button
                key={l}
                onClick={() => setTextLang(l)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                  textLang === l
                    ? 'bg-vermilion text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-brand-50'
                }`}
              >
                {l === 'ne' ? 'नेपाली' : l.toUpperCase()}
              </button>
            ))}
          </div>

          {pageText.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">{t.a2_eventsNoTextRows || 'No text rows yet.'}</p>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="w-8 text-center font-bold py-2.5">#</th>
                    <th className="w-44 text-left font-bold py-2.5 px-2">{t.a2_eventsColKey || 'Key'}</th>
                    <th className="text-left font-bold py-2.5 px-2">{(t.a2_eventsColText || 'Text ({lang})').replace('{lang}', textLang.toUpperCase())}</th>
                    <th className="w-16 text-center font-bold py-2.5">{t.a2_eventsColShow || 'Show'}</th>
                    <th className="w-28 text-center font-bold py-2.5">{t.actions || 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {pageText.map((row, i) => (
                    <tr key={row.key || i} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-2 text-center text-xs font-mono text-gray-400">{i + 1}</td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          aria-label={(t.a2_eventsKeyRow || 'Key (row {n})').replace('{n}', i + 1)} value={row.key || ''}
                          onChange={(e) => patchTextRow(i, (r) => ({ ...r, key: e.target.value }))}
                          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-xs font-mono"
                          placeholder="page-title"
                        />
                        <input
                          type="text"
                          aria-label={(t.a2_eventsHintRow || 'Hint for admins (row {n})').replace('{n}', i + 1)} value={row.label || ''}
                          onChange={(e) => patchTextRow(i, (r) => ({ ...r, label: e.target.value }))}
                          className="w-full px-2.5 py-1 mt-1 border border-gray-100 rounded-lg focus:border-vermilion focus:outline-none text-xs text-gray-500"
                          placeholder={t.a2_eventsHintPlaceholder || 'hint for admins'}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <textarea
                          rows={2}
                          aria-label={(t.a2_eventsTextRow || 'Text ({lang}) (row {n})').replace('{lang}', textLang.toUpperCase()).replace('{n}', i + 1)} value={(row.text || {})[textLang] || ''}
                          onChange={(e) => setTextValue(i, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm resize-none"
                          placeholder={t.a2_eventsTextPlaceholder || 'Text shown on the events page...'}
                        />
                      </td>
                      <td className="py-2 text-center">
                        <button
                          onClick={() => patchTextRow(i, (r) => ({ ...r, enabled: r.enabled === false }))}
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
                            row.enabled === false
                              ? 'bg-gray-100 text-gray-300 hover:bg-gray-200'
                              : 'bg-vermilion/15 text-vermilion'
                          }`}
                          title={row.enabled === false ? (t.a2_eventsHiddenOnPage || 'Hidden on the page') : (t.a2_eventsVisibleOnPage || 'Visible on the page')}
                        >
                          {row.enabled === false ? <XCircle size={14} /> : <Check size={14} />}
                        </button>
                      </td>
                      <td className="py-2">
                        <div className="flex items-center justify-center gap-0.5">
                          <button
                            onClick={() => moveTextRow(i, -1)}
                            disabled={i === 0}
                            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"
                            title={t.a2_moveUp || 'Move up'}
                          >
                            <ChevronDown size={14} className="rotate-180" />
                          </button>
                          <button
                            onClick={() => moveTextRow(i, 1)}
                            disabled={i === pageText.length - 1}
                            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"
                            title={t.a2_moveDown || 'Move down'}
                          >
                            <ChevronDown size={14} />
                          </button>
                          <button
                            onClick={() => removeTextRow(i)}
                            className="p-1.5 rounded hover:bg-red-100 text-red-500"
                            title={t.remove || 'Remove'}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-3 text-xs text-gray-400 leading-relaxed">
            {t.a2_eventsBuiltInKeys || 'Built-in keys:'} <span className="font-mono">page-title</span>,{' '}
            <span className="font-mono">page-subtitle</span>,{' '}
            <span className="font-mono">festivals-title</span>,{' '}
            <span className="font-mono">programs-title</span>,{' '}
            <span className="font-mono">footer-note</span>.{' '}
            {t.a2_eventsBuiltInFallback || "Clear a row's text to fall back to the built-in wording."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminEvents;