import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Github, Twitter, ArrowUpRight } from 'lucide-react';
import { useSiteData } from '../context/SiteDataContext';
import { projectHref } from '../lib/siteData';
import { getMotionAwareScrollBehavior } from '../utils/motion';

const ICON_MAP: Record<string, React.ReactNode> = {
  github: <Github size={18} />,
  twitter: <Twitter size={18} />,
  x: <Twitter size={18} />,
};

export const Footer: React.FC = () => {
  const { socialLinks, footerConfig, projects, isLoading } = useSiteData();

  const featuredProjects = projects
    .filter((p) => p.tier === 'main' || p.tier === 'featured')
    .slice(0, 6);

  const quickLinks = footerConfig?.quick_links ?? [];
  const tagline = footerConfig?.tagline ?? 'Engineer, designer, builder.';
  const year = new Date().getFullYear();

  const scrollToTop = () => {
    const behavior = getMotionAwareScrollBehavior();
    window.scrollTo({ top: 0, behavior });
  };

  if (isLoading) {
    return (
      <footer className="relative z-20 mt-16">
        <div className="mx-auto max-w-6xl px-6 py-12 text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
        </div>
      </footer>
    );
  }

  return (
    <footer className="relative z-20 mt-20">
      <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-purple-500/[0.06] to-transparent" />

      <div className="relative mx-auto max-w-6xl px-6 pb-10 pt-14">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <h2 className="font-mono text-2xl font-bold text-white">Sogki</h2>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-gray-400">{tagline}</p>
            <div className="mt-5 flex gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.platform}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-white/10 bg-white/[0.04] p-2.5 text-gray-400 transition hover:border-purple-400/40 hover:text-purple-300"
                  aria-label={social.platform}
                >
                  {ICON_MAP[social.platform.toLowerCase()] ?? <Github size={18} />}
                </a>
              ))}
            </div>
          </div>

          <div className="md:col-span-4">
            <p className="mb-3 font-mono text-xs uppercase tracking-wider text-gray-500">Work</p>
            <ul className="space-y-2">
              {featuredProjects.map((p) => {
                const href = projectHref(p);
                const label = (
                  <span className="text-sm text-gray-300 transition hover:text-white">{p.title}</span>
                );
                return (
                  <li key={p.id}>
                    {href ? (
                      <Link to={href} className="group inline-flex items-center gap-1">
                        {label}
                        <ArrowUpRight
                          size={12}
                          className="text-gray-600 opacity-0 transition group-hover:text-purple-400 group-hover:opacity-100"
                        />
                      </Link>
                    ) : (
                      label
                    )}
                  </li>
                );
              })}
              <li>
                <Link to="/projects" className="text-sm text-purple-400 hover:text-purple-300">
                  All projects →
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <p className="mb-3 font-mono text-xs uppercase tracking-wider text-gray-500">Explore</p>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-sm text-gray-300 transition hover:text-white"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
              <li>
                <Link to="/about" className="text-sm text-gray-300 transition hover:text-white">
                  Journey & stack
                </Link>
              </li>
              <li>
                <Link to="/graphic-design" className="text-sm text-gray-300 transition hover:text-white">
                  Graphic design
                </Link>
              </li>
              <li>
                <a href="/#contact" className="text-sm text-gray-300 transition hover:text-white">
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="font-mono text-xs text-gray-600">© {year} Sogki</p>
          <motion.button
            type="button"
            onClick={scrollToTop}
            className="inline-flex items-center gap-1 font-mono text-xs text-gray-500 transition hover:text-purple-400"
            whileHover={{ y: -2 }}
          >
            <ArrowUpRight size={14} />
            Back to top
          </motion.button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
