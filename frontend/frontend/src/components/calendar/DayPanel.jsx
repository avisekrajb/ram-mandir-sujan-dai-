import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Bell, BellRing, CalendarDays, Download, ExternalLink, Sparkles, Sunrise, Sunset } from 'lucide-react';
import { eventName, templeTitle } from '../../utils/calendarData';
import { buildIcs, downloadIcs, googleCalendarUrl } from '../../utils/ics';
import { reminderKey } from '../../hooks/useReminders';
import { auspiciousText, markName, TithiMark } from './calendarUi';

/** The payloads a day can be reminded about: each event, plus the day itself. */
export const remindersForDay = (day, bsText, dayTitle, lang) => {
  const common = {
    eventDate: day.key,
    bsLabel: bsText,
    tithi: (lang === 'en' ? day.tithiEn : day.tithiNp) || '',
  };
  const list = [
    ...day.events.map((e) => ({
      ...common,
      kind: e.isHoliday ? 'holiday' : 'festival',
      title: { en: e.en || e.np, ne: e.np || e.en },
    })),
    ...day.temple.map((tp) => ({
      ...common,
      kind: 'event',
      title: { en: tp.title.en || tp.title.ne || '', ne: tp.title.ne || tp.title.en || '' },
    })),
  ];
  const own = { ...common, kind: day.mark ? 'tithi' : 'day', title: dayTitle };
  return { events: list, own };
};

const TagPill = ({ children, tone = 'plain' }) => (
  <span
    className={`shrink-0 text-xs font-semibold rounded-full px-2 py-0.5 ${
      tone === 'holiday' ? 'bg-brand-50 text-vermilion' : 'bg-panel text-ink-soft'
    }`}
  >
    {children}
  </span>
);

