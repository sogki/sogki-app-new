import { Link } from 'react-router-dom';
import { Palette, FileText, FolderGit2, Share2, Layout } from 'lucide-react';

export default function AdminDashboard() {
  const sections = [
    { to: '/admin/graphics', icon: Palette, label: 'Graphics Portfolio', desc: 'Upload and manage graphic design assets' },
    { to: '/admin/blogs', icon: FileText, label: 'Blogs', desc: 'Create and edit blog posts with markdown' },
    { to: '/admin/projects', icon: FolderGit2, label: 'Projects', desc: 'Add and update featured projects' },
    { to: '/admin/social', icon: Share2, label: 'Social Links', desc: 'Manage global social media links' },
    { to: '/admin/footer', icon: Layout, label: 'Footer', desc: 'Configure footer links and featured projects' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-mono font-bold mb-6">Dashboard</h1>
      <p className="text-gray-400 mb-8">Manage your portfolio content</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map(({ to, icon: Icon, label, desc }) => (
          <Link
            key={to}
            to={to}
            className="p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-purple-400/30 transition-all"
          >
            <Icon className="text-purple-400 mb-3" size={24} />
            <h2 className="font-mono font-semibold text-white mb-1">{label}</h2>
            <p className="text-sm text-gray-400">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
