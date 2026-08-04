export default function AdminCard({
  children,
  className = '',
  title,
  actions,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  actions?: React.ReactNode;
  id?: string;
}) {
  return (
    <div id={id} className={`rounded-2xl border border-white/10 bg-white/[0.03] ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 px-4 py-3">
          {title ? <h2 className="text-sm font-medium text-gray-200">{title}</h2> : <span />}
          {actions}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
