import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowUpRight, Clock, Facebook, Instagram, Mail, MapPin, MessageCircle, Phone, Twitter, Youtube } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';
import useSiteSettings from '../../hooks/useSiteSettings';
import { adToBs } from '../../utils/nepaliCalendar';
import TempleIcon from './TempleIcon';
import { getDonateNav, getPrimaryNav } from './header/navConfig';
import { httpUrlFromInput, safeHttpUrl, safeSitePath, MAP_HOSTS } from '../../utils/safeUrl';

// Map embed (short maps.app.goo.gl links can't be embedded): the temple's pin on a
// plain map. A pin without a place label, so nothing is cut off in the small box.
const DEFAULT_MAP_URL = 'https://www.google.com/maps?q=27.7068207,85.3381903&z=16&hl=en&output=embed';
const DEFAULT_ADDRESS = 'Battisputali, Gaushala, Kathmandu, Nepal';
const WHATSAPP_URL = 'https://wa.me/9779851154432?text=Namaste!%20I%20want%20to%20know%20more%20about%20Shree%20Ramchandra%20Temple';
// Photo/video footer backgrounds (set in Admin → Footer). Set to false to switch them off.
const FOOTER_MEDIA_ENABLED = true;
const LIGHT_BACKGROUNDS = ['#ffffff', '#fff', '#fffdfc', '#f8f5f0', '#fbf8f8', '#f7f5f4'];
// Default footer: a mild, flat warm tint. An unset or plain-white colour in
// Admin → Footer means "use the default".
const FOOTER_DEFAULT_BG = '#F7F5F4';

// Link text with a hidden bold copy of itself, so going bold on hover never
// changes the width (see .foot-text in index.css).
const FootText = ({ children, className = '' }) => (
  <span className={`foot-text ${className}`} data-text={children}>{children}</span>
);

const SOCIAL_ICONS = { facebook: Facebook, instagram: Instagram, youtube: Youtube, twitter: Twitter };

const sizedImage = (url, w) => (url && url.includes('/upload/') ? url.replace('/upload/', `/upload/w_${w},q_auto,f_auto/`) : url);
const sizedVideo = (url) => (url && url.includes('/video/upload/') ? url.replace('/video/upload/', '/video/upload/q_auto,w_1280,c_limit/') : url);

/**
 * Site footer: four compact columns (about + social, quick links, contact +
 * hours, map) and one copyright line. Driven by Admin → Footer settings (background colour/photo/
 * video, which columns show, custom quick links, contact info, map).
 */
