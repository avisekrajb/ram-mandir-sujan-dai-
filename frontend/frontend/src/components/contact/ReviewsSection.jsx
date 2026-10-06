import React, { useCallback, useEffect, useState } from 'react';
import { Star, Loader2, CheckCircle2, Send } from 'lucide-react';
import SubTitle from '../common/SubTitle';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../utils/formatDate';
import { rejectionMessage, fillText } from '../../utils/rejectionMessage';
import { toNepaliDigits } from '../../utils/nepaliCalendar';
import api from '../../services/api';

const MAX_COMMENT = 600;
const INITIAL_VISIBLE = 4;

const CARD_STYLE = { boxShadow: '0 12px 40px -20px rgba(0,0,0,0.12)' };
const FILLED = '#A80808';
const EMPTY = '#D9D3D0';

/**
 * Read-only row of five stars. A star is filled once the value is within a
 * quarter of it, so an average of 4.5 shows four stars rather than overstating.
 */
const Stars = ({ value, size = 16, label }) => (
  <span role="img" aria-label={label} className="inline-flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => {
      const on = n <= value + 0.25;
      return <Star key={n} size={size} aria-hidden style={{ color: on ? FILLED : EMPTY, fill: on ? FILLED : 'none' }} />;
    })}
  </span>
);

const fieldClass = (hasError) =>
  [
    'w-full px-4 py-3 rounded-2xl border text-sm transition-all duration-200 outline-none placeholder:text-gray-400',
    hasError
      ? 'border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-4 focus:ring-red-100'
      : 'border-[#F0E2DC] bg-[#FBF8F8] hover:border-[#E8D3CB] hover:bg-white focus:border-[#A80808] focus:bg-white focus:ring-4 focus:ring-[#A80808]/10',
  ].join(' ');

