import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export const ScrollProgress: React.FC = () => {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const updateScrollProgress = () => {
      const scrollPx = document.documentElement.scrollTop;
      const winHeightPx = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = scrollPx / winHeightPx;
      setScrollProgress(scrolled);
    };

    window.addEventListener('scroll', updateScrollProgress);
    return () => window.removeEventListener('scroll', updateScrollProgress);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 h-1 bg-black/20 z-50">
      <motion.div
        className="h-full bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600"
        style={{ scaleX: scrollProgress, transformOrigin: 'left' }}
        initial={{ scaleX: 0 }}
      />
    </div>
  );
};