const Footer = () => {
  const { t, lang } = useLanguage();
  const settings = useSiteSettings();
  const { user } = useAuth();
  const [social, setSocial] = useState([]);

  const footer = useMemo(() => ({ enabled: true, ...(settings?.footer || {}) }), [settings]);

  const localized = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value[lang] || value.en || '';
  };

  // Admin-defined quick links win; otherwise reuse the header's navigation so
  // labels come from the shared translations.
  const quickLinks = useMemo(() => {
    if (Array.isArray(footer.navButtons) && footer.navButtons.length > 0) {
      // Only in-site paths and http(s) addresses become links (never `javascript:` and the like).
      return footer.navButtons
        .map((b) => ({ to: safeSitePath(b.path) || safeHttpUrl(b.path), label: localized(b.label) }))
        .filter((l) => l.to);
    }
    const flat = getPrimaryNav(t).flatMap((item) => (item.children ? item.children : [item]));
    return [...flat, { to: '/blogs', label: t.navBlogs || 'Blogs' }, getDonateNav(t)].map(({ to, label }) => ({ to, label }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- localized() only depends on lang, which changes t
  }, [footer.navButtons, t, lang]);

  useEffect(() => {
    let alive = true;
    api.get('/admin/social')
      .then((res) => {
        const list = res.data?.data || [];
        const safe = list.map((x) => ({ ...x, url: httpUrlFromInput(x.url) }));
        if (alive) setSocial(safe.filter((x) => x.enabled !== false && x.url && SOCIAL_ICONS[String(x.platform).toLowerCase()]));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (footer.enabled === false) return null;

  const logoText = settings?.logo?.text?.[lang] || t.templeName || 'Shree Ramchandra Temple';
  const logoPhoto = settings?.logo?.photo || null;
  const timings = settings?.timings || { open: '05:00 AM', close: '08:00 PM' };
  const bsYear = adToBs(new Date())?.year;
  const year = lang === 'ne' && bsYear ? bsYear : new Date().getFullYear();

  const address = localized(footer.contactInfo?.address) || DEFAULT_ADDRESS;
  const rawPhone = footer.contactInfo?.phone || '';
  const phone = /x{3,}/i.test(rawPhone) ? '' : rawPhone; // e.g. "+977-1-4XXXXXX" is a placeholder
  const contactEmail = footer.contactInfo?.email || '';
  // The map is framed, so the address must be https on a known map host (a `javascript:` or
  // look-alike address would otherwise run or phish inside the page).
  const adminMapUrl = safeHttpUrl(footer.mapUrl, MAP_HOSTS);
  const mapUrl = adminMapUrl && !adminMapUrl.includes('maps.app.goo.gl') ? adminMapUrl : DEFAULT_MAP_URL;

  const bgType = FOOTER_MEDIA_ENABLED ? footer.bgType : 'color';
  const hasMedia = (bgType === 'image' && footer.bgImage) || (bgType === 'video' && footer.bgVideo);
  const rawBg = String(footer.bgColor || '').toLowerCase();
  const bgColor = !rawBg || rawBg === '#ffffff' || rawBg === '#fff' ? FOOTER_DEFAULT_BG : footer.bgColor;
  const isDarkColor = !LIGHT_BACKGROUNDS.includes(String(bgColor).toLowerCase());
  // Over a photo/video the columns sit on a light card, so only a dark colour
  // background switches the text to white.
  const onPhoto = Boolean(hasMedia);
  const dark = isDarkColor && !onPhoto;
  const bgStyle = bgType === 'image' && footer.bgImage
    ? { backgroundImage: `url(${sizedImage(footer.bgImage, 1920)})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { backgroundColor: bgColor };

  // Colour roles flip on dark backgrounds.
  const c = dark
    ? { heading: 'text-white', body: 'text-white/90', muted: 'text-white/75', link: 'foot-link text-white/90 hover:text-white', border: 'border-white/15', icon: 'text-white/70' }
    : { heading: 'text-ink', body: 'text-ink-soft', muted: 'text-mute', link: 'foot-link text-ink-soft hover:text-vermilion', border: 'border-line', icon: 'text-ink-soft' };

  const logoSize = { sm: 'h-16 w-16', md: 'h-20 w-20', lg: 'h-24 w-24' }[footer.logoSize] || 'h-20 w-20';
  const logoShape = footer.logoShape === 'square' || footer.logoShape === 'rectangle' ? 'rounded-2xl' : 'rounded-full';
  // Letter-spacing splits Devanagari/Tamil letters apart, so only Latin/Chinese get it.
  const spaced = lang === 'ne' || lang === 'hi' || lang === 'ta';
  const headingClass = `mb-3 text-sm font-semibold uppercase ${spaced ? 'tracking-normal' : 'tracking-wider'} ${c.heading}`;
  // round badge behind each contact icon
  const IconDot = ({ children }) => (
    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${dark ? 'bg-white/10' : 'bg-white shadow-sm ring-1 ring-line'}`}>{children}</span>
  );

  // Support the Temple: a small card under the quick links.
  const donateCard = (
    <div className={`mt-5 rounded-xl border px-4 py-3 ${dark ? 'border-white/15 bg-white/10' : 'border-line bg-white'}`}>
      <p className={`font-serif text-base font-semibold leading-snug ${c.heading}`}>{t.donateTitle || 'Support the Temple'}</p>
      <p className={`mt-0.5 text-sm leading-snug ${c.muted}`}>{t.donateIntro || 'Your contribution helps preserve this sacred place'}</p>
      <Link
        to="/donate"
        onClick={(e) => {
          if (!user) {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent('open-auth', { detail: 'login' }));
          }
        }}
        className={dark
          ? 'mt-2.5 inline-flex min-h-[2.25rem] items-center rounded-full bg-white px-5 text-sm font-semibold text-vermilion transition-colors hover:bg-brand-50'
          : 'btn-primary mt-2.5 px-5 text-sm lg:!min-h-[2.25rem]'}
      >
        {t.navDonate || 'Donate'}
      </Link>
    </div>
  );

  return (
    <footer className="mt-12 [[data-stay-updated]+&]:mt-0" data-site-footer>
      {/* Columns */}
      <div className={`relative overflow-hidden border-t ${c.border}`} style={bgStyle}>
        {bgType === 'video' && footer.bgVideo && (
          <video className="absolute inset-0 h-full w-full object-cover" src={sizedVideo(footer.bgVideo)} autoPlay muted loop playsInline aria-hidden="true" />
        )}

        <div className="relative z-10">
          <div className={onPhoto ? 'mx-auto max-w-7xl px-3 py-10 sm:px-6' : undefined}>
            <div className={`footer-grid mx-auto max-w-7xl px-4 py-8 sm:px-6 ${onPhoto ? 'rounded-2xl bg-white/95 shadow-lg backdrop-blur-sm' : ''}`}>
              {/* About */}
              <div style={{ containerType: 'inline-size' }}>
                <div className="flex flex-col items-start gap-3">
                  <span className={`flex shrink-0 items-center justify-center overflow-hidden bg-white ring-1 ${dark ? 'ring-white/20' : 'ring-line'} shadow-sm ${logoSize} ${logoShape}`}>
                    {logoPhoto ? (
                      <img src={sizedImage(logoPhoto, 240)} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <TempleIcon size={36} className="text-vermilion" />
                    )}
                  </span>
                  <div className="w-full min-w-0">
                    {/* One line, never cut: the size follows the column width (cqw), capped at 24px */}
                    <p className={`whitespace-nowrap font-serif font-bold leading-snug ${dark ? c.heading : 'temple-name'}`} style={{ fontSize: 'clamp(0.75rem, 6.4cqw, 1.25rem)' }}>{logoText}</p>
                    <p className={`mt-1 flex items-center gap-1 text-sm ${c.muted}`}>
                      <MapPin size={14} className={c.icon} aria-hidden="true" /> {t.templeSub || 'Battisputali, Kathmandu'}
                    </p>
                  </div>
                </div>
                <p className={`mt-3 max-w-sm text-sm leading-relaxed ${c.body}`}>
                  {t.footerDescription || 'A sacred Vaishnava temple dedicated to Lord Ram, Sita and Lakshman, serving devotees for generations.'}
                </p>
              </div>

              {/* Quick links + donate */}
              <div>
                {footer.showQuickLinks !== false && quickLinks.length > 0 && (
                  <nav aria-label={t.navigation || 'Quick Navigation'}>
                    <h2 className={headingClass}>{t.navigation || 'Quick Navigation'}</h2>
                    <ul className="grid grid-cols-2 gap-x-4">
                      {quickLinks.map((link) => (
                        <li key={`${link.to}-${link.label}`}>
                          <Link to={link.to} className={`flex min-h-[2.125rem] items-center text-sm transition-colors ${c.link}`}>
                            <FootText>{link.label}</FootText>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </nav>
                )}
                {donateCard}
              </div>

              {/* Contact + hours */}
              {footer.showContact !== false && (
                <div>
                  <h2 className={headingClass}>{t.contactInfo || 'Get in Touch'}</h2>
                  <ul className="space-y-2.5">
                    <li>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-start gap-3 text-sm leading-relaxed transition-colors ${c.link}`}
                      >
                        <IconDot><MapPin size={15} className={c.icon} aria-hidden="true" /></IconDot>
                        <FootText className="pt-1">{address}</FootText>
                      </a>
                    </li>
                    {phone && (
                      <li>
                        <a href={`tel:${phone.replace(/\s/g, '')}`} className={`flex items-center gap-3 text-sm transition-colors ${c.link}`}>
                          <IconDot><Phone size={15} className={c.icon} aria-hidden="true" /></IconDot>
                          <FootText>{phone}</FootText>
                        </a>
                      </li>
                    )}
                    {contactEmail && (
                      <li>
                        <a href={`mailto:${contactEmail}`} className={`flex items-center gap-3 break-all text-sm transition-colors ${c.link}`}>
                          <IconDot><Mail size={15} className={c.icon} aria-hidden="true" /></IconDot>
                          <FootText>{contactEmail}</FootText>
                        </a>
                      </li>
                    )}
                    <li className={`flex items-start gap-3 text-sm leading-relaxed ${c.body}`}>
                      <IconDot><Clock size={15} className={c.icon} aria-hidden="true" /></IconDot>
                      <span className="pt-1">
                        <span className={`block font-semibold ${c.heading}`}>{t.openHours || 'Darshan Hours'}</span>
                        {timings.open} – {timings.close}
                      </span>
                    </li>
                  </ul>
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 flex min-h-[2.5rem] w-full items-center justify-center gap-2 rounded-full border border-line bg-white px-5 text-sm font-semibold text-ink transition-colors hover:border-vermilion hover:text-vermilion"
                  >
                    <MessageCircle size={16} aria-hidden="true" /> {t.footerWhatsApp || 'Chat on WhatsApp'}
                  </a>
                  </div>
              )}

              {/* Map + follow us */}
              {(footer.showMap !== false || social.length > 0) && (
                <div>
                  {footer.showMap !== false && (
                    <>
                      <h2 className={headingClass}>{t.location || 'Find Us'}</h2>
                      {/* One card: the map on top, a slim "Get directions" bar under it. */}
                      <div className={`overflow-hidden rounded-xl border shadow-sm ${dark ? 'border-white/20 bg-white/10' : 'border-line bg-white'}`}>
                        <div className="aspect-[3/2] w-full">
                          <iframe
                            src={mapUrl}
                            className="block h-full w-full"
                            style={{ border: 0 }}
                            allowFullScreen
                            loading="lazy"
                            referrerPolicy="strict-origin-when-cross-origin"
                            title={`${logoText} — ${t.location || 'Map'}`}
                          />
                        </div>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center justify-between gap-2 border-t px-3.5 py-2.5 text-sm font-medium transition-colors ${c.border} ${c.link}`}
                        >
                          <span className="inline-flex items-center gap-2">
                            <MapPin size={15} className={c.icon} aria-hidden="true" />
                            <FootText>{t.contactDirections || 'Get Directions'}</FootText>
                          </span>
                          <ArrowUpRight size={16} className={c.icon} aria-hidden="true" />
                        </a>
                      </div>
                    </>
                  )}
                  {social.length > 0 && (
                    <div className={footer.showMap !== false ? 'mt-6' : undefined}>
                      <p className={headingClass}>{t.footerFollowUs || 'Follow Us'}</p>
                      <ul className="flex flex-wrap gap-2" aria-label={t.followUs || 'Follow us'}>
                        {social.map((link) => {
                          const Icon = SOCIAL_ICONS[String(link.platform).toLowerCase()];
                          const label = link.label || link.platform;
                          return (
                            <li key={link.id || link.platform}>
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={label}
                                title={label}
                                className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
                                  dark ? 'border-white/25 text-white hover:bg-white hover:text-ink' : 'border-line bg-white text-ink-soft hover:border-vermilion hover:bg-vermilion hover:text-white'
                                }`}
                              >
                                <Icon size={18} aria-hidden="true" />
                              </a>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Copyright */}
          <div className={`border-t ${c.border} ${onPhoto ? 'bg-white/95' : ''}`}>
            <div className={`mx-auto flex max-w-7xl flex-col items-center gap-x-6 gap-y-1 px-4 py-2 text-center text-sm sm:px-6 md:flex-row md:justify-between md:text-left ${c.muted}`}>
              <p>© {year} {logoText}. {t.allRightsReserved || 'All rights reserved.'}</p>
              <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1" aria-label={t.legal || 'Legal'}>
                <Link to="/privacy" className={`py-2 transition-colors ${c.link}`}><FootText>{t.footerPrivacy || 'Privacy Policy'}</FootText></Link>
                <Link to="/terms" className={`py-2 transition-colors ${c.link}`}><FootText>{t.footerTerms || 'Terms of Service'}</FootText></Link>
                <a
                  href="https://www.zeroinfinitytechnologies.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`py-2 underline-offset-4 transition-colors hover:underline ${dark ? 'text-white/90 hover:text-white' : 'text-ink-soft hover:text-vermilion'}`}
                >
                  {t.footerPowered || 'Developed by ZeroInfinity'}
                </a>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Marker used by the scroll-to-top button to detect the footer */}
      <div id="footer-detector" className="pointer-events-none h-0.5 w-full opacity-0" aria-hidden="true" />
    </footer>
  );
};

export default Footer;
