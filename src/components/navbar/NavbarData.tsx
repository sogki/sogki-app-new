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
    label: 'Journey', 
    labelJp: '旅路', 
    href: '/about',
    description: 'Timeline and tech stack'
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
