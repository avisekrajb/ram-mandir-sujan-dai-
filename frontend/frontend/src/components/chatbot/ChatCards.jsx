import React, { useRef, useState } from 'react';
import {
  ArrowUpRight, CalendarDays, CalendarRange, ChevronLeft, ChevronRight, ExternalLink, Flower2, Heart,
  Image as ImageIcon, Landmark, Languages, Mail, MapPin, Navigation, Newspaper, Phone, Play, ScrollText,
  Ticket, User, Users,
} from 'lucide-react';

/**
 * Rich parts of an assistant reply:
 *  - ChatCardRow  a swipeable row of cards (photo, date badge, title, subtitle)
 *  - ChatActions  link buttons, each with an icon for where it leads
 *  - Linkified    plain text in which web addresses, emails and phone numbers are links
 *
 * Everything is a real link (so it can be opened in a new tab or copied); a plain
 * click is handed to `onNavigate`, which routes inside the app without a reload,
 * opens web addresses in a new tab and starts calls and emails.
 */

const plainClick = (e) => !(e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey);
const isWeb = (to) => /^https?:\/\//i.test(to || '');

/** The icon that says where a link leads. */
const destinationIcon = (to) => {
  const t = String(to || '');
  if (/^tel:/i.test(t)) return Phone;
  if (/^mailto:/i.test(t)) return Mail;
  if (/google\.[a-z.]+\/maps|maps\.app\.goo\.gl/i.test(t)) return Navigation;
  if (isWeb(t)) return ExternalLink;
  if (t.startsWith('/events')) return CalendarDays;
  if (t.startsWith('/calendar')) return CalendarRange;
  if (t.startsWith('/booking')) return Flower2;
  if (t.startsWith('/mybookings')) return Ticket;
  if (t.startsWith('/donate')) return Heart;
  if (t.startsWith('/gallery') || t.startsWith('/videos')) return ImageIcon;
  if (t.startsWith('/templeteams')) return Users;
  if (t.startsWith('/about') || t.startsWith('/history')) return Landmark;
  if (t.startsWith('/blogs')) return Newspaper;
  if (t.startsWith('/contact')) return MapPin;
  if (t.startsWith('/tools')) return Languages;
  if (t.startsWith('/privacy') || t.startsWith('/terms')) return ScrollText;
  return ArrowUpRight;
};

/** Photo in a fixed 16:10 box (no layout shift) with a soft placeholder and a gradient for the badge. */
const CardImage = ({ src, kind, badge }) => {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const Fallback = kind === 'person' ? User : ImageIcon;
  const showImage = src && !failed;
  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden bg-panel">
      {showImage ? (
        <img
          src={src}
          alt=""
          width="400"
          height="250"
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      ) : null}
      {(!showImage || !loaded) && (
        <span className="absolute inset-0 flex items-center justify-center text-gray-300" aria-hidden="true">
          <Fallback size={30} />
        </span>
      )}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/35 to-transparent" aria-hidden="true" />
      {badge ? (
        <span className="absolute left-2 top-2 max-w-[85%] truncate rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-vermilion shadow-sm">
          {badge}
        </span>
      ) : null}
      {kind === 'video' && showImage && loaded && (
        <span className="absolute bottom-2 left-2 flex h-8 w-8 items-center justify-center rounded-full bg-vermilion text-white shadow" aria-hidden="true">
          <Play size={14} fill="currentColor" />
        </span>
      )}
    </div>
  );
};

