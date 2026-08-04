import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminAuthProvider, useAdminAuth } from '../../context/AdminAuthContext';
import { AdminToastProvider } from '../../context/AdminToastContext';
import { useKeys } from '../../context/KeysContext';
import AdminToastViewport from '../../components/admin/AdminToastViewport';
import AdminConfirmDialog from '../../components/admin/AdminConfirmDialog';
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
  Briefcase,
  ExternalLink,
  Menu,
  X,
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
import AdminCvs from './AdminCvs';

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ to: '/admin', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Content',
    items: [
      { to: '/admin/home', label: 'Home', icon: Home },
      { to: '/admin/projects', label: 'Projects', icon: FolderGit2 },
      { to: '/admin/contact', label: 'Contact', icon: MessageCircle },
      { to: '/admin/blogs', label: 'Blogs', icon: FileText },
    ],
  },
  {
    label: 'Portfolio',
    items: [
      { to: '/admin/graphics', label: 'Graphics', icon: Palette },
      { to: '/admin/binder-showcase', label: 'Binder showcase', icon: Layers },
      { to: '/admin/master-set-completion', label: 'Master set', icon: Percent },
    ],
  },
  {
    label: 'Tools',
    items: [
      { to: '/admin/cvs', label: 'CV Manager', icon: Briefcase },
      { to: '/admin/resourcepacks', label: 'Resource Packs', icon: Package },
    ],
  },
  {
    label: 'Site',
    items: [
      { to: '/admin/social', label: 'Social Links', icon: Share2 },
      { to: '/admin/footer', label: 'Footer', icon: PanelLeft },
      { to: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
];

function AdminRoutes() {
  const { isAuthenticated, isLoading, handleCallback, logout, login } = useAdminAuth();
  const { keys } = useKeys();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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

  // Close drawer whenever the route changes (mobile nav link tap).
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  // Prevent background scroll while mobile drawer is open.
  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0b]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
          <span className="text-sm text-gray-500">Loading admin...</span>
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
    <div className="flex min-h-screen bg-[#0a0a0b] text-white">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-[#0c0c0e] lg:flex">
        <AdminSidebarHeader />
        <AdminSidebarNav />
        <AdminSidebarFooter logout={logout} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close navigation"
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileNavOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-[min(18rem,88vw)] flex-col border-r border-white/10 bg-[#0c0c0e] shadow-2xl lg:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.22 }}
            >
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <AdminSidebarHeader compact />
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>
              <AdminSidebarNav />
              <AdminSidebarFooter logout={logout} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/10 bg-[#0c0c0e]/80 px-4 py-3 backdrop-blur-md lg:hidden">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-gray-200 hover:bg-white/10"
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white font-mono">Admin</p>
            <p className="truncate text-[11px] text-gray-500">sogki.dev</p>
          </div>
          <div className="rounded-lg border border-purple-400/20 bg-purple-500/10 p-2">
            <Shield className="text-purple-300" size={16} />
          </div>
        </header>

        <main className="relative min-h-0 flex-1 overflow-auto">
          <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden>
            <div
              className="absolute -top-24 right-0 h-[28rem] w-[28rem] rounded-full blur-3xl"
              style={{
                background: 'radial-gradient(circle, rgba(147,51,234,0.12) 0%, transparent 70%)',
              }}
            />
          </div>
          <div className="relative z-10 w-full max-w-none p-4 sm:p-5 lg:p-6 xl:p-8">
            <Routes>
              <Route index element={<AdminDashboard />} />
              <Route path="life" element={<Navigate to="/admin" replace />} />
              <Route path="home" element={<AdminHome />} />
              <Route path="projects" element={<AdminProjects />} />
              <Route path="contact" element={<AdminContact />} />
              <Route path="graphics" element={<AdminGraphics />} />
              <Route path="blogs" element={<AdminBlogs />} />
              <Route path="resourcepacks" element={<AdminResourcePacks />} />
              <Route path="binder-showcase" element={<AdminBinderShowcase />} />
              <Route path="master-set-completion" element={<AdminMasterSetCompletion />} />
              <Route path="cvs" element={<AdminCvs />} />
              <Route path="social" element={<AdminSocial />} />
              <Route path="footer" element={<AdminFooter />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

function AdminSidebarHeader({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? '' : 'border-b border-white/10 px-4 py-4'}>
      <div className="flex items-center gap-3">
        <div className="rounded-xl border border-purple-400/20 bg-purple-500/10 p-2">
          <Shield className="text-purple-300" size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold text-white font-mono">Admin</p>
          <p className="text-[11px] text-gray-500">sogki.dev</p>
        </div>
      </div>
    </div>
  );
}

function AdminSidebarNav() {
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-600">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <AdminNavLink key={item.to} to={item.to} icon={item.icon}>
                {item.label}
              </AdminNavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function AdminSidebarFooter({ logout }: { logout: () => void }) {
  return (
    <div className="space-y-1 border-t border-white/10 p-3">
      <a
        href="/"
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-200"
      >
        <ExternalLink size={15} />
        View site
      </a>
      <button
        type="button"
        onClick={logout}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-300"
      >
        <LogOut size={15} />
        Logout
      </button>
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
        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
          isActive
            ? 'bg-purple-500/15 text-purple-200'
            : 'text-gray-400 hover:bg-white/5 hover:text-gray-100'
        }`}
        whileTap={{ scale: 0.98 }}
      >
        <Icon size={16} />
        <span className="truncate">{children}</span>
      </motion.div>
    </Link>
  );
}

export default function AdminApp() {
  return (
    <AdminAuthProvider>
      <AdminToastProvider>
        <AdminRoutes />
        <AdminToastViewport />
        <AdminConfirmDialog />
      </AdminToastProvider>
    </AdminAuthProvider>
  );
}
