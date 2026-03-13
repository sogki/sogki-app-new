import React from 'react';
import { motion } from 'framer-motion';
import { Github, Twitter, ArrowUpRight } from 'lucide-react';
import { useSiteData } from '../context/SiteDataContext';
import { getMotionAwareScrollBehavior } from '../utils/motion';

const ICON_MAP: Record<string, React.ReactNode> = {
  github: <Github size={20} />,
  twitter: <Twitter size={20} />,
  x: <Twitter size={20} />,
};

export const Footer: React.FC = () => {
  const { socialLinks, footerConfig, isLoading } = useSiteData();

  const featuredProjects = footerConfig?.featured_projects ?? [];
  const quickLinks = footerConfig?.quick_links ?? [];
  const tagline = footerConfig?.tagline ?? 'Full-stack product engineering with a design-first edge';
  const philosophy = footerConfig?.philosophy ?? { jp: '美しさは簡潔にあり', en: 'Beauty lies in simplicity' };

  const socialWithIcons = socialLinks.map((s) => ({
    name: s.platform.charAt(0).toUpperCase() + s.platform.slice(1),
    url: s.url,
    icon: ICON_MAP[s.platform.toLowerCase()] ?? <Github size={20} />,
  }));

  const scrollToTop = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const behavior = getMotionAwareScrollBehavior();
    window.scrollTo({ top: 0, behavior });
    document.documentElement.scrollTo({ top: 0, behavior });
    document.body.scrollTo({ top: 0, behavior });
  };

  if (isLoading) {
    return (
      <footer className="relative z-20 border-t border-white/10 bg-gradient-to-b from-transparent via-black/20 to-black/40">
        <div className="max-w-6xl mx-auto px-6 py-12 text-center">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </footer>
    );
  }

  return (
    <footer className="relative z-20 border-t border-white/10 bg-gradient-to-b from-transparent via-black/20 to-black/40">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-white/10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              viewport={{ once: true }}
            >
              <h2 className="text-2xl font-bold text-white mb-2 font-mono flex items-center gap-2">
                Sogki
                <span className="text-purple-400">✦</span>
              </h2>
              <p className="text-gray-400 text-sm">{tagline}</p>
            </motion.div>
            <motion.div
              className="flex gap-3"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              viewport={{ once: true }}
            >
              {socialWithIcons.map((social) => (
                <motion.a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-400/50 transition-all duration-150 group"
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label={social.name}
                >
                  <span className="text-gray-400 group-hover:text-purple-400 transition-colors">
                    {social.icon}
                  </span>
                </motion.a>
              ))}
            </motion.div>
          </div>

          {featuredProjects.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <h3 className="text-sm font-semibold text-gray-400 mb-4 font-mono uppercase tracking-wider">
                Featured Projects
              </h3>
              <div className="flex flex-wrap gap-3">
                {featuredProjects.map((project, index) => (
                  <motion.a
                    key={project.name}
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-400/50 transition-all duration-150"
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 + index * 0.1 }}
                    viewport={{ once: true }}
                    whileHover={{ scale: 1.05, x: 4 }}
                  >
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors font-mono">
                      {project.name}
                    </span>
                    <ArrowUpRight size={14} className="text-gray-500 group-hover:text-purple-400 transition-colors opacity-0 group-hover:opacity-100" />
                  </motion.a>
                ))}
              </div>
            </motion.div>
          )}

          {quickLinks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <div className="flex flex-wrap gap-6">
                {quickLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-purple-400 transition-colors duration-150 font-mono group"
                  >
                    <span className="group-hover:underline">{link.name}</span>
                  </a>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        <motion.div
          className="mt-8 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <div className="text-center md:text-left">
            <p className="text-sm text-gray-500 font-mono mb-1">{philosophy.jp ?? '美しさは簡潔にあり'}</p>
            <p className="text-xs text-gray-600">{philosophy.en ?? 'Beauty lies in simplicity'}</p>
          </div>
          <div className="flex items-center gap-6">
            <p className="text-xs text-gray-500 font-mono">© 2026 Sogki</p>
            <motion.button
              onClick={scrollToTop}
              type="button"
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-purple-400 transition-colors font-mono group cursor-pointer"
              whileHover={{ y: -2 }}
              aria-label="Scroll to top"
            >
              <ArrowUpRight size={14} className="group-hover:rotate-45 transition-transform" />
              <span>Back to top</span>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;
