import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Palette,
  FileText,
  FolderGit2,
  Share2,
  PanelLeft,
  ChevronRight,
  Home,
  MessageCircle,
  Settings,
  Layers,
  Percent,
  Package,
  Briefcase,
} from 'lucide-react';

export default function AdminDashboard() {
  const sections = [
    { to: '/admin/home', icon: Home, label: 'Home', labelJp: 'ホーム', desc: 'Hero, About, and Features content', group: 'Content' },
    { to: '/admin/projects', icon: FolderGit2, label: 'Projects', labelJp: 'プロジェクト', desc: 'Add and update featured projects', group: 'Content' },
    { to: '/admin/contact', icon: MessageCircle, label: 'Contact', labelJp: 'お問い合わせ', desc: 'Contact section text and links', group: 'Content' },
    { to: '/admin/blogs', icon: FileText, label: 'Blogs', labelJp: 'ブログ', desc: 'Create and edit blog posts with markdown', group: 'Content' },
    { to: '/admin/graphics', icon: Palette, label: 'Graphics', labelJp: 'グラフィック', desc: 'Upload and manage graphic design assets', group: 'Portfolio' },
    { to: '/admin/binder-showcase', icon: Layers, label: 'Binder showcase', labelJp: 'バインダー', desc: 'TCG binder carousels and set rows', group: 'Portfolio' },
    { to: '/admin/master-set-completion', icon: Percent, label: 'Master set', labelJp: 'マスター', desc: 'Collection completion entries', group: 'Portfolio' },
    { to: '/admin/cvs', icon: Briefcase, label: 'CV Manager', labelJp: '履歴書', desc: 'Private CV storage, preview, and email export', group: 'Tools' },
    { to: '/admin/resourcepacks', icon: Package, label: 'Resource Packs', labelJp: 'リソース', desc: 'Minecraft resource pack uploads', group: 'Tools' },
    { to: '/admin/social', icon: Share2, label: 'Social Links', labelJp: 'ソーシャル', desc: 'Manage global social media links', group: 'Site' },
    { to: '/admin/footer', icon: PanelLeft, label: 'Footer', labelJp: 'フッター', desc: 'Configure footer links and featured projects', group: 'Site' },
    { to: '/admin/settings', icon: Settings, label: 'Settings', labelJp: '設定', desc: 'Feature flags and visibility toggles', group: 'Site' },
  ];

  return (
    <div className="relative">
      <span
        className="absolute -top-1 right-0 text-5xl font-light text-purple-400/[0.08] pointer-events-none select-none"
        aria-hidden
      >
        管理パネル
      </span>
      <div className="relative mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white font-mono">Dashboard</h1>
        <p className="mt-1.5 text-sm text-gray-400">Manage portfolio content, tools, and site settings.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {sections.map(({ to, icon: Icon, label, labelJp, desc, group }, i) => (
          <Link key={to} to={to}>
            <motion.div
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-purple-400/30 hover:bg-white/[0.05]"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.03 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.99 }}
            >
              <span
                className="absolute inset-0 flex items-center justify-end pr-5 text-3xl font-light text-purple-400/[0.07] pointer-events-none select-none"
                aria-hidden
              >
                {labelJp}
              </span>
              <div className="relative flex items-start gap-3">
                <div className="rounded-xl border border-white/10 bg-purple-500/10 p-2.5 text-purple-300">
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-600">{group}</p>
                  <h2 className="mt-0.5 font-medium text-white font-mono">{label}</h2>
                  <p className="mt-1 text-xs text-gray-500 leading-relaxed">{desc}</p>
                </div>
                <ChevronRight className="mt-1 shrink-0 text-gray-600 transition-colors group-hover:text-purple-300" size={16} />
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}
