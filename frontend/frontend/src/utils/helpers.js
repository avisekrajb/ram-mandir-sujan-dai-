import { formatDate as formatLocaleDate } from './formatDate';

export const getYoutubeId = (url) => {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/);
  return match ? match[1] : null;
};

export const formatDate = (date, lang = 'en') => {
  const d = new Date(date);
  if (isNaN(d)) return '--';
  return formatLocaleDate(d, lang, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const truncateText = (text, length = 60) => {
  if (!text) return '';
  return text.length > length ? text.slice(0, length) + '…' : text;
};

export const generateId = () => Math.random().toString(36).slice(2, 10);

export const getInitials = (name) => {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
};