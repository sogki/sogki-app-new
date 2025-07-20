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
  delay = 0,
  tiltMaxAngleX = 25,
  tiltMaxAngleY = 25,
  perspective = 1000,
  scale = 1.05
}) => {
  const [transform, setTransform] = useState('');
  const itemRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!itemRef.current) return;

    const { left, top, width, height } = itemRef.current.getBoundingClientRect();
    const x = (e.clientX - left - width / 2) / width;
    const y = (e.clientY - top - height / 2) / height;

    const angleX = y * tiltMaxAngleX;
    const angleY = x * tiltMaxAngleY;

    setTransform(
      `perspective(${perspective}px) rotateX(${angleX}deg) rotateY(${angleY}deg) scale3d(${scale}, ${scale}, ${scale})`
    );
  };

  const handleMouseLeave = () => {
    setTransform('');
  };

  return (
    <motion.div
      ref={itemRef}
      className={`relative group transition-transform duration-200 ease-out ${className}`}
      initial={{ opacity: 0, y: 50, rotateX: 15 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.8, delay }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ 
        transform,
        transformStyle: 'preserve-3d'
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300" />
      <div className="relative backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl p-6 shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 h-full">
        {children}
      </div>
    </motion.div>
  );
};