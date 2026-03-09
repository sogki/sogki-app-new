import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Palette, FileText, FolderGit2, Share2, PanelLeft, ChevronRight, Home, MessageCircle, Settings } from 'lucide-react';

export default function AdminDashboard() {
  const sections = [
    { to: '/admin/home', icon: Home, label: 'Home', labelJp: 'ホーム', desc: 'Hero, About, and Features content' },
    { to: '/admin/projects', icon: FolderGit2, label: 'Projects', labelJp: 'プロジェクト', desc: 'Add and update featured projects' },
    { to: '/admin/contact', icon: MessageCircle, label: 'Contact', labelJp: 'お問い合わせ', desc: 'Contact section text and links' },
    { to: '/admin/settings', icon: Settings, label: 'Settings', labelJp: '設定', desc: 'Feature flags and visibility toggles' },
    { to: '/admin/graphics', icon: Palette, label: 'Graphics Portfolio', labelJp: 'グラフィックデザイン', desc: 'Upload and manage graphic design assets' },
    { to: '/admin/blogs', icon: FileText, label: 'Blogs', labelJp: 'ブログ', desc: 'Create and edit blog posts with markdown' },
    { to: '/admin/social', icon: Share2, label: 'Social Links', labelJp: 'ソーシャルリンク', desc: 'Manage global social media links' },
    { to: '/admin/footer', icon: PanelLeft, label: 'Footer', labelJp: 'フッター', desc: 'Configure footer links and featured projects' },
  ];

  return (
    <div className="relative">
      <span
        className="absolute -top-2 right-0 text-6xl font-light text-purple-400/10 pointer-events-none select-none"
        aria-hidden
      >
        管理パネル
      </span>
      <div className="relative">
        <h1 className="text-2xl font-bold text-white mb-2 font-mono">Dashboard</h1>
        <p className="text-gray-400 mb-8">Manage your portfolio content</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map(({ to, icon: Icon, label, labelJp, desc }, i) => (
          <Link key={to} to={to}>
            <motion.div
              className="group relative overflow-hidden flex items-start gap-4 p-5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-purple-400/50 transition-all duration-150"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <span
                className="absolute inset-0 flex items-center justify-end pr-6 text-4xl font-light text-purple-400/10 pointer-events-none select-none"
                aria-hidden
              >
                {labelJp}
              </span>
              <div className="relative p-2.5 rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-white/10 text-purple-400 group-hover:border-purple-400/30 transition-colors shrink-0">
                <Icon size={20} />
              </div>
              <div className="relative flex-1 min-w-0">
                <h2 className="font-semibold text-white font-mono mb-1">{label}</h2>
                <p className="text-sm text-gray-400">{desc}</p>
              </div>
              <ChevronRight className="relative text-gray-500 group-hover:text-purple-400 shrink-0 transition-colors" size={18} />
            </motion.div>
          </Link>
        ))}
      </div>
      </div>
    </div>
  );
}
