import { AnimatePresence, motion } from 'framer-motion';
import { useAdminToast } from '../../context/AdminToastContext';
import AdminButton from './AdminButton';

export default function AdminConfirmDialog() {
  const { confirmState, resolveConfirm } = useAdminToast();

  return (
    <AnimatePresence>
      {confirmState && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Cancel"
            onClick={() => resolveConfirm(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-confirm-title"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#121214] p-5 shadow-2xl shadow-black/50"
          >
            <h2 id="admin-confirm-title" className="text-lg font-semibold text-white font-mono">
              {confirmState.title}
            </h2>
            {confirmState.description && (
              <p className="mt-2 text-sm text-gray-400 leading-relaxed">{confirmState.description}</p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <AdminButton variant="ghost" onClick={() => resolveConfirm(false)}>
                {confirmState.cancelLabel ?? 'Cancel'}
              </AdminButton>
              <AdminButton
                variant={confirmState.danger ? 'danger' : 'primary'}
                onClick={() => resolveConfirm(true)}
              >
                {confirmState.confirmLabel ?? 'Confirm'}
              </AdminButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