export const ChatCardRow = ({ cards, openLabel, label, onNavigate }) => {
  const rowRef = useRef(null);
  if (!cards?.length) return null;

  const nudge = (dir) => rowRef.current?.scrollBy({ left: dir * 190, behavior: 'smooth' });
  const arrow = 'absolute top-[38%] z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white text-vermilion shadow-md ring-1 ring-line transition-colors hover:bg-vermilion hover:text-white sm:flex';

  return (
    <div className="relative mt-2 w-full min-w-0">
      {cards.length > 2 && (
        <>
          <button type="button" aria-label="Previous" onClick={() => nudge(-1)} className={`${arrow} -left-2`}>
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <button type="button" aria-label="Next" onClick={() => nudge(1)} className={`${arrow} -right-2`}>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </>
      )}
      <ul
        ref={rowRef}
        aria-label={label}
        className="scroll-x-hidden flex w-full min-w-0 snap-x snap-mandatory gap-3 px-0.5 pb-2 pt-0.5"
      >
        {cards.map((card, index) => (
          <li key={`${card.to}-${card.title}-${index}`} className="w-[11.5rem] shrink-0 snap-start sm:w-[12rem]">
            <a
              href={card.to}
              onClick={(e) => { if (plainClick(e)) { e.preventDefault(); onNavigate(card.to, { auth: card.auth }); } }}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white text-ink shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vermilion"
            >
              <CardImage src={card.image} kind={card.kind} badge={card.badge} />
              <span className="flex flex-1 flex-col gap-1 p-3">
                <span className="line-clamp-2 break-words text-sm font-semibold leading-snug">{card.title}</span>
                {card.subtitle ? <span className="truncate text-xs text-mute">{card.subtitle}</span> : null}
                <span className="mt-auto flex items-center justify-between pt-2 text-sm font-semibold text-vermilion">
                  {openLabel}
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 transition-colors group-hover:bg-vermilion group-hover:text-white">
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </span>
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export const ChatActions = ({ actions, onNavigate, newTabLabel }) => {
  if (!actions?.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {actions.map((action, index) => {
        const Icon = destinationIcon(action.to);
        const web = isWeb(action.to);
        return (
          <a
            key={`${action.to}-${action.label}`}
            href={action.to}
            {...(web ? { target: '_blank', rel: 'noopener noreferrer', title: newTabLabel } : {})}
            onClick={(e) => { if (plainClick(e)) { e.preventDefault(); onNavigate(action.to, { auth: action.auth }); } }}
            className={`inline-flex min-h-[40px] items-center gap-2 rounded-full px-4 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vermilion ${
              index === 0
                ? 'bg-vermilion text-white hover:bg-brand-700'
                : 'border border-line bg-white text-ink hover:border-brand-300 hover:bg-brand-50'
            }`}
          >
            <Icon size={15} aria-hidden="true" className={index === 0 ? '' : 'text-vermilion'} />
            {action.label}
            {web ? <ArrowUpRight size={13} aria-hidden="true" className="opacity-70" /> : null}
          </a>
        );
      })}
    </div>
  );
};

// web addresses, email addresses and phone-number-like runs
const LINK_PATTERN = /(https?:\/\/[^\s<>()]+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+|\+?\d[\d\s-]{7,}\d)/g;

const linkFor = (piece) => {
  if (/^https?:\/\//i.test(piece)) {
    const trimmed = piece.replace(/[.,;:!?]+$/, '');
    let shown = trimmed;
    try { const u = new URL(trimmed); shown = `${u.host.replace(/^www\./, '')}${u.pathname === '/' ? '' : u.pathname}`; } catch { /* show as typed */ }
    return { href: trimmed, shown, external: true, tail: piece.slice(trimmed.length) };
  }
  if (piece.includes('@')) return { href: `mailto:${piece}`, shown: piece, external: false, tail: '' };
  const digits = piece.replace(/\D/g, '');
  if (digits.length >= 9) return { href: `tel:${piece.replace(/[^\d+]/g, '')}`, shown: piece.trim(), external: false, tail: '' };
  return null;
};

/** Plain text with web addresses, emails and phone numbers turned into links. */
export const Linkified = ({ text, onNavigate, dark = false }) => {
  const parts = String(text || '').split(LINK_PATTERN);
  return parts.map((piece, i) => {
    const link = i % 2 === 1 ? linkFor(piece) : null;
    if (!link) return <React.Fragment key={i}>{piece}</React.Fragment>;
    return (
      <React.Fragment key={i}>
        <a
          href={link.href}
          {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          onClick={(e) => { if (plainClick(e)) { e.preventDefault(); onNavigate(link.href); } }}
          className={`break-words font-semibold underline decoration-1 underline-offset-2 ${dark ? 'text-white' : 'text-vermilion hover:text-brand-700'}`}
        >
          {link.shown}
        </a>
        {link.tail}
      </React.Fragment>
    );
  });
};
