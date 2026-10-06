import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Facebook, Youtube, Instagram, Twitter, MessageCircle, Linkedin, Mail, Phone, Globe, Share2, X } from 'lucide-react';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import useHeroInView from '../../hooks/useHeroInView';
import useFooterOverlap from '../../hooks/useFooterOverlap';

// Icon mapping for all platforms - same as admin
const iconMap = {
  Facebook: Facebook,
  Youtube: Youtube,
  Instagram: Instagram,
  Twitter: Twitter,
  Linkedin: Linkedin,
  MessageCircle: MessageCircle,
  Mail: Mail,
  Phone: Phone,
  Globe: Globe,
  Share2: Share2,
  WhatsApp: MessageCircle,
  Email: Mail,
};

// Platform colors - same as admin
const platformColors = {
  Facebook: '#1877F2',
  Instagram: '#E4405F',
  Twitter: '#000000',
  Youtube: '#FF0000',
  Linkedin: '#0A66C2',
  MessageCircle: '#25D366',
  WhatsApp: '#25D366',
  Mail: '#EA4335',
  Email: '#EA4335',
  Phone: '#34B7F1',
  Globe: '#6B6B72',
  Share2: '#6B6B72',
};

// Default social links if no data from API
const DEFAULT_LINKS = [
  { id: '1', platform: 'facebook', icon: 'Facebook', label: 'Facebook', url: 'https://www.facebook.com', enabled: true, color: '#1877F2' },
  { id: '2', platform: 'instagram', icon: 'Instagram', label: 'Instagram', url: 'https://www.instagram.com', enabled: true, color: '#E4405F' },
  { id: '3', platform: 'youtube', icon: 'Youtube', label: 'YouTube', url: 'https://www.youtube.com', enabled: true, color: '#FF0000' },
  { id: '4', platform: 'twitter', icon: 'Twitter', label: 'Twitter', url: 'https://twitter.com', enabled: true, color: '#000000' },
];

// Links saved without a scheme ("facebook.com/...") still have to open as external pages.
const hrefOf = (url) => (url && !url.startsWith('http://') && !url.startsWith('https://') ? `https://${url}` : url);

