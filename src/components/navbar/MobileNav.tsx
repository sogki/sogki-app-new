import React from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, ChevronDown, ExternalLink, X } from 'lucide-react';
import { navItems as defaultNavItems, socialLinks } from './NavbarData';
import { useSiteData } from '../../context/SiteDataContext';
import { projectHref } from '../../lib/siteData';
import ProjectStatusBadge from '../ProjectStatusBadge';

type NavItem = (typeof defaultNavItems)[number];

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  handleNavClick: (href: string) => void;
  isProjectsOpen: boolean;
  setIsProjectsOpen: (value: boolean) => void;
  navItems?: NavItem[];
}

export const MobileNav: React.FC<MobileNavProps> = ({
  isOpen,
  onClose,
  handleNavClick,
  isProjectsOpen,
  setIsProjectsOpen,
  navItems: navItemsProp,
}) => {
  const navItems = navItemsProp ?? defaultNavItems;
  const { projects } = useSiteData();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="mobile-menu fixed inset-0 z-50 bg-black md:hidden"
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          role="dialog"
          aria-label="Mobile navigation menu"
        >
          <div className="flex h-full flex-col p-4 sm:p-6">
            <div className="mb-6 flex items-center justify-between sm:mb-8">
              <span className="font-mono text-base font-bold text-white sm:text-lg">Sogki.dev</span>
              <motion.button
                onClick={onClose}
                className="p-2 text-gray-300 hover:text-white"
                aria-label="Close menu"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X size={22} className="sm:h-6 sm:w-6" />
              </motion.button>
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto sm:gap-4">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleNavClick(item.href)}
                  className="group relative flex items-center gap-3 overflow-hidden rounded-lg p-3 text-gray-300 transition-all duration-150 hover:bg-gradient-to-r hover:from-purple-500/20 hover:to-indigo-500/20 hover:text-white"
                  aria-label={item.label}
                >
                  {item.icon}
                  <div className="text-left">
                    <div className="text-sm font-medium text-white">{item.label}</div>
                    <div className="text-xs text-purple-300">{item.labelJp}</div>
                  </div>
                </button>
              ))}

              <div className="mt-2 sm:mt-6">
                <button
                  onClick={() => setIsProjectsOpen(!isProjectsOpen)}
                  className="relative flex w-full items-center gap-3 overflow-hidden rounded-lg p-3 text-left text-white transition-all duration-150 hover:bg-gradient-to-r hover:from-purple-500/20 hover:to-indigo-500/20"
                  aria-expanded={isProjectsOpen}
                >
                  <Briefcase size={18} />
                  <span className="text-sm font-medium">Projects</span>
                  <motion.div
                    animate={{ rotate: isProjectsOpen ? 180 : 0 }}
                    className="ml-auto"
                  >
                    <ChevronDown size={14} />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {isProjectsOpen && (
                    <motion.div
                      className="mt-2 space-y-2"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                    >
                      {projects.map((project) => {
                        const caseStudy = projectHref(project);
                        const inner = (
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1 pr-2">
                              <div className="mb-1 flex flex-wrap items-center gap-1">
                                <span className="text-sm font-medium text-white">{project.title}</span>
                                <ProjectStatusBadge status={project.status} className="scale-90" />
                              </div>
                              <p className="line-clamp-2 text-xs text-gray-400">
                                {project.tagline ?? project.description}
                              </p>
                            </div>
                            <ExternalLink size={12} className="mt-0.5 flex-shrink-0 text-gray-500" />
                          </div>
                        );
                        return (
                          <div key={project.id} className="pl-4 sm:pl-6">
                            {caseStudy ? (
                              <Link
                                to={caseStudy}
                                onClick={onClose}
                                className="block rounded-lg p-2 transition hover:bg-white/10 sm:p-3"
                              >
                                {inner}
                              </Link>
                            ) : (
                              <div className="p-2 sm:p-3">{inner}</div>
                            )}
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-2 sm:mt-6">
                <div className="mb-2 text-sm font-medium text-white">Social</div>
                <div className="space-y-2">
                  {socialLinks.map((social) => (
                    <a
                      key={social.label}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg p-2 transition hover:bg-white/10 sm:p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400">{social.icon}</span>
                        <span className="text-sm text-white">{social.label}</span>
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
