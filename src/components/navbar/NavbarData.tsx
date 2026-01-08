import React from 'react';
import { Home, User, Code, MessageCircle, Github, Twitter } from 'lucide-react';

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
    icon: <MessageCircle size={18} />, 
    label: 'Contact', 
    labelJp: '連絡', 
    href: '#contact',
    description: 'Establish communication across the void'
  }
];

export const projects = [
  { 
    name: 'BLXR', 
    url: 'https://blxr.dev', 
    description: 'Next-generation developer platform for building modular backends. Features innovative DSL system, zero-config type generation, and unified design system.',
    tech: 'Next.js • TypeScript • PostgreSQL • React • Advanced DSL'
  },
  { 
    name: 'Binderly TCG', 
    url: 'https://binderlytcg.com', 
    description: 'The ultimate Pokemon card collection platform. Organize, track, and discover rare cards with real-time pricing and market insights.',
    tech: 'React • TypeScript • PostgreSQL • Next.js • Real-time Data'
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
  }
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
