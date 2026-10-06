import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { PLACEHOLDER_IMAGE, handleImageError } from '../utils/imageFallback';

const RamModal = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, rotateY: 180 }}
          animate={{ scale: 1, opacity: 1, rotateY: 0 }}
          exit={{ scale: 0.8, opacity: 0, rotateY: -180 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative max-w-lg w-full rounded-2xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Glowing Border Animation */}
          <div className="absolute -inset-1 bg-gradient-to-r from-brand-700 via-brand-400 to-brand-700 rounded-2xl opacity-75 blur-xl animate-spin-slow" />
          
          <div className="relative bg-black/90 rounded-2xl overflow-hidden p-1">
            {/* Glowing Neon Border */}
            <div className="absolute inset-0 rounded-2xl p-[3px] bg-gradient-to-r from-brand-700 via-brand-400 to-brand-700 animate-border-flow">
              <div className="absolute inset-[3px] rounded-2xl bg-black/95" />
            </div>
            
            {/* Content */}
            <div className="relative z-10 p-6">
              <button
                onClick={onClose}
                aria-label="Close"
                className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
              
              <div className="flex flex-col items-center">
                {/* Ram Image */}
                <div className="relative w-48 h-48 rounded-full overflow-hidden shadow-2xl shadow-black/10 ring-4 ring-brand-300/50">
                  <img
                    src="https://res.cloudinary.com/dibusz4ag/image/upload/v1/temple/ram.jpg"
                    alt="Jai Shree Ram"
                    className="w-full h-full object-cover"
                       onError={(e) => {
                         handleImageError(e, PLACEHOLDER_IMAGE);
                       }}
                  />
                  
                  {/* Glowing Rings */}
                  <div className="absolute inset-0 rounded-full animate-ping-slow ring-4 ring-red-500/30" />
                  <div className="absolute inset-[-8px] rounded-full animate-ping-slow ring-2 ring-brand-300/20 animation-delay-300" />
                  <div className="absolute inset-[-16px] rounded-full animate-ping-slow ring-1 ring-green-500/20 animation-delay-600" />
                </div>
                
                {/* Text */}
                <h2 className="mt-6 text-3xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-700 via-brand-400 to-brand-700">
                  Jai Shree Ram
                </h2>
                <p className="mt-2 text-white/60 text-sm">🕉 May Lord Ram bless you with peace and prosperity</p>
                
                {/* Decorative Glow */}
                <div className="mt-4 flex gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                  <div className="w-3 h-3 rounded-full bg-brand-300 animate-pulse animation-delay-300" />
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse animation-delay-600" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default RamModal;