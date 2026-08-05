import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSiteData } from '../context/SiteDataContext';
import { projectHref } from '../lib/siteData';
import ShinyText from '../components/ShinyText';
import ProjectStatusBadge from '../components/ProjectStatusBadge';
import { projectAccent } from '../lib/siteData';
import type { ProjectStatus } from '../lib/projectTypes';

const FILTERS: { id: 'all' | ProjectStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'live', label: 'Live' },
  { id: 'closed_beta', label: 'Beta' },
  { id: 'offline', label: 'Offline' },
  { id: 'ceased', label: 'Ceased' },
];

export function ProjectsIndexPage() {
  const { projects, isLoading } = useSiteData();
  const [filter, setFilter] = useState<'all' | ProjectStatus>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return projects;
    return projects.filter((p) => p.status === filter);
  }, [projects, filter]);

  if (isLoading) {
    return (
      <section className="relative min-h-[60vh] px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
        </div>
      </section>
    );
  }

  return (
    <section className="relative min-h-screen px-4 pb-20 pt-24 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <motion.header
          className="mb-10 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-mono text-4xl font-bold sm:text-5xl">
            <ShinyText text="Projects" speed={3} />
          </h1>
          <p className="mt-2 text-purple-300">プロジェクト</p>
        </motion.header>

        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-mono transition ${
                filter === f.id
                  ? 'border-purple-400/50 bg-purple-500/20 text-purple-200'
                  : 'border-white/10 text-gray-400 hover:border-white/20'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((project) => {
            const href = projectHref(project);
            const accent = projectAccent(project);
            return (
              <Link
                key={project.id}
                to={href ?? '#'}
                className="group overflow-hidden rounded-xl border border-white/10 bg-black/40 transition hover:border-white/20"
              >
                <div className={`h-1 bg-gradient-to-r ${accent}`} />
                <div className="p-5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h2 className="font-mono text-lg font-semibold text-white group-hover:text-purple-200">
                      {project.title}
                    </h2>
                    <ProjectStatusBadge status={project.status} />
                  </div>
                  <p className="text-sm text-gray-400">
                    {project.tagline ?? project.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
