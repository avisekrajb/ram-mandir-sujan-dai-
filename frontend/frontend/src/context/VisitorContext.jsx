// context/VisitorContext.jsx
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import { v4 as uuidv4 } from 'uuid';

const VisitorContext = createContext(null);

// The password-reset link carries a secret in its path (/reset-password/<token>). Page paths go to the
// analytics table that admins read, so the secret part is never reported.
const scrub = (value) => String(value || '').replace(/(\/reset-password\/)[^?#\s]+/gi, '$1:token');

export const useVisitor = () => {
  const context = useContext(VisitorContext);
  if (!context) {
    throw new Error('useVisitor must be used within VisitorProvider');
  }
  return context;
};

/**
 * Visitor tracking.
 *
 * `sessionId` is a per-tab UUID used to group a browsing session together. It
 * is deliberately NOT what drives the visitor totals: every reload and every
 * new tab mints a new sessionId, so counting distinct sessionIds inflates the
 * numbers with no real visitor behind them.
 *
 * The real totals are counted per IP address per day on the server
 * (see Visitor.distinctVisitorsByIp). One network = one visit, so a refresh
 * loop or 20 tabs do not add 20 visitors.
 */
export const VisitorProvider = ({ children }) => {
  const location = useLocation();
  const [visitorId, setVisitorId] = useState(null);
  const [totalVisits, setTotalVisits] = useState(0);
  const trackedPages = useRef(new Set());
  const entryTime = useRef(null);
  const currentPage = useRef('');
  const isTracking = useRef(false);
  // Mirrors visitorId for callbacks registered once (e.g. the unload handler),
  // which would otherwise only ever see the first-render value (null).
  const visitorIdRef = useRef(null);

  // Per-tab session ID. sessionStorage (not localStorage) is intentional:
  // a new tab is a new session, which is what "session" means for analytics.
  useEffect(() => {
    try {
      let sessionId = sessionStorage.getItem('visitor_session_id');
      if (!sessionId) {
        sessionId = uuidv4();
        sessionStorage.setItem('visitor_session_id', sessionId);
      }
      visitorIdRef.current = sessionId;
      setVisitorId(sessionId);

      // Visit counter for this tab. sessionStorage is cleared when the tab
      // closes, so this resets naturally and never drifts upward.
      const count = parseInt(sessionStorage.getItem('visitor_visit_count') || '0', 10) + 1;
      sessionStorage.setItem('visitor_visit_count', String(count));
      sessionStorage.setItem('visitor_session_started', 'true');
      setTotalVisits(count);
    } catch (error) {
      console.error('Visitor session error:', error);
    }
  }, []);

  // Update time spent on page
  const updateTimeSpent = async (page, timeSpent) => {
    if (!visitorIdRef.current) return;
    try {
      await api.post('/visitors/time', {
        sessionId: visitorIdRef.current,
        page,
        timeSpent,
      });
    } catch (error) {
      console.error('Error updating time spent:', error);
    }
  };

  // Track page views
  useEffect(() => {
    if (!visitorId || isTracking.current) return;

    const currentPath = scrub(location.pathname);
    const pageTitle = document.title || 'Shree Ramchandra Temple';

    const pageKey = `${currentPath}`;

    if (entryTime.current && currentPage.current && currentPage.current !== currentPath) {
      const timeSpent = Math.floor((Date.now() - entryTime.current) / 1000);
      if (timeSpent > 0) {
        updateTimeSpent(currentPage.current, timeSpent);
      }
    }

    if (trackedPages.current.has(pageKey)) {
      entryTime.current = Date.now();
      currentPage.current = currentPath;
      return;
    }

    const trackVisitor = async () => {
      try {
        isTracking.current = true;

        await api.post('/visitors/track', {
          sessionId: visitorId,
          page: currentPath,
          pageTitle: pageTitle,
          referrer: scrub(document.referrer),
          userAgent: navigator.userAgent,
          // Whether this browser profile is seeing the site for the first
          // time. Note this is a client-side flag only — the authoritative
          // "new vs returning" decision is made server-side from the IP.
          isNewVisitor: totalVisits <= 1,
          visitCount: totalVisits,
        });

        trackedPages.current.add(pageKey);
        entryTime.current = Date.now();
        currentPage.current = currentPath;
      } catch (error) {
        console.error('Error tracking visitor:', error);
      } finally {
        isTracking.current = false;
      }
    };

    const timeoutId = setTimeout(trackVisitor, 500);

    return () => {
      clearTimeout(timeoutId);
    };
    // totalVisits is read inside trackVisitor but the effect must only re-run
    // when the page or the session changes, not on every counter bump.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, visitorId]);

  // Track time spent on page when leaving
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!entryTime.current || !currentPage.current || !visitorIdRef.current) return;
      const timeSpent = Math.floor((Date.now() - entryTime.current) / 1000);
      if (timeSpent <= 0) return;
      const body = JSON.stringify({ sessionId: visitorIdRef.current, page: currentPage.current, timeSpent });
      const base = (api.defaults.baseURL || '/api').replace(/\/$/, '');
      if (navigator.sendBeacon) {
        navigator.sendBeacon(`${base}/visitors/time`, new Blob([body], { type: 'application/json' }));
      } else {
        updateTimeSpent(currentPage.current, timeSpent);
      }
      entryTime.current = null;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();
    };
  }, []);

  return (
    <VisitorContext.Provider value={{ visitorId, totalVisits }}>
      {children}
    </VisitorContext.Provider>
  );
};