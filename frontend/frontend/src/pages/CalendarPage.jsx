import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import {
  getBsMonthDays,
  adToBs,
  bsToAd,
  toNepaliDigits,
  WEEKDAYS_SHORT,
  WEEKDAYS,
  BS_MONTHS,
  GREGORIAN_MONTHS,
} from '../utils/nepaliCalendar';
import {
  adKey,
  buildDay,
  dateOfKey,
  daysFromKey,
  eventName,
  fetchPatroMonth,
  groupTempleEvents,
  keyOfDate,
  TITHI_NAMES,
  templeTitle,
} from '../utils/calendarData';
import { buildIcs, downloadIcs } from '../utils/ics';
import { formatDate } from '../utils/formatDate';
import useReminders, { reminderKey } from '../hooks/useReminders';
import PageHeader from '../components/common/PageHeader';
import CalendarToolbar from '../components/calendar/CalendarToolbar';
import MonthGrid from '../components/calendar/MonthGrid';
import DayPanel from '../components/calendar/DayPanel';
import UpcomingList from '../components/calendar/UpcomingList';
import ReminderDialog from '../components/calendar/ReminderDialog';
import MyRemindersDialog from '../components/calendar/MyRemindersDialog';
import { FILTERS, fmt, TithiMark, TONE_DOT } from '../components/calendar/calendarUi';

const pad = (n) => String(n).padStart(2, '0');

/* Nepali and Hindi readers get the Bikram Sambat patro */
const PREFERS_BS = ['ne', 'hi'];

/* The bundled BS table covers BS 2000-2090; the Gregorian view stays inside it */
const BS_MIN = 2000;
const BS_MAX = 2090;
const AD_MIN = 1944;
const AD_MAX = 2033;

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/* The BS year/month (or AD year/month) a given day falls in. The published patro
   wins over the bundled table, which can be a day out for the newest years. */
const viewForKey = (calendar, key, byAd) => {
  if (calendar === 'ad') {
    const [y, m] = key.split('-').map(Number);
    return { year: y, month: m };
  }
  const rec = byAd?.[key];
  if (rec?.bsYear) return { year: rec.bsYear, month: rec.bsMonth };
  const bs = adToBs(dateOfKey(key));
  return bs ? { year: bs.year, month: bs.month } : { year: 2083, month: 1 };
};

/* The days of one BS month as { bsDay, key }: from the patro when it is loaded,
   from the bundled table until then. */
const daysOfBsMonth = (year, month, entry) => {
  if (entry?.days?.length) {
    return entry.days
      .filter((d) => d.ad)
      .map((d) => ({ bsDay: d.bsDay, key: adKey(d.ad.year, d.ad.month, d.ad.day) }));
  }
  const out = [];
  const count = getBsMonthDays(year, month);
  for (let d = 1; d <= count; d++) {
    const ad = bsToAd(year, month, d);
    if (ad) out.push({ bsDay: d, key: adKey(ad.getUTCFullYear(), ad.getUTCMonth() + 1, ad.getUTCDate()) });
  }
  return out;
};

