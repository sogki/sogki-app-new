import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { socialLinks } from './NavbarData';

interface SocialDropdownProps {
  isOpen: boolean;
  isScrolled: boolean;
}

export const SocialDropdown: React.FC<SocialDropdownProps> = ({ isOpen, isScrolled }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="absolute top-full mt-2 right-0 bg-black border border-white/20 rounded-xl p-4 min-w-64 shadow-lg shadow-purple-500/10 z-50"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.1 }}
        >
          <div className="space-y-2">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 rounded-lg hover:bg-white/10 transition-colors duration-150 group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 group-hover:text-purple-400 transition-colors">
                    {social.icon}
                  </span>
                  <div className="flex-1">
                    <div className="text-white text-sm font-medium group-hover:text-purple-300 transition-colors">
                      {social.label}
                    </div>
                    <div className="text-purple-400 text-xs font-mono">
                      {social.handle}
                    </div>
                    <div className="text-gray-400 text-xs mt-1">
                      {social.description}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
