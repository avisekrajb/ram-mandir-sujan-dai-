// Minimal iCalendar (.ics) writer so a festival or a whole month can be added to
// a phone / Google / Outlook calendar. All-day events, with optional alarms.

const esc = (s) =>
  String(s === undefined || s === null ? '' : s)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

/** Lines longer than 75 bytes must be folded (RFC 5545). Never split a character. */
const fold = (line) => {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out = [];
  let cur = '';
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > limit) {
      out.push(cur);
      cur = ch;
      bytes = b;
      limit = 74; // continuation lines start with a space
    } else {
      cur += ch;
      bytes += b;
    }
  }
  out.push(cur);
  return out.join('\r\n ');
};

const compact = (key) => key.replace(/-/g, '');

const nextDay = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  const n = new Date(Date.UTC(y, m - 1, d + 1));
  return `${n.getUTCFullYear()}${String(n.getUTCMonth() + 1).padStart(2, '0')}${String(n.getUTCDate()).padStart(2, '0')}`;
};

// An all-day event starts at 00:00, so "N days before at 08:00" is N*24h - 8h
// before the start (or 8h after it, for the day itself).
const alarmTrigger = (daysBefore) => {
  const hours = daysBefore * 24 - 8;
  if (hours <= 0) return `PT${-hours}H`;
  const d = Math.floor(hours / 24);
  const h = hours % 24;
  return `-P${d ? `${d}D` : ''}${h ? `T${h}H` : d ? '' : 'T0H'}`;
};

const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');

/**
 * @param {Array<{uid:string,key:string,title:string,description?:string,alarms?:number[]}>} items
 */
export const buildIcs = (items, { calName = 'Shree Ramchandra Temple' } = {}) => {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Shree Ramchandra Temple//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(calName)}`,
  ];
  const now = stamp();
  items.forEach((it) => {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${esc(it.uid)}@ramchandratemple`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${compact(it.key)}`,
      `DTEND;VALUE=DATE:${nextDay(it.key)}`,
      `SUMMARY:${esc(it.title)}`
    );
    if (it.description) lines.push(`DESCRIPTION:${esc(it.description)}`);
    lines.push('TRANSP:TRANSPARENT');
    (it.alarms || []).forEach((n) => {
      lines.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${esc(it.title)}`,
        `TRIGGER:${alarmTrigger(n)}`,
        'END:VALARM'
      );
    });
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
};

export const downloadIcs = (filename, text) => {
  const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** "Add to Google Calendar" link for one all-day event. */
export const googleCalendarUrl = ({ key, title, details = '' }) =>
  'https://calendar.google.com/calendar/render?action=TEMPLATE' +
  `&text=${encodeURIComponent(title)}` +
  `&dates=${compact(key)}/${nextDay(key)}` +
  `&details=${encodeURIComponent(details)}`;
