import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, ChevronDown, ExternalLink, X } from 'lucide-react';
import { navItems, projects, socialLinks } from './NavbarData';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  handleNavClick: (href: string) => void;
  isProjectsOpen: boolean;
  setIsProjectsOpen: (value: boolean) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  isOpen,
  onClose,
  handleNavClick,
  isProjectsOpen,
  setIsProjectsOpen
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 bg-black md:hidden mobile-menu"
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          role="dialog"
          aria-label="Mobile navigation menu"
        >
          <div className="flex flex-col h-full p-4 sm:p-6">
            <div className="flex justify-between items-center mb-6 sm:mb-8">
              <span className="text-white text-base sm:text-lg font-bold font-mono">Sogki.dev</span>
              <motion.button
                onClick={onClose}
                className="text-gray-300 hover:text-white p-2"
                aria-label="Close menu"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X size={22} className="sm:w-6 sm:h-6" />
              </motion.button>
            </div>

            <div className="flex flex-col gap-3 sm:gap-4 overflow-y-auto">
              {/* Navigation Items */}
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleNavClick(item.href)}
                  className="flex items-center gap-3 text-gray-300 hover:text-white transition-all duration-150 p-3 rounded-lg hover:bg-gradient-to-r hover:from-purple-500/20 hover:to-indigo-500/20 relative overflow-hidden group"
                  aria-label={item.label}
                >
                  {item.icon}
                  <div className="text-left">
                    <div className="text-white text-sm font-medium">{item.label}</div>
                    <div className="text-xs text-purple-300">{item.labelJp}</div>
                    <div className="text-xs text-gray-400 mt-1">{item.description}</div>
                  </div>
                </button>
              ))}

              {/* Projects Collapsible Section */}
              <div className="mt-2 sm:mt-6">
                <button
                  onClick={() => setIsProjectsOpen(!isProjectsOpen)}
                  className="flex items-center gap-3 text-white p-3 rounded-lg hover:bg-gradient-to-r hover:from-purple-500/20 hover:to-indigo-500/20 transition-all duration-150 w-full text-left relative overflow-hidden"
                  aria-label={isProjectsOpen ? "Collapse Projects" : "Expand Projects"}
                  aria-expanded={isProjectsOpen}
                >
                  <Briefcase size={18} />
                  <span className="text-sm font-medium">Projects</span>
                  <motion.div
                    animate={{ rotate: isProjectsOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="ml-auto"
                  >
                    <ChevronDown size={14} />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {isProjectsOpen && (
                    <motion.div
                      className="space-y-2 mt-2"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      {projects.map((project) => (
                        <div key={project.name} className="pl-4 sm:pl-6">
                          <a
                            href={project.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-2 sm:p-3 rounded-lg hover:bg-gradient-to-r hover:from-purple-500/20 hover:to-indigo-500/20 transition-colors duration-150 group"
                            aria-label={`Open ${project.name} in new tab`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0 pr-2">
                                <div className="text-white text-sm font-medium mb-1 group-hover:text-purple-300 transition-colors">
                                  {project.name}
                                </div>
                                <div className="text-gray-400 text-xs leading-tight mb-1 line-clamp-2">
                                  {project.description}
                                </div>
                                <div className="text-purple-400 text-xs font-mono">
                                  {project.tech}
                                </div>
                              </div>
                              <ExternalLink size={12} className="text-gray-400 group-hover:text-purple-400 transition-colors ml-2 mt-0.5 flex-shrink-0" />
                            </div>
                          </a>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Social Links Section */}
              <div className="mt-2 sm:mt-6">
                <div className="text-white text-sm font-medium mb-2">Social</div>
                <div className="space-y-2">
                  {socialLinks.map((social) => (
                    <a
                      key={social.label}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-2 sm:p-3 rounded-lg hover:bg-gradient-to-r hover:from-purple-500/20 hover:to-indigo-500/20 transition-colors duration-150 group"
                      aria-label={`Visit ${social.label}`}
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
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
