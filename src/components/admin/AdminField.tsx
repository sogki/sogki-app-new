import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

const controlClass =
  'w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-purple-400/40 focus:bg-white/[0.06]';

export function AdminLabel({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500">
      {children}
    </label>
  );
}

export function AdminInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${controlClass} ${props.className ?? ''}`} />;
}

export function AdminTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${controlClass} resize-y ${props.className ?? ''}`} />;
}

export function AdminSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${controlClass} ${props.className ?? ''}`} />;
}

export function AdminCheckbox({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-gray-300">
      <input
        type="checkbox"
        {...props}
        className={`rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/30 ${props.className ?? ''}`}
      />
      {label}
    </label>
  );
}

export function AdminFileInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="file"
      {...props}
      className={`w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-gray-300 file:mr-3 file:rounded file:border-0 file:bg-purple-500/20 file:px-3 file:py-1 file:text-purple-200 ${props.className ?? ''}`}
    />
  );
}
