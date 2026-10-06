import React, { useState } from 'react';
import { Bell, Check, Loader2, LogIn, Send, Trash2 } from 'lucide-react';
import Dialog from './Dialog';
import { dateOfKey, daysFromKey } from '../../utils/calendarData';
import { formatDate } from '../../utils/formatDate';
import { fmt } from './calendarUi';

const OFFSET_KEYS = {
  0: ['cal_remOnDay', 'On the day'],
  1: ['cal_rem1', '1 day before'],
  3: ['cal_rem3', '3 days before'],
  7: ['cal_rem7', '1 week before'],
};

const offsetLabel = (o, t) => {
  const [key, fallback] = OFFSET_KEYS[o] || [null, `${o} days before`];
  return (key && t[key]) || fallback;
};

const MyRemindersDialog = ({
  t,
  lang,
  todayKey,
  signedIn,
  loading,
  list,
  email,
  onClose,
  onSignIn,
  onOpenDay,
  onRemove,
  onTest,
}) => {
  // id of the reminder whose request is running, so only its buttons wait
  const [busy, setBusy] = useState(null);

  const run = async (id, action) => {
    setBusy(id);
    await action();
    setBusy(null);
  };

  const upcoming = list.filter((r) => r.eventDate >= todayKey);
  const past = list.filter((r) => r.eventDate < todayKey);

  const row = (r) => {
    const name = lang === 'en' ? r.title.en || r.title.ne : r.title.ne || r.title.en;
    const left = daysFromKey(todayKey, r.eventDate);
    const waiting = busy === r.id;
    return (
      <li key={r.id} className="py-3.5">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => onOpenDay(r.eventDate)}
              className="text-left text-sm font-semibold text-ink hover:text-vermilion break-words"
            >
              {name}
            </button>
            <p className="text-xs text-ink-soft mt-0.5">
              {formatDate(dateOfKey(r.eventDate), lang, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              {r.bsLabel ? ` · ${r.bsLabel}` : ''}
            </p>
          </div>
          <span className="shrink-0 text-xs font-semibold rounded-full px-2 py-0.5 bg-panel text-ink-soft">
            {left < 0
              ? t.cal_myPast || 'Past'
              : left === 0
                ? t.cal_today || 'Today'
                : fmt(t.cal_myDaysLeft || '{n} days left', { n: left })}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {r.schedule.map((s) => (
            <span
              key={s.offset}
              className={`inline-flex items-center gap-1 text-xs rounded-full border px-2 py-0.5 ${
                s.sent ? 'border-line bg-panel text-mute' : 'border-line text-ink-soft'
              }`}
            >
              {s.sent && <Check size={11} aria-hidden="true" />}
              {offsetLabel(s.offset, t)}
            </span>
          ))}
        </div>

        {r.note && <p className="mt-2 text-xs text-ink-soft italic break-words">“{r.note}”</p>}

        <div className="mt-2.5 flex items-center gap-2">
          {left >= 0 && (
            <button
              type="button"
              disabled={waiting}
              onClick={() => run(r.id, () => onTest(r.id))}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-line text-xs font-semibold text-ink hover:bg-panel disabled:opacity-50 transition"
            >
              {waiting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              {t.cal_myTest || 'Send test email'}
            </button>
          )}
          <button
            type="button"
            disabled={waiting}
            onClick={() => run(r.id, () => onRemove(r.id))}
            aria-label={t.cal_remRemove || 'Remove reminder'}
            title={t.cal_remRemove || 'Remove reminder'}
            className="ml-auto w-8 h-8 rounded-full border border-line text-ink-soft hover:text-vermilion hover:bg-panel disabled:opacity-50 flex items-center justify-center transition"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </li>
    );
  };

  return (
    <Dialog
      wide
      onClose={onClose}
      closeLabel={t.close || 'Close'}
      icon={<Bell size={18} className="text-vermilion shrink-0" aria-hidden="true" />}
      title={t.cal_myTitle || 'My reminders'}
    >
      {!signedIn ? (
        <div className="py-8 text-center">
          <p className="text-sm text-ink-soft">{t.cal_mySignIn || 'Sign in to see and manage your reminders.'}</p>
          <button
            type="button"
            onClick={onSignIn}
            className="mt-4 inline-flex items-center gap-2 h-11 px-6 rounded-full bg-vermilion text-white text-sm font-semibold hover:bg-maroon-deep transition"
          >
            <LogIn size={16} aria-hidden="true" /> {t.cal_signIn || 'Sign in'}
          </button>
        </div>
      ) : loading && list.length === 0 ? (
        <div className="py-10 flex justify-center text-ink-soft">
          <Loader2 className="animate-spin" size={20} aria-label="Loading" />
        </div>
      ) : list.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-soft">
          {t.cal_myEmpty || 'You have no reminders yet. Press the bell on any festival to add one.'}
        </p>
      ) : (
        <>
          {email && (
            <p className="text-xs text-ink-soft mb-1">{fmt(t.cal_remSentTo || 'The email goes to {email}.', { email })}</p>
          )}
          <ul className="divide-y divide-line">{upcoming.map(row)}</ul>
          {past.length > 0 && (
            <>
              <h3 className="mt-4 text-xs font-semibold uppercase tracking-wider text-mute">{t.cal_myPast || 'Past'}</h3>
              <ul className="divide-y divide-line opacity-70">{past.map(row)}</ul>
            </>
          )}
        </>
      )}
    </Dialog>
  );
};

export default MyRemindersDialog;
