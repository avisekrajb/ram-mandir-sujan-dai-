import React, { useState, useEffect } from 'react';
import { 
  Mail, Reply, Trash2, Eye, X, Clock,
  Search, RefreshCw, ChevronDown, ChevronUp,
  Send, CheckCircle,
  Loader2
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';
import { formatDate as formatLocaleDate } from '../../utils/formatDate';
import OmLoader from '../../components/common/OmLoader';

const AdminContact = ({ t }) => {
  const { showToast } = useToast();
  const { lang } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    read: 0,
    replied: 0,
  });
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    fetchMessages();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once on mount
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const response = await api.get('/contact');
      setMessages(response.data.data || []);
    } catch (error) {
      console.error('Fetch messages error:', error);
      showToast(t.a1_contactLoadFailed || 'Failed to load messages', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/contact/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Fetch stats error:', error);
    }
  };

  const handleViewMessage = async (id) => {
    try {
      const response = await api.get(`/contact/${id}`);
      setMessages(messages.map(m => m._id === id ? response.data.data : m));
      setSelectedMessage(response.data.data);
      setShowReplyModal(true);
      fetchStats();
    } catch (error) {
      console.error('View message error:', error);
      showToast(t.a1_contactLoadMessageFailed || 'Failed to load message', 'error');
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || replyText.trim().length < 2) {
      showToast(t.a1_contactEnterReply || 'Please enter a reply message', 'error');
      return;
    }

    setSendingReply(true);
    try {
      await api.post(`/contact/${selectedMessage._id}/reply`, { 
        reply: replyText.trim() 
      });
      
      showToast(t.a1_contactReplySent || 'Reply sent successfully!', 'success');
      setReplyText('');
      setShowReplyModal(false);
      setSelectedMessage(null);
      fetchMessages();
      fetchStats();
    } catch (error) {
      console.error('Send reply error:', error);
      showToast(error.response?.data?.message || t.a1_contactReplyFailed || 'Failed to send reply', 'error');
    } finally {
      setSendingReply(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t.a1_contactDeleteConfirm || 'Delete this message?')) return;
    try {
      await api.delete(`/contact/${id}`);
      setMessages(messages.filter(m => m._id !== id));
      showToast(t.a1_contactDeleted || 'Message deleted', 'success');
      fetchStats();
    } catch (error) {
      console.error('Delete error:', error);
      showToast(t.a1_contactDeleteFailed || 'Failed to delete', 'error');
    }
  };

  const handleBulkDelete = async () => {
    const selectedIds = messages.filter(m => m.selected).map(m => m._id);
    if (selectedIds.length === 0) {
      showToast(t.a1_contactSelectToDelete || 'Please select messages to delete', 'warning');
      return;
    }
    if (!window.confirm((t.a1_contactBulkDeleteConfirm || 'Delete {count} messages?').replace('{count}', selectedIds.length))) return;
    
    try {
      await api.delete('/contact/bulk', { data: { ids: selectedIds } });
      setMessages(messages.filter(m => !m.selected));
      showToast((t.a1_contactBulkDeleted || '{count} messages deleted').replace('{count}', selectedIds.length), 'success');
      fetchStats();
    } catch (error) {
      console.error('Bulk delete error:', error);
      showToast(t.a1_contactBulkDeleteFailed || 'Failed to delete messages', 'error');
    }
  };

  const toggleSelect = (id) => {
    setMessages(messages.map(m => 
      m._id === id ? { ...m, selected: !m.selected } : m
    ));
  };

  const toggleSelectAll = () => {
    const allSelected = messages.every(m => m.selected);
    setMessages(messages.map(m => ({ ...m, selected: !allSelected })));
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      read: 'bg-gray-100 text-gray-700 border-gray-200',
      replied: 'bg-green-100 text-green-700 border-green-200',
    };
    return colors[status] || colors.pending;
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'pending': return <Clock size={14} className="text-yellow-500" />;
      case 'read': return <Eye size={14} className="text-gray-500" />;
      case 'replied': return <CheckCircle size={14} className="text-green-500" />;
      default: return <Clock size={14} className="text-gray-500" />;
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: t.pending || 'Pending',
      read: t.a1_contactRead || 'Read',
      replied: t.a1_contactReplied || 'Replied',
    };
    return labels[status] || (status ? status.charAt(0).toUpperCase() + status.slice(1) : '');
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

  const filteredMessages = messages.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          m.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || m.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-medium">{t.a1_contactTotal || 'Total'}</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
              <Mail size={18} className="text-gray-500" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-yellow-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-yellow-600 font-medium">{t.pending || 'Pending'}</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center">
              <Clock size={18} className="text-yellow-500" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-brand-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 font-medium">{t.a1_contactRead || 'Read'}</p>
              <p className="text-2xl font-bold text-gray-600">{stats.read}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
              <Eye size={18} className="text-gray-500" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-green-600 font-medium">{t.a1_contactReplied || 'Replied'}</p>
              <p className="text-2xl font-bold text-green-600">{stats.replied}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <CheckCircle size={18} className="text-green-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              aria-label={t.a1_contactSelectAll || 'Select all'} checked={messages.length > 0 && messages.every(m => m.selected)}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-gray-300 text-[#A80808] focus:ring-[#A80808]"
            />
            <span className="text-xs text-gray-400">
              {(t.a1_contactSelectedCount || '{count} selected').replace('{count}', messages.filter(m => m.selected).length)}
            </span>
          </div>
          
          <button
            onClick={handleBulkDelete}
            className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-all"
          >
            <Trash2 size={16} className="inline mr-1" />
            {t.a1_contactDeleteSelected || 'Delete Selected'}
          </button>

          <div className="flex-1" />

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              aria-label={t.a1_contactSearch || 'Search'} value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t.a1_contactSearchPlaceholder || 'Search messages...'}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:border-[#A80808] focus:outline-none text-sm w-40 sm:w-56"
            />
          </div>

          <select
            aria-label={t.a1_contactFilterByStatus || 'Filter by status'} value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:border-[#A80808] focus:outline-none text-sm bg-white"
          >
            <option value="all">{t.a1_contactAllStatus || 'All Status'}</option>
            <option value="pending">{getStatusLabel('pending')}</option>
            <option value="read">{getStatusLabel('read')}</option>
            <option value="replied">{getStatusLabel('replied')}</option>
          </select>

          <button
            onClick={() => { fetchMessages(); fetchStats(); }}
            aria-label={t.a1_contactRefresh || 'Refresh'}
            className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
          >
            <RefreshCw size={16} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Messages Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <OmLoader size="md" color="maroon" />
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center py-12">
            <Mail size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">{t.a1_contactNoMessages || 'No messages found'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-200">
                  <th className="pb-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wide">
                    <input
                      type="checkbox"
                      aria-label={t.a1_contactSelectAll || 'Select all'} checked={messages.length > 0 && messages.every(m => m.selected)}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-[#A80808] focus:ring-[#A80808]"
                    />
                  </th>
                  <th className="pb-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wide">{t.a1_contactFrom || 'From'}</th>
                  <th className="pb-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wide hidden md:table-cell">{t.message || 'Message'}</th>
                  <th className="pb-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wide hidden lg:table-cell">{t.a1_contactDate || 'Date'}</th>
                  <th className="pb-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wide">{t.status || 'Status'}</th>
                  <th className="pb-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wide text-right">{t.actions || 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredMessages.map((message) => (
                  <React.Fragment key={message._id}>
                    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          aria-label={message.name ? (t.a1_contactSelectName || 'Select {name}').replace('{name}', message.name) : (t.a1_contactSelectMessage || 'Select message')} checked={message.selected || false}
                          onChange={() => toggleSelect(message._id)}
                          className="w-4 h-4 rounded border-gray-300 text-[#A80808] focus:ring-[#A80808]"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#A80808] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {message.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{message.name}</p>
                            <p className="text-xs text-gray-400">{message.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        <p className="text-gray-600 truncate max-w-[200px]">{message.message}</p>
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell text-gray-500 text-xs">
                        {formatDate(message.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full border ${getStatusBadge(message.status)}`}>
                          {getStatusIcon(message.status)}
                          {getStatusLabel(message.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {message.status !== 'replied' && (
                            <button
                              onClick={() => handleViewMessage(message._id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all"
                              title={t.a1_contactReply || 'Reply'}
                            >
                              <Reply size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => setExpandedId(expandedId === message._id ? null : message._id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#A80808] transition-all"
                            title={t.a1_contactViewDetails || 'View Details'}
                          >
                            {expandedId === message._id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                          <button
                            onClick={() => handleDelete(message._id)}
                            className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
                            title={t.delete || 'Delete'}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Expanded Details */}
                    {expandedId === message._id && (
                      <tr>
                        <td colSpan="6" className="px-4 py-4 bg-gray-50/50 border-b border-gray-100">
                          <div className="space-y-3">
                            <div>
                              <p className="text-xs text-gray-400">{t.message || 'Message'}</p>
                              <p className="text-gray-700 text-sm whitespace-pre-wrap">{message.message}</p>
                            </div>
                            {message.reply && (
                              <div className="bg-green-50 rounded-xl p-3 border border-green-200">
                                <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                                  <CheckCircle size={12} />
                                  {t.a1_contactReply || 'Reply'}
                                </p>
                                <p className="text-gray-700 text-sm mt-1 whitespace-pre-wrap">{message.reply}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {(t.a1_contactRepliedByOn || 'Replied by {name} on {date}').replace('{name}', message.repliedBy).replace('{date}', formatDate(message.repliedAt))}
                                </p>
                              </div>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-400">
                              <span>{(t.a1_contactFromEmail || 'From: {email}').replace('{email}', message.email)}</span>
                              <span>•</span>
                              <span>{(t.a1_contactReceivedOn || 'Received: {date}').replace('{date}', formatDate(message.createdAt))}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reply Modal */}
      {showReplyModal && selectedMessage && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-[#A80808]/10 to-[#A80808]/5 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-serif font-bold text-[#A80808] flex items-center gap-2">
                <Reply size={18} />
                {(t.a1_contactReplyTo || 'Reply to {name}').replace('{name}', selectedMessage.name)}
              </h3>
              <button
                onClick={() => {
                  setShowReplyModal(false);
                  setSelectedMessage(null);
                  setReplyText('');
                }}
                aria-label={t.close || 'Close'}
                className="p-2 rounded-xl hover:bg-gray-100 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400">{t.a1_contactOriginalMessage || 'Original Message'}</p>
                <p className="text-sm font-medium text-gray-800 mt-1">{selectedMessage.name}</p>
                <p className="text-xs text-gray-400">{selectedMessage.email}</p>
                <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{selectedMessage.message}</p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">{t.a1_contactYourReply || 'Your Reply'}</label>
                <textarea
                  aria-label={t.a1_contactYourReply || 'Your Reply'} value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={5}
                  placeholder={t.a1_contactReplyPlaceholder || 'Type your reply here...'}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#A80808] focus:ring-2 focus:ring-[#A80808]/10 focus:outline-none transition-all text-sm resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {(t.a1_contactCharsEmailNote || '{count} characters • This will be sent as an email to the user').replace('{count}', replyText.length)}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => {
                    setShowReplyModal(false);
                    setSelectedMessage(null);
                    setReplyText('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                >
                  {t.cancel || 'Cancel'}
                </button>
                <button
                  onClick={handleSendReply}
                  disabled={sendingReply || !replyText.trim()}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#A80808] text-white rounded-xl text-sm font-semibold hover:bg-[#660505] transition-all disabled:opacity-50"
                >
                  {sendingReply ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {t.contactSending || 'Sending...'}
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      {t.a1_contactSendReply || 'Send Reply'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminContact;