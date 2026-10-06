import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '../../context/ToastContext';

// Small helpers and the form look shared by the four tools on the Tools page.

export const loadStored = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
};

export const storeValue = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* storage blocked: the tool still works, it just forgets */ }
};

// 16px fields so phones do not zoom in, 48px tall so they are easy to hit.
export const fieldClass =
  'h-12 w-full rounded-xl border border-line bg-white px-3.5 text-base text-ink placeholder:text-mute transition-colors focus:border-vermilion focus:outline-none focus:ring-4 focus:ring-vermilion/15';

export const labelClass = 'mb-1.5 block text-sm font-semibold text-ink-soft';

export const chipClass = (on) =>
  `inline-flex min-h-[2.5rem] items-center rounded-full border px-4 text-sm font-semibold transition-colors ${
    on ? 'border-vermilion bg-vermilion text-white' : 'border-line bg-white text-ink hover:border-vermilion hover:text-vermilion'
  }`;

/** Replace {name} placeholders: fill('In {n} days', { n: 3 }). */
export const fill = (text, values) =>
  String(text).replace(/\{(\w+)\}/g, (whole, key) => (values[key] !== undefined ? values[key] : whole));

/** [copied, copy(text)]: copies to the clipboard, says so, and reports a failure. */
export function useCopy(t) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast(t.copied || 'Copied to clipboard', 'success');
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      showToast(t.converterCopyFailed || 'Copy failed', 'error');
    }
  }, [showToast, t]);

  return [copied, copy];
}
