import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';

const SocialContext = createContext(null);

export const useSocial = () => {
  const context = useContext(SocialContext);
  if (!context) {
    throw new Error('useSocial must be used within SocialProvider');
  }
  return context;
};

export const SocialProvider = ({ children }) => {
  const [socialLinks, setSocialLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(false);
  // A ref, not state: as state it was an effect dependency, so every scroll
  // event tore down and re-created the listeners, interval and observer.
  const lastScrollY = useRef(0);
  const observerRef = useRef(null);
  const checkInterval = useRef(null);

  useEffect(() => {
    const fetchSocialLinks = async () => {
      try {
        const response = await api.get('/admin/settings');
        const footer = response.data?.footer || {};
        const links = [
          {
            id: 'facebook',
            icon: 'Facebook',
            label: 'Facebook',
            color: '#1877F2',
            url: footer.socialLinks?.facebook?.url || 'https://facebook.com',
            enabled: footer.socialLinks?.facebook?.enabled !== false,
          },
          {
            id: 'youtube',
            icon: 'Youtube',
            label: 'YouTube',
            color: '#FF0000',
            url: footer.socialLinks?.youtube?.url || 'https://youtube.com',
            enabled: footer.socialLinks?.youtube?.enabled !== false,
          },
          {
            id: 'instagram',
            icon: 'Instagram',
            label: 'Instagram',
            color: '#E4405F',
            url: footer.socialLinks?.instagram?.url || 'https://instagram.com',
            enabled: footer.socialLinks?.instagram?.enabled !== false,
          },
          {
            id: 'twitter',
            icon: 'Twitter',
            label: 'Twitter',
            color: '#1DA1F2',
            url: footer.socialLinks?.twitter?.url || 'https://twitter.com',
            enabled: footer.socialLinks?.twitter?.enabled !== false,
          },
        ];
        setSocialLinks(links.filter(link => link.enabled));
      } catch (error) {
        console.error('Error fetching social links:', error);
        // Set default links if API fails
        setSocialLinks([
          { id: 'facebook', icon: 'Facebook', label: 'Facebook', color: '#1877F2', url: 'https://facebook.com' },
          { id: 'youtube', icon: 'Youtube', label: 'YouTube', color: '#FF0000', url: 'https://youtube.com' },
          { id: 'instagram', icon: 'Instagram', label: 'Instagram', color: '#E4405F', url: 'https://instagram.com' },
          { id: 'twitter', icon: 'Twitter', label: 'Twitter', color: '#1DA1F2', url: 'https://twitter.com' },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchSocialLinks();
  }, []);

  // Check if footer is visible
  const checkFooterVisibility = useCallback(() => {
    const footer = document.querySelector('footer');
    if (footer) {
      const footerRect = footer.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const isFooterVisible = footerRect.top < windowHeight && footerRect.bottom > 0;
      
      // Check if near bottom
      const scrollY = window.scrollY;
      const documentHeight = document.documentElement.scrollHeight;
      const atBottom = scrollY + windowHeight >= documentHeight - 150;
      
      setIsAtBottom(isFooterVisible || atBottom);
    } else {
      // If no footer found, check if near bottom
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const atBottom = scrollY + windowHeight >= documentHeight - 150;
      setIsAtBottom(atBottom);
    }
  }, []);

  // Hide on scroll down, show on scroll up, hide in footer
  useEffect(() => {
    // Initial check
    const initialCheck = setTimeout(checkFooterVisibility, 200);

    // Set up Intersection Observer for footer
    const setupObserver = () => {
      const footer = document.querySelector('footer');
      if (footer) {
        if (observerRef.current) {
          observerRef.current.disconnect();
        }
        observerRef.current = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              setIsAtBottom(entry.isIntersecting);
            });
          },
          {
            root: null,
            rootMargin: '0px',
            threshold: 0.1,
          }
        );
        observerRef.current.observe(footer);
      }
    };

    const observerSetup = setTimeout(setupObserver, 300);

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // Check if at bottom
      const atBottom = currentScrollY + windowHeight >= documentHeight - 150;
      
      // Hide on scroll down, show on scroll up
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsVisible(false);
      } else if (!atBottom) {
        setIsVisible(true);
      }
      
      lastScrollY.current = currentScrollY;
      checkFooterVisibility();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', checkFooterVisibility, { passive: true });

    // Periodic check for footer visibility
    checkInterval.current = setInterval(checkFooterVisibility, 500);

    return () => {
      clearTimeout(initialCheck);
      clearTimeout(observerSetup);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', checkFooterVisibility);
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
      }
    };
  }, [checkFooterVisibility]);

  const value = {
    socialLinks,
    loading,
    isVisible,
    isAtBottom,
    setIsVisible,
  };

  return (
    <SocialContext.Provider value={value}>
      {children}
    </SocialContext.Provider>
  );
};