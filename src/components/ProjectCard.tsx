import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Github } from 'lucide-react';
import { GlareCard } from './GlareCard';

interface ProjectCardProps {
  title: string;
  titleJp: string;
  description: string;
  technologies: string[];
  image: string;
  github?: string;
  demo?: string;
  delay?: number;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  title,
  titleJp,
  description,
  technologies,
  image,
  github,
  demo,
  delay = 0
}) => {
  return (
    <GlareCard className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-900/20 to-blue-900/20 backdrop-blur-sm border border-white/10 h-full">
      <motion.div
        className="h-full"
      initial={{ opacity: 0, rotateY: -15, x: -50 }}
      whileInView={{ opacity: 1, rotateY: 0, x: 0 }}
      transition={{ duration: 0.8, delay }}
      >
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur opacity-0 group-hover:opacity-75 transition duration-1000" />
        
        <div className="relative p-6 h-full flex flex-col">
          {/* Image */}
          <div className="relative h-48 mb-4 rounded-lg overflow-hidden">
            <img 
              src={image} 
              alt={title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          </div>
          
          {/* Content */}
          <div className="space-y-3 flex-1 flex flex-col">
            <div>
              <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">
                {title}
              </h3>
              <p className="text-sm text-purple-300 font-light">{titleJp}</p>
            </div>
            
            <p className="text-gray-300 text-sm leading-relaxed flex-1">{description}</p>
            
            {/* Technologies */}
            <div className="flex flex-wrap gap-2">
              {technologies.map((tech) => (
                <span
                  key={tech}
                  className="px-2 py-1 text-xs bg-purple-500/20 text-purple-200 rounded-full border border-purple-400/30"
                >
                  {tech}
                </span>
              ))}
            </div>
            
            {/* Links */}
            <div className="flex gap-3 pt-2">
              {github && (
                <a
                  href={github}
                  className="flex items-center gap-1 text-sm text-gray-300 hover:text-white transition-colors"
                >
                  <Github size={16} />
                  Code
                </a>
              )}
              {demo && (
                <a
                  href={demo}
                  className="flex items-center gap-1 text-sm text-gray-300 hover:text-white transition-colors"
                >
                  <ExternalLink size={16} />
                  Demo
                </a>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </GlareCard>
  );
};