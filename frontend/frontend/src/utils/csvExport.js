/**
 * CSV export + period filtering shared by the admin tables
 * (bookings, donations, users).
 *
 * The download button in each table offers Weekly / Monthly / Yearly / All time.
 * The period is applied to the rows already loaded by the admin panel, so no
 * extra network request is made and the export always matches what the admin
 * is looking at.
 */

// Inclusive start of the window for a period, relative to `now`.
// Returns null for 'all'.
export const periodStart = (period, now = new Date()) => {
  const d = new Date(now);

  switch (period) {
    case 'weekly': {
      // Last 7 days, including today.
      const start = new Date(d);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - 6);
      return start;
    }
    case 'monthly': {
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      return start;
    }
    case 'yearly': {
      return new Date(d.getFullYear(), 0, 1);
    }
    default:
      return null;
  }
};

/**
 * Keep only the rows whose `dateField` falls inside the period.
 * Rows with an unparseable date are dropped for a bounded period, because they
 * cannot be placed on a timeline; they are kept for 'all'.
 */
export const filterByPeriod = (rows = [], period, dateField = 'createdAt', now = new Date()) => {
  const list = Array.isArray(rows) ? rows : [];
  const start = periodStart(period, now);
  if (!start) return list;

  const end = new Date(now);
  return list.filter((row) => {
    const raw = row?.[dateField];
    if (!raw) return false;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return false;
    return d >= start && d <= end;
  });
};

/**
 * Escape one CSV cell.
 * A leading =, +, - or @ is prefixed with a single quote so spreadsheet apps
 * treat the value as text instead of a formula (CSV injection).
 */
const escapeCell = (value) => {
  if (value === null || value === undefined) return '';

  let str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;

  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Build the CSV text.
 * `columns` is [{ key, label }]; `rows` are the objects to read from.
 * A UTF-8 BOM is prefixed so Excel opens Nepali/Devanagari text correctly.
 */
export const toCsv = (columns = [], rows = []) =>
  columns
    .map((c) => escapeCell(c.label))
    .join(',') +
  '\n' +
  rows
    .map((row) => columns.map((c) => escapeCell(c.value ? c.value(row) : row[c.key])).join(','))
    .join('\n');

/**
 * Trigger a browser download of the given text.
 * Mirrors the Blob + anchor pattern already used by BackupContext / AdminGallery.
 */
export const downloadCsvFile = (filename, csvText) => {
  // The BOM keeps Excel from mangling non-Latin characters.
  const blob = new Blob(['\uFEFF' + csvText], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const csvStamp = () => new Date().toISOString().slice(0, 10);

/**
 * Period options. Labels come from the active language via `t`, with an English
 * fallback so the menu is never blank.
 */
export const PERIODS = ['weekly', 'monthly', 'yearly', 'all'];

export const periodLabel = (period, t) => {
  const map = {
    weekly: t?.downloadWeekly || 'This Week',
    monthly: t?.downloadMonthly || 'This Month',
    yearly: t?.downloadYearly || 'This Year',
    all: t?.downloadAllTime || 'All Time',
  };
  return map[period] || map.all;
};
