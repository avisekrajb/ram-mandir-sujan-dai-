import React from 'react';
import { Panel, cx } from './kit';

/**
 * The shared shape for the newer admin pages: a title, a run of numbered cards,
 * and - when the page has one - a save bar pinned to the bottom of the viewport so
 * Save is always reachable without scrolling to the end of a long page.
 *
 * Built on the admin kit (Panel, PanelHeader) rather than on one-off classes, so
 * these pages look the same as the rest of the panel.
 */

/**
 * One numbered card. `n` is its position on the page; pass nothing to leave the
 * number out.
 */
export const Card = ({ n, icon: Icon, title, description, actions, children, className = '', bodyClassName = 'p-5', accent = true }) => (
  <Panel className={cx('overflow-hidden', className)}>
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        {n != null && (
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white"
          >
            {n}
          </span>
        )}
        {Icon && (
          <span
            aria-hidden="true"
            className={cx('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', accent ? 'bg-brand-50 text-vermilion' : 'bg-gray-100 text-mute')}
          >
            <Icon size={16} />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="font-serif text-base font-semibold leading-tight text-ink">{title}</h3>
          {description && <p className="mt-1 text-sm leading-relaxed text-ink-soft">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
    <div className={bodyClassName}>{children}</div>
  </Panel>
);

/**
 * The bar pinned to the bottom while there are unsaved changes. Deliberately only
 * rendered when `dirty`, so a page with nothing pending shows no bar at all.
 */
export const SaveBar = ({ dirty, saving, onSave, onReset, saveLabel = 'Save changes', resetLabel = 'Discard', extra }) => {
  if (!dirty && !saving) return null;
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-2 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">{saving ? 'Saving…' : 'You have unsaved changes.'}</p>
        <div className="flex flex-wrap items-center gap-2">
          {extra}
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              disabled={saving}
              className="inline-flex min-h-[2.75rem] items-center rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              {resetLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex min-h-[2.75rem] items-center rounded-xl bg-vermilion px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#820606] disabled:opacity-60"
          >
            {saving ? 'Saving…' : saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

/** A dropzone that opens the file picker, with an uploading overlay. */
export const Dropzone = ({ inputRef, onPick, accept = 'image/*', preview, hint, empty, className = '', boxClassName = 'h-40', busy, onRemove, removeLabel = 'Remove' }) => (
  <div className={cx('flex flex-col gap-3 sm:flex-row', className)}>
    <div
      className={cx(
        'group relative flex flex-1 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-vermilion',
        boxClassName
      )}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
    >
      <input ref={inputRef} type="file" accept={accept} onChange={onPick} className="hidden" />
      {preview ? (
        <img src={preview} alt="" className="h-full w-full object-cover" />
      ) : (
        empty
      )}
      {busy && (
        <div className="absolute inset-0 flex items-center justify-center bg-ink/55" aria-hidden="true">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-white border-t-transparent" />
        </div>
      )}
    </div>
    {onRemove && preview && (
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex min-h-[2.75rem] shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 sm:self-center"
      >
        {removeLabel}
      </button>
    )}
    {hint && <p className="text-xs text-mute sm:basis-full">{hint}</p>}
  </div>
);

export default Card;