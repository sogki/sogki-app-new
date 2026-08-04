import { Link } from 'react-router-dom';
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
import AdminCard from '../AdminCard';

const ADMIN_SECTIONS = [
  { to: '/admin/home', icon: Home, label: 'Home', desc: 'Hero, About, Features', group: 'Content' },
  { to: '/admin/projects', icon: FolderGit2, label: 'Projects', desc: 'Featured projects', group: 'Content' },
  { to: '/admin/contact', icon: MessageCircle, label: 'Contact', desc: 'Contact section', group: 'Content' },
  { to: '/admin/blogs', icon: FileText, label: 'Blogs', desc: 'Posts & markdown', group: 'Content' },
  { to: '/admin/graphics', icon: Palette, label: 'Graphics', desc: 'Design assets', group: 'Portfolio' },
  { to: '/admin/binder-showcase', icon: Layers, label: 'Binder', desc: 'TCG showcases', group: 'Portfolio' },
  { to: '/admin/master-set-completion', icon: Percent, label: 'Master set', desc: 'Completion', group: 'Portfolio' },
  { to: '/admin/cvs', icon: Briefcase, label: 'CV Manager', desc: 'Store & email CVs', group: 'Tools' },
  { to: '/admin/resourcepacks', icon: Package, label: 'Packs', desc: 'Resource packs', group: 'Tools' },
  { to: '/admin/social', icon: Share2, label: 'Social', desc: 'Social links', group: 'Site' },
  { to: '/admin/footer', icon: PanelLeft, label: 'Footer', desc: 'Footer config', group: 'Site' },
  { to: '/admin/settings', icon: Settings, label: 'Settings', desc: 'Feature flags', group: 'Site' },
];

export default function LifeSiteTools() {
  return (
    <AdminCard id="widget-site-tools" title="Site tools" className="h-full">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {ADMIN_SECTIONS.map(({ to, icon: Icon, label, desc, group }) => (
          <Link
            key={to}
            to={to}
            className="group flex items-start gap-2.5 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 transition-colors hover:border-purple-400/30 hover:bg-white/[0.04]"
          >
            <div className="rounded-lg border border-white/10 bg-purple-500/10 p-1.5 text-purple-300">
              <Icon size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-600">
                {group}
              </p>
              <p className="text-sm font-medium text-white font-mono">{label}</p>
              <p className="mt-0.5 text-[11px] text-gray-500 leading-snug">{desc}</p>
            </div>
            <ChevronRight
              size={14}
              className="mt-1 shrink-0 text-gray-600 group-hover:text-purple-300"
            />
          </Link>
        ))}
      </div>
    </AdminCard>
  );
}
