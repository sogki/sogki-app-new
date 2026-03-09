import { MessageCircle } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center bg-[#06060a]">
      <div className="text-center max-w-md p-8">
        <h1 className="text-3xl font-mono font-bold text-white mb-2">Admin Panel</h1>
        <p className="text-gray-400 mb-8">Sign in with Discord to continue</p>
        <button
          type="button"
          onClick={handleLogin}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#5865F2] hover:bg-[#4752C4] rounded-lg text-white font-medium transition-colors"
        >
          <MessageCircle size={20} />
          Login with Discord
        </button>
        <p className="text-gray-500 text-xs mt-6">
          Only the configured Discord user ID can access this panel.
        </p>
      </div>
    </div>
  );
}
