export default function SentinelCard({
  children,
  className = '',
  title,
  actions,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] ${className}`}
    >
      {(title || actions) && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/5 px-4 py-3">
          {title ? (
            <h2 className="text-sm font-medium tracking-wide text-zinc-200">{title}</h2>
          ) : (
            <span />
          )}
          {actions}
        </div>
      )}
      <div className="min-h-0 flex-1 p-4">{children}</div>
    </div>
  );
}
