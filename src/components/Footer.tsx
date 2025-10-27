import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Github, Twitter, Heart, Coffee } from 'lucide-react';

export const Footer: React.FC = () => {
  const projects = [
    {
      name: 'Profiles After Dark',
      url: 'https://profilesafterdark.com',
      description: 'An aesthetic profile database for Profile pictures, banners, emoji combos.',
      tech: 'Next.js • React • PostgreSQL • TypeScript'
    },
    {
      name: "50andBad's VOD Archive",
      url: 'https://50andbad.site',
      description: 'A VOD Archive for 50andBad, with advanced admin features.',
      tech: 'Next.js • React • PostgreSQL • TypeScript • Supabase'
    },
    {
      name: 'Marlow Marketing',
      url: 'https://marlowmarketing.org',
      description: 'A responsive, clean and minimalist website for a marketing agency.',
      tech: 'React • TypeScript • Framer Motion'
    },
    {
      name: 'RankTheGlobe',
      url: 'https://ranktheglobe.com',
      description: 'Interactive crowd-source consumer rankings and ratings platform.',
      tech: 'React • React Native • NextJS • PostgreSQL'
    },
    {
      name: 'NekoLinks',
      url: 'https://neko-links.sogki.dev',
      description: 'A cute, easy japanese aesthetic link and anime tracker.',
      tech: 'React • Framer Motion • TailwindCSS • Vercel'
    },
    {
      name: 'NekoSnippets',
      url: 'https://neko-snippets.sogki.dev',
      description: 'Japanese-inspired minimalist code snippet storage tool.',
      tech: 'React • Framer Motion • PrismJS • Vercel'
    }
  ];

  const socialLinks = [
    {
      name: 'GitHub',
      url: 'https://github.com/sogki',
      icon: <Github size={18} />,
      handle: '@sogki'
    },
    {
      name: 'Twitter',
      url: 'https://x.com/sogkii',
      icon: <Twitter size={18} />,
      handle: '@sogkii'
    }
  ];

  const quickLinks = [
    { name: 'About', href: '#about' },
    { name: 'Projects', href: '#projects' },
    { name: 'Tech Stack', href: '#tech-stack' },
    { name: 'Contact', href: '#contact' }
  ];

  return (
    <footer className="relative z-20 border-t border-white/10 bg-gradient-to-b from-transparent via-black/20 to-black/40 backdrop-blur-sm">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          {/* Creator Section */}
          <motion.div
            className="lg:col-span-1"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              Sogki
              <span className="text-purple-400 text-lg">✦</span>
              <span className="text-sm font-normal text-gray-400">創作者</span>
            </h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              Creating digital experiences with passion, precision, and a touch of Japanese aesthetics.
            </p>
            
            {/* Social Links */}
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-300 group"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="text-gray-400 group-hover:text-purple-400 transition-colors">
                    {social.icon}
                  </span>
                  <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                    {social.handle}
                  </span>
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <h3 className="text-white font-semibold text-lg mb-6">Quick Links</h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-gray-400 hover:text-purple-400 transition-colors duration-300 flex items-center group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform duration-300">
                      {link.name}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Featured Projects */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h3 className="text-white font-semibold text-lg mb-6">Featured Projects</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.slice(0, 4).map((project, index) => (
                <motion.a
                  key={project.name}
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-300 border border-white/10 hover:border-purple-400/30"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-white font-medium group-hover:text-purple-300 transition-colors">
                      {project.name}
                    </h4>
                    <ExternalLink size={14} className="text-gray-400 group-hover:text-purple-400 transition-colors flex-shrink-0" />
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed mb-2 line-clamp-2">
                    {project.description}
                  </p>
                  <p className="text-purple-400 text-xs font-mono">
                    {project.tech}
                  </p>
                </motion.a>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Philosophy Section */}
      <motion.div
        className="border-t border-white/10 py-8"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        viewport={{ once: true }}
      >
        <div className="max-w-4xl mx-auto text-center px-6">
          <div className="mb-6">
            <p className="text-white font-semibold text-lg mb-2">美しさは簡潔にあり</p>
            <p className="text-gray-400">Beauty lies in simplicity.</p>
          </div>
          
          {/* Bottom Note */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <span>Made with</span>
            <Heart size={16} className="text-red-400" />
            <span>and lots of</span>
            <Coffee size={16} className="text-amber-400" />
            <span>• Sogki.dev - &copy; 2025 Sogki. All rights reserved.</span>
          </div>
        </div>
      </motion.div>
    </footer>
  );
};

export default Footer;
