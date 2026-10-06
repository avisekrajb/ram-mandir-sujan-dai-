import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Sparkles, Award } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { PLACEHOLDER_IMAGE, handleImageError } from '../utils/imageFallback';

const RamPage = () => {
  const { t } = useLanguage();
  const [showModal, setShowModal] = useState(true);

  // Close modal on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setShowModal(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showModal]);

  const handleClose = () => {
    setShowModal(false);
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-maroon/5 via-white to-maroon/5 flex items-center justify-center p-4">
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
            onClick={handleClose}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, rotateY: 180 }}
              animate={{ scale: 1, opacity: 1, rotateY: 0 }}
              exit={{ scale: 0.8, opacity: 0, rotateY: -180 }}
              transition={{ 
                duration: 0.7, 
                ease: [0.16, 1, 0.3, 1],
                rotateY: { duration: 0.8, ease: "easeOut" }
              }}
              className="relative max-w-lg w-full rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Animated Glowing Border - Red, Yellow, Green */}
              <div className="absolute -inset-1 bg-gradient-to-r from-brand-700 via-brand-400 to-brand-700 rounded-2xl opacity-75 blur-xl animate-spin-slow" />
              
              <div className="relative bg-black/95 rounded-2xl overflow-hidden p-1">
                {/* Neon Border Flow */}
                <div className="absolute inset-0 rounded-2xl p-[3px] bg-gradient-to-r from-brand-700 via-brand-400 to-brand-700 animate-border-flow">
                  <div className="absolute inset-[3px] rounded-2xl bg-black/95" />
                </div>
                
                {/* Floating Sparkles */}
                <div className="absolute top-4 left-4 animate-pulse">
                  <Sparkles size={16} className="text-brand-200" />
                </div>
                <div className="absolute bottom-4 right-4 animate-pulse animation-delay-600">
                  <Sparkles size={16} className="text-green-400" />
                </div>
                <div className="absolute top-4 right-4 animate-pulse animation-delay-300">
                  <Award size={16} className="text-red-400" />
                </div>
                
                {/* Content */}
                <div className="relative z-10 p-6">
                  <button
                    onClick={handleClose}
                    aria-label="Close"
                    className="absolute top-4 right-4 flex items-center justify-center w-11 h-11 text-white/60 hover:text-white transition-colors bg-black/50 rounded-full hover:bg-black/70"
                  >
                    <X size={20} />
                  </button>
                  
                  <div className="flex flex-col items-center">
                    {/* Ram Image with Glowing Rings */}
                    <div className="relative w-48 h-48 rounded-full overflow-hidden shadow-2xl shadow-black/10 ring-4 ring-brand-300/50">
                      <img
                        src="https://res.cloudinary.com/dibusz4ag/image/upload/v1/temple/ram.jpg"
                        alt="Jai Shree Ram"
                        className="w-full h-full object-cover"
                           onError={(e) => {
                             handleImageError(e, PLACEHOLDER_IMAGE);
                           }}
                      />
                      
                      {/* Glowing Rings Animation */}
                      <div className="absolute inset-0 rounded-full animate-ping-slow ring-4 ring-red-500/30" />
                      <div className="absolute inset-[-8px] rounded-full animate-ping-slow ring-2 ring-brand-300/20 animation-delay-300" />
                      <div className="absolute inset-[-16px] rounded-full animate-ping-slow ring-1 ring-green-500/20 animation-delay-600" />
                    </div>
                    
                    {/* Title with Gradient */}
                    <h2 className="mt-6 text-4xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-700 via-brand-400 to-brand-700 animate-pulse">
                      Jai Shree Ram
                    </h2>
                    
                    <p className="mt-3 text-white/70 text-sm text-center max-w-xs">
                      {t.ramBlessing || '🕉 May Lord Ram bless you with peace, prosperity, and happiness.'}
                    </p>
                    
                    {/* Decorative Glow Dots */}
                    <div className="mt-5 flex gap-3">
                      <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-lg shadow-red-500/50" />
                      <div className="w-3 h-3 rounded-full bg-brand-300 animate-pulse animation-delay-300 shadow-lg shadow-brand-300/50" />
                      <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse animation-delay-600 shadow-lg shadow-green-500/50" />
                    </div>
                    
                    {/* Heart Icon */}
                    <div className="mt-5 flex items-center gap-2 text-white/65 text-xs">
                      <Heart size={14} className="text-red-400 animate-pulse" />
                      <span>Blessings from Shree Ramchandra Temple</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RamPage;