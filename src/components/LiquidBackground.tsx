import React from 'react';
import { motion } from 'framer-motion';

interface LiquidBackgroundProps {
  className?: string;
  intensity?: 'low' | 'medium' | 'high';
  colors?: string[];
  speed?: number;
}

export const LiquidBackground: React.FC<LiquidBackgroundProps> = ({
  className = '',
  intensity = 'medium',
  colors = ['#1a1a2e', '#16213e', '#0f3460', '#533483', '#7209b7'],
  speed = 1
}) => {
  const getIntensitySettings = (intensity: string) => {
    switch (intensity) {
      case 'low':
        return { duration: 20, scale: 1.1, opacity: 0.3 };
      case 'high':
        return { duration: 8, scale: 1.3, opacity: 0.6 };
      default:
        return { duration: 12, scale: 1.2, opacity: 0.4 };
    }
  };

  const settings = getIntensitySettings(intensity);

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Main liquid gradient */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 20% 20%, ${colors[0]} 0%, transparent 50%),
                       radial-gradient(ellipse at 80% 80%, ${colors[1]} 0%, transparent 50%),
                       radial-gradient(ellipse at 40% 60%, ${colors[2]} 0%, transparent 50%),
                       radial-gradient(ellipse at 60% 40%, ${colors[3]} 0%, transparent 50%),
                       radial-gradient(ellipse at 90% 10%, ${colors[4]} 0%, transparent 50%)`,
        }}
        animate={{
          background: [
            `radial-gradient(ellipse at 20% 20%, ${colors[0]} 0%, transparent 50%),
             radial-gradient(ellipse at 80% 80%, ${colors[1]} 0%, transparent 50%),
             radial-gradient(ellipse at 40% 60%, ${colors[2]} 0%, transparent 50%),
             radial-gradient(ellipse at 60% 40%, ${colors[3]} 0%, transparent 50%),
             radial-gradient(ellipse at 90% 10%, ${colors[4]} 0%, transparent 50%)`,
            `radial-gradient(ellipse at 80% 20%, ${colors[1]} 0%, transparent 50%),
             radial-gradient(ellipse at 20% 80%, ${colors[0]} 0%, transparent 50%),
             radial-gradient(ellipse at 60% 40%, ${colors[3]} 0%, transparent 50%),
             radial-gradient(ellipse at 40% 60%, ${colors[2]} 0%, transparent 50%),
             radial-gradient(ellipse at 10% 90%, ${colors[4]} 0%, transparent 50%)`,
            `radial-gradient(ellipse at 40% 80%, ${colors[2]} 0%, transparent 50%),
             radial-gradient(ellipse at 60% 20%, ${colors[3]} 0%, transparent 50%),
             radial-gradient(ellipse at 80% 40%, ${colors[1]} 0%, transparent 50%),
             radial-gradient(ellipse at 20% 60%, ${colors[0]} 0%, transparent 50%),
             radial-gradient(ellipse at 90% 90%, ${colors[4]} 0%, transparent 50%)`,
            `radial-gradient(ellipse at 20% 20%, ${colors[0]} 0%, transparent 50%),
             radial-gradient(ellipse at 80% 80%, ${colors[1]} 0%, transparent 50%),
             radial-gradient(ellipse at 40% 60%, ${colors[2]} 0%, transparent 50%),
             radial-gradient(ellipse at 60% 40%, ${colors[3]} 0%, transparent 50%),
             radial-gradient(ellipse at 90% 10%, ${colors[4]} 0%, transparent 50%)`,
          ],
        }}
        transition={{
          duration: settings.duration / speed,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Secondary liquid layer */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 30% 70%, ${colors[2]} 0%, transparent 40%),
                       radial-gradient(circle at 70% 30%, ${colors[4]} 0%, transparent 40%),
                       radial-gradient(circle at 50% 50%, ${colors[1]} 0%, transparent 40%)`,
          opacity: settings.opacity,
        }}
        animate={{
          background: [
            `radial-gradient(circle at 30% 70%, ${colors[2]} 0%, transparent 40%),
             radial-gradient(circle at 70% 30%, ${colors[4]} 0%, transparent 40%),
             radial-gradient(circle at 50% 50%, ${colors[1]} 0%, transparent 40%)`,
            `radial-gradient(circle at 70% 30%, ${colors[4]} 0%, transparent 40%),
             radial-gradient(circle at 30% 70%, ${colors[2]} 0%, transparent 40%),
             radial-gradient(circle at 20% 20%, ${colors[1]} 0%, transparent 40%)`,
            `radial-gradient(circle at 50% 50%, ${colors[1]} 0%, transparent 40%),
             radial-gradient(circle at 80% 80%, ${colors[2]} 0%, transparent 40%),
             radial-gradient(circle at 30% 30%, ${colors[4]} 0%, transparent 40%)`,
            `radial-gradient(circle at 30% 70%, ${colors[2]} 0%, transparent 40%),
             radial-gradient(circle at 70% 30%, ${colors[4]} 0%, transparent 40%),
             radial-gradient(circle at 50% 50%, ${colors[1]} 0%, transparent 40%)`,
          ],
        }}
        transition={{
          duration: (settings.duration * 0.8) / speed,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Floating orbs */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-xl"
          style={{
            width: `${60 + i * 40}px`,
            height: `${60 + i * 40}px`,
            background: `radial-gradient(circle, ${colors[i % colors.length]} 0%, transparent 70%)`,
            opacity: 0.3,
          }}
          animate={{
            x: [0, 100, -50, 0],
            y: [0, -80, 60, 0],
            scale: [1, 1.2, 0.8, 1],
          }}
          transition={{
            duration: (15 + i * 5) / speed,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 2,
          }}
        />
      ))}

      {/* Subtle noise overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};

export default LiquidBackground;
