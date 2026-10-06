import React, { useMemo, useState } from 'react';
import { AlertCircle, Bell, Check, Loader2, Mail } from 'lucide-react';
import Dialog from './Dialog';
import { addDaysToKey, dateOfKey } from '../../utils/calendarData';
import { formatDate } from '../../utils/formatDate';
import { fmt } from './calendarUi';

// How far ahead a person can ask to be reminded (days before the day itself).
const OPTIONS = [
  { offset: 0, key: 'cal_remOnDay', fallback: 'On the day' },
  { offset: 1, key: 'cal_rem1', fallback: '1 day before' },
  { offset: 3, key: 'cal_rem3', fallback: '3 days before' },
  { offset: 7, key: 'cal_rem7', fallback: '1 week before' },
];

const ReminderDialog = ({
  item,
  existing,
  t,
  lang,
  todayKey,
  email,
  emailReady,
  onClose,
  onSave,
  onRemove,
}) => {
  const options = useMemo(
    () =>
      OPTIONS.map((o) => {
        const sendKey = addDaysToKey(item.eventDate, -o.offset);
        const sent = !!existing?.schedule?.find((s) => s.offset === o.offset && s.sent);
        // A reminder is only sent on a later day than today, so those are closed.
        return { ...o, sendKey, sent, passed: sendKey <= todayKey };
      }),
    [item.eventDate, existing, todayKey]
  );

  const anyOpen = options.some((o) => !o.passed);

  const [offsets, setOffsets] = useState(() => {
    const open = options.filter((o) => !o.passed).map((o) => o.offset);
    const wanted = existing ? existing.offsets.filter((o) => open.includes(o)) : [1, 0].filter((o) => open.includes(o));
    return wanted.length ? wanted : open.slice(-1); // nothing else fits: the latest open one
  });
  const [note, setNote] = useState(existing?.note || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const name = lang === 'en' ? item.title.en || item.title.ne : item.title.ne || item.title.en;
  const longDate = formatDate(dateOfKey(item.eventDate), lang, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const toggle = (offset) =>
    setOffsets((cur) => (cur.includes(offset) ? cur.filter((o) => o !== offset) : [...cur, offset]));

  const save = async () => {
    if (!offsets.length) {
      setError(t.cal_remPickOne || 'Choose at least one time.');
      return;
    }
    setSaving(true);
    setError('');
    const result = await onSave({
      eventDate: item.eventDate,
      kind: item.kind,
      title: item.title,
      bsLabel: item.bsLabel || '',
      tithi: item.tithi || '',
      note: note.trim(),
      offsets,
      lang,
    });
    setSaving(false);
    if (!result.ok) setError(result.message);
  };

  const remove = async () => {
    setSaving(true);
    setError('');
    const result = await onRemove(existing.id);
    setSaving(false);
    if (!result.ok) setError(result.message);
  };

  return (
    <Dialog
      onClose={onClose}
      closeLabel={t.close || 'Close'}
      icon={<Bell size={18} className="text-vermilion shrink-0" aria-hidden="true" />}
      title={existing ? t.cal_remEditTitle || 'Edit reminder' : t.cal_remTitle || 'Set a reminder'}
      footer={
        <div className="flex items-center gap-3">
          {existing && (
            <button
              type="button"
              onClick={remove}
              disabled={saving}
              className="text-sm font-semibold text-ink-soft hover:text-vermilion disabled:opacity-50"
            >
              {t.cal_remRemove || 'Remove reminder'}
            </button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving || !anyOpen || !emailReady}
            className="ml-auto inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full bg-vermilion text-white text-sm font-semibold hover:bg-maroon-deep disabled:opacity-50 disabled:pointer-events-none transition"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" aria-hidden="true" /> {t.cal_saving || 'Saving…'}
              </>
            ) : existing ? (
              t.cal_remUpdate || 'Update reminder'
            ) : (
              t.cal_remSave || 'Save reminder'
            )}
          </button>
        </div>
      }
    >
      <div className="rounded-xl bg-panel border border-line p-3">
        <p className="font-semibold text-ink break-words">{name}</p>
        <p className="text-sm text-ink-soft mt-0.5">
          {longDate}
          {item.bsLabel ? ` · ${item.bsLabel}` : ''}
        </p>
      </div>

      <fieldset className="mt-4">
        <legend className="text-xs font-semibold uppercase tracking-wider text-ink-soft mb-2">
          {t.cal_remWhen || 'Email me'}
        </legend>
        <div className="space-y-2">
          {options.map((o) => {
            const checked = offsets.includes(o.offset) || o.sent;
            const disabled = o.passed || saving;
            return (
              <label
                key={o.offset}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                  disabled && !o.sent
                    ? 'border-line bg-panel/60 text-mute cursor-not-allowed'
                    : checked
                      ? 'border-vermilion bg-brand-50 cursor-pointer'
                      : 'border-line bg-white hover:bg-panel cursor-pointer'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(o.offset)}
                  className="w-4 h-4 accent-[#A80808]"
                />
                <span className="flex-1 text-sm font-semibold">{t[o.key] || o.fallback}</span>
                <span className="text-xs text-ink-soft inline-flex items-center gap-1">
                  {o.sent ? (
                    <>
                      <Check size={12} aria-hidden="true" /> {t.cal_mySent || 'sent'}
                    </>
                  ) : o.passed ? (
                    t.cal_remPassed || 'already passed'
                  ) : (
                    fmt(t.cal_remSendOn || 'sent {date}', {
                      date: formatDate(dateOfKey(o.sendKey), lang, { weekday: 'short', day: 'numeric', month: 'short' }),
                    })
                  )}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <label className="block mt-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
          {t.cal_remNote || 'Note (optional)'}
        </span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
          rows={2}
          placeholder={t.cal_remNotePh || 'e.g. bring flowers for the puja'}
          className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-mute focus:outline-none focus:ring-2 focus:ring-vermilion/40 focus:border-vermilion resize-none"
        />
      </label>

      <p className="mt-3 flex items-start gap-2 text-sm text-ink-soft">
        <Mail size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>{fmt(t.cal_remSentTo || 'The email goes to {email}.', { email })}</span>
      </p>

      {!emailReady && (
        <p className="mt-3 flex items-start gap-2 text-sm text-vermilion" role="status">
          <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          {t.cal_remEmailOff || 'Email is not set up on this server yet, so reminders cannot be sent right now.'}
        </p>
      )}
      {error && (
        <p className="mt-3 flex items-start gap-2 text-sm text-vermilion" role="alert">
          <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </Dialog>
  );
};

export default ReminderDialog;
