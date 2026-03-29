import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { DesktopNav } from './navbar/DesktopNav';
import { MobileNav } from './navbar/MobileNav';
import { navItems as allNavItems } from './navbar/NavbarData';
import { useSiteData } from '../context/SiteDataContext';
import { getBool } from '../lib/siteContent';
import { getMotionAwareScrollBehavior } from '../utils/motion';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { siteContent } = useSiteData();
  const navItems = getBool(siteContent, 'feature.show_collection', true)
    ? allNavItems
    : allNavItems.filter((item) => item.href !== '/collection');
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const nextScrolled = window.scrollY > 50;
      setIsScrolled((prev) => (prev === nextScrolled ? prev : nextScrolled));
    };

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container') && !target.closest('.mobile-menu')) {
        setActiveDropdown(null);
        setIsMobileMenuOpen(false);
        setIsProjectsOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const navigateToPath = (path: string) => {
    if (window.location.pathname !== path) {
      navigate(path);
    }
    window.scrollTo({ top: 0, behavior: getMotionAwareScrollBehavior() });
  };

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: getMotionAwareScrollBehavior(), block: 'start' });
      window.scrollBy(0, -20);
    }
  };

  const handleNavClick = (href: string) => {
    if (href.startsWith('/')) {
      navigateToPath(href);
    } else if (window.location.pathname !== '/') {
      navigateToPath('/');
      requestAnimationFrame(() => {
        scrollToSection(href);
      });
    } else {
      scrollToSection(href);
    }
    setActiveDropdown(null);
    setIsMobileMenuOpen(false);
    setIsProjectsOpen(false);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-between px-3 sm:px-4 pt-3 sm:pt-4 md:justify-center">
      {/* Logo for Mobile */}
      <motion.div 
        className={`flex items-center gap-2 text-white font-bold transition-all duration-150 md:hidden font-mono ${
          isScrolled ? 'text-sm' : 'text-base'
        }`}
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.95 }}
      >
        <span>Sogki.dev</span>
      </motion.div>

      {/* Mobile Navbar (Circular Hamburger) */}
      <motion.nav
        className={`md:hidden flex items-center justify-center transition-all duration-200 ease-out ${
          isScrolled 
            ? 'bg-black border border-white/20 shadow-lg shadow-purple-500/10' 
            : 'bg-black/90 border border-white/10'
        } rounded-full w-11 h-11 sm:w-12 sm:h-12`}
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
        whileHover={{ scale: isScrolled ? 0.98 : 1.05 }}
      >
        <motion.button
          className="text-gray-300 hover:text-white p-2 mobile-menu relative"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMobileMenuOpen}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <AnimatePresence mode="wait">
            {isMobileMenuOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <X size={22} className="sm:w-6 sm:h-6" />
              </motion.div>
            ) : (
              <motion.div
                key="menu"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Menu size={22} className="sm:w-6 sm:h-6" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </motion.nav>

      {/* Desktop Navbar */}
      <DesktopNav
        isScrolled={isScrolled}
        activeDropdown={activeDropdown}
        setActiveDropdown={setActiveDropdown}
        handleNavClick={handleNavClick}
        navItems={navItems}
      />

      {/* Mobile Sidebar Menu */}
      <MobileNav
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        handleNavClick={handleNavClick}
        isProjectsOpen={isProjectsOpen}
        setIsProjectsOpen={setIsProjectsOpen}
        navItems={navItems}
      />
    </div>
  );
};
