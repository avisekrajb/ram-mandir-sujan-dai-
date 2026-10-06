import React, { useCallback, useEffect, useState } from 'react';
// MessageSquareText does not exist in the installed lucide-react (0.294); that missing export broke the whole build.
import { Star, Check, EyeOff, Trash2, RefreshCw, MessageSquare as MessageSquareText } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';
import { formatDate } from '../../utils/formatDate';
import OmLoader from '../common/OmLoader';

const STATUS_STYLE = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  approved: 'bg-green-100 text-green-700 border-green-200',
  hidden: 'bg-gray-100 text-gray-600 border-gray-200',
};

/** Moderation queue for the reviews visitors leave on the Contact page. */
const AdminReviews = ({ t }) => {
  const { showToast } = useToast();
  const { lang } = useLanguage();
  const [reviews, setReviews] = useState([]);
  const [counts, setCounts] = useState({ total: 0, pending: 0, approved: 0, hidden: 0 });
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const labelFor = (status) =>
    ({
      all: t.ct_adminAll || 'All',
      pending: t.ct_adminPending || 'Pending',
      approved: t.ct_adminApproved || 'Approved',
      hidden: t.ct_adminHidden || 'Hidden',
    }[status] || status);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/reviews/admin/all');
      setReviews(res.data?.data || []);
      setCounts(res.data?.counts || { total: 0, pending: 0, approved: 0, hidden: 0 });
    } catch (error) {
      console.error('Load reviews error:', error);
      showToast(error.response?.data?.message || t.ct_adminLoadFailed || 'Failed to load reviews', 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once; showToast/t are stable enough here
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (id, status) => {
    setBusyId(id);
    try {
      await api.patch(`/reviews/${id}/status`, { status });
      showToast(t.ct_adminUpdated || 'Review updated', 'success');
      await load();
    } catch (error) {
      showToast(error.response?.data?.message || t.ct_adminFailed || 'Something went wrong', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id) => {
    if (!window.confirm(t.ct_adminDeleteConfirm || 'Delete this review?')) return;
    setBusyId(id);
    try {
      await api.delete(`/reviews/${id}`);
      showToast(t.ct_adminDeleted || 'Review deleted', 'success');
      await load();
    } catch (error) {
      showToast(error.response?.data?.message || t.ct_adminFailed || 'Something went wrong', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const visible = filter === 'all' ? reviews : reviews.filter((r) => r.status === filter);

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">{t.ct_adminHint || 'New reviews wait here. Only approved reviews appear on the Contact page.'}</p>

      {/* Filter tabs with counts */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 flex flex-wrap items-center gap-2">
        {['pending', 'approved', 'hidden', 'all'].map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            aria-pressed={filter === key}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === key ? 'bg-[#A80808] text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {labelFor(key)}
            <span className={`ml-2 text-xs ${filter === key ? 'text-white/80' : 'text-gray-400'}`}>
              {key === 'all' ? counts.total : counts[key]}
            </span>
          </button>
        ))}
        <div className="flex-1" />
        <button
          type="button"
          onClick={load}
          aria-label={t.ct_adminRefresh || 'Refresh'}
          className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
        >
          <RefreshCw size={16} className="text-gray-400" />
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <OmLoader size="md" color="maroon" />
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquareText size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">{t.ct_adminNone || 'No reviews here.'}</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 m-0 p-0 list-none">
            {visible.map((review) => (
              <li key={review._id} className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="m-0 font-semibold text-gray-800 break-words">{review.name}</p>
                      <span className="inline-flex gap-0.5" role="img" aria-label={`${review.rating}/5`}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            size={14}
                            aria-hidden
                            style={{ color: n <= review.rating ? '#A80808' : '#D9D3D0', fill: n <= review.rating ? '#A80808' : 'none' }}
                          />
                        ))}
                      </span>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${STATUS_STYLE[review.status] || STATUS_STYLE.pending}`}>
                        {labelFor(review.status)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(review.createdAt, lang, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="mt-2 mb-0 text-sm text-gray-600 whitespace-pre-wrap break-words">{review.comment}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {review.status !== 'approved' && (
                      <button
                        type="button"
                        disabled={busyId === review._id}
                        onClick={() => setStatus(review._id, 'approved')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 transition-all disabled:opacity-50"
                      >
                        <Check size={15} aria-hidden />
                        {t.ct_adminApprove || 'Approve'}
                      </button>
                    )}
                    {review.status !== 'hidden' && (
                      <button
                        type="button"
                        disabled={busyId === review._id}
                        onClick={() => setStatus(review._id, 'hidden')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 transition-all disabled:opacity-50"
                      >
                        <EyeOff size={15} aria-hidden />
                        {t.ct_adminHide || 'Hide'}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busyId === review._id}
                      onClick={() => remove(review._id)}
                      aria-label={t.ct_adminDelete || 'Delete'}
                      title={t.ct_adminDelete || 'Delete'}
                      className="p-2 rounded-xl text-red-500 hover:bg-red-50 transition-all disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AdminReviews;
