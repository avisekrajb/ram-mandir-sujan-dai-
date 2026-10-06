import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';
import { Button, Field, inputCls, cx } from './kit';
import { useLanguage } from '../../../context/LanguageContext';
import { pushOverlay, popOverlay, isTopOverlay, claimEscape } from './overlayStack';

const FOCUSABLE = 'a[href],button:not([disabled]),textarea,input:not([disabled]),select,[tabindex]:not([tabindex="-1"])';

/**
 * Shared behaviour for dialogs: Escape closes, Tab stays inside, the page
 * behind does not scroll, and focus returns to what opened it.
 */
const useOverlay = (open, onClose, panelRef) => {
  // Always call the latest onClose: callers pass `undefined` while saving, and that
  // must apply to an Escape pressed mid-save, not the value from when it opened.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const id = pushOverlay();

    const first = panelRef.current?.querySelector('[data-autofocus]') || panelRef.current?.querySelector(FOCUSABLE);
    (first || panelRef.current)?.focus?.();

    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (claimEscape(e, id)) { e.stopPropagation(); closeRef.current?.(); }
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current || !isTopOverlay(id)) return;
      const nodes = [...panelRef.current.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null);
      if (!nodes.length) return;
      const firstNode = nodes[0];
      const lastNode = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === firstNode) { e.preventDefault(); lastNode.focus(); }
      else if (!e.shiftKey && document.activeElement === lastNode) { e.preventDefault(); firstNode.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      popOverlay(id);
      previous?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run on open/close only
  }, [open]);
};

const SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };

export const Modal = ({ open, onClose, title, description, children, footer, size = 'md', closeLabel = 'Close' }) => {
  const panelRef = useRef(null);
  const titleId = useId();
  useOverlay(open, onClose, panelRef);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-end justify-center sm:items-center sm:p-4" role="presentation">
      <div className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx(
          'relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-line bg-white shadow-2xl outline-none sm:rounded-2xl',
          SIZES[size]
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h3 id={titleId} className="font-serif text-lg font-semibold text-ink">{title}</h3>
            {description && <p className="mt-0.5 text-sm text-ink-soft">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-mute hover:bg-gray-100 hover:text-ink"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-gray-50/60 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body
  );
};

/** Right-hand detail panel (full width on phones). */
export const Drawer = ({ open, onClose, title, subtitle, children, footer, closeLabel = 'Close' }) => {
  const panelRef = useRef(null);
  const titleId = useId();
  useOverlay(open, onClose, panelRef);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[10000] flex justify-end" role="presentation">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex h-full w-full max-w-xl flex-col border-l border-line bg-white shadow-2xl outline-none"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h3 id={titleId} className="truncate font-serif text-lg font-semibold text-ink">{title}</h3>
            {subtitle && <div className="mt-0.5 text-sm text-ink-soft">{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-mute hover:bg-gray-100 hover:text-ink"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="flex flex-wrap items-center gap-2 border-t border-line bg-gray-50/60 px-5 py-3">{footer}</div>}
      </aside>
    </div>,
    document.body
  );
};

/**
 * Confirmation for anything destructive. `requireText` makes the person type a
 * word (e.g. DELETE) before the button enables; `reasonLabel` adds an optional
 * note that is passed to onConfirm.
 */
export const ConfirmDialog = ({
  open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  tone = 'danger', requireText, reasonLabel, busy, children,
}) => {
  const { t } = useLanguage();
  const [typed, setTyped] = useState('');
  const [reason, setReason] = useState('');
  useEffect(() => { if (open) { setTyped(''); setReason(''); } }, [open]);
  const locked = requireText && typed.trim().toLowerCase() !== requireText.toLowerCase();
  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      size="sm"
      title={
        <span className="flex items-center gap-2">
          {tone === 'danger' && <AlertTriangle size={18} className="text-red-600" aria-hidden="true" />}
          {title}
        </span>
      }
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>{cancelLabel}</Button>
          <Button
            variant={tone === 'danger' ? 'dangerSolid' : 'primary'}
            loading={busy}
            disabled={locked}
            onClick={() => onConfirm(reason.trim())}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-sm text-ink-soft">
        {message && <p>{message}</p>}
        {children}
        {reasonLabel && (
          <Field label={reasonLabel} htmlFor="confirm-reason">
            <input
              id="confirm-reason"
              data-autofocus
              value={reason}
              maxLength={300}
              onChange={(e) => setReason(e.target.value)}
              className={inputCls}
            />
          </Field>
        )}
        {requireText && (
          <Field label={(t.k7_typeToConfirm || 'Type “{word}” to confirm').replace('{word}', requireText)} htmlFor="confirm-text">
            <input
              id="confirm-text"
              data-autofocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              className={inputCls}
            />
          </Field>
        )}
      </div>
    </Modal>
  );
};
