export default function AdminEmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-10 text-center">
      <p className="text-sm font-medium text-gray-300">{title}</p>
      {description && <p className="mt-1.5 text-xs text-gray-500">{description}</p>}
    </div>
  );
}
