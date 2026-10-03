export default function ToolShell({
  title,
  teaches,
  outbound = false,
  children,
}: {
  title: string;
  teaches: string;
  outbound?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
        <p className="mt-1 text-sm text-zinc-500">{teaches}</p>
      </div>
      {outbound && (
        <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          Only use against systems you own or have explicit permission to test.
        </div>
      )}
      {children}
    </div>
  );
}
