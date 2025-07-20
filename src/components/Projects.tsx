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
      image: "https://mswrkamyldrizwmpzfgp.supabase.co/storage/v1/object/sign/previews/profilesafterdark-preview.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV81MTk5YjNjYS03Y2EwLTRlZmItOGMxNC0xYmZjZDVhMmVmN2QiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwcmV2aWV3cy9wcm9maWxlc2FmdGVyZGFyay1wcmV2aWV3LnBuZyIsImlhdCI6MTc1Mjk2ODk2NywiZXhwIjo0OTA2NTY4OTY3fQ.lQUSI-zoue2Rs6u7QlpmkixrsaY7Dm87ypQMWaiKUsE",
      github: "https://github.com/sogki/profiles-after-dark",
      demo: "https://profilesafterdark.com"
    },
    {
      title: "Marlow Marketing",
      titleJp: "マーケティング",
      description: "A responsive, clean and minimalist website for a marketing agency.",
      technologies: ["React", "TypeScript", "Framer Motion", "Reactbits.dev"],
      image: "https://mswrkamyldrizwmpzfgp.supabase.co/storage/v1/object/sign/previews/marlowmarketing-preview.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV81MTk5YjNjYS03Y2EwLTRlZmItOGMxNC0xYmZjZDVhMmVmN2QiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwcmV2aWV3cy9tYXJsb3dtYXJrZXRpbmctcHJldmlldy5wbmciLCJpYXQiOjE3NTI5NjkwODMsImV4cCI6NDkwNjU2OTA4M30.jna5sTQTBWUzNkNvhJyjzM1A51Non0S3CcNLXQX4nFw",
      github: "https://github.com/sogki/nekolinks",
      demo: "https://neko-links.sogki.dev"
    },
    {
      title: "RankTheGlobe",
      titleJp: "地球儀をランク付けする",
      description: "An online platform featuring interactive crowd-source consumer rankings and ratings in parallel with healthier forms of social networking.",
      technologies: ["React", "TypeScript", "PostgreSQL", "NextJS", "Shadcn"],
      image: "https://mswrkamyldrizwmpzfgp.supabase.co/storage/v1/object/sign/previews/ranktheglobe-preview.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV81MTk5YjNjYS03Y2EwLTRlZmItOGMxNC0xYmZjZDVhMmVmN2QiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwcmV2aWV3cy9yYW5rdGhlZ2xvYmUtcHJldmlldy5wbmciLCJpYXQiOjE3NTI5Njk0NDAsImV4cCI6NDkwNjU2OTQ0MH0.OwysSJ8CPaU6wueY7_pVK-NTNnpHoUfHboMpSeC_WpM",
      github: "https://github.com/world-ranking-inc",
      demo: "https://ranktheglobe"
    }
  ];

  return (
    <section id="projects" className="relative py-20 px-6">
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
    </section>
  );
};