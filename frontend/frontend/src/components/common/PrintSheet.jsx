import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';

const STYLE_ID = 'temple-print-sheet-css';

/**
 * Injected once. The printable sheet is rendered into a portal that is a direct
 * child of <body>, so during printing every other top-level node can be hidden
 * without touching the React tree. That keeps long documents (a booking list
 * running to several pages) intact — a `position: fixed` overlay would be
 * clipped to a single page.
 */
const PRINT_CSS = `
@media print {
  @page { margin: 12mm; size: A4; }
  html, body { background: #fff !important; }
  body.print-sheet-active > *:not(.print-sheet-portal) { display: none !important; }
  .print-sheet-portal {
    position: static !important;
    inset: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    overflow: visible !important;
    display: block !important;
  }
  .print-sheet-portal * { box-shadow: none !important; }
  .print-no { display: none !important; }
  .print-page-break { break-before: page; page-break-before: always; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  thead { display: table-header-group; }
}
`;

const injectStyles = () => {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = PRINT_CSS;
  document.head.appendChild(el);
};

/**
 * A printable document.
 *
 * Screen: a dismissible overlay with a Print button.
 * Print: only the `children` are laid out on paper, so nothing needs per-button
 * `print-no` classes outside the header bar.
 */
const PrintSheet = ({ title, subtitle, onClose, children, printRef }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    injectStyles();
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mounted, onClose]);

  const handlePrint = () => {
    document.body.classList.add('print-sheet-active');
    const cleanup = () => {
      document.body.classList.remove('print-sheet-active');
      window.removeEventListener('afterprint', cleanup);
    };
    // `afterprint` is not universal; the timeout is the fallback so the class
    // can never get stuck and leave the page unclickable.
    window.addEventListener('afterprint', cleanup);
    window.print();
    setTimeout(cleanup, 1500);
  };

  if (!mounted) return null;

  return createPortal(
    <div className="print-sheet-portal fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-4 sm:p-6 print-no">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-4">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-gray-100 bg-white rounded-t-2xl">
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-serif font-bold text-[#A80808] truncate">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-ink-soft mt-0.5 truncate">{subtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#A80808] text-white rounded-xl text-sm font-semibold hover:bg-[#660505] transition-all"
              >
                <Printer size={15} /> Print
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-all"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div
            ref={printRef}
            className="px-5 sm:px-8 py-6 sm:py-8 bg-white text-gray-900"
            style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

/**
 * Letterhead used at the top of every printed document.
 * `settings` is the admin settings object so the temple name, logo and address
 * come from the CMS rather than being hardcoded.
 */
export const PrintHeader = ({ settings, documentTitle }) => {
  const logoUrl = settings?.logo?.photo || '/logo.png';
  const templeName = settings?.logo?.text?.en || 'Shree Ramchandra Temple';
  const address =
    settings?.footer?.contactInfo?.address?.en ||
    'Battisputali, Gaushala, Kathmandu, Nepal';
  const phone = settings?.footer?.contactInfo?.phone?.en || '';

  return (
    <header className="text-center border-b-2 border-[#A80808] pb-5 mb-6">
      <div className="flex items-center justify-center gap-4 mb-3">
        {logoUrl && (
          <img
            src={logoUrl}
            alt="Logo"
            className="h-14 w-14 object-contain"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        )}
        <div className="text-left">
          <h1 className="text-2xl font-bold text-[#A80808]">{templeName}</h1>
          <p className="text-xs text-gray-600">{address}</p>
          {phone && <p className="text-xs text-gray-500">Tel: {phone}</p>}
        </div>
      </div>
      <h2 className="text-lg font-bold uppercase tracking-wide text-gray-800">
        {documentTitle}
      </h2>
    </header>
  );
};

/** Label/value pair used inside the detail grids. */
export const PrintField = ({ label, value, mono = false }) => (
  <div>
    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</p>
    <p className={`text-sm font-semibold text-gray-900 mt-0.5 ${mono ? 'font-mono tracking-wider' : ''}`}>
      {value === null || value === undefined || value === '' ? '—' : value}
    </p>
  </div>
);

/** Signature / stamp footer shared by the printable documents. */
export const PrintFooter = ({ settings, note }) => {
  const signature = settings?.signature || '/signature.png';
  const logoUrl = settings?.logo?.photo || '/logo.png';

  return (
    <footer className="mt-8 pt-5 border-t border-gray-300">
      <div className="flex items-end justify-between gap-6">
        <div className="text-center">
          <div className="w-36 h-12 border-b border-gray-400 mb-1" />
          <p className="text-xs text-gray-600">Prepared By</p>
        </div>
        <div className="text-center">
          <div className="w-36 h-12 border-b border-gray-400 mb-1 flex items-end justify-center">
            {signature && (
              <img
                src={signature}
                alt="Signature"
                className="h-full object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            )}
          </div>
          <p className="text-xs text-gray-600">Temple Committee</p>
        </div>
        <div className="text-center">
          <div className="w-24 h-12 border-b border-gray-400 mb-1 flex items-end justify-center">
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Stamp"
                className="h-full object-contain opacity-60"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            )}
          </div>
          <p className="text-xs text-gray-600">Official Stamp</p>
        </div>
      </div>
      <div className="text-center mt-5 space-y-0.5">
        {note && <p className="text-xs text-gray-500">{note}</p>}
        <p className="text-xs text-gray-400">
          Generated on {new Date().toLocaleString()}
        </p>
      </div>
    </footer>
  );
};

export default PrintSheet;
