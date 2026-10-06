import React, { useCallback, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import useDismiss from './useDismiss';

/**
 * Button + popover panel. Closes on outside click, Escape, or when an item
 * inside calls the provided `close` (render-prop).
 */
const Dropdown = ({ label, trigger, align = 'left', active = false, panelClassName = '', children, ariaLabel }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  return (
    <div className="relative" ref={ref}>
      {trigger ? (
        trigger({ open, toggle: () => setOpen((v) => !v) })
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={ariaLabel}
          className={`nav-link inline-flex items-center gap-1 ${active || open ? 'nav-link-active' : ''}`}
        >
          <span>{label}</span>
          <ChevronDown size={17} strokeWidth={2.5} aria-hidden="true" className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>
      )}
      {open && (
        <div
          role="menu"
          className={`absolute top-full mt-2 ${align === 'right' ? 'right-0' : 'left-0'} z-50 min-w-[12.5rem] rounded-xl border border-line bg-white p-1.5 shadow-rt animate-dropdown ${panelClassName}`}
        >
          {children(close)}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
