import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ExternalLink, Github, Sparkles } from 'lucide-react';
import type { Project } from '../lib/siteData';
import { projectAccent, projectHref } from '../lib/siteData';
import ProjectStatusBadge from './ProjectStatusBadge';
import { sectionRevealTransition, sectionViewport } from '../lib/motionPresets';

type MainProjectSpotlightProps = {
  project: Project;
};

export default function MainProjectSpotlight({ project }: MainProjectSpotlightProps) {
  const accent = projectAccent(project);
  const caseStudy = projectHref(project);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={sectionRevealTransition}
      viewport={sectionViewport}
      className="mb-12 sm:mb-16"
    >
      <div className="mb-4 text-center sm:text-left">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-amber-300/80">
          Main Project
        </p>
        <p className="text-sm text-amber-200/50">メインプロジェクト</p>
      </div>

      <div
        className={`group relative overflow-hidden rounded-2xl border border-amber-400/20 bg-gradient-to-br ${accent}`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12),transparent_50%)]" />
        <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/40 to-orange-600/40 rounded-2xl blur-2xl opacity-40 group-hover:opacity-60 transition-opacity" />

        <div className="relative grid gap-6 p-6 sm:p-8 md:grid-cols-2 md:items-center md:gap-10 lg:p-10">
          <div className="order-2 md:order-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Sparkles className="text-amber-100" size={18} />
              <ProjectStatusBadge status={project.status} />
            </div>
            <h3 className="font-mono text-2xl font-bold text-white sm:text-3xl md:text-4xl">
              {project.title}
            </h3>
            {project.title_jp && (
              <p className="mt-1 text-sm text-amber-100/70">{project.title_jp}</p>
            )}
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/90 sm:text-base">
              {project.tagline ?? project.description}
            </p>

            {project.metrics.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-3">
                {project.metrics.map((m) => (
                  <div
                    key={m.label}
                    className="rounded-lg border border-white/20 bg-black/20 px-3 py-2 backdrop-blur-sm"
                  >
                    <p className="text-[10px] uppercase tracking-wider text-amber-100/60">
                      {m.label}
                    </p>
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
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-amber-950 transition hover:bg-amber-50"
                >
                  <ExternalLink size={16} />
                  Visit site
                </a>
              )}
              {caseStudy && (
                <Link
                  to={caseStudy}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
                >
                  Read case study
                </Link>
              )}
              {project.github && (
                <a
                  href={project.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2.5 text-sm text-white/90 transition hover:bg-white/10"
                >
                  <Github size={16} />
                  GitHub
                </a>
              )}
            </div>
          </div>

          <div className="order-1 md:order-2">
            <div className="overflow-hidden rounded-xl border border-white/20 bg-black/30 shadow-2xl">
              {project.hero_image_url ? (
                <img
                  src={project.hero_image_url}
                  alt={`${project.title} preview`}
                  className="aspect-video w-full object-cover object-top"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className={`aspect-video w-full bg-gradient-to-br ${accent} opacity-80`} />
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