const CalendarPage = () => {
  const { t, lang } = useLanguage();
  const { showToast } = useToast();
  const reminders = useReminders();

  const todayKey = useMemo(() => keyOfDate(new Date()), []);

  const [calendar, setCalendar] = useState(() => (PREFERS_BS.includes(lang) ? 'bs' : 'ad'));
  const [view, setView] = useState(() =>
    viewForKey(PREFERS_BS.includes(lang) ? 'bs' : 'ad', todayKey)
  );
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [filter, setFilter] = useState('all');
  const [patro, setPatro] = useState({ status: 'idle', byAd: {}, months: {} });
  const [templeByKey, setTempleByKey] = useState({});

  const [reminderItem, setReminderItem] = useState(null);
  const [myOpen, setMyOpen] = useState(false);

  const panelRef = useRef(null);
  const pendingSelect = useRef(null); // 'first' | 'last' after an arrow key crosses a month edge
  const pendingReminder = useRef(null); // a reminder asked for before signing in
  const reconciled = useRef(false);

  /* digits / names in the reader's language */
  const digits = useCallback(
    (n) => (PREFERS_BS.includes(lang) ? toNepaliDigits(n) : String(n)),
    [lang]
  );
  const bsMonthNames = BS_MONTHS[lang] || BS_MONTHS.en;
  const adMonthNames = GREGORIAN_MONTHS[lang] || GREGORIAN_MONTHS.en;
  const weekdayShort = WEEKDAYS_SHORT[lang] || WEEKDAYS_SHORT.en;
  const weekdayFull = WEEKDAYS[lang] || WEEKDAYS.en;
  const monthNames = calendar === 'bs' ? bsMonthNames : adMonthNames;

  const bsText = useCallback(
    (bs, forLang = lang) => {
      if (!bs) return '';
      const names = BS_MONTHS[forLang] || BS_MONTHS.ne;
      const d = forLang === 'ne' || forLang === 'hi' ? toNepaliDigits : String;
      return `${d(bs.day)} ${names[bs.month - 1]} ${d(bs.year)}`;
    },
    [lang]
  );

  /* ----- temple programmes from the admin panel ----- */
  useEffect(() => {
    let alive = true;
    api
      .get('/events')
      .then((res) => alive && setTempleByKey(groupTempleEvents(res.data)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  /* ----- patro months: the one on screen and the next few ----- */
  const sidebarMonths = useMemo(() => {
    let base;
    if (calendar === 'bs') {
      base = { year: view.year, month: view.month };
    } else {
      const bs = adToBs(new Date(view.year, view.month - 1, 1));
      base = bs ? { year: bs.year, month: bs.month } : null;
    }
    if (!base) return [];
    // A Gregorian month straddles two BS months, and the table can be a day out
    // at the edge, so start one BS month early and read one further.
    let { year: y, month: m } = base;
    if (calendar === 'ad') {
      m -= 1;
      if (m < 1) {
        m = 12;
        y -= 1;
      }
    }
    const count = calendar === 'bs' ? 4 : 5;
    const out = [];
    for (let i = 0; i < count && y >= BS_MIN && y <= BS_MAX; i++) {
      out.push({ year: y, month: m });
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
    return out;
  }, [calendar, view]);

  const neededKey = sidebarMonths.map((m) => `${m.year}-${m.month}`).join('|');

  useEffect(() => {
    if (!sidebarMonths.length) {
      setPatro({ status: 'idle', byAd: {}, months: {} });
      return undefined;
    }
    let alive = true;
    setPatro((prev) => ({ ...prev, status: 'loading' }));

    Promise.all(
      sidebarMonths.map((m) => fetchPatroMonth(m.year, m.month).catch(() => ({ byAd: {}, days: [] })))
    )
      .then((entries) => {
        if (!alive) return;
        const byAd = {};
        const months = {};
        entries.forEach((e, i) => {
          Object.assign(byAd, e.byAd || {});
          months[`${sidebarMonths[i].year}-${sidebarMonths[i].month}`] = e;
        });
        const got = entries.some((e) => e.days && e.days.length > 0);
        setPatro({ status: got ? 'ready' : 'error', byAd, months });
      })
      .catch(() => alive && setPatro({ status: 'error', byAd: {}, months: {} }));

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [neededKey]);

  const byAd = patro.byAd;

  /* Once, when the patro first arrives: if it dates today into a different BS
     month than the bundled table did, follow the patro. */
  useEffect(() => {
    if (reconciled.current || patro.status !== 'ready' || calendar !== 'bs') return;
    reconciled.current = true;
    if (selectedKey !== todayKey) return;
    const rec = byAd[todayKey];
    if (rec?.bsYear && (rec.bsYear !== view.year || rec.bsMonth !== view.month)) {
      setView({ year: rec.bsYear, month: rec.bsMonth });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patro.status]);

  const dayFor = useCallback(
    (key) => buildDay(key, byAd[key], templeByKey[key] || []),
    [byAd, templeByKey]
  );

  /* ----- the month on screen ----- */
  const month = useMemo(() => {
    let list;
    if (calendar === 'bs') {
      list = daysOfBsMonth(view.year, view.month, patro.months[`${view.year}-${view.month}`]);
    } else {
      const n = new Date(view.year, view.month, 0).getDate();
      list = range(1, n).map((d) => ({ bsDay: null, key: adKey(view.year, view.month, d) }));
    }
    if (!list.length) return null;

    const cells = list.map(({ bsDay, key }) => {
      const date = dateOfKey(key);
      const day = dayFor(key);
      return {
        key,
        day,
        isToday: key === todayKey,
        isSaturday: date.getDay() === 6,
        label: calendar === 'bs' ? digits(bsDay) : String(date.getDate()),
        sub: calendar === 'bs' ? pad(date.getDate()) : day.bs ? digits(day.bs.day) : '',
        ariaDate: formatDate(date, lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      };
    });

    const padded = [...Array(dateOfKey(list[0].key).getDay()).fill(null), ...cells];
    const weeks = [];
    for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));
    const last = weeks[weeks.length - 1];
    while (last.length < 7) last.push(null);

    return { cells, weeks, firstKey: cells[0].key, lastKey: cells[cells.length - 1].key };
  }, [calendar, view, patro.months, dayFor, digits, lang, todayKey]);

  const subtitle = useMemo(() => {
    if (!month) return '';
    const first = month.cells[0];
    const last = month.cells[month.cells.length - 1];
    if (calendar === 'bs') {
      const a = formatDate(dateOfKey(first.key), lang, { day: 'numeric', month: 'short' });
      const b = formatDate(dateOfKey(last.key), lang, { day: 'numeric', month: 'short', year: 'numeric' });
      return `${a} – ${b}`;
    }
    const b1 = first.day.bs;
    const b2 = last.day.bs;
    if (!b1 || !b2) return t.gregorianCalendar || 'Gregorian Calendar';
    return b1.month === b2.month
      ? `${bsMonthNames[b2.month - 1]} ${digits(b2.year)}`
      : `${bsMonthNames[b1.month - 1]} – ${bsMonthNames[b2.month - 1]} ${digits(b2.year)}`;
  }, [month, calendar, lang, bsMonthNames, digits, t]);

  /* keep the selected day inside the month on screen */
  useEffect(() => {
    if (!month) return;
    const pending = pendingSelect.current;
    pendingSelect.current = null;
    if (pending === 'first') setSelectedKey(month.firstKey);
    else if (pending === 'last') setSelectedKey(month.lastKey);
    else if (selectedKey < month.firstKey || selectedKey > month.lastKey) {
      setSelectedKey(todayKey >= month.firstKey && todayKey <= month.lastKey ? todayKey : month.firstKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month?.firstKey, month?.lastKey]);

  /* ----- navigation ----- */
  const yearBounds = useMemo(
    () => (calendar === 'bs' ? [BS_MIN, BS_MAX] : [AD_MIN, AD_MAX]),
    [calendar]
  );

  const stepMonth = useCallback(
    (delta) => {
      setView((v) => {
        let y = v.year;
        let m = v.month + delta;
        while (m > 12) {
          m -= 12;
          y += 1;
        }
        while (m < 1) {
          m += 12;
          y -= 1;
        }
        return y < yearBounds[0] || y > yearBounds[1] ? v : { year: y, month: m };
      });
    },
    [yearBounds]
  );

  const canPrev = view.year > yearBounds[0] || view.month > 1;
  const canNext = view.year < yearBounds[1] || view.month < 12;

  const jump = (year, m) => setView({ year, month: m });

  const goToday = () => {
    setView(viewForKey(calendar, todayKey, byAd));
    setSelectedKey(todayKey);
  };

  const switchCalendar = (id) => {
    if (id === calendar) return;
    setCalendar(id);
    setView(viewForKey(id, selectedKey, byAd));
  };

  /* the page opens in the calendar the reader's language prefers */
  const firstLang = useRef(true);
  useEffect(() => {
    if (firstLang.current) {
      firstLang.current = false;
      return;
    }
    const id = PREFERS_BS.includes(lang) ? 'bs' : 'ad';
    setCalendar(id);
    setView(viewForKey(id, selectedKey, byAd));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const selectDay = useCallback((key) => {
    setSelectedKey(key);
    // On a phone the day's details sit below the grid: bring them into view.
    if (window.matchMedia && window.matchMedia('(max-width: 1023px)').matches) {
      requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }, []);

  /* from the list or "My reminders": open that day, whichever month it is in */
  const openDay = useCallback(
    (key) => {
      if (month && (key < month.firstKey || key > month.lastKey)) {
        setView(viewForKey(calendar, key, byAd));
      }
      selectDay(key);
    },
    [month, calendar, byAd, selectDay]
  );

  /* arrow keys: a day at a time inside the month, month steps at its edges */
  const moveSelection = useCallback(
    (delta) => {
      if (!month) return;
      const idx = month.cells.findIndex((c) => c.key === selectedKey);
      const next = (idx < 0 ? 0 : idx) + delta;
      if (next < 0) {
        if (!canPrev) return;
        pendingSelect.current = 'last';
        stepMonth(-1);
      } else if (next >= month.cells.length) {
        if (!canNext) return;
        pendingSelect.current = 'first';
        stepMonth(1);
      } else {
        setSelectedKey(month.cells[next].key);
      }
    },
    [month, selectedKey, stepMonth, canPrev, canNext]
  );

  /* ----- the selected day ----- */
  const selectedDay = useMemo(() => dayFor(selectedKey), [dayFor, selectedKey]);
  const selectedDate = dateOfKey(selectedKey);

  const dayTitle = useMemo(() => {
    const d = selectedDay;
    if (d.mark) return TITHI_NAMES[d.mark];
    return {
      en: formatDate(selectedDate, 'en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      ne: bsText(d.bs, 'ne') || formatDate(selectedDate, 'ne', { day: 'numeric', month: 'long', year: 'numeric' }),
    };
  }, [selectedDay, selectedDate, bsText]);

  /* ----- festival / holiday list, month after month ----- */
  const listGroups = useMemo(() => {
    if (!month) return [];
    const short = bsMonthNames.map((m) => m.slice(0, lang === 'en' ? 3 : 4));
    // Upcoming first: in the current month (or an earlier one) start from today;
    // when browsing a month that is already over, show it whole.
    const listFrom = todayKey > month.lastKey ? month.firstKey : todayKey > month.firstKey ? todayKey : month.firstKey;
    return sidebarMonths.map(({ year, month: bsMonth }) => {
      const entry = patro.months[`${year}-${bsMonth}`];
      const items = [];
      (entry?.days || []).forEach((rec) => {
        if (!rec.ad) return;
        const key = adKey(rec.ad.year, rec.ad.month, rec.ad.day);
        if (key < listFrom) return;
        const day = dayFor(key);
        const date = dateOfKey(key);
        const base = {
          dateKey: key,
          bsDay: digits(rec.bsDay),
          bsMonthShort: short[bsMonth - 1] || '',
          adLabel: formatDate(date, lang, { day: 'numeric', month: 'short', year: 'numeric' }),
          tithi: (lang === 'en' ? rec.tithiEn : rec.tithiNp) || '',
          inDays: daysFromKey(todayKey, key),
        };
        const remindCommon = {
          eventDate: key,
          bsLabel: bsText(day.bs, lang === 'en' ? 'en' : 'ne'),
          tithi: base.tithi,
        };

        if (filter === 'all' || filter === 'holidays' || filter === 'festivals') {
          day.events.forEach((e, i) => {
            if (filter === 'holidays' && !e.isHoliday) return;
            const name = eventName(e, lang);
            if (!name) return;
            items.push({
              ...base,
              id: `${key}-e${i}`,
              name,
              isHoliday: e.isHoliday,
              remind: {
                ...remindCommon,
                kind: e.isHoliday ? 'holiday' : 'festival',
                title: { en: e.en || e.np, ne: e.np || e.en },
              },
            });
          });
        }
        if (filter === 'all' || filter === 'temple') {
          day.temple.forEach((tp, i) => {
            const name = templeTitle(tp, lang);
            if (!name) return;
            items.push({
              ...base,
              id: `${key}-t${i}`,
              name,
              isHoliday: false,
              remind: {
                ...remindCommon,
                kind: 'event',
                title: { en: tp.title.en || tp.title.ne || '', ne: tp.title.ne || tp.title.en || '' },
              },
            });
          });
        }
        if (filter === 'tithi' && day.mark) {
          items.push({
            ...base,
            id: `${key}-m`,
            name: t[`cal_leg${day.mark === 'amavasya' ? 'Amavasya' : day.mark === 'purnima' ? 'Purnima' : 'Ekadashi'}`],
            mark: day.mark,
            isHoliday: false,
            remind: { ...remindCommon, kind: 'tithi', title: TITHI_NAMES[day.mark] },
          });
        }
        if (filter === 'auspicious' && day.auspicious) {
          const name = [
            day.special.bibaha && (t.cal_bibaha || 'Marriage'),
            day.special.bratabanda && (t.cal_bratabanda || 'Bratabandha'),
            day.special.grihaprabesh && (t.cal_grihaprabesh || 'Griha pravesh'),
          ]
            .filter(Boolean)
            .join(' · ');
          items.push({
            ...base,
            id: `${key}-a`,
            name,
            isHoliday: false,
            remind: {
              ...remindCommon,
              kind: 'day',
              title: {
                en: formatDate(date, 'en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
                ne: bsText(day.bs, 'ne'),
              },
            },
          });
        }
      });
      return { key: `${year}-${bsMonth}`, label: `${bsMonthNames[bsMonth - 1]} ${digits(year)}`, items };
    });
  }, [month, sidebarMonths, patro.months, filter, lang, t, bsMonthNames, digits, dayFor, bsText, todayKey]);

  const nextUp = useMemo(() => {
    for (const g of listGroups) {
      const hit = g.items.find((i) => i.inDays >= 0);
      if (hit) return hit;
    }
    return null;
  }, [listGroups]);

  /* ----- reminders ----- */
  const openReminder = useCallback(
    (item) => {
      if (!reminders.signedIn) {
        pendingReminder.current = { item, at: Date.now() };
        showToast(t.cal_remNeedLogin || 'Sign in to get an email reminder.', 'info');
        window.dispatchEvent(new CustomEvent('open-auth', { detail: 'login' }));
        return;
      }
      setReminderItem(item);
    },
    [reminders.signedIn, showToast, t]
  );

  // Signed in just now, after asking for a reminder: carry on where they were.
  useEffect(() => {
    const pending = pendingReminder.current;
    if (reminders.signedIn && pending) {
      pendingReminder.current = null;
      if (Date.now() - pending.at < 5 * 60 * 1000) setReminderItem(pending.item);
    }
  }, [reminders.signedIn]);

  const existingForItem = reminderItem
    ? reminders.byKey.get(reminderKey(reminderItem.eventDate, reminderItem.title))
    : null;

  const saveReminder = async (payload) => {
    const result = await reminders.save(payload);
    if (result.ok) {
      const name = lang === 'en' ? payload.title.en || payload.title.ne : payload.title.ne || payload.title.en;
      showToast(fmt(t.cal_remSaved || 'Reminder saved. We will email you before {title}.', { title: name }), 'success');
      setReminderItem(null);
    }
    return result;
  };

  const removeReminder = async (id) => {
    const result = await reminders.remove(id);
    if (result.ok) {
      showToast(t.cal_remRemoved || 'Reminder removed.', 'success');
      setReminderItem(null);
    } else {
      showToast(result.message, 'error');
    }
    return result;
  };

  const testReminder = async (id) => {
    const result = await reminders.sendTest(id);
    showToast(
      result.ok ? fmt(t.cal_myTestSent || 'Test email sent to {email}.', { email: result.sentTo }) : result.message,
      result.ok ? 'success' : 'error'
    );
  };

  const upcomingCount = reminders.list.filter((r) => r.eventDate >= todayKey).length;

  /* ----- add the month to a phone / Google / Outlook calendar ----- */
  const exportMonth = () => {
    if (!month) return;
    const items = [];
    month.cells.forEach(({ key, day }) => {
      day.events.forEach((e, i) => {
        items.push({ uid: `${key}-e${i}`, key, title: e.en || e.np, description: e.isHoliday ? 'Public holiday' : '' });
      });
      day.temple.forEach((tp, i) => {
        items.push({
          uid: `${key}-t${i}`,
          key,
          title: tp.title.en || tp.title.ne,
          description: 'Shree Ramchandra Temple programme',
        });
      });
    });
    if (!items.length) {
      showToast(t.noFestivals || 'No festivals or holidays in this month.', 'info');
      return;
    }
    downloadIcs(
      `temple-calendar-${month.firstKey.slice(0, 7)}.ics`,
      buildIcs(items, { calName: 'Shree Ramchandra Temple Calendar' })
    );
  };

  const yearOptions = useMemo(
    () =>
      range(...yearBounds).map((y) => ({
        value: y,
        label: calendar === 'bs' ? digits(y) : String(y),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [calendar, digits]
  );

  const showReminderButtons = selectedKey > todayKey;

  return (
    <div className="min-h-screen bg-slate-50 pt-10 sm:pt-14 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <PageHeader sub={t.calendarSubtitle || 'Nepali Bikram Sambat calendar with festivals and public holidays, in your language.'}>
            {t.calendarTitle || 'Shree Ramchandra Mandir Calendar'}
          </PageHeader>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          {/* Month */}
          <div className="w-full min-w-0 lg:flex-1 space-y-4">
            <CalendarToolbar
              t={t}
              calendar={calendar}
              onCalendar={switchCalendar}
              monthNames={monthNames}
              yearOptions={yearOptions}
              view={view}
              subtitle={subtitle}
              onJump={jump}
              onPrev={() => stepMonth(-1)}
              onNext={() => stepMonth(1)}
              onToday={goToday}
              canPrev={canPrev}
              canNext={canNext}
              reminderCount={upcomingCount}
              onReminders={() => setMyOpen(true)}
              onExport={exportMonth}
            />

            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="group" aria-label="Filter">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  aria-pressed={filter === f.id}
                  className={`shrink-0 h-9 px-4 rounded-full border text-sm font-semibold transition-colors ${
                    filter === f.id
                      ? 'bg-vermilion border-vermilion text-white'
                      : 'bg-white border-line text-ink-soft hover:bg-panel hover:text-ink'
                  }`}
                >
                  {t[f.labelKey] || f.fallback}
                </button>
              ))}
            </div>

            {month ? (
              <>
                <MonthGrid
                  weekdayHeaders={weekdayShort}
                  weeks={month.weeks}
                  selectedKey={selectedKey}
                  onSelect={selectDay}
                  onMove={moveSelection}
                  onMonth={stepMonth}
                  filter={filter}
                  lang={lang}
                  t={t}
                  remindedDates={reminders.datesWithReminder}
                  loading={patro.status === 'loading'}
                />

                <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-soft px-1" aria-label="Legend">
                  <li className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${TONE_DOT.holiday}`} /> {t.cal_legHoliday || 'Public holiday'}
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${TONE_DOT.festival}`} /> {t.cal_tagFestival || 'Festival'}
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${TONE_DOT.temple}`} /> {t.cal_legTemple || 'Temple programme'}
                  </li>
                  <li className="flex items-center gap-1.5">
                    <TithiMark mark="ekadashi" /> {t.cal_legEkadashi || 'Ekadashi'}
                  </li>
                  <li className="flex items-center gap-1.5">
                    <TithiMark mark="purnima" /> {t.cal_legPurnima || 'Purnima'}
                  </li>
                  <li className="flex items-center gap-1.5">
                    <TithiMark mark="amavasya" /> {t.cal_legAmavasya || 'Aunsi'}
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Sparkles size={11} aria-hidden="true" /> {t.cal_legAuspicious || 'Auspicious day'}
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Bell size={11} className="text-vermilion fill-vermilion" aria-hidden="true" />{' '}
                    {t.cal_legReminder || 'Reminder set'}
                  </li>
                </ul>
              </>
            ) : (
              <div className="rounded-2xl border border-line bg-white text-center text-ink-soft py-16">
                {t.noData || 'No data available for the selected month.'}
              </div>
            )}
          </div>

          {/* Day + upcoming */}
          <div className="w-full lg:w-[360px] lg:shrink-0 space-y-5" ref={panelRef}>
            <DayPanel
              t={t}
              lang={lang}
              day={selectedDay}
              isToday={selectedKey === todayKey}
              bsLabel={bsText(selectedDay.bs)}
              adLabel={formatDate(selectedDate, lang, { day: 'numeric', month: 'long', year: 'numeric' })}
              weekdayName={weekdayFull[selectedDate.getDay()]}
              reminderByKey={reminders.byKey}
              onRemind={openReminder}
              canRemind={showReminderButtons}
              bsText={bsText(selectedDay.bs, lang === 'en' ? 'en' : 'ne')}
              dayTitle={dayTitle}
              slideKey={selectedKey}
            />

            <UpcomingList
              t={t}
              groups={listGroups}
              loading={patro.status === 'loading'}
              error={patro.status === 'error'}
              next={nextUp}
              selectedKey={selectedKey}
              onSelect={openDay}
              onRemind={openReminder}
              reminderByKey={reminders.byKey}
            />

            <p className="text-xs leading-relaxed text-mute px-1">
              {t.a6_calendarSource ||
                'Festivals, holidays and panchanga details are served by the Hamro Patro public calendar API.'}
            </p>
          </div>
        </div>
      </div>

      {reminderItem && (
        <ReminderDialog
          key={`${reminderItem.eventDate}-${reminderItem.title.en}`}
          item={reminderItem}
          existing={existingForItem}
          t={t}
          lang={lang}
          todayKey={todayKey}
          email={reminders.email}
          emailReady={reminders.emailReady}
          onClose={() => setReminderItem(null)}
          onSave={saveReminder}
          onRemove={removeReminder}
        />
      )}

      {myOpen && (
        <MyRemindersDialog
          t={t}
          lang={lang}
          todayKey={todayKey}
          signedIn={reminders.signedIn}
          loading={reminders.loading}
          list={reminders.list}
          email={reminders.email}
          onClose={() => setMyOpen(false)}
          onSignIn={() => {
            setMyOpen(false);
            window.dispatchEvent(new CustomEvent('open-auth', { detail: 'login' }));
          }}
          onOpenDay={(key) => {
            setMyOpen(false);
            openDay(key);
          }}
          onRemove={removeReminder}
          onTest={testReminder}
        />
      )}
    </div>
  );
};

export default CalendarPage;
