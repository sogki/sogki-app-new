import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Section {
  id: string;
  kanji: string;
  label: string;
  color: string;
}

const sections: Section[] = [
  { id: 'home', kanji: '家', label: 'Home', color: 'text-purple-400' },
  { id: 'about', kanji: '私', label: 'About', color: 'text-blue-400' },
  { id: 'projects', kanji: '作', label: 'Projects', color: 'text-green-400' },
  { id: 'tech-stack', kanji: '技', label: 'Tech', color: 'text-yellow-400' },
  { id: 'contact', kanji: '話', label: 'Contact', color: 'text-red-400' }
];

export const KanjiScrollbar: React.FC = () => {
  const [activeSection, setActiveSection] = useState('home');
  const [isClickNavigating, setIsClickNavigating] = useState(false);

  useEffect(() => {
    // Use IntersectionObserver for more reliable scroll detection
    const observerOptions = {
      root: null,
      rootMargin: '-40% 0px -40% 0px', // Trigger when section is 40% from top
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      if (isClickNavigating) return; // Don't update during click navigation
      
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.id;
          setActiveSection(sectionId);
        }
      });
    }, observerOptions);

    // Observe all sections
    sections.forEach(section => {
      const element = document.getElementById(section.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [isClickNavigating]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      setIsClickNavigating(true); // Prevent scroll listener from interfering
      setActiveSection(sectionId); // Immediately update active state on click
      element.scrollIntoView({ behavior: 'smooth' });
      
      // Re-enable scroll detection after animation completes
      setTimeout(() => {
        setIsClickNavigating(false);
      }, 1000);
    }
  };

  return (
    <div className="fixed right-4 top-1/2 transform -translate-y-1/2 z-50 space-y-2">
      {sections.map((section, index) => (
        <motion.button
          key={section.id}
          onClick={() => scrollToSection(section.id)}
          className={`
            relative group block w-12 h-12 rounded-full border-2 transition-all duration-300
            ${activeSection === section.id 
              ? 'bg-purple-500/20 border-purple-400 shadow-lg shadow-purple-500/30' 
              : 'bg-black/20 border-white/20 hover:border-white/40 hover:bg-white/10'
            }
          `}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          {/* Kanji */}
          <div className={`
            absolute inset-0 flex items-center justify-center text-2xl font-bold
            ${activeSection === section.id ? section.color : 'text-white/70'}
            group-hover:text-white transition-colors duration-300
          `}>
            {section.kanji}
          </div>
          
          {/* Tooltip */}
          <div className="absolute right-full mr-3 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div className="bg-black/90 text-white text-sm px-3 py-1 rounded-lg whitespace-nowrap">
              {section.label}
            </div>
            <div className="absolute left-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-l-4 border-l-black/90 border-t-4 border-t-transparent border-b-4 border-b-transparent"></div>
          </div>
          
          {/* Active indicator - small dot */}
          {activeSection === section.id && (
            <motion.div
              className={`absolute -left-4 top-1/2 transform -translate-y-1/2 w-2 h-2 rounded-full ${
                section.id === 'home' ? 'bg-purple-400' :
                section.id === 'about' ? 'bg-blue-400' :
                section.id === 'projects' ? 'bg-green-400' :
                section.id === 'tech-stack' ? 'bg-yellow-400' :
                section.id === 'contact' ? 'bg-red-400' : 'bg-purple-400'
              }`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
          )}
          
          {/* Glow effect for active section */}
          {activeSection === section.id && (
            <motion.div
              className={`absolute inset-0 rounded-full blur-md ${
                section.id === 'home' ? 'bg-purple-400/20' :
                section.id === 'about' ? 'bg-blue-400/20' :
                section.id === 'projects' ? 'bg-green-400/20' :
                section.id === 'tech-stack' ? 'bg-yellow-400/20' :
                section.id === 'contact' ? 'bg-red-400/20' : 'bg-purple-400/20'
              }`}
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.8, 0.5]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          )}
        </motion.button>
      ))}
    </div>
  );
};
