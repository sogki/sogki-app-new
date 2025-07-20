import React from 'react';
import { motion } from 'framer-motion';
import ShinyText  from './ShinyText';
import { TiltedCard } from './TiltedCard';
import { 
  Code2, 
  Database, 
  Globe, 
  Smartphone, 
  Cloud, 
  Palette,
  Coffee,
  Music,
  Camera,
  Gamepad2,
  Book,
  Plane
} from 'lucide-react';

export const TechStack: React.FC = () => {
  const techCategories = [
    {
      icon: <Code2 size={28} />,
      title: "Frontend",
      titleJp: "フロントエンド",
      technologies: ["React", "TypeScript", "Next.js", "Tailwind CSS", "Framer Motion"],
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: <Database size={28} />,
      title: "Backend",
      titleJp: "バックエンド",
      technologies: ["Node.js", "MySQL", "PostgreSQL", "REST APIs"],
      color: "from-green-500 to-emerald-500"
    },
    // {
    //   icon: <Smartphone size={28} />,
    //   title: "Mobile",
    //   titleJp: "モバイル",
    //   technologies: ["React Native", "Flutter", "Swift", "Kotlin", "Expo"],
    //   color: "from-purple-500 to-pink-500"
    // },
    {
      icon: <Cloud size={28} />,
      title: "DevOps & Cloud",
      titleJp: "DevOpsとクラウド",
      technologies: ["AWS", "Docker", "Supabase", "Vercel", "GitHub"],
      color: "from-orange-500 to-red-500"
    },
    // {
    //   icon: <Palette size={28} />,
    //   title: "Design & Tools",
    //   titleJp: "デザインとツール",
    //   technologies: ["Figma", "Adobe Photoshop", "Blender", "Three.js", "WebGL"],
    //   color: "from-pink-500 to-rose-500"
    // }
  ];

  const personalInterests = [
    { icon: <Coffee size={16} />, label: "Caffeine Enthusiast", labelJp: "カフェイン愛好家" },
    { icon: <Music size={16} />, label: "Music Headbopper", labelJp: "音楽 頭を振る" },
    { icon: <Gamepad2 size={16} />, label: "Gaming", labelJp: "ゲーム" },
    { icon: <Book size={16} />, label: "Designer", labelJp: "デザイン" },
    { icon: <Plane size={16} />, label: "Digital Nomad", labelJp: "デジタルノマド" }
  ];

  return (
    <section id="tech-stack" className="relative py-20 px-6">
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
            <ShinyText text="Tech stack & Languages" speed={3} />
          </h2>
          <p className="text-purple-300 text-lg mb-6">技術スタックと言語</p>
          
          {/* Personal Interest Tags */}
          <div className="flex flex-wrap gap-3 justify-center mb-8">
            {personalInterests.map((interest, index) => (
              <motion.div
                key={interest.label}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-sm border border-white/10 rounded-full text-sm text-gray-300 hover:border-purple-400/50 transition-all duration-300 hover:scale-105"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -2 }}
              >
                <span className="text-purple-400">{interest.icon}</span>
                <span className="hidden sm:inline">{interest.label}</span>
                <span className="text-xs text-purple-300 hidden md:inline">• {interest.labelJp}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
        
        {/* Tech Stack Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {techCategories.map((category, index) => (
            <TiltedCard key={category.title} delay={index * 0.15}>
              <div className="text-center h-full flex flex-col">
                <div className={`inline-flex p-3 rounded-full bg-gradient-to-r ${category.color} mb-4 mx-auto`}>
                  <div className="text-white">
                    {category.icon}
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2">
                  {category.title}
                </h3>
                <p className="text-purple-300 text-sm mb-4">{category.titleJp}</p>
                
                <div className="flex flex-wrap gap-2 justify-center flex-1">
                  {category.technologies.map((tech, techIndex) => (
                    <motion.span
                      key={tech}
                      className="px-3 py-1 text-sm bg-white/10 text-gray-200 rounded-full border border-white/20 hover:border-purple-400/50 transition-all duration-300"
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: (index * 0.15) + (techIndex * 0.05) }}
                      viewport={{ once: true }}
                      whileHover={{ scale: 1.05, y: -2 }}
                    >
                      {tech}
                    </motion.span>
                  ))}
                </div>
              </div>
            </TiltedCard>
          ))}
        </div>
      </div>
    </section>
  );
};