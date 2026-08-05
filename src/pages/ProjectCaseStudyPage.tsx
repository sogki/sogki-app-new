import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, ExternalLink, Github } from 'lucide-react';
import { fetchProjectBySlug, fetchProjects } from '../lib/siteData';
import type { Project } from '../lib/siteData';
import { projectAccent } from '../lib/siteData';
import ProjectStatusBadge from '../components/ProjectStatusBadge';

export function ProjectCaseStudyPage() {
  const { slug } = useParams<{ slug: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    Promise.all([fetchProjectBySlug(slug), fetchProjects()])
      .then(([p, all]) => {
        setProject(p);
        setAllProjects(all);
      })
      .catch(() => setProject(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <section className="relative min-h-[60vh] px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
        </div>
      </section>
    );
  }

  if (!project) {
    return (
      <section className="relative min-h-[60vh] px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mb-4 text-2xl font-bold text-white">Project not found</h1>
          <Link to="/projects" className="text-purple-400 hover:text-purple-300">
            ← All projects
          </Link>
        </div>
      </section>
    );
  }

  const accent = projectAccent(project);
  const idx = allProjects.findIndex((p) => p.id === project.id);
  const prev = idx > 0 ? allProjects[idx - 1] : null;
  const next = idx >= 0 && idx < allProjects.length - 1 ? allProjects[idx + 1] : null;
  const body = project.long_description ?? project.description;

  return (
    <article className="relative min-h-screen px-4 pb-20 pt-24 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/projects"
          className="mb-8 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-purple-300"
        >
          <ArrowLeft size={16} />
          All projects
        </Link>

        {project.hero_image_url && (
          <div className="mb-8 overflow-hidden rounded-xl border border-white/10">
            <img
              src={project.hero_image_url}
              alt={project.title}
              className="aspect-video w-full object-cover object-top"
            />
          </div>
        )}

        <header className="mb-8">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <ProjectStatusBadge status={project.status} />
            {project.tier === 'main' && (
              <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-amber-200">
                Main project
              </span>
            )}
          </div>
          <h1 className="font-mono text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            {project.title}
          </h1>
          {project.title_jp && (
            <p className="mt-2 text-purple-300">{project.title_jp}</p>
          )}
          <p className="mt-4 text-lg text-gray-300">
            {project.tagline ?? project.description}
          </p>

          {(project.status === 'offline' || project.status === 'ceased') && project.status_note && (
            <div className="mt-4 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-400">
              {project.status_note}
            </div>
          )}

          {project.metrics.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-3">
              {project.metrics.map((m) => (
                <div
                  key={m.label}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                >
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">{m.label}</p>
                  <p className="font-mono text-sm text-white">{m.value}</p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {project.show_demo_link && project.demo && (
              <a
                href={project.demo}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-2 rounded-lg bg-gradient-to-r px-4 py-2 text-sm font-medium text-white ${accent}`}
              >
                <ExternalLink size={16} />
                {project.status === 'closed_beta' ? 'Visit site' : 'Live demo'}
              </a>
            )}
            {project.github && (
              <a
                href={project.github}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
              >
                <Github size={16} />
                GitHub
              </a>
            )}
          </div>
        </header>

        <motion.div
          className="prose prose-invert prose-purple max-w-none prose-headings:font-mono prose-a:text-purple-300"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
        </motion.div>

        {project.technologies.length > 0 && (
          <div className="mt-10 border-t border-white/10 pt-8">
            <h2 className="mb-3 font-mono text-sm uppercase tracking-wider text-gray-500">
              Stack
            </h2>
            <div className="flex flex-wrap gap-2">
              {project.technologies.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-gray-300"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        <nav className="mt-12 flex justify-between gap-4 border-t border-white/10 pt-8 text-sm">
          {prev?.slug ? (
            <Link to={`/projects/${prev.slug}`} className="text-gray-400 hover:text-purple-300">
              ← {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next?.slug ? (
            <Link
              to={`/projects/${next.slug}`}
              className="text-right text-gray-400 hover:text-purple-300"
            >
              {next.title} →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </div>
    </article>
  );
}
