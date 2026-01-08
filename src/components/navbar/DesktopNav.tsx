import React from 'react';
import { motion } from 'framer-motion';
import { Briefcase, ChevronDown, Share2 } from 'lucide-react';
import { navItems } from './NavbarData';
import { ProjectsDropdown } from './ProjectsDropdown';
import { SocialDropdown } from './SocialDropdown';

interface DesktopNavProps {
  isScrolled: boolean;
  activeDropdown: string | null;
  setActiveDropdown: (value: string | null) => void;
  handleNavClick: (href: string) => void;
  mousePosition: { x: number; y: number };
}

export const DesktopNav: React.FC<DesktopNavProps> = ({
  isScrolled,
  activeDropdown,
  setActiveDropdown,
  handleNavClick,
  mousePosition
}) => {
  return (
    <motion.nav
      className={`hidden md:flex transition-all duration-200 ease-out relative ${
        isScrolled 
          ? 'bg-black border border-white/20 shadow-lg shadow-purple-500/10' 
          : 'bg-black/90 border border-white/10'
      } rounded-full ${isScrolled ? 'px-4 py-2' : 'px-6 py-3'}`}
      initial={{ y: -100, opacity: 0, scale: 0.8 }}
      animate={{ 
        y: 0, 
        opacity: 1, 
        scale: isScrolled ? 0.95 : 1,
      }}
      transition={{ 
        duration: 0.15, 
        type: "tween",
        ease: "easeOut"
      }}
      whileHover={{ scale: isScrolled ? 0.98 : 1.02 }}
    >
      {/* Animated glow effect that follows mouse */}
      <div 
        className="absolute inset-0 rounded-full opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(147, 51, 234, 0.15), transparent 40%)`,
        }}
      />

      <div className="flex items-center gap-3 lg:gap-4 relative z-10">
        {/* Logo */}
        <motion.div 
          className={`flex items-center gap-2 text-white font-bold transition-all duration-150 font-mono ${
            isScrolled ? 'text-sm' : 'text-base'
          }`}
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.95 }}
        >
          <span>Sogki.dev</span>
        </motion.div>

        {/* Desktop Navigation Items */}
        <div className="flex items-center gap-1 lg:gap-2">
          {navItems.map((item) => (
            <div key={item.label} className="relative group">
              <button
                onClick={() => handleNavClick(item.href)}
                className={`flex items-center gap-1.5 lg:gap-2 text-gray-300 hover:text-white transition-all duration-150 rounded-full relative overflow-hidden ${
                  isScrolled ? 'px-2 py-1' : 'px-3 py-2'
                }`}
                aria-label={item.label}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-150" />
                
                <span className={`relative z-10 ${isScrolled ? 'text-sm' : 'text-base'}`}>
                  {item.icon}
                </span>
                <span className={`hidden lg:inline relative z-10 ${isScrolled ? 'text-xs' : 'text-sm'}`}>
                  {item.label}
                </span>
              </button>
              
              {/* Enhanced Tooltip */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
                <div className="bg-gradient-to-br from-purple-500 to-indigo-500 border border-white/20 rounded-lg px-3 py-2 text-sm text-white whitespace-nowrap shadow-lg shadow-purple-500/20">
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs text-white/80">{item.labelJp}</div>
                  <div className="text-xs text-white/60 mt-1">{item.description}</div>
                </div>
              </div>
            </div>
          ))}

          {/* Projects Dropdown */}
          <div className="relative dropdown-container">
            <button
              onClick={() => setActiveDropdown(activeDropdown === 'projects' ? null : 'projects')}
              className={`flex items-center gap-1.5 lg:gap-2 text-gray-300 hover:text-white transition-all duration-150 rounded-full relative overflow-hidden ${
                isScrolled ? 'px-2 py-1' : 'px-3 py-2'
              }`}
              aria-label="Projects"
              aria-expanded={activeDropdown === 'projects'}
            >
              <div className={`absolute inset-0 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full opacity-0 ${activeDropdown === 'projects' ? 'opacity-20' : 'group-hover:opacity-20'} transition-opacity duration-150`} />
              <Briefcase size={isScrolled ? 16 : 18} className="relative z-10" />
              <span className={`hidden lg:inline relative z-10 ${isScrolled ? 'text-xs' : 'text-sm'}`}>
                Projects
              </span>
              <motion.div
                animate={{ rotate: activeDropdown === 'projects' ? 180 : 0 }}
                transition={{ duration: 0.15 }}
                className="relative z-10"
              >
                <ChevronDown size={isScrolled ? 12 : 14} />
              </motion.div>
            </button>
            <ProjectsDropdown isOpen={activeDropdown === 'projects'} isScrolled={isScrolled} />
          </div>

          {/* Social Dropdown */}
          <div className="relative dropdown-container">
            <button
              onClick={() => setActiveDropdown(activeDropdown === 'social' ? null : 'social')}
              className={`flex items-center gap-1.5 lg:gap-2 text-gray-300 hover:text-white transition-all duration-150 rounded-full relative overflow-hidden ${
                isScrolled ? 'px-2 py-1' : 'px-3 py-2'
              }`}
              aria-label="Social Links"
              aria-expanded={activeDropdown === 'social'}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-150" />
              <Share2 size={isScrolled ? 16 : 18} className="relative z-10" />
              <span className={`hidden lg:inline relative z-10 ${isScrolled ? 'text-xs' : 'text-sm'}`}>
                Social
              </span>
              <motion.div
                animate={{ rotate: activeDropdown === 'social' ? 180 : 0 }}
                transition={{ duration: 0.3 }}
                className="relative z-10"
              >
                <ChevronDown size={isScrolled ? 12 : 14} />
              </motion.div>
            </button>
            <SocialDropdown isOpen={activeDropdown === 'social'} isScrolled={isScrolled} />
          </div>
        </div>
      </div>
    </motion.nav>
  );
};
