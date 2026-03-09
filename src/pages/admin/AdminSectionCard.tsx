/**
 * Container for admin content with optional Japanese text as background watermark.
 * Gives a clearer, more intentional direction to each section.
 */
export function AdminSectionCard({
  label,
  labelJp,
  children,
  className = '',
}: {
  label?: string;
  labelJp?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-white/10 bg-white/5 ${className}`}
    >
      {labelJp && (
        <span
          className="absolute inset-0 flex items-center justify-end pr-6 text-5xl font-light text-purple-400/10 pointer-events-none select-none"
          aria-hidden
        >
          {labelJp}
        </span>
      )}
      <div className="relative">
        {label && (
          <h3 className="px-4 pt-4 pb-2 font-semibold text-white font-mono text-sm">
            {label}
          </h3>
        )}
        {children}
      </div>
    </div>
  );
}
