import React from 'react';

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
        return { opacity: 0.25 };
      case 'high':
        return { opacity: 0.5 };
      default:
        return { opacity: 0.35 };
    }
  };

  const settings = getIntensitySettings(intensity);

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Optimized static gradient background - using CSS for better performance */}
      <div
        className="absolute inset-0 bg-gradient-animate"
        style={{
          background: `radial-gradient(ellipse at 20% 20%, ${colors[0]} 0%, transparent 60%),
                       radial-gradient(ellipse at 80% 80%, ${colors[1]} 0%, transparent 60%),
                       radial-gradient(ellipse at 40% 60%, ${colors[2]} 0%, transparent 60%),
                       radial-gradient(ellipse at 60% 40%, ${colors[3]} 0%, transparent 60%),
                       radial-gradient(ellipse at 90% 10%, ${colors[4]} 0%, transparent 60%)`,
          opacity: settings.opacity,
        }}
      />

      {/* Subtle noise overlay - reduced opacity for performance */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};

export default LiquidBackground;
