import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useAdminToast, type AdminToastVariant } from '../../context/AdminToastContext';

const styles: Record<
  AdminToastVariant,
  { border: string; bg: string; icon: typeof CheckCircle2; iconClass: string }
> = {
  success: {
    border: 'border-emerald-400/30',
    bg: 'bg-emerald-500/10',
    icon: CheckCircle2,
    iconClass: 'text-emerald-300',
  },
  error: {
    border: 'border-red-400/30',
    bg: 'bg-red-500/10',
    icon: AlertCircle,
    iconClass: 'text-red-300',
  },
  info: {
    border: 'border-purple-400/30',
    bg: 'bg-purple-500/10',
    icon: Info,
    iconClass: 'text-purple-300',
  },
};

export default function AdminToastViewport() {
  const { toasts, dismiss } = useAdminToast();

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-[100] flex w-[min(100vw-2rem,22rem)] flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const style = styles[toast.variant];
          const Icon = style.icon;
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border ${style.border} ${style.bg} px-3.5 py-3 shadow-lg shadow-black/40 backdrop-blur-md`}
              role="status"
            >
              <Icon size={18} className={`${style.iconClass} mt-0.5 shrink-0`} />
              <p className="flex-1 text-sm text-gray-100 leading-snug">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="shrink-0 rounded-md p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
