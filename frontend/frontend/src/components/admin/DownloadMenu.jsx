import React, { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, FileSpreadsheet, Check } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import {
  PERIODS,
  periodLabel,
  filterByPeriod,
  toCsv,
  downloadCsvFile,
  csvStamp,
} from '../../utils/csvExport';

/**
 * Download button with a Weekly / Monthly / Yearly / All time dropdown.
 *
 * Each option exports the rows the admin is currently looking at (already
 * search- and status-filtered) as a CSV file.
 *
 * @param rows      the rows to export
 * @param columns   [{ key, label, value? }]
 * @param baseName  file name prefix, e.g. "bookings" -> bookings-weekly-2026-10-04.csv
 * @param dateField field used for the period filter
 * @param t         translation object
 */
const DownloadMenu = ({
  rows = [],
  columns = [],
  baseName = 'export',
  dateField = 'createdAt',
  t,
  className = '',
  label,
}) => {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClickAway = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClickAway);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickAway);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleExport = (period) => {
    setBusy(period);
    try {
      const scoped = filterByPeriod(rows, period, dateField);
      if (!scoped.length) {
        showToast(
          (t?.noRecordsForPeriod || 'No records for {period}.')
            .replace('{period}', periodLabel(period, t)),
          'warning'
        );
        setOpen(false);
        return;
      }

      const csv = toCsv(columns, scoped);
      downloadCsvFile(`${baseName}-${period}-${csvStamp()}.csv`, csv);
      showToast(
        (t?.downloadedRecords || '{count} records downloaded')
          .replace('{count}', String(scoped.length)),
        'success'
      );
      setOpen(false);
    } catch (error) {
      console.error('CSV export error:', error);
      showToast(t?.downloadFailed || 'Download failed', 'error');
    } finally {
      setBusy(null);
    }
  };

  const countFor = (period) => filterByPeriod(rows, period, dateField).length;

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl bg-white text-sm font-semibold text-gray-700 hover:border-[#A80808] hover:text-[#A80808] transition-colors"
      >
        <Download size={15} className="text-[#A80808]" />
        <span className="hidden sm:inline">{label || t?.download || 'Download'}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 z-40 overflow-hidden animate-in fade-in"
        >
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
            <FileSpreadsheet size={14} className="text-[#A80808]" />
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              {t?.downloadCsv || 'Download CSV'}
            </span>
          </div>

          <div className="p-1.5">
            {PERIODS.map((period) => {
              const count = countFor(period);
              return (
                <button
                  key={period}
                  type="button"
                  role="menuitem"
                  onClick={() => handleExport(period)}
                  disabled={busy === period}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-[#A80808]/[0.06] hover:text-[#A80808] transition-colors disabled:opacity-50 text-left"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A80808]/40 flex-shrink-0" />
                  <span className="flex-1 font-medium">{periodLabel(period, t)}</span>
                  <span className="text-xs font-semibold text-gray-400 bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded-full">
                    {count}
                  </span>
                  {busy === period ? (
                    <Check size={13} className="text-green-500" />
                  ) : (
                    <Download size={13} className="text-gray-300" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DownloadMenu;
