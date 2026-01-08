import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProjectCard } from './ProjectCard';
import ShinyText from './ShinyText';
import { ExternalLink, Github, Sparkles } from 'lucide-react';

export const Projects: React.FC = () => {
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const projects = [
    {
      title: "BLXR",
      titleJp: "BLXR",
      description: "Next-generation developer platform for building modular backends. Features innovative DSL system, zero-config type generation, and unified design system.",
      technologies: ["Next.js", "TypeScript", "PostgreSQL", "React", "Advanced DSL"],
      github: "https://github.com/sogki/blxr",
      demo: "https://blxr.dev",
      featured: true,
      color: "from-purple-500 to-indigo-500"
    },
    {
      title: "Binderly TCG",
      titleJp: "Binderly TCG",
      description: "The ultimate Pokemon card collection platform. Organize, track, and discover rare cards with real-time pricing and market insights.",
      technologies: ["React", "TypeScript", "PostgreSQL", "Next.js", "Real-time Data"],
      github: "https://github.com/sogki/binderly",
      demo: "https://binderlytcg.com",
      featured: true,
      color: "from-purple-500 to-indigo-500"
    },
    {
      title: "Profiles After Dark",
      titleJp: "暗闇後のプロフィール",
      description: "An aesthetic profile database serving 200+ users. Built with Next.js, PostgreSQL, and modern design principles.",
      technologies: ["Next.js", "React", "PostgreSQL", "TypeScript", "JavaScript"],
      github: "https://github.com/sogki/profiles-after-dark",
      demo: "https://profilesafterdark.com",
      featured: true,
      color: "from-purple-500 to-indigo-500"
    },
    {
      title: "RankTheGlobe",
      titleJp: "地球儀をランク付けする",
      description: "Interactive crowd-source consumer rankings and ratings platform. Built with React, React Native, Next.js, and PostgreSQL.",
      technologies: ["React", "React Native", "TailwindCSS", "Nativewind", "TypeScript", "PostgreSQL", "NextJS", "Shadcn"],
      github: "https://github.com/world-ranking-inc",
      demo: "https://ranktheglobe.com",
      featured: false,
      color: "from-cyan-500 to-teal-500"
    },
    {
      title: "50andBad's VOD Archive",
      titleJp: "50andBadのビデオオンデマンドアーカイブ",
      description: "A VOD Archive for 50andBad, with advanced admin features.",
      technologies: ["Next.js", "React", "PostgreSQL", "TypeScript", "Supabase"],
      github: "https://github.com/sogki/50andbad-vod-archive",
      demo: "https://50andbad.site",
      featured: false,
      color: "from-green-500 to-emerald-500"
    },
    {
      title: "Marlow Marketing",
      titleJp: "マーケティング",
      description: "A responsive, clean and minimalist website for a marketing agency.",
      technologies: ["React", "TypeScript", "Framer Motion"],
      github: "https://github.com/sogki/marlow-marketing",
      demo: "https://marlowmarketing.org",
      featured: false,
      color: "from-yellow-500 to-orange-500"
    }
  ];

  const featuredProjects = projects.filter(p => p.featured);
  const otherProjects = projects.filter(p => !p.featured);
  const currentFeatured = featuredProjects[featuredIndex];

  // Auto-loop through featured projects
  useEffect(() => {
    if (isHovered) return; // Pause when hovered

    const interval = setInterval(() => {
      setFeaturedIndex((prev) => (prev + 1) % featuredProjects.length);
    }, 5000); // Change every 5 seconds

    return () => clearInterval(interval);
  }, [featuredProjects.length, isHovered]);

  return (
    <section className="relative py-12 sm:py-16 md:py-20 px-4 sm:px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 font-mono">
            <ShinyText text="Featured Projects" speed={3} />
          </h2>
          <p className="text-purple-300 text-base sm:text-lg mb-2">注目のプロジェクト</p>
          <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto px-4">
            Innovative projects that showcase my expertise in modern web development
          </p>
        </motion.div>

        {/* Featured Project Showcase */}
        <div className="mb-12 sm:mb-16 min-h-[450px] sm:min-h-[500px] md:min-h-[550px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={featuredIndex}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="relative h-full"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 border border-white/20 h-full min-h-[450px] sm:min-h-[500px] md:min-h-[550px]">
                {/* Animated background pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0" style={{
                    backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                    backgroundSize: '40px 40px'
                  }} />
                </div>

                {/* Glow effect */}
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

                    {/* Technologies */}
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

                  {/* Links */}
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

              {/* Featured Project Indicators */}
              <div className="flex justify-center gap-2 mt-6">
                {featuredProjects.map((_, index) => (
                  <motion.button
                    key={index}
                    onClick={() => {
                      setFeaturedIndex(index);
                      // Reset auto-loop timer when manually clicked
                    }}
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
          </AnimatePresence>
        </div>

        {/* Other Projects Marquee */}
        {otherProjects.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="mt-16"
          >
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-6 sm:mb-8 font-mono text-center">
              More Projects
            </h3>
            
            {/* Marquee Container */}
            <div className="relative overflow-hidden py-4">
              <div className="flex gap-4 sm:gap-6 animate-marquee">
                {/* Duplicate for seamless loop */}
                {[...otherProjects, ...otherProjects].map((project, index) => (
                  <div
                    key={`${project.title}-${index}`}
                    className="flex-shrink-0 w-[300px] sm:w-[350px] md:w-[400px]"
                  >
                    <ProjectCard
                      {...project}
                      delay={0}
                    />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
};
