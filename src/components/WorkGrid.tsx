import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ExternalLink, Github } from 'lucide-react';
import type { Project } from '../lib/siteData';
import { projectAccent, projectHref } from '../lib/siteData';
import ProjectStatusBadge from './ProjectStatusBadge';
import { sectionRevealTransition, sectionViewport } from '../lib/motionPresets';

const PAGE_SIZE = 6;

type WorkGridProps = {
  projects: Project[];
};

export default function WorkGrid({ projects }: WorkGridProps) {
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(projects.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);

  const pageProjects = useMemo(() => {
    const start = safePage * PAGE_SIZE;
    return projects.slice(start, start + PAGE_SIZE);
  }, [projects, safePage]);

  if (projects.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ ...sectionRevealTransition, delay: 0.05 }}
      viewport={sectionViewport}
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="font-mono text-xl font-bold text-white sm:text-2xl">All Work</h3>
          <p className="text-sm text-purple-300/80">すべてのプロジェクト</p>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded-lg border border-white/10 p-2 text-gray-400 transition hover:bg-white/5 hover:text-white disabled:opacity-30"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-mono text-xs text-gray-500">
              {safePage + 1} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="rounded-lg border border-white/10 p-2 text-gray-400 transition hover:bg-white/5 hover:text-white disabled:opacity-30"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={safePage}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.25 }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {pageProjects.map((project, i) => {
            const accent = projectAccent(project);
            const caseStudy = projectHref(project);

            return (
              <motion.article
                key={project.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.05 }}
                whileHover={{ y: -6, scale: 1.01 }}
                className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-black/40 shadow-lg transition hover:border-purple-400/30 hover:shadow-purple-500/10"
              >
                <div className={`h-1 bg-gradient-to-r ${accent}`} />
                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <h4 className="font-mono text-lg font-semibold text-white group-hover:text-purple-200">
                      {project.title}
                    </h4>
                    <ProjectStatusBadge status={project.status} />
                  </div>

                  <p className="mb-2 text-sm leading-relaxed text-gray-400">
                    {project.tagline ?? project.description}
                  </p>

                  {project.status_note &&
                    (project.status === 'offline' || project.status === 'ceased') && (
                      <p className="mb-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs leading-relaxed text-gray-500">
                        {project.status_note}
                      </p>
                    )}

                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {project.technologies.slice(0, 4).map((tech) => (
                      <span
                        key={tech}
                        className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-gray-400"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>

                  <div className="mt-auto flex flex-wrap gap-2 pt-2">
                    {caseStudy && (
                      <Link
                        to={caseStudy}
                        className="text-xs font-medium text-purple-300 hover:text-purple-200"
                      >
                        Case study →
                      </Link>
                    )}
                    {project.show_demo_link && project.demo && (
                      <a
                        href={project.demo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white"
                      >
                        <ExternalLink size={12} />
                        Demo
                      </a>
                    )}
                    {project.github && (
                      <a
                        href={project.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white"
                      >
                        <Github size={12} />
                        Code
                      </a>
                    )}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
