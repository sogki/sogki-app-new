import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const variantClass: Record<Variant, string> = {
  primary:
    'bg-purple-500/20 hover:bg-purple-500/30 border-purple-400/30 text-purple-200 disabled:opacity-50',
  secondary:
    'bg-white/5 hover:bg-white/10 border-white/10 text-gray-200 disabled:opacity-50',
  danger:
    'bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-300 disabled:opacity-50',
  ghost:
    'bg-transparent hover:bg-white/5 border-transparent text-gray-400 hover:text-white disabled:opacity-50',
};

type AdminButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: 'sm' | 'md';
};

const AdminButton = forwardRef<HTMLButtonElement, AdminButtonProps>(function AdminButton(
  { variant = 'secondary', size = 'md', className = '', type = 'button', children, ...props },
  ref
) {
  const sizeClass = size === 'sm' ? 'px-2.5 py-1.5 text-xs gap-1.5' : 'px-3.5 py-2 text-sm gap-2';
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex items-center justify-center rounded-lg border font-medium transition-colors ${sizeClass} ${variantClass[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

export default AdminButton;
