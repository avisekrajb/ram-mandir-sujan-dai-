import React, { useEffect, useRef } from 'react';
import { Bell, Sparkles } from 'lucide-react';
import { dayItems, TONE_DOT, TONE_TEXT, TithiMark, markName } from './calendarUi';

const CELL_H = 'h-[76px] sm:h-[104px]';

/**
 * The month as a grid of day buttons (one tab stop, arrow keys move between
 * days). Cells are flat: number, the other calendar's number, up to two labels,
 * and small indicators for tithi days, auspicious days and set reminders.
 */
const MonthGrid = ({
  weekdayHeaders,
  weeks,
  selectedKey,
  onSelect,
  onMove,
  onMonth,
  filter,
  lang,
  t,
  remindedDates,
  loading,
}) => {
  const gridRef = useRef(null);
  const refocus = useRef(false);

  // After an arrow key changes the selection, move focus with it (the new cell
  // may only exist after the month changed, hence the effect).
  useEffect(() => {
    if (!refocus.current) return;
    // Across a month edge the grid re-renders before the new selection lands, so
    // keep waiting until the selected day actually exists.
    const el = gridRef.current?.querySelector(`[data-key="${selectedKey}"]`);
    if (el) {
      refocus.current = false;
      el.focus();
    }
  }, [selectedKey, weeks]);

  const onKeyDown = (e) => {
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (e.key in moves) {
      e.preventDefault();
      refocus.current = true;
      onMove(moves[e.key]);
    } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault();
      refocus.current = true;
      onMonth(e.key === 'PageUp' ? -1 : 1);
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-white overflow-hidden" aria-busy={loading}>
      <div className="grid grid-cols-7 border-b border-line bg-panel" role="presentation">
        {weekdayHeaders.map((d, i) => (
          <div
            key={i}
            className={`text-center py-3 text-xs font-semibold uppercase tracking-wider ${
              i === 6 ? 'text-vermilion' : 'text-ink-soft'
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* -mr-px / -mb-px push the last column's and row's borders out of view */}
      <div className="overflow-hidden">
        <div ref={gridRef} role="grid" onKeyDown={onKeyDown} className="-mr-px -mb-px">
          {weeks.map((row, r) => (
            <div key={r} role="row" className="grid grid-cols-7">
              {row.map((cell, c) => {
                if (!cell) {
                  return (
                    <div
                      key={c}
                      role="gridcell"
                      aria-hidden="true"
                      className={`${CELL_H} border-r border-b border-line bg-panel/60`}
                    />
                  );
                }
                const { day } = cell;
                const selected = cell.key === selectedKey;
                const items = dayItems(day, filter, lang, t);
                const shown = items.slice(0, 2);
                const more = items.length - shown.length;
                const hasReminder = remindedDates.has(cell.key);
                const red = cell.isSaturday || day.isHoliday;

                const label = [
                  cell.ariaDate,
                  ...items.map((i) => i.text),
                  day.mark ? markName(day.mark, t) : '',
                ]
                  .filter(Boolean)
                  .join(', ');

                return (
                  <button
                    key={c}
                    type="button"
                    role="gridcell"
                    data-key={cell.key}
                    aria-selected={selected}
                    aria-current={cell.isToday ? 'date' : undefined}
                    aria-label={label}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => onSelect(cell.key)}
                    className={`relative ${CELL_H} p-1.5 sm:p-2 text-left flex flex-col border-r border-b border-line transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-vermilion ${
                      selected ? 'bg-brand-50 ring-2 ring-inset ring-vermilion' : 'bg-white hover:bg-panel'
                    }`}
                  >
                    <span className="flex items-start justify-between">
                      <span
                        className={`inline-flex items-center justify-center text-base sm:text-lg font-semibold leading-none ${
                          cell.isToday
                            ? 'w-7 h-7 -mt-0.5 -ml-0.5 rounded-full bg-vermilion text-white'
                            : red
                              ? 'text-vermilion'
                              : 'text-ink'
                        }`}
                      >
                        {cell.label}
                      </span>
                      <span className="text-xs leading-none text-mute">{cell.sub}</span>
                    </span>

                    {/* Labels from sm up; dots only on phones where there is no room */}
                    <span className="hidden sm:flex flex-col gap-0.5 mt-1.5 min-w-0">
                      {shown.map((it, i) => (
                        <span
                          key={i}
                          title={it.text}
                          className={`flex items-center gap-1 text-xs leading-tight min-w-0 ${TONE_TEXT[it.tone]}`}
                        >
                          <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${TONE_DOT[it.tone]}`} />
                          <span className="truncate">{it.text}</span>
                        </span>
                      ))}
                      {more > 0 && <span className="text-xs leading-tight text-mute">+{more}</span>}
                    </span>
                    <span className="flex sm:hidden gap-0.5 mt-1.5">
                      {items.slice(0, 3).map((it, i) => (
                        <span key={i} className={`w-1.5 h-1.5 rounded-full ${TONE_DOT[it.tone]}`} />
                      ))}
                    </span>

                    <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1">
                      {day.auspicious && (
                        <Sparkles size={11} className="text-ink-soft" aria-hidden="true" />
                      )}
                      {day.mark && <TithiMark mark={day.mark} />}
                      {hasReminder && (
                        <Bell size={11} className="text-vermilion fill-vermilion" aria-hidden="true" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MonthGrid;
