import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const FullscreenContext = createContext();

export const useFullscreen = () => {
  const context = useContext(FullscreenContext);
  if (!context) {
    throw new Error('useFullscreen must be used within a FullscreenProvider');
  }
  return context;
};

export const FullscreenProvider = ({ children }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Check if fullscreen is supported
  const isFullscreenSupported = () => {
    return document.fullscreenEnabled || 
           document.webkitFullscreenEnabled || 
           document.mozFullScreenEnabled || 
           document.msFullscreenEnabled;
  };

  // Get current fullscreen element
  const getFullscreenElement = () => {
    return document.fullscreenElement || 
           document.webkitFullscreenElement || 
           document.mozFullScreenElement || 
           document.msFullscreenElement;
  };

  // Request fullscreen
  const requestFullscreen = useCallback(async (element) => {
    try {
      const target = element || document.documentElement;
      
      // Save current scroll position
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;
      
      if (target.requestFullscreen) {
        await target.requestFullscreen();
      } else if (target.webkitRequestFullscreen) {
        await target.webkitRequestFullscreen();
      } else if (target.mozRequestFullScreen) {
        await target.mozRequestFullScreen();
      } else if (target.msRequestFullscreen) {
        await target.msRequestFullscreen();
      }
      
      setIsFullscreen(true);
      
      // Restore scroll position after fullscreen
      setTimeout(() => {
        window.scrollTo(scrollX, scrollY);
      }, 100);
      
    } catch (error) {
      console.error('Error entering fullscreen:', error);
      // Fallback
      enterFullscreenFallback();
    }
    // enterFullscreenFallback is declared below (listing it here would hit the TDZ) and is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Exit fullscreen
  const exitFullscreen = useCallback(async () => {
    try {
      // Save current scroll position
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;
      
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        await document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        await document.msExitFullscreen();
      }
      
      setIsFullscreen(false);
      
      // Restore scroll position after exiting
      setTimeout(() => {
        window.scrollTo(scrollX, scrollY);
      }, 100);
      
    } catch (error) {
      console.error('Error exiting fullscreen:', error);
      exitFullscreenFallback();
    }
    // exitFullscreenFallback is declared below (listing it here would hit the TDZ) and is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fallback methods
  const enterFullscreenFallback = useCallback(() => {
    // Save current scroll
    const scrollY = window.scrollY;
    
    // Apply minimal styles - just enough to simulate fullscreen
    document.documentElement.style.position = 'fixed';
    document.documentElement.style.top = '0';
    document.documentElement.style.left = '0';
    document.documentElement.style.width = '100%';
    document.documentElement.style.height = '100%';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.zIndex = '9999';
    document.documentElement.style.backgroundColor = 'black';
    
    // Save scroll position for restoration
    document.documentElement.dataset.scrollY = scrollY;
    
    setIsFullscreen(true);
  }, []);

  const exitFullscreenFallback = useCallback(() => {
    // Get saved scroll position
    const scrollY = parseInt(document.documentElement.dataset.scrollY || '0');
    
    // Remove all fallback styles
    document.documentElement.style.position = '';
    document.documentElement.style.top = '';
    document.documentElement.style.left = '';
    document.documentElement.style.width = '';
    document.documentElement.style.height = '';
    document.documentElement.style.overflow = '';
    document.documentElement.style.zIndex = '';
    document.documentElement.style.backgroundColor = '';
    
    delete document.documentElement.dataset.scrollY;
    
    setIsFullscreen(false);
    
    // Restore scroll
    setTimeout(() => {
      window.scrollTo(0, scrollY);
    }, 50);
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(async (element) => {
    const isCurrentlyFullscreen = isFullscreen || !!getFullscreenElement();
    
    if (isCurrentlyFullscreen) {
      await exitFullscreen();
    } else {
      await requestFullscreen(element);
    }
  }, [isFullscreen, requestFullscreen, exitFullscreen]);

  // Listen for fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreenNow = !!getFullscreenElement();
      
      if (!isFullscreenNow && isFullscreen) {
        // Fullscreen was exited via ESC key or browser UI
        setIsFullscreen(false);
        // Clean up any fallback styles
        document.documentElement.style.position = '';
        document.documentElement.style.top = '';
        document.documentElement.style.left = '';
        document.documentElement.style.width = '';
        document.documentElement.style.height = '';
        document.documentElement.style.overflow = '';
        document.documentElement.style.zIndex = '';
        document.documentElement.style.backgroundColor = '';
        delete document.documentElement.dataset.scrollY;
      } else if (isFullscreenNow && !isFullscreen) {
        setIsFullscreen(true);
      }
    };

    // Add event listeners for all browsers
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      
      // Cleanup on unmount
      if (isFullscreen) {
        exitFullscreenFallback();
      }
    };
  }, [isFullscreen, exitFullscreenFallback]);

  // Context value
  const value = {
    isFullscreen,
    toggleFullscreen,
    requestFullscreen,
    exitFullscreen,
    isSupported: isFullscreenSupported(),
    getFullscreenElement,
  };

  return (
    <FullscreenContext.Provider value={value}>
      {children}
    </FullscreenContext.Provider>
  );
};

export default FullscreenProvider;