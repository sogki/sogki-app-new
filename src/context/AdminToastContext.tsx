import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type AdminToastVariant = 'success' | 'error' | 'info';

export type AdminToast = {
  id: string;
  message: string;
  variant: AdminToastVariant;
};

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type ConfirmState = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

type AdminToastContextValue = {
  toasts: AdminToast[];
  dismiss: (id: string) => void;
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
  };
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  confirmState: ConfirmState | null;
  resolveConfirm: (value: boolean) => void;
};

const AdminToastContext = createContext<AdminToastContextValue | null>(null);

let toastSeq = 0;

export function AdminToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<AdminToast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const timers = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, variant: AdminToastVariant) => {
      const id = `toast-${++toastSeq}`;
      setToasts((prev) => [...prev.slice(-4), { id, message, variant }]);
      const timer = window.setTimeout(() => dismiss(id), variant === 'error' ? 5500 : 3200);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  const toast = useMemo(
    () => ({
      success: (message: string) => push(message, 'success'),
      error: (message: string) => push(message, 'error'),
      info: (message: string) => push(message, 'info'),
    }),
    [push]
  );

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ ...options, resolve });
    });
  }, []);

  const resolveConfirm = useCallback((value: boolean) => {
    setConfirmState((current) => {
      current?.resolve(value);
      return null;
    });
  }, []);

  const value = useMemo(
    () => ({
      toasts,
      dismiss,
      toast,
      confirm,
      confirmState,
      resolveConfirm,
    }),
    [toasts, dismiss, toast, confirm, confirmState, resolveConfirm]
  );

  return <AdminToastContext.Provider value={value}>{children}</AdminToastContext.Provider>;
}

export function useAdminToast() {
  const ctx = useContext(AdminToastContext);
  if (!ctx) throw new Error('useAdminToast must be used within AdminToastProvider');
  return ctx;
}
