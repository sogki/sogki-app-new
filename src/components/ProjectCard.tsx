import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Github } from 'lucide-react';

interface ProjectCardProps {
  title: string;
  titleJp: string;
  description: string;
  technologies: string[];
  github?: string;
  demo?: string;
  delay?: number;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  title,
  titleJp,
  description,
  technologies,
  github,
  demo,
  delay = 0
}) => {
  return (
    <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-white/10 h-full">
      <motion.div
        className="h-full"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay }}
        viewport={{ once: true }}
      >
        {/* Simple hover glow - no animation loop */}
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur-lg opacity-0 group-hover:opacity-30 transition-opacity duration-200" />
        
        <div className="relative p-6 h-full flex flex-col bg-black/40">
          {/* Content */}
          <div className="space-y-4 flex-1 flex flex-col">
            <div>
              <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors duration-150 mb-1 font-mono">
                {title}
              </h3>
              <p className="text-sm text-purple-300 font-light">{titleJp}</p>
            </div>
            
            <p className="text-gray-300 text-sm leading-relaxed flex-1">{description}</p>
            
            {/* Technologies */}
            <div className="flex flex-wrap gap-2">
              {technologies.slice(0, 4).map((tech) => (
                <span
                  key={tech}
                  className="px-2 py-1 text-xs bg-purple-500/20 text-purple-200 rounded-full border border-purple-400/30 hover:bg-purple-500/30 transition-colors duration-150 font-mono"
                >
                  {tech}
                </span>
              ))}
              {technologies.length > 4 && (
                <span className="px-2 py-1 text-xs bg-purple-500/10 text-purple-300 rounded-full border border-purple-400/20">
                  +{technologies.length - 4}
                </span>
              )}
            </div>
            
            {/* Links */}
            <div className="flex gap-3 pt-2 border-t border-white/10">
              {github && (
                <a
                  href={github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors duration-150 group/link"
                >
                  <Github size={16} className="group-hover/link:text-purple-400 transition-colors" />
                  <span>Code</span>
                </a>
              )}
              {demo && (
                <a
                  href={demo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors duration-150 group/link"
                >
                  <ExternalLink size={16} className="group-hover/link:text-blue-400 transition-colors" />
                  <span>Live Demo</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};