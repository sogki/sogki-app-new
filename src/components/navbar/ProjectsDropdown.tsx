import React from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { useSiteData } from '../../context/SiteDataContext';
import { projectHref } from '../../lib/siteData';
import ProjectStatusBadge from '../ProjectStatusBadge';

interface ProjectsDropdownProps {
  isOpen: boolean;
  isScrolled: boolean;
}

export const ProjectsDropdown: React.FC<ProjectsDropdownProps> = ({ isOpen }) => {
  const { projects } = useSiteData();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-white/20 bg-black p-3 shadow-lg shadow-purple-500/10"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.1 }}
        >
          <div className="dropdown-scroll grid max-h-[450px] grid-cols-1 gap-2 overflow-y-auto overflow-x-hidden pr-1">
            {projects.map((project) => {
              const caseStudy = projectHref(project);
              const inner = (
                <>
                  <div className="flex items-start justify-between w-full">
                    <div className="min-w-0 flex-1 overflow-hidden pr-1">
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-white group-hover:text-purple-300">
                          {project.title}
                        </span>
                        <ProjectStatusBadge status={project.status} className="scale-90" />
                      </div>
                      <div className="mb-1 line-clamp-2 break-words text-xs leading-tight text-gray-400">
                        {project.tagline ?? project.description}
                      </div>
                      <div className="truncate font-mono text-xs text-purple-400">
                        {project.technologies.slice(0, 3).join(' • ')}
                      </div>
                    </div>
                    <ExternalLink
                      size={10}
                      className="ml-1 mt-0.5 flex-shrink-0 text-gray-400 group-hover:text-purple-400"
                    />
                  </div>
                </>
              );

              if (caseStudy) {
                return (
                  <Link
                    key={project.id}
                    to={caseStudy}
                    className="group block w-full rounded-lg p-2 transition-colors duration-150 hover:bg-white/10"
                  >
                    {inner}
                  </Link>
                );
              }

              return (
                <div key={project.id} className="block w-full rounded-lg p-2 text-gray-500">
                  {inner}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