const DayPanel = ({
  t,
  lang,
  day,
  isToday,
  bsLabel,
  adLabel,
  weekdayName,
  reminderByKey,
  onRemind,
  canRemind,
  bsText,
  dayTitle,
  slideKey,
}) => {
  const { events, own } = useMemo(
    () => remindersForDay(day, bsText, dayTitle, lang),
    [day, bsText, dayTitle, lang]
  );

  const ownExisting = reminderByKey.get(reminderKey(own.eventDate, own.title));

  // Whatever the day is called, for the calendar file and the Google link.
  const names = [
    ...day.events.map((e) => eventName(e, lang)),
    ...day.temple.map((tp) => templeTitle(tp, lang)),
  ].filter(Boolean);
  const calTitle = names[0] || (day.mark ? markName(day.mark, t) : adLabel);
  const calDetails = [names.slice(1).join(', '), bsLabel].filter(Boolean).join('\n');

  const downloadDay = () =>
    downloadIcs(
      `temple-calendar-${day.key}.ics`,
      buildIcs([{ uid: `day-${day.key}`, key: day.key, title: calTitle, description: calDetails }])
    );

  const renderBell = (item, existing) => (
    <button
      type="button"
      onClick={() => onRemind(item)}
      aria-label={existing ? t.cal_editReminder || 'Edit reminder' : t.cal_remindMe || 'Remind me'}
      title={existing ? t.cal_editReminder || 'Edit reminder' : t.cal_remindMe || 'Remind me'}
      className={`shrink-0 w-9 h-9 rounded-full border flex items-center justify-center transition active:scale-95 ${
        existing
          ? 'border-vermilion bg-brand-50 text-vermilion'
          : 'border-line bg-white text-ink-soft hover:bg-panel hover:text-vermilion'
      }`}
    >
      {existing ? <BellRing size={16} className="fill-vermilion" /> : <Bell size={16} />}
    </button>
  );

  return (
    <motion.section
      key={slideKey}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-line bg-white overflow-hidden"
      aria-live="polite"
    >
      <div className="bg-maroon-deep text-white p-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/70">
          <CalendarDays size={13} aria-hidden="true" />
          {isToday ? t.today || 'Today' : t.cal_selectedDay || 'Selected day'}
        </div>
        <div className="mt-3 font-serif text-2xl leading-tight">{bsLabel || '—'}</div>
        <div className="text-sm text-white/75 mt-1">
          {weekdayName}, {adLabel}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/10 border border-white/15 px-3 py-2">
            <div className="text-white/60 uppercase tracking-wider text-xs">{t.tithi || 'Tithi'}</div>
            <div className="font-semibold mt-0.5 flex items-center gap-1.5 min-w-0">
              {day.mark && <TithiMark mark={day.mark} className="!text-white" />}
              <span className="truncate">{(lang === 'en' ? day.tithiEn : day.tithiNp) || '—'}</span>
            </div>
          </div>
          <div className="rounded-xl bg-white/10 border border-white/15 px-3 py-2">
            <div className="flex items-center gap-1 text-white/60 text-xs">
              <Sunrise size={11} aria-hidden="true" /> {t.sunrise || 'Sunrise'}
              <Sunset size={11} className="ml-1" aria-hidden="true" /> {t.sunset || 'Sunset'}
            </div>
            <div className="font-semibold mt-0.5">
              {day.sunrise || '—'} · {day.sunset || '—'}
            </div>
          </div>
        </div>
      </div>

      <div className="p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
          {t.cal_onThisDay || 'On this day'}
        </h3>

        {events.length === 0 ? (
          <p className="text-sm text-ink-soft mt-2">{t.cal_noEvents || 'No festival or holiday on this day.'}</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {events.map((item, i) => {
              const existing = reminderByKey.get(reminderKey(item.eventDate, item.title));
              const name = lang === 'en' ? item.title.en : item.title.ne || item.title.en;
              const tag =
                item.kind === 'holiday'
                  ? { text: t.holiday || 'Holiday', tone: 'holiday' }
                  : item.kind === 'event'
                    ? { text: t.cal_tagTemple || 'Temple', tone: 'plain' }
                    : { text: t.cal_tagFestival || 'Festival', tone: 'plain' };
              return (
                <li key={`${item.kind}-${i}-${name}`} className="py-2.5 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink break-words">{name}</p>
                    <div className="mt-1">
                      <TagPill tone={tag.tone}>{tag.text}</TagPill>
                    </div>
                  </div>
                  {canRemind && renderBell(item, existing)}
                </li>
              );
            })}
          </ul>
        )}

        {day.auspicious && (
          <p className="mt-3 flex items-start gap-2 text-sm text-ink-soft">
            <Sparkles size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              <span className="font-semibold text-ink">{t.cal_auspiciousFor || 'Auspicious for'}:</span>{' '}
              {auspiciousText(day, t)}
            </span>
          </p>
        )}

        {canRemind && (
          <button
            type="button"
            onClick={() => onRemind(own)}
            className={`mt-4 w-full inline-flex items-center justify-center gap-2 h-11 rounded-full text-sm font-semibold transition active:scale-[.98] ${
              ownExisting
                ? 'border border-vermilion bg-brand-50 text-vermilion'
                : 'bg-vermilion text-white hover:bg-maroon-deep'
            }`}
          >
            {ownExisting ? <BellRing size={16} className="fill-vermilion" /> : <Bell size={16} />}
            {ownExisting
              ? t.cal_reminderSet || 'Reminder set'
              : t.cal_remindThisDay || 'Remind me about this day'}
          </button>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={downloadDay}
            className="inline-flex items-center justify-center gap-1.5 h-10 rounded-full border border-line text-sm font-semibold text-ink hover:bg-panel transition"
          >
            <Download size={14} aria-hidden="true" /> {t.cal_downloadIcs || 'Download (.ics)'}
          </button>
          <a
            href={googleCalendarUrl({ key: day.key, title: calTitle, details: calDetails })}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 h-10 rounded-full border border-line text-sm font-semibold text-ink hover:bg-panel transition"
          >
            <ExternalLink size={14} aria-hidden="true" /> {t.cal_googleCal || 'Google Calendar'}
          </a>
        </div>
      </div>
    </motion.section>
  );
};

export default DayPanel;
