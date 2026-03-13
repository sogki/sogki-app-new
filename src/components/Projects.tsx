import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProjectCard } from './ProjectCard';
import ShinyText from './ShinyText';
import { ExternalLink, Github, Sparkles } from 'lucide-react';
import { useSiteData } from '../context/SiteDataContext';
import { getString } from '../lib/siteContent';
import { projects as navProjects } from './navbar/NavbarData';
import { sectionRevealTransition, sectionViewport, smoothEase } from '../lib/motionPresets';

function mapProject(p: { title: string; title_jp: string | null; description: string; technologies: string[]; github: string | null; demo: string | null; featured: boolean; color: string | null }) {
  return {
    title: p.title,
    titleJp: p.title_jp ?? p.title,
    description: p.description,
    technologies: p.technologies ?? [],
    github: p.github ?? undefined,
    demo: p.demo ?? undefined,
    featured: p.featured,
    color: p.color ?? 'from-purple-500 to-indigo-500',
  };
}

export const Projects: React.FC = () => {
  const { projects: rawProjects, isLoading, siteContent } = useSiteData();
  const projects = rawProjects.map(mapProject);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const featuredProjects = projects.filter(p => p.featured);
  const currentFeatured = featuredProjects[featuredIndex];

  useEffect(() => {
    if (featuredProjects.length > 0 && featuredIndex >= featuredProjects.length) {
      setFeaturedIndex(0);
    }
  }, [featuredProjects.length, featuredIndex]);

  useEffect(() => {
    if (isHovered || featuredProjects.length === 0) return;
    const interval = setInterval(() => {
      setFeaturedIndex((prev) => (prev + 1) % featuredProjects.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [featuredProjects.length, isHovered]);

  if (isLoading || projects.length === 0) {
    return (
      <section className="relative py-12 sm:py-16 md:py-20 px-4 sm:px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto text-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading projects...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative py-12 sm:py-16 md:py-20 px-4 sm:px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={sectionRevealTransition}
          viewport={sectionViewport}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 font-mono">
            <ShinyText text={getString(siteContent, 'projects.section_title', 'Featured Projects')} speed={3} />
          </h2>
          <p className="text-purple-300 text-base sm:text-lg mb-2">{getString(siteContent, 'projects.section_title_jp', '注目のプロジェクト')}</p>
          <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto px-4">
            {getString(siteContent, 'projects.section_description', 'Production websites and platforms that demonstrate product depth, technical execution, and visual craft')}
          </p>
        </motion.div>

        <div className="mb-12 sm:mb-16 min-h-[450px] sm:min-h-[500px] md:min-h-[550px]">
          <AnimatePresence mode="wait">
            {currentFeatured && (
              <motion.div
                key={featuredIndex}
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.98 }}
                transition={{ duration: 0.52, ease: smoothEase }}
                className="relative h-full"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 border border-white/20 h-full min-h-[450px] sm:min-h-[500px] md:min-h-[550px]">
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                      backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                      backgroundSize: '40px 40px'
                    }} />
                  </div>
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl sm:rounded-2xl blur-2xl opacity-50 group-hover:opacity-75 transition-opacity duration-300" />
                  <div className="relative p-4 sm:p-6 md:p-8 lg:p-12 h-full flex flex-col">
                    <div className="flex-1 flex flex-col">
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 mb-4 sm:mb-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                            <Sparkles className="text-white" size={20} />
                            <span className="text-xs sm:text-sm text-white/80 font-mono uppercase tracking-wider">Featured Project</span>
                          </div>
                          <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 font-mono group-hover:text-white transition-colors">
                            {currentFeatured.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-white/70 mb-3 sm:mb-4">{currentFeatured.titleJp}</p>
                          <p className="text-white/90 text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl">
                            {currentFeatured.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-6">
                        {currentFeatured.technologies.map((tech) => (
                          <span
                            key={tech}
                            className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm bg-white/20 text-white rounded-full border border-white/30 font-mono backdrop-blur-sm"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-auto">
                      {currentFeatured.github && (
                        <motion.a
                          href={currentFeatured.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm sm:text-base font-medium transition-all duration-150 backdrop-blur-sm border border-white/30"
                          whileHover={{ scale: 1.05, x: 4 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Github size={18} />
                          <span>View Code</span>
                        </motion.a>
                      )}
                      {currentFeatured.demo && (
                        <motion.a
                          href={currentFeatured.demo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-white text-black hover:bg-white/90 rounded-lg text-sm sm:text-base font-medium transition-all duration-150"
                          whileHover={{ scale: 1.05, x: 4 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <ExternalLink size={18} />
                          <span>Live Demo</span>
                        </motion.a>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex justify-center gap-2 mt-6">
                  {featuredProjects.map((_, index) => (
                    <motion.button
                      key={index}
                      onClick={() => setFeaturedIndex(index)}
                      className={`h-2 rounded-full transition-all duration-200 ${
                        index === featuredIndex 
                          ? 'bg-gradient-to-r from-purple-500 to-indigo-500 w-8' 
                          : 'bg-white/20 w-2 hover:bg-white/40'
                      }`}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      aria-label={`View ${featuredProjects[index].title}`}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.64, delay: 0.1, ease: smoothEase }}
          viewport={sectionViewport}
          className="mt-16"
        >
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-6 sm:mb-8 font-mono text-center">
            {getString(siteContent, 'projects.more_title', 'More Projects')}
          </h3>
          <div className="relative overflow-hidden py-4">
            <div className="flex gap-4 sm:gap-6 animate-marquee">
              {[...navProjects, ...navProjects, ...navProjects].map((p, index) => {
                const project = {
                  title: p.name,
                  titleJp: p.name,
                  description: p.description,
                  technologies: p.tech.split(' • ').filter(Boolean),
                  demo: p.url,
                };
                return (
                  <div
                    key={`${p.name}-${index}`}
                    className="flex-shrink-0 w-[300px] sm:w-[350px] md:w-[400px]"
                  >
                    <ProjectCard {...project} delay={0} />
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
