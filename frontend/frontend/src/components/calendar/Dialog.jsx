import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Modal shell for the calendar dialogs. Same look as the site's other modals
 * (backdrop, bottom sheet on phones); locks page scroll, closes on Escape or a
 * click outside, and hands focus back to whatever opened it.
 */
const Dialog = ({ onClose, title, icon, closeLabel = 'Close', children, footer, wide = false }) => {
  const titleId = useId();
  const sheetRef = useRef(null);

  useEffect(() => {
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sheetRef.current?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      if (opener && typeof opener.focus === 'function') opener.focus();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[500] flex items-end md:items-center justify-center p-4 rt-modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`bg-white rounded-2xl w-full ${wide ? 'max-w-lg' : 'max-w-md'} max-h-[92vh] flex flex-col shadow-2xl rt-modal-sheet focus:outline-none`}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line shrink-0">
          <h2 id={titleId} className="flex items-center gap-2 text-lg font-serif font-bold text-ink min-w-0">
            {icon}
            <span className="truncate">{title}</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="p-2 -mr-2 rounded-full text-ink-soft hover:bg-panel transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-line shrink-0">{footer}</div>}
      </div>
    </div>
  );
};

export default Dialog;
