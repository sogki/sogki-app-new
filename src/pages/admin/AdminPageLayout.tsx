import { AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

type AdminPageLayoutProps = {
  title: string;
  titleJp?: string;
  description?: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  children: React.ReactNode;
};

export default function AdminPageLayout({
  title,
  titleJp,
  description,
  loading,
  error,
  onRetry,
  children,
}: AdminPageLayoutProps) {
  if (loading) {
    return (
      <div className="relative">
        {titleJp && (
          <span className="absolute -top-2 right-0 text-6xl font-light text-purple-400/10 pointer-events-none select-none" aria-hidden>{titleJp}</span>
        )}
        <div className="relative">
          <h1 className="text-2xl font-bold text-white mb-2 font-mono">{title}</h1>
          {description && <p className="text-gray-400 mb-6">{description}</p>}
        <div className="flex items-center gap-3 py-12">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400">Loading...</span>
        </div>
        </div>
      </div>
    );
  }

  if (error) {
    const isDeployHint = error.toLowerCase().includes('admin-api') || error.toLowerCase().includes('deploy');
    return (
      <div className="relative">
        {titleJp && (
          <span className="absolute -top-2 right-0 text-6xl font-light text-purple-400/10 pointer-events-none select-none" aria-hidden>{titleJp}</span>
        )}
        <div className="relative">
          <h1 className="text-2xl font-bold text-white mb-2 font-mono">{title}</h1>
          {description && <p className="text-gray-400 mb-6">{description}</p>}
        <motion.div
          className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex gap-3">
            <AlertCircle className="text-purple-400 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-medium text-purple-200">{error}</p>
              {isDeployHint && (
                <p className="mt-3 text-sm text-gray-400">
                  Run: <code className="px-2 py-1 rounded bg-black/40 text-purple-300 font-mono border border-white/10">npx supabase functions deploy admin-api</code>
                </p>
              )}
              {onRetry && (
                <motion.button
                  type="button"
                  onClick={onRetry}
                  className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-sm transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <RefreshCw size={14} />
                  Retry
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {titleJp && (
        <span
          className="absolute -top-2 right-0 text-6xl font-light text-purple-400/10 pointer-events-none select-none"
          aria-hidden
        >
          {titleJp}
        </span>
      )}
      <div className="relative">
        <h1 className="text-2xl font-bold text-white mb-1 font-mono">{title}</h1>
        {description && <p className="text-gray-400 mb-6">{description}</p>}
        {children}
      </div>
    </div>
  );
}
