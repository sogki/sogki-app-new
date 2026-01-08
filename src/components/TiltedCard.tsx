import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface TiltedCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  tiltMaxAngleX?: number;
  tiltMaxAngleY?: number;
  perspective?: number;
  scale?: number;
}

export const TiltedCard: React.FC<TiltedCardProps> = ({ 
  children, 
  className = "", 
  delay = 0
}) => {
  return (
    <motion.div
      className={`relative group ${className}`}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      viewport={{ once: true }}
      whileHover={{ y: -4 }}
    >
      {/* Simple glow - reduced blur for performance */}
      <div className="absolute -inset-1 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl blur-md opacity-0 group-hover:opacity-50 transition-opacity duration-200" />
      <div className="relative bg-black/60 border border-white/10 rounded-xl p-6 shadow-lg hover:shadow-purple-500/20 hover:border-white/20 transition-all duration-200 h-full">
        {children}
      </div>
    </motion.div>
  );
};