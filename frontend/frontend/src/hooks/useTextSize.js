import { useEffect, useState } from 'react';

/**
 * Reader-controlled text size (for older visitors). The chosen scale is kept in
 * localStorage and applied as the --text-scale CSS variable, which multiplies the
 * root font size (see index.css), so every rem-based size grows together.
 */
export const TEXT_SIZES = [
  { key: 'normal', scale: 1 },
  { key: 'large', scale: 1.15 },
  { key: 'xlarge', scale: 1.3 },
];

const STORAGE_KEY = 'rcmt:text-size';
const listeners = new Set();

const readStored = () => {
  try {
    const key = localStorage.getItem(STORAGE_KEY);
    return TEXT_SIZES.some((s) => s.key === key) ? key : 'normal';
  } catch {
    return 'normal';
  }
};

let current = readStored();

const apply = (key) => {
  const size = TEXT_SIZES.find((s) => s.key === key) || TEXT_SIZES[0];
  document.documentElement.style.setProperty('--text-scale', String(size.scale));
};

// Apply as soon as this module loads so the page never paints at the wrong size.
apply(current);

export const setTextSize = (key) => {
  current = TEXT_SIZES.some((s) => s.key === key) ? key : 'normal';
  apply(current);
  try {
    localStorage.setItem(STORAGE_KEY, current);
  } catch {
    /* storage blocked: the choice still applies for this visit */
  }
  listeners.forEach((fn) => fn(current));
};

const useTextSize = () => {
  const [size, setSize] = useState(current);
  useEffect(() => {
    listeners.add(setSize);
    setSize(current);
    return () => listeners.delete(setSize);
  }, []);
  return [size, setTextSize];
};

export default useTextSize;
