import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { formatDate as formatLocaleDate } from '../utils/formatDate';
import OmLoader from '../components/common/OmLoader';
import {
  Bell, User, Gift, Mail,
  Clock, Eye, EyeOff, Trash2,
  CalendarDays, MessageSquare,
  Search, ChevronDown, ChevronUp, RefreshCw,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';

// Delete Confirmation Modal Component
const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, title, message, count }) => {
  const { t } = useLanguage();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={28} className="text-red-500" />
          </div>
          <h3 className="text-xl font-serif font-bold text-ink mb-2">{title}</h3>
          <p className="text-sm text-ink-soft mb-2">{message}</p>
          {count > 0 && (
            <p className="text-sm font-semibold text-red-500 mb-4">
              {count > 1
                ? (t.a1_notifWillDeleteMany || 'This will delete {count} notifications').replace('{count}', count)
                : (t.a1_notifWillDeleteOne || 'This will delete 1 notification')}
            </p>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-ink-soft font-medium hover:bg-gray-50 transition-all"
            >
              {t.cancel || 'Cancel'}
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
            >
              {t.a1_notifDeleteAll || 'Delete All'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Display labels for notification types (values stay as API enums)
const getTypeLabels = (t) => ({
  all: t.a1_settingsAll || 'All',
  user: t.a1_notifTypeUser || 'User',
  booking: t.a1_notifTypeBooking || 'Booking',
  donation: t.donation || 'Donation',
  contact: t.a1_notifTypeContact || 'Contact',
  subscribe: t.a1_notifTypeSubscribe || 'Subscribe',
  system: t.a1_notifTypeSystem || 'System',
});

// Notification Item Component
const NotificationItem = ({ notification, onMarkRead, onDelete, onToggleExpand, isExpanded, getTimeAgo }) => {
  const { t, lang } = useLanguage();
  const typeLabels = getTypeLabels(t);
  const statusLabels = {
    pending: t.statusPending || 'Pending',
    confirmed: t.statusConfirmed || 'Confirmed',
    completed: t.statusCompleted || 'Completed',
    cancelled: t.a1_notifStatusCancelled || 'Cancelled',
    replied: t.a1_notifStatusReplied || 'Replied',
    read: t.a1_notifStatusRead || 'Read',
    new: t.a1_notifStatusNew || 'New',
  };
  const statusLabel = (s) => statusLabels[s] || s;
  const isUnread = !notification.read;
  const isOld = new Date(notification.time) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  return (
    <div
      className={`border rounded-xl p-4 transition-all duration-300 ${
        isUnread 
          ? 'bg-white shadow-md border-gray-200 hover:shadow-lg' 
          : 'bg-gray-50/50 border-gray-100 opacity-80'
      } ${isOld ? 'border-l-4 border-l-amber-400' : ''}`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${notification.bgColor}`}>
          {notification.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className={`text-sm font-semibold ${isUnread ? 'text-ink' : 'text-ink-soft'}`}>
                  {notification.title}
                </h4>
                {isUnread && (
                  <span className="w-2 h-2 rounded-full bg-vermilion flex-shrink-0 animate-pulse" />
                )}
                {isOld && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 font-medium">
                    {t.a1_notifOld || 'Old'}
                  </span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  notification.type === 'user' ? 'bg-brand-50 text-brand-600' :
                  notification.type === 'booking' ? 'bg-brand-50 text-vermilion' :
                  notification.type === 'donation' ? 'bg-green-50 text-green-600' :
                  notification.type === 'contact' ? 'bg-brand-50 text-brand-600' :
                  notification.type === 'subscribe' ? 'bg-amber-50 text-amber-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {typeLabels[notification.type] || notification.type}
                </span>
              </div>
              <p className={`text-sm ${isUnread ? 'text-ink-soft' : 'text-mute'}`}>
                {notification.message}
              </p>
              {isExpanded && notification.data && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs space-y-1 border border-gray-100">
                  {notification.type === 'user' && (
                    <>
                      <p><strong className="text-ink">{t.a1_notifName || 'Name'}:</strong> <span className="text-ink-soft">{notification.data.name}</span></p>
                      <p><strong className="text-ink">{t.email || 'Email'}:</strong> <span className="text-ink-soft">{notification.data.email}</span></p>
                      <p><strong className="text-ink">{t.phone || 'Phone'}:</strong> <span className="text-ink-soft">{notification.data.phone || t.a1_notifNA || 'N/A'}</span></p>
                      <p><strong className="text-ink">{t.role || 'Role'}:</strong> <span className="text-ink-soft">{notification.data.role || 'user'}</span></p>
                      <p><strong className="text-ink">{t.a1_notifJoined || 'Joined'}:</strong> <span className="text-ink-soft">{formatLocaleDate(notification.data.createdAt, lang)}</span></p>
                    </>
                  )}
                  {notification.type === 'booking' && (
                    <>
                      <p><strong className="text-ink">{t.a1_notifName || 'Name'}:</strong> <span className="text-ink-soft">{notification.data.name}</span></p>
                      <p><strong className="text-ink">{t.pujaType || 'Puja Type'}:</strong> <span className="text-ink-soft">{notification.data.type}</span></p>
                      <p><strong className="text-ink">{t.a1_notifDate || 'Date'}:</strong> <span className="text-ink-soft">{notification.data.date}</span></p>
                      <p><strong className="text-ink">{t.a1_notifTime || 'Time'}:</strong> <span className="text-ink-soft">{notification.data.time || t.a1_notifNA || 'N/A'}</span></p>
                      <p><strong className="text-ink">{t.status || 'Status'}:</strong> <span className={`px-2 py-0.5 rounded-full text-xs ${
                        notification.data.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                        notification.data.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        notification.data.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>{statusLabel(notification.data.status || 'pending')}</span></p>
                    </>
                  )}
                  {notification.type === 'donation' && (
                    <>
                      <p><strong className="text-ink">{t.a1_notifName || 'Name'}:</strong> <span className="text-ink-soft">{notification.data.name}</span></p>
                      <p><strong className="text-ink">{t.amount || 'Amount'}:</strong> <span className="text-ink-soft font-bold text-vermilion">NPR {notification.data.amount}</span></p>
                      <p><strong className="text-ink">{t.a1_notifDate || 'Date'}:</strong> <span className="text-ink-soft">{formatLocaleDate(notification.data.date, lang)}</span></p>
                      <p><strong className="text-ink">{t.status || 'Status'}:</strong> <span className={`px-2 py-0.5 rounded-full text-xs ${
                        notification.data.status === 'completed' ? 'bg-green-100 text-green-700' :
                        notification.data.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>{statusLabel(notification.data.status || 'pending')}</span></p>
                    </>
                  )}
                  {notification.type === 'contact' && (
                    <>
                      <p><strong className="text-ink">{t.a1_notifName || 'Name'}:</strong> <span className="text-ink-soft">{notification.data.name}</span></p>
                      <p><strong className="text-ink">{t.email || 'Email'}:</strong> <span className="text-ink-soft">{notification.data.email}</span></p>
                      <p><strong className="text-ink">{t.phone || 'Phone'}:</strong> <span className="text-ink-soft">{notification.data.phone || t.a1_notifNA || 'N/A'}</span></p>
                      <p><strong className="text-ink">{t.message || 'Message'}:</strong> <span className="text-ink-soft">{notification.data.message}</span></p>
                      <p><strong className="text-ink">{t.status || 'Status'}:</strong> <span className={`px-2 py-0.5 rounded-full text-xs ${
                        notification.data.status === 'replied' ? 'bg-green-100 text-green-700' :
                        notification.data.status === 'read' ? 'bg-gray-100 text-gray-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{statusLabel(notification.data.status || 'new')}</span></p>
                    </>
                  )}
                  {notification.type === 'subscribe' && (
                    <>
                      <p><strong className="text-ink">{t.email || 'Email'}:</strong> <span className="text-ink-soft">{notification.data.email}</span></p>
                      <p><strong className="text-ink">{t.a1_notifSubscribedOn || 'Subscribed'}:</strong> <span className="text-ink-soft">{formatLocaleDate(notification.data.createdAt || notification.time, lang)}</span></p>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => onToggleExpand(notification.id)}
                className="p-1 rounded hover:bg-gray-200 transition-colors"
                title={t.a1_notifExpand || 'Expand'}
              >
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              <button
                onClick={() => onMarkRead(notification.id)}
                className="p-1 rounded hover:bg-gray-200 transition-colors"
                title={isUnread ? (t.a1_notifMarkAsRead || 'Mark as read') : (t.a1_notifMarkAsUnread || 'Mark as unread')}
              >
                {isUnread ? <Eye size={16} className="text-ink-soft" /> : <EyeOff size={16} className="text-ink-soft" />}
              </button>
              <button
                onClick={() => onDelete(notification.id)}
                className="p-1 rounded hover:bg-red-100 transition-colors text-red-400 hover:text-red-600"
                title={t.delete || 'Delete'}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-mute flex items-center gap-1">
              <Clock size={12} />
              {getTimeAgo(notification.time)}
            </span>
            {isUnread && (
              <span className="text-xs text-vermilion font-medium flex items-center gap-1">
                <AlertCircle size={10} />
                {t.a1_notifNew || 'New'}
              </span>
            )}
            {isOld && (
              <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                <Clock size={10} />
                {t.a1_notifOver30Days || '30+ days'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminNotifications = () => {
  const { t } = useLanguage();
  useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteType, setDeleteType] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    users: 0,
    bookings: 0,
    donations: 0,
    contacts: 0,
    subscribes: 0,
    old: 0
  });
  const fetched = useRef(false);

  // Map a backend notification to the shape used by the UI
  const mapNotification = (n) => {
    const type = n.type || 'system';
    let icon;
    let bgColor;
    switch (type) {
      case 'user':
        icon = <User size={18} className="text-brand-500" />;
        bgColor = 'bg-brand-50';
        break;
      case 'booking':
        icon = <CalendarDays size={18} className="text-vermilion" />;
        bgColor = 'bg-brand-50';
        break;
      case 'donation':
        icon = <Gift size={18} className="text-green-500" />;
        bgColor = 'bg-green-50';
        break;
      case 'contact':
        icon = <MessageSquare size={18} className="text-brand-500" />;
        bgColor = 'bg-brand-50';
        break;
      case 'subscribe':
        icon = <Mail size={18} className="text-amber-500" />;
        bgColor = 'bg-amber-50';
        break;
      default:
        icon = <Bell size={18} className="text-gray-500" />;
        bgColor = 'bg-gray-50';
        break;
    }
    return {
      id: n._id,
      type,
      title: n.title,
      message: n.message,
      time: n.createdAt || new Date().toISOString(),
      read: !!n.read,
      data: n.data || {},
      icon,
      bgColor,
    };
  };

  // Fetch real notifications from backend
  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    const fetchNotifications = async () => {
      try {
        const res = await api.get('/admin/notifications');

        const notifs = (res.data?.data || []).map(mapNotification);
        notifs.sort((a, b) => new Date(b.time) - new Date(a.time));

        setNotifications(notifs);
        updateStats(notifs, res.data?.stats);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        showToast(t.a1_notifLoadFailed || 'Failed to load notifications', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [showToast, t]);

  const handleDelete = (id) => {
    setDeleteType('single');
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    const id = deleteId;
    try {
      await api.delete(`/admin/notifications/${id}`);

      const updatedNotifications = notifications.filter(n => n.id !== id);
      setNotifications(updatedNotifications);
      updateStats(updatedNotifications);

      showToast(t.a1_notifDeleted || 'Notification deleted successfully', 'success');
    } catch (error) {
      console.error('Delete notification error:', error);
      showToast(t.a1_notifDeleteFailed || 'Failed to delete notification', 'error');
    }
    setShowDeleteModal(false);
    setDeleteId(null);
    setDeleteType(null);
  };

  const handleDeleteAll = () => {
    setDeleteType('all');
    setDeleteId(null);
    setShowDeleteModal(true);
  };

  const confirmDeleteAll = async () => {
    try {
      await api.delete('/admin/notifications', { data: { type: filter } });

      const remaining = filter === 'all'
        ? []
        : notifications.filter(n => n.type !== filter);

      setNotifications(remaining);
      updateStats(remaining);

      showToast(t.a1_notifDeletedMany || 'Notifications deleted successfully', 'success');
    } catch (error) {
      console.error('Delete all notifications error:', error);
      showToast(t.a1_notifDeleteManyFailed || 'Failed to delete notifications', 'error');
    }
    setShowDeleteModal(false);
    setDeleteType(null);
  };

  const handleMarkRead = async (id) => {
    const notification = notifications.find(n => n.id === id);
    if (!notification) return;

    const wasUnread = !notification.read;
    const nextRead = !notification.read;

    // Optimistic update
    const updatedNotifications = notifications.map(n => {
      if (n.id === id) {
        return { ...n, read: nextRead };
      }
      return n;
    });

    setNotifications(updatedNotifications);
    updateStats(updatedNotifications);

    try {
      await api.put(`/admin/notifications/${id}/read`, { read: nextRead });
      showToast(wasUnread ? (t.a1_notifMarkedRead || 'Notification marked as read') : (t.a1_notifMarkedUnread || 'Notification marked as unread'), 'success');
    } catch (error) {
      console.error('Mark notification read error:', error);
      // Revert on failure
      setNotifications(notifications);
      updateStats(notifications);
      showToast(t.a1_notifUpdateFailed || 'Failed to update notification', 'error');
    }
  };

  const handleMarkAllRead = async () => {
    const unreadCount = notifications.filter(n => !n.read).length;

    const updatedNotifications = notifications.map(n => ({
      ...n,
      read: true
    }));

    setNotifications(updatedNotifications);
    updateStats(updatedNotifications);

    try {
      await api.put('/admin/notifications/read-all');
      showToast((t.a1_notifMarkedAllRead || 'Marked {count} notifications as read').replace('{count}', unreadCount), 'success');
    } catch (error) {
      console.error('Mark all read error:', error);
      showToast(t.a1_notifMarkAllReadFailed || 'Failed to mark all as read', 'error');
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const refreshNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/notifications');

      const notifs = (res.data?.data || []).map(mapNotification);
      notifs.sort((a, b) => new Date(b.time) - new Date(a.time));

      setNotifications(notifs);
      updateStats(notifs, res.data?.stats);
      showToast(t.a1_notifRefreshed || 'Notifications refreshed', 'success');
    } catch (error) {
      console.error('Error refreshing notifications:', error);
      showToast(t.a1_notifRefreshFailed || 'Failed to refresh', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateStats = (notifs, serverStats) => {
    const unreadCount = notifs.filter(n => !n.read).length;
    const userCount = notifs.filter(n => n.type === 'user').length;
    const bookingCount = notifs.filter(n => n.type === 'booking').length;
    const donationCount = notifs.filter(n => n.type === 'donation').length;
    const contactCount = notifs.filter(n => n.type === 'contact').length;
    const subscribeCount = notifs.filter(n => n.type === 'subscribe').length;

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const oldCount = notifs.filter(n => new Date(n.time) < threeMonthsAgo).length;

    setStats({
      total: serverStats?.total ?? notifs.length,
      unread: serverStats?.unread ?? unreadCount,
      users: serverStats?.users ?? userCount,
      bookings: serverStats?.bookings ?? bookingCount,
      donations: serverStats?.donations ?? donationCount,
      contacts: serverStats?.contacts ?? contactCount,
      subscribes: serverStats?.subscribes ?? subscribeCount,
      old: oldCount
    });
  };

  const filteredNotifications = notifications.filter(n => {
    const matchesFilter = filter === 'all' || n.type === filter;
    const matchesSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          n.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (n.data?.name && n.data.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const getTimeAgo = (dateString) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffMins < 1) return t.a1_notifJustNow || 'Just now';
    if (diffMins < 60) return (t.a1_notifMinutesAgo || '{n}m ago').replace('{n}', diffMins);
    if (diffHours < 24) return (t.a1_notifHoursAgo || '{n}h ago').replace('{n}', diffHours);
    if (diffDays < 7) return (t.a1_notifDaysAgo || '{n}d ago').replace('{n}', diffDays);
    if (diffMonths < 1) return (t.a1_notifDaysAgo || '{n}d ago').replace('{n}', diffDays);
    if (diffMonths < 12) return (t.a1_notifMonthsAgo || '{n}mo ago').replace('{n}', diffMonths);
    return (t.a1_notifYearsAgo || '{n}y ago').replace('{n}', Math.floor(diffMonths / 12));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <OmLoader size="lg" color="vermilion" className="mx-auto mb-4" />
          <p className="text-ink-soft text-sm">{t.a1_notifLoading || 'Loading notifications...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center hover:shadow-md transition-all">
          <div className="text-xl font-bold text-ink">{stats.total}</div>
          <div className="text-xs text-ink-soft font-medium">{t.a1_notifTotal || 'Total'}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-line p-3 text-center hover:shadow-md transition-all">
          <div className="text-xl font-bold text-vermilion">{stats.unread}</div>
          <div className="text-xs text-ink-soft font-medium">{t.a1_notifUnread || 'Unread'}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center hover:shadow-md transition-all">
          <div className="text-xl font-bold text-gray-600">{stats.users}</div>
          <div className="text-xs text-ink-soft font-medium">{t.a1_notifUsers || 'Users'}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-vermilion/10 p-3 text-center hover:shadow-md transition-all">
          <div className="text-xl font-bold text-vermilion">{stats.bookings}</div>
          <div className="text-xs text-ink-soft font-medium">{t.a1_notifBookings || 'Bookings'}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-green-100 p-3 text-center hover:shadow-md transition-all">
          <div className="text-xl font-bold text-green-600">{stats.donations}</div>
          <div className="text-xs text-ink-soft font-medium">{t.a1_notifDonations || 'Donations'}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-brand-100 p-3 text-center hover:shadow-md transition-all">
          <div className="text-xl font-bold text-brand-600">{stats.contacts}</div>
          <div className="text-xs text-ink-soft font-medium">{t.a1_notifContacts || 'Contacts'}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-3 text-center hover:shadow-md transition-all">
          <div className="text-xl font-bold text-amber-600">{stats.subscribes}</div>
          <div className="text-xs text-ink-soft font-medium">{t.a1_notifSubscribers || 'Subscribers'}</div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-serif font-bold text-ink">{t.a1_notifTitle || 'Notifications'}</h1>
          <p className="text-sm text-ink-soft">
            {stats.unread > 0
              ? (t.a1_notifUnreadCount || '{count} unread notifications').replace('{count}', stats.unread)
              : `${t.a1_notifAllCaughtUp || 'All caught up!'} 🎉`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={refreshNotifications}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-all"
            title={t.a1_settingsRefresh || 'Refresh'}
          >
            <RefreshCw size={18} className="text-ink-soft" />
          </button>
          {notifications.length > 0 && (
            <>
              <button
                onClick={handleMarkAllRead}
                className="px-4 py-2 rounded-lg bg-brand-50 text-vermilion text-sm font-semibold hover:bg-vermilion/20 transition-all"
              >
                {t.a1_notifMarkAllRead || 'Mark All Read'}
              </button>
              <button
                onClick={handleDeleteAll}
                className="px-4 py-2 rounded-lg bg-red-50 text-red-500 text-sm font-semibold hover:bg-red-100 transition-all"
              >
                {t.a1_notifDeleteAll || 'Delete All'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex gap-2 flex-wrap">
          {['all', 'user', 'booking', 'donation', 'contact', 'subscribe'].map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filter === type
                  ? 'bg-vermilion text-white shadow-md shadow-black/10'
                  : 'bg-gray-100 text-ink-soft hover:bg-gray-200'
              }`}
            >
              {getTypeLabels(t)[type] || type}
            </button>
          ))}
        </div>
        <div className="relative flex-1 sm:max-w-xs">
          <input
            type="text"
            aria-label={t.a1_settingsSearch || 'Search'} placeholder={t.a1_notifSearchPlaceholder || 'Search notifications...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-1.5 pl-9 border border-gray-200 rounded-lg focus:border-vermilion focus:ring-2 focus:ring-line focus:outline-none text-sm"
          />
          <Search size={16} className="absolute left-3 top-2 text-ink-soft" />
        </div>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
          <Bell size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-ink-soft font-medium">{t.a1_notifEmpty || 'No notifications'}</p>
          <p className="text-sm text-mute mt-1">{t.a1_notifAllCaughtUp || 'All caught up!'} 🎉</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={handleMarkRead}
              onDelete={handleDelete}
              onToggleExpand={toggleExpand}
              isExpanded={expandedId === notification.id}
              getTimeAgo={getTimeAgo}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteId(null);
          setDeleteType(null);
        }}
        onConfirm={() => {
          if (deleteType === 'all') {
            confirmDeleteAll();
          } else {
            confirmDelete();
          }
        }}
        title={deleteType === 'all' ? (t.a1_notifDeleteAllTitle || "Delete All Notifications") : (t.a1_notifDeleteOneTitle || "Delete Notification")}
        message={deleteType === 'all'
          ? (t.a1_notifDeleteAllConfirm || "Are you sure you want to delete all notifications? This action cannot be undone.")
          : (t.a1_notifDeleteOneConfirm || "Are you sure you want to delete this notification?")
        }
        count={deleteType === 'all' ? notifications.length : 1}
      />
    </div>
  );
};

export default AdminNotifications;