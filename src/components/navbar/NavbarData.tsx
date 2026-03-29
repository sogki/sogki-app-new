import React from 'react';
import { Home, User, Code, MessageCircle, Palette, Github, Twitter, FileText, Layers } from 'lucide-react';

export const navItems = [
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
    icon: <Palette size={18} />,
    label: 'Graphic Design',
    labelJp: 'デザイン',
    href: '/graphic-design',
    description: 'Browse client design collections and assets'
  },
  {
    icon: <FileText size={18} />,
    label: 'Blog',
    labelJp: 'ブログ',
    href: '/blog',
    description: 'Read posts on engineering and design'
  },
  {
    icon: <Layers size={18} />,
    label: 'Collection',
    labelJp: 'コレクション',
    href: '/collection',
    description: 'Pokemon TCG binders, master sets, and favorite cards'
  },
  { 
    icon: <MessageCircle size={18} />, 
    label: 'Contact', 
    labelJp: '連絡', 
    href: '#contact',
    description: 'Establish communication across the void'
  }
];

export const projects = [
  { 
    name: 'TikTok Live API', 
    url: 'https://api.50andbad.site', 
    description: 'Developer API to check if any TikTok user is live. Get live status, viewer counts, and embed badges. REST API with per-developer keys, free tier, and Discord login.',
    tech: 'REST API • TypeScript • Discord OAuth • Rate limiting'
  },
  { 
    name: "ArcRaiders Companion", 
    url: 'https://arcraiders.50andbad.site', 
    description: 'A companion app for the game Arc Raiders, featuring advanced tracking and analytics.',
    tech: 'Next.js • React • Rust • PostgreSQL • TypeScript • Supabase'
  },
  { 
    name: "50andBad's VOD Archive", 
    url: 'https://50andbad.site', 
    description: 'A VOD Archive for 50andBad, with advanced admin features.',
    tech: 'Next.js • React • PostgreSQL • TypeScript • Supabase'
  },
  { 
    name: 'Profiles After Dark', 
    url: 'https://profilesafterdark.com', 
    description: 'An aesthetic profile database serving 200+ users. Built with Next.js, PostgreSQL, and modern design principles.',
    tech: 'Next.js • React • PostgreSQL • TypeScript • JavaScript'
  },
  { 
    name: 'RankTheGlobe', 
    url: 'https://ranktheglobe.com', 
    description: 'Interactive crowd-source consumer rankings and ratings platform. Built with React, React Native, Next.js, and PostgreSQL.',
    tech: 'React • React Native • TailwindCSS • Nativewind • TypeScript • PostgreSQL • NextJS • Shadcn'
  },
  { 
    name: 'Marlow Marketing', 
    url: 'https://marlowmarketing.org', 
    description: 'A responsive, clean and minimalist website for a marketing agency.',
    tech: 'React • TypeScript • Framer Motion'
  },
  { 
    name: 'Binderly TCG', 
    url: 'https://binderlytcg.com', 
    description: 'The ultimate Pokemon card collection platform. Organize, track, and discover rare cards with real-time pricing and market insights.',
    tech: 'React • TypeScript • PostgreSQL • Next.js • Real-time Data'
  },
];

export const socialLinks = [
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
    handle: '@sogkii'
  }
];
