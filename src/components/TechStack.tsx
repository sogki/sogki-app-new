import React from 'react';
import { motion } from 'framer-motion';
import ShinyText from './ShinyText';
import { 
  Code2, 
  Database, 
  Cloud,
  Coffee,
  Music,
  Gamepad2,
  Book,
  Plane
} from 'lucide-react';

export const TechStack: React.FC = () => {
  const techCategories = [
    {
      icon: <Code2 size={24} />,
      title: "Frontend",
      titleJp: "フロントエンド",
      technologies: ["React", "TypeScript", "Next.js", "Tailwind CSS", "Framer Motion"],
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: <Database size={24} />,
      title: "Backend",
      titleJp: "バックエンド",
      technologies: ["Node.js", "MySQL", "PostgreSQL", "REST APIs"],
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: <Cloud size={24} />,
      title: "Tools & Platforms",
      titleJp: "ツールとプラットフォーム",
      technologies: ["Supabase", "Vercel", "GitHub", "PostgreSQL"],
      color: "from-purple-500 to-indigo-500"
    }
  ];

  const personalInterests = [
    { icon: <Coffee size={16} />, label: "Caffeine Enthusiast", labelJp: "カフェイン愛好家" },
    { icon: <Music size={16} />, label: "Music Headbopper", labelJp: "音楽 頭を振る" },
    { icon: <Gamepad2 size={16} />, label: "Gaming", labelJp: "ゲーム" },
    { icon: <Book size={16} />, label: "Designer", labelJp: "デザイン" },
    { icon: <Plane size={16} />, label: "Digital Nomad", labelJp: "デジタルノマド" }
  ];

  return (
    <section className="relative py-20 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-4 font-mono">
            <ShinyText text="Tech stack & Languages" speed={3} />
          </h2>
          <p className="text-purple-300 text-lg mb-6">技術スタックと言語</p>
          
          {/* Personal Interest Tags */}
          <div className="flex flex-wrap gap-3 justify-center">
            {personalInterests.map((interest, index) => (
              <motion.div
                key={interest.label}
                className="flex items-center gap-2 px-3 py-1.5 bg-black/40 border border-white/10 rounded-full text-xs text-gray-300 hover:border-purple-400/50 transition-all duration-150"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05, y: -2 }}
              >
                <span className="text-purple-400">{interest.icon}</span>
                <span className="hidden sm:inline">{interest.label}</span>
                <span className="text-xs text-purple-300 hidden md:inline ml-1">• {interest.labelJp}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
        
        {/* Tech Stack Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {techCategories.map((category, index) => (
            <motion.div
              key={category.title}
              className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-white/10 h-full"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -4 }}
            >
              {/* Hover glow */}
              <div className={`absolute -inset-1 bg-gradient-to-r ${category.color} rounded-xl blur-lg opacity-0 group-hover:opacity-30 transition-opacity duration-200`} />
              
              <div className="relative p-6 h-full flex flex-col bg-black/40">
                {/* Icon & Title */}
                <div className="mb-6">
                  <div className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${category.color} mb-4`}>
                    <div className="text-white">
                      {category.icon}
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-1 font-mono group-hover:text-purple-300 transition-colors">
                    {category.title}
                  </h3>
                  <p className="text-sm text-purple-300">{category.titleJp}</p>
                </div>
                
                {/* Technologies */}
                <div className="flex flex-wrap gap-2">
                  {category.technologies.map((tech) => (
                    <span
                      key={tech}
                      className="px-3 py-1.5 text-xs bg-white/10 text-gray-200 rounded-full border border-white/20 hover:border-purple-400/50 hover:bg-white/15 transition-all duration-150 font-mono"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
