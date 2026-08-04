import { AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import AdminButton from '../../components/admin/AdminButton';

type AdminPageLayoutProps = {
  title: string;
  titleJp?: string;
  description?: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export default function AdminPageLayout({
  title,
  titleJp,
  description,
  loading,
  error,
  onRetry,
  actions,
  children,
}: AdminPageLayoutProps) {
  return (
    <div className="relative">
      {titleJp && (
        <span
          className="absolute -top-1 right-0 text-5xl font-light text-purple-400/[0.08] pointer-events-none select-none"
          aria-hidden
        >
          {titleJp}
        </span>
      )}

      <div className="relative mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-white font-mono">{title}</h1>
          {description && <p className="mt-1.5 max-w-2xl text-sm text-gray-400 leading-relaxed">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {loading ? (
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-12">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
          <span className="text-sm text-gray-400">Loading...</span>
        </div>
      ) : error ? (
        <motion.div
          className="rounded-2xl border border-red-500/25 bg-red-500/10 p-5"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 shrink-0 text-red-300" size={18} />
            <div>
              <p className="text-sm font-medium text-red-100">{error}</p>
              {(error.toLowerCase().includes('admin-api') || error.toLowerCase().includes('deploy')) && (
                <p className="mt-2 text-xs text-gray-400">
                  Run:{' '}
                  <code className="rounded border border-white/10 bg-black/40 px-1.5 py-0.5 font-mono text-purple-300">
                    npx supabase functions deploy admin-api
                  </code>
                </p>
              )}
              {onRetry && (
                <AdminButton variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
                  <RefreshCw size={14} />
                  Retry
                </AdminButton>
              )}
            </div>
          </div>
        </motion.div>
      ) : (
        children
      )}
    </div>
  );
}
