import React from 'react';
import { motion } from 'framer-motion';
import ShinyText from './ShinyText';
import { useSiteData } from '../context/SiteDataContext';
import { getString } from '../lib/siteContent';
import MainProjectSpotlight from './MainProjectSpotlight';
import WorkGrid from './WorkGrid';
import { sectionRevealTransition, sectionViewport } from '../lib/motionPresets';

export const Projects: React.FC = () => {
  const { projects: rawProjects, isLoading, siteContent } = useSiteData();

  const mainProject = rawProjects.find((p) => p.tier === 'main');
  const otherProjects = rawProjects.filter((p) => p.tier !== 'main');

  if (isLoading) {
    return (
      <section className="relative overflow-hidden px-4 py-12 sm:px-6 sm:py-16 md:py-20">
        <div className="mx-auto max-w-7xl text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
          <p className="text-gray-400">Loading projects...</p>
        </div>
      </section>
    );
  }

  if (rawProjects.length === 0) return null;

  return (
    <section className="relative overflow-hidden px-4 py-12 sm:px-6 sm:py-16 md:py-20">
      <div className="mx-auto max-w-7xl">
        <motion.div
          className="mb-12 text-center sm:mb-16"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={sectionRevealTransition}
          viewport={sectionViewport}
        >
          <h2 className="mb-3 font-mono text-3xl font-bold sm:mb-4 sm:text-4xl md:text-5xl lg:text-6xl">
            <ShinyText
              text={getString(siteContent, 'projects.section_title', 'Work')}
              speed={3}
            />
          </h2>
          <p className="mb-2 text-base text-purple-300 sm:text-lg">
            {getString(siteContent, 'projects.section_title_jp', '制作物')}
          </p>
          <p className="mx-auto max-w-2xl px-4 text-sm text-gray-400 sm:text-base">
            {getString(
              siteContent,
              'projects.section_description',
              'Products, platforms, and client work — built end to end.'
            )}
          </p>
        </motion.div>

        {mainProject && <MainProjectSpotlight project={mainProject} />}
        <WorkGrid projects={otherProjects} />
      </div>
    </section>
  );
};
