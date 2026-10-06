import React from 'react';
import { AlertCircle, Bell, BellRing, PartyPopper } from 'lucide-react';
import { reminderKey } from '../../hooks/useReminders';
import { fmt, TithiMark } from './calendarUi';

const Skeleton = () => (
  <div className="p-5 space-y-3" aria-hidden="true">
    {[0, 1, 2, 3].map((i) => (
      <div key={i} className="flex gap-3 animate-pulse">
        <div className="w-11 h-11 rounded-xl shrink-0 bg-panel" />
        <div className="flex-1 space-y-2 py-1">
          <div className="h-3 w-3/4 rounded bg-panel" />
          <div className="h-2.5 w-1/2 rounded bg-panel" />
        </div>
      </div>
    ))}
  </div>
);

const when = (item, t) => {
  if (item.inDays === 0) return t.cal_today || 'Today';
  if (item.inDays === 1) return t.cal_tomorrow || 'Tomorrow';
  return fmt(t.cal_inDays || 'in {n} days', { n: item.inDays });
};

const UpcomingList = ({ t, groups, loading, error, next, selectedKey, onSelect, onRemind, reminderByKey }) => {
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <section className="rounded-2xl border border-line bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-line">
        <PartyPopper size={16} className="text-vermilion" aria-hidden="true" />
        <h2 className="font-serif text-base font-bold text-ink">{t.festivalsHolidays || 'Festivals & Holidays'}</h2>
      </div>

      {next && (
        <button
          type="button"
          onClick={() => onSelect(next.dateKey)}
          className="w-full text-left px-5 py-3 bg-panel border-b border-line hover:bg-brand-100 transition-colors"
        >
          <span className="block text-xs font-semibold uppercase tracking-wider text-ink-soft">
            {t.cal_next || 'Next'} · {when(next, t)}
          </span>
          <span className="block text-sm font-bold text-ink mt-0.5 truncate">{next.name}</span>
        </button>
      )}

      <div className="max-h-[420px] overflow-y-auto">
        {loading && <Skeleton />}

        {!loading && error && (
          <div className="p-6 text-center">
            <AlertCircle size={20} className="mx-auto text-vermilion mb-2" aria-hidden="true" />
            <p className="text-xs text-ink-soft">{t.festivalsError || 'Festival list is unavailable right now.'}</p>
          </div>
        )}

        {!loading && !error && total === 0 && (
          <div className="p-8 text-center">
            <PartyPopper size={20} className="mx-auto text-mute mb-2" aria-hidden="true" />
            <p className="text-xs text-ink-soft">{t.cal_noMatch || 'Nothing matches this filter in the coming months.'}</p>
          </div>
        )}

        {!loading && !error && total > 0 &&
          groups
            .filter((g) => g.items.length > 0)
            .map((group, gi) => (
              <section key={group.key}>
                {gi > 0 && <div className="h-px bg-line" />}
                <div className="sticky top-0 z-10 px-5 py-2 flex items-center justify-between bg-panel">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink">{group.label}</span>
                  <span className="text-xs text-ink-soft">{group.items.length}</span>
                </div>
                <ul className="divide-y divide-line">
                  {group.items.map((item) => {
                    const existing = item.remind && reminderByKey.get(reminderKey(item.remind.eventDate, item.remind.title));
                    const past = item.inDays < 0;
                    return (
                      <li
                        key={item.id}
                        className={`flex items-center gap-3 pr-3 ${past ? 'opacity-55' : ''} ${
                          item.dateKey === selectedKey ? 'bg-brand-50' : ''
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onSelect(item.dateKey)}
                          className="flex-1 min-w-0 flex gap-3 items-start text-left pl-5 py-3 hover:bg-panel transition-colors"
                        >
                          <span
                            className={`shrink-0 w-11 rounded-xl py-1.5 text-center ${
                              item.isHoliday ? 'bg-vermilion text-white' : 'bg-brand-100 text-ink'
                            }`}
                          >
                            <span className="block text-xs uppercase tracking-wider opacity-80">{item.bsMonthShort}</span>
                            <span className="block text-base font-bold leading-none mt-0.5">{item.bsDay}</span>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold leading-snug text-ink break-words">
                              {item.mark && <TithiMark mark={item.mark} className="inline-block mr-1.5 -mt-0.5" />}
                              {item.name}
                            </span>
                            <span className="block text-xs text-ink-soft mt-0.5">
                              {item.adLabel}
                              {item.tithi ? ` · ${item.tithi}` : ''}
                              {!past && item.inDays >= 0 && (
                                <span className="font-semibold text-vermilion"> · {when(item, t)}</span>
                              )}
                            </span>
                          </span>
                        </button>
                        {item.remind && item.inDays >= 1 && (
                          <button
                            type="button"
                            onClick={() => onRemind(item.remind)}
                            aria-label={existing ? t.cal_editReminder || 'Edit reminder' : t.cal_remindMe || 'Remind me'}
                            title={existing ? t.cal_editReminder || 'Edit reminder' : t.cal_remindMe || 'Remind me'}
                            className={`shrink-0 w-9 h-9 rounded-full border flex items-center justify-center transition active:scale-95 ${
                              existing
                                ? 'border-vermilion bg-brand-50 text-vermilion'
                                : 'border-line bg-white text-ink-soft hover:bg-panel hover:text-vermilion'
                            }`}
                          >
                            {existing ? <BellRing size={15} className="fill-vermilion" /> : <Bell size={15} />}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
      </div>
    </section>
  );
};

export default UpcomingList;
