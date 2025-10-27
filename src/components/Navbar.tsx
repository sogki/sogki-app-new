import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  User, 
  Code, 
  Briefcase, 
  MessageCircle, 
  ChevronDown,
  ExternalLink,
  Github,
  Twitter,
  Menu,
  X,
  Share2
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container') && !target.closest('.mobile-menu')) {
        setActiveDropdown(null);
        setIsMobileMenuOpen(false);
        setIsProjectsOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const navItems = [
    { 
      icon: <Home size={18} />, 
      label: 'Home', 
      labelJp: 'ホーム', 
      href: '#home',
      description: 'Return to the cosmic beginning'
    },
    { 
      icon: <User size={18} />, 
      label: 'About', 
      labelJp: '私について', 
      href: '#about',
      description: 'Discover my journey through the stars'
    },
    { 
      icon: <Code size={18} />, 
      label: 'Tech Stack', 
      labelJp: '技術', 
      href: '#tech-stack',
      description: 'Explore my technological arsenal'
    },
    { 
      icon: <MessageCircle size={18} />, 
      label: 'Contact', 
      labelJp: '連絡', 
      href: '#contact',
      description: 'Establish communication across the void'
    }
  ];

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
      icon: <Github size={16} />, 
      label: 'GitHub', 
      url: 'https://github.com/sogki',
      description: 'Explore my code repositories and contributions',
      handle: '@sogki'
    },
    { 
      icon: <Twitter size={16} />, 
      label: 'Twitter', 
      url: 'https://x.com/sogkii',
      description: 'Thoughts on tech, space, and development',
      handle: '@sogkiii'
    }
  ];

  const handleNavClick = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setActiveDropdown(null);
    setIsMobileMenuOpen(false);
    setIsProjectsOpen(false);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-between px-4 pt-4 md:justify-center">
      {/* Logo for Mobile */}
      <motion.div 
        className={`flex items-center gap-2 text-white font-bold transition-all duration-300 md:hidden ${
          isScrolled ? 'text-sm' : 'text-base'
        }`}
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.95 }}
      >
        <span>Sogki.dev</span>
      </motion.div>

      {/* Mobile Navbar (Circular Hamburger) */}
      <motion.nav
        className={`md:hidden flex items-center justify-center transition-all duration-500 ease-out ${
          isScrolled 
            ? 'bg-black/90 border border-white/30 shadow-2xl shadow-purple-500/20' 
            : 'bg-white/5 border border-white/10'
        } backdrop-blur-xl rounded-full w-12 h-12`}
        initial={{ y: -100, opacity: 0, scale: 0.8 }}
        animate={{ 
          y: 0, 
          opacity: 1, 
          scale: isScrolled ? 0.95 : 1,
        }}
        transition={{ 
          duration: 0.8, 
          delay: 0.2,
          type: "spring",
          stiffness: 100,
          damping: 20
        }}
        whileHover={{ scale: isScrolled ? 0.98 : 1.02 }}
      >
        <motion.button
          className="text-gray-300 hover:text-white p-2 mobile-menu"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMobileMenuOpen}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </motion.button>
      </motion.nav>

      {/* Desktop Navbar */}
      <motion.nav
        className={`hidden md:flex transition-all duration-500 ease-out ${
          isScrolled 
            ? 'bg-black/90 border border-white/30 shadow-2xl shadow-purple-500/20' 
            : 'bg-white/5 border border-white/10'
        } backdrop-blur-xl rounded-full ${isScrolled ? 'px-4 py-2' : 'px-6 py-3'}`}
        initial={{ y: -100, opacity: 0, scale: 0.8 }}
        animate={{ 
          y: 0, 
          opacity: 1, 
          scale: isScrolled ? 0.95 : 1,
        }}
        transition={{ 
          duration: 0.8, 
          delay: 0.2,
          type: "spring",
          stiffness: 100,
          damping: 20
        }}
        whileHover={{ scale: isScrolled ? 0.98 : 1.02 }}
      >
        <div className="flex items-center gap-4">
          {/* Logo */}
          <motion.div 
            className={`flex items-center gap-2 text-white font-bold transition-all duration-300 ${
              isScrolled ? 'text-sm' : 'text-base'
            }`}
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            <span>Sogki.dev</span>
          </motion.div>

          {/* Desktop Navigation Items */}
          <div className="flex items-center gap-2">
            {navItems.map((item) => (
              <div key={item.label} className="relative group">
                <motion.button
                  onClick={() => handleNavClick(item.href)}
                  className={`flex items-center gap-2 text-gray-300 hover:text-white transition-all duration-300 rounded-full hover:bg-white/10 ${
                    isScrolled ? 'px-2 py-1' : 'px-3 py-2'
                  }`}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label={item.label}
                >
                  <span className={isScrolled ? 'text-sm' : 'text-base'}>{item.icon}</span>
                  <span className={`hidden md:inline ${isScrolled ? 'text-xs' : 'text-sm'}`}>
                    {item.label}
                  </span>
                </motion.button>
                
                {/* Tooltip */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <div className="bg-black/90 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 text-sm text-white whitespace-nowrap">
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs text-purple-300">{item.labelJp}</div>
                    <div className="text-xs text-gray-400 mt-1">{item.description}</div>
                  </div>
                </div>
              </div>
            ))}

            {/* Projects Dropdown */}
            <div className="relative dropdown-container">
              <motion.button
                onClick={() => setActiveDropdown(activeDropdown === 'projects' ? null : 'projects')}
                className={`flex items-center gap-1 text-gray-300 hover:text-white transition-all duration-300 rounded-full hover:bg-white/10 ${
                  isScrolled ? 'px-2 py-1' : 'px-3 py-2'
                }`}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Projects"
                aria-expanded={activeDropdown === 'projects'}
              >
                <Briefcase size={isScrolled ? 16 : 18} />
                <span className={`hidden md:inline ${isScrolled ? 'text-xs' : 'text-sm'}`}>
                  Projects
                </span>
                <motion.div
                  animate={{ rotate: activeDropdown === 'projects' ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronDown size={isScrolled ? 12 : 14} />
                </motion.div>
              </motion.button>

              <AnimatePresence>
                {activeDropdown === 'projects' && (
                  <motion.div
                    className="absolute top-full mt-2 right-0 sm:right-0 sm:left-auto left-0 bg-black/95 backdrop-blur-xl border border-white/30 rounded-xl p-3 w-72 max-w-[calc(100vw-2rem)] shadow-2xl shadow-purple-500/20 z-50"
                    initial={{ opacity: 0, y: -20, scale: 0.9, rotateX: -15 }}
                    animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
                    exit={{ opacity: 0, y: -20, scale: 0.9, rotateX: -15 }}
                    transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 30 }}
                  >
                    <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto overflow-x-hidden dropdown-scroll">
                      {projects.map((project) => (
                        <motion.a
                          key={project.name}
                          href={project.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-2 rounded-lg hover:bg-white/10 transition-all duration-300 group w-full"
                          whileHover={{ scale: 1.01, x: 1 }}
                        >
                          <div className="flex items-start justify-between w-full">
                            <div className="flex-1 min-w-0 pr-1 overflow-hidden">
                              <div className="text-white text-sm font-medium mb-1 group-hover:text-purple-300 transition-colors truncate">
                                {project.name}
                              </div>
                              <div className="text-gray-400 text-xs leading-tight mb-1 line-clamp-2 break-words">
                                {project.description}
                              </div>
                              <div className="text-purple-400 text-xs font-mono truncate">
                                {project.tech}
                              </div>
                            </div>
                            <ExternalLink size={10} className="text-gray-400 group-hover:text-purple-400 transition-colors ml-1 mt-0.5 flex-shrink-0" />
                          </div>
                        </motion.a>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Social Dropdown */}
            <div className="relative dropdown-container">
              <motion.button
                onClick={() => setActiveDropdown(activeDropdown === 'social' ? null : 'social')}
                className={`flex items-center gap-1 text-gray-300 hover:text-white transition-all duration-300 rounded-full hover:bg-white/10 ${
                  isScrolled ? 'px-2 py-1' : 'px-3 py-2'
                }`}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Social Links"
                aria-expanded={activeDropdown === 'social'}
              >
                <Share2 size={isScrolled ? 16 : 18} />
                <span className={`hidden md:inline ${isScrolled ? 'text-xs' : 'text-sm'}`}>
                  Social
                </span>
                <motion.div
                  animate={{ rotate: activeDropdown === 'social' ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronDown size={isScrolled ? 12 : 14} />
                </motion.div>
              </motion.button>

              <AnimatePresence>
                {activeDropdown === 'social' && (
                  <motion.div
                    className="absolute top-full mt-2 right-0 bg-black/95 backdrop-blur-xl border border-white/30 rounded-xl p-4 min-w-64 shadow-2xl shadow-purple-500/20"
                    initial={{ opacity: 0, y: -20, scale: 0.9, rotateX: -15 }}
                    animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
                    exit={{ opacity: 0, y: -20, scale: 0.9, rotateX: -15 }}
                    transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 30 }}
                  >
                    <div className="space-y-2">
                      {socialLinks.map((social) => (
                        <motion.a
                          key={social.label}
                          href={social.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-3 rounded-lg hover:bg-white/10 transition-all duration-300 group"
                          whileHover={{ scale: 1.02, x: 4 }}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-gray-400 group-hover:text-purple-400 transition-colors">
                              {social.icon}
                            </span>
                            <div className="flex-1">
                              <div className="text-white text-sm font-medium group-hover:text-purple-300 transition-colors">
                                {social.label}
                              </div>
                              <div className="text-purple-400 text-xs font-mono">
                                {social.handle}
                              </div>
                              <div className="text-gray-400 text-xs mt-1">
                                {social.description}
                              </div>
                            </div>
                          </div>
                        </motion.a>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Sidebar Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl md:hidden mobile-menu"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 30 }}
            role="dialog"
            aria-label="Mobile navigation menu"
          >
            <div className="flex flex-col h-full p-6">
              <div className="flex justify-between items-center mb-8">
                <span className="text-white text-lg font-bold">Sogki.dev</span>
                <motion.button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-gray-300 hover:text-white p-2"
                  aria-label="Close menu"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X size={24} />
                </motion.button>
              </div>

              <div className="flex flex-col gap-4">
                {/* Navigation Items */}
                {navItems.map((item) => (
                  <motion.button
                    key={item.label}
                    onClick={() => handleNavClick(item.href)}
                    className="flex items-center gap-3 text-gray-300 hover:text-white transition-all duration-300 p-3 rounded-lg hover:bg-white/10"
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label={item.label}
                  >
                    {item.icon}
                    <div className="text-left">
                      <div className="text-white text-sm font-medium">{item.label}</div>
                      <div className="text-xs text-purple-300">{item.labelJp}</div>
                      <div className="text-xs text-gray-400 mt-1">{item.description}</div>
                    </div>
                  </motion.button>
                ))}

                {/* Projects Collapsible Section */}
                <div className="mt-6">
                  <motion.button
                    onClick={() => setIsProjectsOpen(!isProjectsOpen)}
                    className="flex items-center gap-3 text-white p-3 rounded-lg hover:bg-white/10 transition-all duration-300 w-full text-left"
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label={isProjectsOpen ? "Collapse Projects" : "Expand Projects"}
                    aria-expanded={isProjectsOpen}
                  >
                    <Briefcase size={18} />
                    <span className="text-sm font-medium">Projects</span>
                    <motion.div
                      animate={{ rotate: isProjectsOpen ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="ml-auto"
                    >
                      <ChevronDown size={14} />
                    </motion.div>
                  </motion.button>

                  <AnimatePresence>
                    {isProjectsOpen && (
                      <motion.div
                        className="space-y-2 mt-2"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        {projects.map((project) => (
                          <div key={project.name} className="pl-6">
                            <motion.a
                              href={project.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block p-3 rounded-lg hover:bg-white/10 transition-all duration-300 group"
                              whileHover={{ scale: 1.02, x: 4 }}
                              aria-label={`Open ${project.name} in new tab`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="text-white text-sm font-medium mb-1 group-hover:text-purple-300 transition-colors">
                                    {project.name}
                                  </div>
                                  <div className="text-gray-400 text-xs leading-tight mb-1 line-clamp-2">
                                    {project.description}
                                  </div>
                                  <div className="text-purple-400 text-xs font-mono">
                                    {project.tech}
                                  </div>
                                </div>
                                <ExternalLink size={12} className="text-gray-400 group-hover:text-purple-400 transition-colors ml-2 mt-0.5 flex-shrink-0" />
                              </div>
                            </motion.a>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Social Links Section */}
                <div className="mt-6">
                  <div className="text-white text-sm font-medium mb-2">Social</div>
                  <div className="space-y-2">
                    {socialLinks.map((social) => (
                      <motion.a
                        key={social.label}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 rounded-lg hover:bg-white/10 transition-all duration-300 group"
                        whileHover={{ scale: 1.02, x: 4 }}
                        aria-label={`Visit ${social.label}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-gray-400 group-hover:text-purple-400 transition-colors">
                            {social.icon}
                          </span>
                          <div className="flex-1">
                            <div className="text-white text-sm font-medium group-hover:text-purple-300 transition-colors">
                              {social.label}
                            </div>
                            <div className="text-purple-400 text-xs font-mono">
                              {social.handle}
                            </div>
                            <div className="text-gray-400 text-xs mt-1">
                              {social.description}
                            </div>
                          </div>
                        </div>
                      </motion.a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};