const SocialFloating = () => {
  const { t } = useLanguage();
  const [socialLinks, setSocialLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);
  // Phones show one share button that opens the icons, instead of the whole stack
  // sitting over the page next to the chat button.
  const [open, setOpen] = useState(false);
  const mobileRef = useRef(null);
  const [isVisible, setIsVisible] = useState(true);
  // Previous scroll position in a ref, so the scroll effect never re-subscribes
  // and never renders on its own.
  const lastScrollY = useRef(0);
  const linkCount = useRef(0);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch social links from API
  useEffect(() => {
    const fetchSocialLinks = async () => {
      try {
        console.log('SocialFloating: Fetching social links...');
        let response = await api.get('/admin/social');
        console.log('SocialFloating: Response from /admin/social:', response.data);
        
        let links = [];
        if (response.data && response.data.success && response.data.data) {
          links = response.data.data;
          console.log('SocialFloating: Found social links:', links);
        } else {
          console.log('SocialFloating: Trying to get from /admin/settings...');
          const settingsResponse = await api.get('/admin/settings');
          console.log('SocialFloating: Settings response:', settingsResponse.data);
          
          if (settingsResponse.data && settingsResponse.data.socialLinks) {
            links = settingsResponse.data.socialLinks;
            console.log('SocialFloating: Found social links in settings:', links);
          } else {
            console.log('SocialFloating: No social links found, using defaults');
            links = DEFAULT_LINKS;
          }
        }
        
        const enabledLinks = links.filter(link => {
          const isEnabled = link.enabled !== false;
          const hasUrl = link.url && link.url.trim() !== '';
          return isEnabled && hasUrl;
        });
        
        const linksWithColors = enabledLinks.map(link => ({
          ...link,
          color: link.color || platformColors[link.icon] || '#6B6B72'
        }));
        
        console.log('SocialFloating: Enabled links with colors:', linksWithColors);
        setSocialLinks(linksWithColors);
      } catch (error) {
        console.error('SocialFloating: Error fetching social links:', error);
        setSocialLinks(DEFAULT_LINKS);
      } finally {
        setLoading(false);
      }
    };
    fetchSocialLinks();
  }, []);

  // Handle scroll events for visibility and footer detection
  useEffect(() => {
    let frame = 0;

    const evaluate = () => {
      frame = 0;
      const scrollY = window.scrollY;
      const previous = lastScrollY.current;

      // Ignore sub-pixel jitter so only real movement toggles visibility.
      if (Math.abs(scrollY - previous) < 4) return;

      const nextVisible = scrollY > previous || scrollY <= 100;
      setIsVisible((prev) => (prev === nextVisible ? prev : nextVisible));
      lastScrollY.current = scrollY;
    };

    const handleScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(evaluate);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    evaluate();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  /*
   * Hide over the home page video banner.
   *
   * The icons are a fixed column on the right edge, so over a full-bleed hero
   * they sit on top of the footage and the shloka. Scoped to the home hero, so
   * the About page banner and every other section keep them.
   */
  const heroInView = useHeroInView('home');

  /*
   * The footer is "near" once its top edge rises above the icons: on phones the
   * share button sits above the chat button (bottom 4.5rem, 2.25rem tall; the site's
   * root font size is not 16px, so it is read, not assumed); from sm up the icons
   * are a column centred on the screen's right edge, each 36px with an 8px gap,
   * plus a 12px margin.
   */
  linkCount.current = socialLinks.length;
  const footerNear = useFooterOverlap(() => {
    if (window.innerWidth < 640) {
      const rem = parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
      return (4.5 + 2.25) * rem + 12;
    }
    const columnHeight = linkCount.current * 44 - 8;
    return (window.innerHeight - columnHeight) / 2 + 12;
  });

  /*
   * Hidden while: loading, no links, the footer is near, scrolled down, or
   * sitting over the home hero video banner.
   */
  const hidden = loading || socialLinks.length === 0 || footerNear || !isVisible || heroInView;

  // The phone menu closes when the button hides or the screen grows past a phone.
  useEffect(() => {
    if (hidden || !isMobile) setOpen(false);
  }, [hidden, isMobile]);

  // ...and on a tap anywhere else or Escape.
  useEffect(() => {
    if (!open) return undefined;
    const away = (event) => {
      if (mobileRef.current && !mobileRef.current.contains(event.target)) setOpen(false);
    };
    const escape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  if (hidden) {
    return null;
  }

  // Get icon component
  const getIcon = (iconName) => {
    return iconMap[iconName] || MessageCircle;
  };

  // Get platform color (with fallback)
  // One neutral colour for every platform; the brand colours made the column look busy.
  const getColor = () => '#5E5757';

  // Phones: one 36px button centred over the 48px chat button (16px from the edge, 8px
  // above it). Tapping it fans the icons out upward; they close again on a tap elsewhere.
  if (isMobile) {
    const color = getColor();
    const followLabel = t.footerFollowUs || 'Follow us';
    return (
      <div ref={mobileRef} className="fixed bottom-[4.5rem] right-[1.375rem] z-40 flex flex-col items-center gap-2">
        <AnimatePresence>
          {open &&
            socialLinks.map((link, index) => {
              const Icon = getIcon(link.icon);
              return (
                <motion.a
                  key={link.id || `social-${index}`}
                  href={hrefOf(link.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.8 }}
                  transition={{ duration: 0.18, delay: (socialLinks.length - 1 - index) * 0.03 }}
                  onClick={() => setOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border bg-white shadow-sm"
                  style={{ color, borderColor: `${color}30` }}
                  title={link.label || link.platform}
                  aria-label={link.label || link.platform}
                >
                  <Icon size={15} />
                </motion.a>
              );
            })}
        </AnimatePresence>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={followLabel}
          title={followLabel}
          className="flex h-9 w-9 items-center justify-center rounded-full border bg-white/70 shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
          style={{ color, borderColor: `${color}30` }}
        >
          {open ? <X size={16} aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />}
        </button>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {/* Phones: a short stack above the chat button. From sm: a column centred on the right edge. */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.3 }}
        className="fixed bottom-20 right-3 z-40 flex flex-col gap-2 sm:bottom-auto sm:right-4 sm:top-[calc(50%-var(--social-half,60px))]"
        style={{ '--social-half': `${(socialLinks.length * 44 - 8) / 2}px` }}
      >
        {/* Social Links */}
        {socialLinks.map((link, index) => {
          const Icon = getIcon(link.icon);
          const color = getColor(link);
          const url = hrefOf(link.url);

          return (
            <motion.a
              key={link.id || `social-${index}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, scale: 0.8, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ delay: index * 0.08, duration: 0.3 }}
              whileHover={{ 
                scale: 1.1,
                transition: { duration: 0.2 }
              }}
              whileTap={{ scale: 0.9 }}
              className="group relative flex h-8 w-8 items-center justify-center rounded-full border bg-white/70 shadow-sm backdrop-blur-sm transition-all duration-300 hover:bg-white sm:h-9 sm:w-9"
              style={{
                color: color,
                borderColor: `${color}30`,
              }}
              title={link.label || link.platform}
              aria-label={link.label || link.platform}
            >
              <Icon
                size={isMobile ? 15 : 17}
                className="relative z-10"
              />
              
              {/* Tooltip - hidden on mobile */}
              {!isMobile && (
                <span className="hidden sm:block absolute right-full mr-3 px-3 py-1.5 bg-black/80 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                  {link.label || link.platform}
                </span>
              )}
              
              {/* Hover background */}
              <div 
                className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ backgroundColor: `${color}20` }}
              />
            </motion.a>
          );
        })}
      </motion.div>
    </AnimatePresence>
  );
};

export default SocialFloating;