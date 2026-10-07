import React from 'react';
import { motion } from 'framer-motion';
import { Bell, ChevronDown, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

const CALENDARS = [
  { id: 'bs', labelKey: 'bsCalendar', fallback: 'Bikram Sambat' },
  { id: 'ad', labelKey: 'gregorianCalendar', fallback: 'Gregorian' },
];

const iconBtn =
  'w-10 h-10 rounded-full border border-line bg-white text-ink hover:bg-panel active:scale-95 transition flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none';

const Select = ({ label, value, onChange, children, className = '' }) => (
  <label className={`relative inline-flex items-center ${className}`}>
    <span className="sr-only">{label}</span>
    <select
      value={value}
      onChange={onChange}
      className="appearance-none bg-transparent font-serif text-xl sm:text-2xl font-bold text-ink pr-6 pl-0 py-0.5 rounded-md cursor-pointer hover:text-vermilion focus:outline-none focus-visible:ring-2 focus-visible:ring-vermilion"
    >
      {children}
    </select>
    <ChevronDown size={16} className="absolute right-0 pointer-events-none text-mute" aria-hidden="true" />
  </label>
);

const CalendarToolbar = ({
  t,
  calendar,
  onCalendar,
  monthNames,
  yearOptions,
  view,
  subtitle,
  onJump,
  onPrev,
  onNext,
  onToday,
  reminderCount,
  onReminders,
  canPrev,
  canNext,
}) => (
  <div className="rounded-2xl border border-line bg-white p-3 sm:p-4 flex flex-wrap items-center gap-x-4 gap-y-3">
    <div className="flex items-center gap-2">
      <button type="button" onClick={onPrev} disabled={!canPrev} aria-label={t.prevMonth || 'Previous'} className={iconBtn}>
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        onClick={onToday}
        className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-line bg-white text-sm font-semibold text-vermilion hover:bg-panel active:scale-95 transition"
      >
        <RotateCcw size={14} aria-hidden="true" /> {t.today || 'Today'}
      </button>
      <button type="button" onClick={onNext} disabled={!canNext} aria-label={t.nextMonth || 'Next'} className={iconBtn}>
        <ChevronRight size={18} />
      </button>
    </div>

    <div className="flex-1 min-w-[200px]">
      <div className="flex items-center gap-3 flex-wrap">
        <Select
          label={t.cal_monthLabel || 'Month'}
          value={view.month}
          onChange={(e) => onJump(view.year, Number(e.target.value))}
        >
          {monthNames.map((name, i) => (
            <option key={i} value={i + 1}>
              {name}
            </option>
          ))}
        </Select>
        <Select
          label={t.cal_yearLabel || 'Year'}
          value={view.year}
          onChange={(e) => onJump(Number(e.target.value), view.month)}
        >
          {yearOptions.map((y) => (
            <option key={y.value} value={y.value}>
              {y.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="text-sm text-ink-soft mt-0.5 truncate">{subtitle}</div>
    </div>

    <div className="flex items-center gap-2 ml-auto">
      <div className="inline-flex p-1 rounded-full bg-panel border border-line" role="group" aria-label="Calendar">
        {CALENDARS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onCalendar(c.id)}
            aria-pressed={calendar === c.id}
            className={`relative px-3 sm:px-4 h-8 rounded-full text-sm font-semibold transition-colors ${
              calendar === c.id ? 'text-vermilion' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {calendar === c.id && (
              <motion.span
                layoutId="cal-switch"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                className="absolute inset-0 rounded-full bg-white border border-line"
              />
            )}
            <span className="relative z-10">{t[c.labelKey] || c.fallback}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onReminders}
        className="relative inline-flex items-center gap-2 h-10 px-3 sm:px-4 rounded-full bg-vermilion text-white text-sm font-semibold hover:bg-maroon-deep active:scale-95 transition"
      >
        <Bell size={16} aria-hidden="true" />
        <span className="hidden sm:inline">{t.cal_remindersBtn || 'My reminders'}</span>
        {reminderCount > 0 && (
          <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-white text-vermilion text-xs font-bold leading-5 text-center">
            {reminderCount}
          </span>
        )}
      </button>
    </div>
  </div>
);

export default CalendarToolbar;
