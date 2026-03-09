import { motion } from 'framer-motion';
import { MessageCircle, Shield } from 'lucide-react';

interface AdminLoginProps {
  discordClientId: string;
  onLogin: (clientId: string) => void;
}

export default function AdminLogin({ discordClientId, onLogin }: AdminLoginProps) {
  const handleLogin = () => {
    if (!discordClientId || discordClientId === 'YOUR_DISCORD_CLIENT_ID') {
      alert('Discord Client ID not configured. Add DISCORD_CLIENT_ID to the keys table.');
      return;
    }
    onLogin(discordClientId);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black overflow-hidden">
      {/* Subtle background - matches Hero */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full blur-3xl opacity-20"
            style={{
              width: `${200 + i * 100}px`,
              height: `${200 + i * 100}px`,
              background: `radial-gradient(circle, ${
                i % 2 === 0 ? 'rgba(147, 51, 234, 0.4)' : 'rgba(59, 130, 246, 0.4)'
              } 0%, transparent 70%)`,
              left: `${20 + i * 15}%`,
              top: `${30 + i * 10}%`,
            }}
          />
        ))}
      </div>

      <motion.div
        className="text-center max-w-md p-8 relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-white/10 mb-6">
          <Shield className="text-purple-400" size={40} />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2 font-mono">Admin Panel</h1>
        <p className="text-purple-300 text-sm tracking-widest mb-2">Sogki.dev</p>
        <p className="text-gray-400 mb-8">Sign in with Discord to continue</p>
        <motion.button
          type="button"
          onClick={handleLogin}
          className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-full text-white font-medium transition-all duration-150 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/25"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <MessageCircle size={20} />
          Login with Discord
        </motion.button>
        <p className="text-gray-500 text-xs mt-6">
          Only the configured Discord user ID can access this panel.
        </p>
      </motion.div>
    </div>
  );
}
