import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AdminAuthProvider, useAdminAuth } from '../../context/AdminAuthContext';
import { useKeys } from '../../context/KeysContext';
import {
  LayoutDashboard,
  Palette,
  FileText,
  FolderGit2,
  Share2,
  PanelLeft,
  LogOut,
  Shield,
  Home,
  MessageCircle,
  Settings,
  Package,
  Layers,
  Percent,
} from 'lucide-react';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';
import AdminGraphics from './AdminGraphics';
import AdminBlogs from './AdminBlogs';
import AdminProjects from './AdminProjects';
import AdminSocial from './AdminSocial';
import AdminFooter from './AdminFooter';
import AdminHome from './AdminHome';
import AdminContact from './AdminContact';
import AdminSettings from './AdminSettings';
import AdminResourcePacks from './AdminResourcePacks';
import AdminBinderShowcase from './AdminBinderShowcase';
import AdminMasterSetCompletion from './AdminMasterSetCompletion';

function AdminRoutes() {
  const { isAuthenticated, isLoading, handleCallback, logout, login } = useAdminAuth();
  const { keys } = useKeys();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const error = params.get('error');
    if (token) {
      handleCallback(token);
      window.history.replaceState({}, '', location.pathname);
      navigate('/admin', { replace: true });
    }
    if (error && !token) {
      console.error('Auth error:', error);
    }
  }, [location.search, handleCallback, navigate, location.pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400 text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <AdminLogin
        discordClientId={keys['DISCORD_CLIENT_ID'] ?? ''}
        onLogin={login}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-black/80 backdrop-blur-sm flex flex-col shrink-0">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-white/10">
              <Shield className="text-purple-400" size={20} />
            </div>
            <div>
              <h1 className="font-semibold text-white font-mono">Admin</h1>
              <p className="text-xs text-gray-500">Sogki.dev</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          <AdminNavLink to="/admin" icon={LayoutDashboard}>
            Dashboard
          </AdminNavLink>
          <AdminNavLink to="/admin/home" icon={Home}>
            Home
          </AdminNavLink>
          <AdminNavLink to="/admin/projects" icon={FolderGit2}>
            Projects
          </AdminNavLink>
          <AdminNavLink to="/admin/contact" icon={MessageCircle}>
            Contact
          </AdminNavLink>
          <AdminNavLink to="/admin/graphics" icon={Palette}>
            Graphics
          </AdminNavLink>
          <AdminNavLink to="/admin/blogs" icon={FileText}>
            Blogs
          </AdminNavLink>
          <AdminNavLink to="/admin/resourcepacks" icon={Package}>
            Resource Packs
          </AdminNavLink>
          <AdminNavLink to="/admin/binder-showcase" icon={Layers}>
            Binder showcase
          </AdminNavLink>
          <AdminNavLink to="/admin/master-set-completion" icon={Percent}>
            Master set completion
          </AdminNavLink>
          <AdminNavLink to="/admin/social" icon={Share2}>
            Social Links
          </AdminNavLink>
          <AdminNavLink to="/admin/footer" icon={PanelLeft}>
            Footer
          </AdminNavLink>
          <AdminNavLink to="/admin/settings" icon={Settings}>
            Settings
          </AdminNavLink>
        </nav>
        <div className="p-3 border-t border-white/10">
          <a
            href="/"
            className="block text-xs text-gray-500 hover:text-purple-400 mb-2 transition-colors"
          >
            ← Back to site
          </a>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all text-sm"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="relative p-6 lg:p-8 max-w-5xl min-h-full">
          {/* Subtle gradient overlay - matches main site */}
          <div className="absolute inset-0 pointer-events-none opacity-30">
            <div
              className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl"
              style={{ background: 'radial-gradient(circle, rgba(147, 51, 234, 0.15) 0%, transparent 70%)' }}
            />
          </div>
          <div className="relative z-10">
            <Routes>
              <Route index element={<AdminDashboard />} />
              <Route path="home" element={<AdminHome />} />
              <Route path="projects" element={<AdminProjects />} />
              <Route path="contact" element={<AdminContact />} />
              <Route path="graphics" element={<AdminGraphics />} />
              <Route path="blogs" element={<AdminBlogs />} />
              <Route path="resourcepacks" element={<AdminResourcePacks />} />
              <Route path="binder-showcase" element={<AdminBinderShowcase />} />
              <Route path="master-set-completion" element={<AdminMasterSetCompletion />} />
              <Route path="social" element={<AdminSocial />} />
              <Route path="footer" element={<AdminFooter />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </div>
        </div>
      </main>
    </div>
  );
}

function AdminNavLink({
  to,
  icon: Icon,
  children,
}: {
  to: string;
  icon: React.ComponentType<{ size?: number }>;
  children: React.ReactNode;
}) {
  const location = useLocation();
  const isActive =
    location.pathname === to || (to !== '/admin' && location.pathname.startsWith(to));
  return (
    <Link to={to}>
      <motion.div
        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30'
            : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10'
        }`}
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.98 }}
      >
        <Icon size={18} />
        {children}
      </motion.div>
    </Link>
  );
}

export default function AdminApp() {
  return (
    <AdminAuthProvider>
      <AdminRoutes />
    </AdminAuthProvider>
  );
}
