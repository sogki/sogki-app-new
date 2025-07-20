import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';

export const ScrollToTop: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          onClick={scrollToTop}
          className="fixed bottom-16 right-8 z-50 group"
          initial={{ opacity: 0, scale: 0, rotate: -180 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0, rotate: 180 }}
          transition={{ duration: 0.3 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {/* Outer glow ring */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full blur-lg opacity-75 group-hover:opacity-100 transition-opacity duration-300 animate-pulse" />
          
          {/* Main button */}
          <div className="relative bg-gradient-to-r from-purple-600 to-blue-600 p-3 rounded-full shadow-lg backdrop-blur-sm border border-white/20 hover:border-white/40 transition-all duration-300">
            <ArrowUp className="text-white" size={24} />
          </div>
          
          {/* Japanese text tooltip */}
          <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div className="bg-black/90 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 text-sm text-white whitespace-nowrap">
              <div>Back to Top</div>
              <div className="text-xs text-purple-300">トップへ戻る</div>
            </div>
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
};