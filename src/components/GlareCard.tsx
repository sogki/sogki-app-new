import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface GlareCardProps {
  children: React.ReactNode;
  className?: string;
  glareColor?: string;
  glareSize?: number;
}

export const GlareCard: React.FC<GlareCardProps> = ({
  children,
  className = "",
  glareColor = "rgba(255, 255, 255, 0.3)",
  glareSize = 200
}) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMousePosition({ x, y });
  };

  return (
    <motion.div
      ref={cardRef}
      className={`relative overflow-hidden ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3 }}
    >
      {/* Glare effect */}
      <div
        className="absolute pointer-events-none transition-opacity duration-150"
        style={{
          background: `radial-gradient(${glareSize}px circle at ${mousePosition.x}px ${mousePosition.y}px, ${glareColor}, transparent 40%)`,
          opacity: isHovering ? 1 : 0,
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
        }}
      />
      
      {children}
    </motion.div>
  );
};