import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { projects } from './NavbarData';

interface ProjectsDropdownProps {
  isOpen: boolean;
  isScrolled: boolean;
}

export const ProjectsDropdown: React.FC<ProjectsDropdownProps> = ({ isOpen, isScrolled }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="absolute top-full mt-2 right-0 bg-black border border-white/20 rounded-xl p-3 w-72 max-w-[calc(100vw-2rem)] shadow-lg shadow-purple-500/10 z-50"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.1 }}
        >
          <div className="grid grid-cols-1 gap-2 max-h-[450px] overflow-y-auto overflow-x-hidden dropdown-scroll pr-1">
            {projects.map((project) => (
              <a
                key={project.name}
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-2 rounded-lg hover:bg-white/10 transition-colors duration-150 group w-full"
              >
                <div className="flex items-start justify-between w-full">
                  <div className="flex-1 min-w-0 pr-1 overflow-hidden">
                    <div className="text-white text-sm font-medium mb-1 group-hover:text-purple-300 transition-colors truncate">
                      {project.name}
                    </div>
                    <div className="text-gray-400 text-xs leading-tight mb-1 line-clamp-2 break-words">
                      {project.description}
                    </div>
                    <div className="text-purple-400 text-xs font-mono truncate">
                      {project.tech}
                    </div>
                  </div>
                  <ExternalLink size={10} className="text-gray-400 group-hover:text-purple-400 transition-colors ml-1 mt-0.5 flex-shrink-0" />
                </div>
              </a>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