/** Review list + average + the form to leave a new one. New reviews wait for admin approval. */
const ReviewsSection = () => {
  const { t, lang } = useLanguage();
  const { showToast } = useToast();

  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ count: 0, average: 0 });
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const [form, setForm] = useState({ name: '', comment: '', hp_field: '' });
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/reviews', { params: { limit: 30 } });
      setReviews(res.data?.data || []);
      setSummary(res.data?.summary || { count: 0, average: 0 });
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === 'comment' ? value.slice(0, MAX_COMMENT) : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const pickRating = (n) => {
    setRating(Math.min(5, Math.max(1, n)));
    if (errors.rating) setErrors((prev) => ({ ...prev, rating: '' }));
  };

  const onStarKey = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      pickRating((rating || 0) + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      pickRating((rating || 2) - 1);
    }
  };

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = t.contactNameError || 'Name must be at least 2 characters';
    if (!rating) next.rating = t.ct_reviewRatingError;
    if (form.comment.trim().length < 5) next.comment = t.ct_reviewCommentError;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await api.post('/reviews', {
        name: form.name.trim(),
        rating,
        comment: form.comment.trim(),
        hp_field: form.hp_field,
      });
      setSent(true);
      setForm({ name: '', comment: '', hp_field: '' });
      setRating(0);
      setErrors({});
      showToast(t.ct_reviewThanks, 'success');
    } catch (error) {
      const data = error.response?.data;
      const status = error.response?.status;
      if (data?.code === 'content_rejected') {
        const field = data.field === 'message' ? 'comment' : data.field;
        setErrors({ [field]: rejectionMessage(t, data.field, data.reason) });
      } else if (status === 429) {
        showToast(t.ct_tooMany, 'error');
      } else if (status === 409) {
        showToast(t.ct_reviewDuplicate, 'error');
      } else if (data?.field && ['name', 'rating', 'comment'].includes(data.field)) {
        setErrors({ [data.field]: data.message });
      } else {
        showToast(t.ct_reviewFailed, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const visible = showAll ? reviews : reviews.slice(0, INITIAL_VISIBLE);
  // Devanagari digits on the Nepali site, like the dates and the rest of the page
  const num = (v) => (lang === 'ne' ? toNepaliDigits(v) : String(v));
  const countLabel = summary.count === 1 ? t.ct_reviewsCountOne : fillText(t.ct_reviewsCount, { count: num(summary.count) });
  const starsLabel = (n) => fillText(t.ct_reviewStarsLabel, { n: num(n) });
  const remaining = MAX_COMMENT - form.comment.length;

  // Single review, loading, failed and empty cards share the form's width (and the
  // FAQ below uses the same one), so the section reads as one centred column instead
  // of a short list beside a tall form.
  const narrow = 'mx-auto max-w-3xl';

  return (
    <section id="reviews" aria-labelledby="reviews-title" className="mt-16 sm:mt-20">
      <div className="mb-8 sm:mb-10 flex flex-col items-center text-center">
        <SubTitle align="center" as="h2">
          <span id="reviews-title">{t.ct_reviewsTitle}</span>
        </SubTitle>
        <p className="mt-3 text-sm sm:text-base text-ink-soft max-w-xl">{t.ct_reviewsSub}</p>

        {summary.count > 0 && (
          <div className="mt-6 flex items-center gap-4">
            <span className="text-4xl font-serif font-semibold text-ink leading-none">
              {num(summary.average.toFixed(1))}
            </span>
            <div className="text-left">
              <Stars value={summary.average} size={18} label={starsLabel(summary.average.toFixed(1))} />
              <p className="mt-1 text-xs text-ink-soft">{countLabel}</p>
            </div>
          </div>
        )}
      </div>

      {/* ================= REVIEWS ================= */}
      {loading ? (
        <div className={`${narrow} rounded-3xl border border-[#EFEBE9] bg-white p-8 flex justify-center`} style={CARD_STYLE}>
          <Loader2 size={20} className="animate-spin text-[#A80808]" aria-hidden />
        </div>
      ) : loadFailed ? (
        <div className={`${narrow} rounded-3xl border border-[#EFEBE9] bg-white p-8 text-center text-sm text-ink-soft`} style={CARD_STYLE}>
          {t.ct_reviewsLoadFailed}
        </div>
      ) : reviews.length === 0 ? (
        <div className={`${narrow} rounded-3xl border border-[#EFEBE9] bg-white p-8 text-center text-sm text-ink-soft`} style={CARD_STYLE}>
          {t.ct_reviewsEmpty}
        </div>
      ) : (
        <>
          {/* Cards in the same row share a height, so the grid has no ragged gaps */}
          <ul
            className={`m-0 grid list-none gap-4 p-0 lg:gap-6 ${
              visible.length > 1 ? 'grid-cols-1 md:grid-cols-2' : `grid-cols-1 ${narrow} w-full`
            }`}
          >
            {visible.map((review) => (
              <li
                key={review._id}
                className="rounded-2xl bg-white border border-[#EFEBE9] p-5"
                style={CARD_STYLE}
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#F7F5F4] text-sm font-bold text-[#820606]"
                  >
                    {Array.from(review.name || '?')[0]?.toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <p className="m-0 text-sm font-semibold text-ink break-words">{review.name}</p>
                      <span className="text-xs text-mute">
                        {formatDate(review.createdAt, lang, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="mt-1">
                      <Stars value={review.rating} size={14} label={starsLabel(review.rating)} />
                    </div>
                    <p className="mt-2 mb-0 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap break-words">
                      {review.comment}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {reviews.length > INITIAL_VISIBLE && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="text-sm font-semibold text-[#A80808] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A80808]/30 rounded-lg px-2 py-1"
              >
                {showAll ? t.ct_reviewsLess : t.ct_reviewsMore}
              </button>
            </div>
          )}
        </>
      )}

      {/* ================= WRITE A REVIEW ================= */}
      <div
        className={`${narrow} mt-6 lg:mt-8 rounded-3xl bg-white border border-[#EFEBE9] p-6 sm:p-8`}
        style={CARD_STYLE}
      >
        <SubTitle size="md" as="h3">{t.ct_writeReview}</SubTitle>

        {sent ? (
          <div role="status" className="mt-5 flex items-start gap-3 rounded-2xl bg-[#FBF8F8] border border-[#EFEBE9] p-4">
            <CheckCircle2 size={20} className="mt-0.5 flex-shrink-0 text-[#A80808]" aria-hidden />
            <p className="m-0 text-sm leading-relaxed text-gray-700">{t.ct_reviewThanks}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-5">
            {/* Honeypot: invisible to people, bots fill it in */}
            <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', height: 0, overflow: 'hidden' }}>
              <input
                type="text"
                name="hp_field"
                tabIndex={-1}
                autoComplete="off"
                value={form.hp_field}
                onChange={handleChange}
              />
            </div>

            {/* Name and rating share a row on wider screens */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="review-name" className="block text-xs font-semibold text-ink-soft mb-2 uppercase tracking-[0.14em]">
                  {t.contactYourName || 'Your Name'}
                </label>
                <input
                  id="review-name"
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  maxLength={60}
                  placeholder={t.contactNamePlaceholder || 'Enter your name'}
                  aria-invalid={!!errors.name}
                  className={fieldClass(!!errors.name)}
                />
                {errors.name && <p className="text-xs mt-1.5 text-red-600">{errors.name}</p>}
              </div>

              <div>
                <span id="review-rating-label" className="block text-xs font-semibold text-ink-soft mb-1 uppercase tracking-[0.14em]">
                  {t.ct_reviewYourRating}
                </span>
                <div
                  role="radiogroup"
                  aria-labelledby="review-rating-label"
                  onKeyDown={onStarKey}
                  onMouseLeave={() => setHover(0)}
                  className="flex gap-1 -ml-1"
                >
                  {[1, 2, 3, 4, 5].map((n) => {
                    const active = n <= (hover || rating);
                    return (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={rating === n}
                        aria-label={starsLabel(n)}
                        tabIndex={rating === n || (!rating && n === 1) ? 0 : -1}
                        onClick={() => pickRating(n)}
                        onMouseEnter={() => setHover(n)}
                        className="p-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A80808]/40"
                      >
                        <Star
                          size={28}
                          aria-hidden
                          style={{ color: active ? FILLED : EMPTY, fill: active ? FILLED : 'none' }}
                          className="transition-colors duration-150"
                        />
                      </button>
                    );
                  })}
                </div>
                {errors.rating && <p className="text-xs mt-1 text-red-600">{errors.rating}</p>}
              </div>
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-2">
                <label htmlFor="review-comment" className="block text-xs font-semibold text-ink-soft uppercase tracking-[0.14em]">
                  {t.ct_reviewYourReview}
                </label>
                <span
                  className="text-xs tabular-nums"
                  style={{ color: remaining === 0 ? '#dc2626' : remaining < 80 ? '#d97706' : '#a8a29e' }}
                >
                  {form.comment.length}/{MAX_COMMENT}
                </span>
              </div>
              <textarea
                id="review-comment"
                name="comment"
                rows={4}
                value={form.comment}
                onChange={handleChange}
                placeholder={t.ct_reviewPlaceholder}
                aria-invalid={!!errors.comment}
                className={`${fieldClass(!!errors.comment)} resize-none min-h-[110px]`}
              />
              {errors.comment && <p className="text-xs mt-1.5 text-red-600">{errors.comment}</p>}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl px-6 py-3.5 text-sm font-semibold text-white transition-all duration-300
                         hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              style={{ background: '#A80808' }}
            >
              <span className="flex items-center justify-center gap-2">
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" aria-hidden />
                    {t.contactSending || 'Sending...'}
                  </>
                ) : (
                  <>
                    {t.ct_reviewSubmit}
                    <Send size={15} aria-hidden />
                  </>
                )}
              </span>
            </button>

            <p className="m-0 text-xs text-mute leading-relaxed">{t.ct_reviewNote}</p>
          </form>
        )}
      </div>
    </section>
  );
};

export default ReviewsSection;
