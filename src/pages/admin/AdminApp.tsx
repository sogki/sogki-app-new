import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { AdminAuthProvider, useAdminAuth } from '../../context/AdminAuthContext';
import { useKeys } from '../../context/KeysContext';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';
import AdminGraphics from './AdminGraphics';
import AdminBlogs from './AdminBlogs';
import AdminProjects from './AdminProjects';
import AdminSocial from './AdminSocial';
import AdminFooter from './AdminFooter';

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
      <div className="min-h-screen flex items-center justify-center bg-[#06060a]">
        <div className="text-purple-400 animate-pulse">Loading...</div>
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
    <div className="min-h-screen bg-[#06060a] text-white flex">
      <aside className="w-56 border-r border-white/10 p-4 flex flex-col gap-2">
        <h1 className="text-xl font-mono font-bold text-purple-400 mb-4">Admin</h1>
        <nav className="flex flex-col gap-1">
          <AdminNavLink to="/admin">Dashboard</AdminNavLink>
          <AdminNavLink to="/admin/graphics">Graphics</AdminNavLink>
          <AdminNavLink to="/admin/blogs">Blogs</AdminNavLink>
          <AdminNavLink to="/admin/projects">Projects</AdminNavLink>
          <AdminNavLink to="/admin/social">Social Links</AdminNavLink>
          <AdminNavLink to="/admin/footer">Footer</AdminNavLink>
        </nav>
        <button
          type="button"
          onClick={logout}
          className="mt-auto text-sm text-gray-400 hover:text-red-400"
        >
          Logout
        </button>
      </aside>
      <main className="flex-1 p-8 overflow-auto">
        <Routes>
          <Route index element={<AdminDashboard />} />
          <Route path="graphics" element={<AdminGraphics />} />
          <Route path="blogs" element={<AdminBlogs />} />
          <Route path="projects" element={<AdminProjects />} />
          <Route path="social" element={<AdminSocial />} />
          <Route path="footer" element={<AdminFooter />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function AdminNavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/admin' && location.pathname.startsWith(to));
  return (
    <Link
      to={to}
      className={`block px-3 py-2 rounded-lg text-sm font-mono transition-colors ${
        isActive ? 'bg-purple-500/20 text-purple-300' : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
    >
      {children}
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
