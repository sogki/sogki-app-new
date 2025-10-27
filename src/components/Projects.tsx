import React from 'react';
import { motion } from 'framer-motion';
import { ProjectCard } from './ProjectCard';
import ShinyText  from './ShinyText';

export const Projects: React.FC = () => {
  const projects = [
    {
      title: "Profiles After Dark",
      titleJp: "暗闇後のプロフィール",
      description: "An aesthetic profile database for Profile pictures, banners, emoji combos.",
      technologies: ["Next.js", "React", "PostgreSQL", "TypeScript", "JavaScript"],
      github: "https://github.com/sogki/profiles-after-dark",
      demo: "https://profilesafterdark.com"
    },
    {
      title: "50andBad's VOD Archive",
      titleJp: "50andBadのビデオオンデマンドアーカイブ",
      description: "A VOD Archive for 50andBad, with advanced admin features.",
      technologies: ["Next.js", "React", "PostgreSQL", "TypeScript", "Supabase"],
      github: "https://github.com/sogki/50andbad-vod-archive",
      demo: "https://50andbad.site"
    },
    {
      title: "Marlow Marketing",
      titleJp: "マーケティング",
      description: "A responsive, clean and minimalist website for a marketing agency.",
      technologies: ["React", "TypeScript", "Framer Motion"],
      github: "https://github.com/sogki/marlow-marketing",
      demo: "https://marlowmarketing.org"
    },
    {
      title: "RankTheGlobe",
      titleJp: "地球儀をランク付けする",
      description: "An online platform featuring interactive crowd-source consumer rankings and ratings in parallel with healthier forms of social networking.",
      technologies: ["React", "React Native", "TailwindCSS", "Nativewind", "TypeScript", "PostgreSQL", "NextJS", "Shadcn"],
      github: "https://github.com/world-ranking-inc",
      demo: "https://ranktheglobe.com"
    },
    {
      title: "NekoLinks",
      titleJp: "ネコリンクス",
      description: "A cute, easy japanese aesthetic link and anime tracker.",
      technologies: ["React", "Framer Motion", "TailwindCSS", "Vercel"],
      github: "https://github.com/sogki/nekolinks",
      demo: "https://neko-links.sogki.dev"
    },
    {
      title: "NekoSnippets",
      titleJp: "ネコスニペット",
      description: "Japanese-inspired minimalist code snippet storage tool.",
      technologies: ["React", "Framer Motion", "PrismJS", "Vercel"],
      github: "https://github.com/sogki/neko-snippets",
      demo: "https://neko-snippets.sogki.dev"
    }
  ];

  return (
    <div className="relative py-20 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-4">
            <ShinyText text="Featured Projects" speed={3} />
          </h2>
          <p className="text-purple-300 text-lg">注目のプロジェクト</p>
          <p className="text-gray-400 mt-4 max-w-2xl mx-auto">
            Explore my cosmic journey through innovative projects that push the boundaries of web development
          </p>
        </motion.div>
        
        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project, index) => (
            <ProjectCard
              key={project.title}
              {...project}
              delay={index * 0.2}
            />
          ))}
        </div>
      </div>
    </div>
  );
};