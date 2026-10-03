import { useState } from 'react';
import SentinelCard from './SentinelCard';
import TargetPicker from './TargetPicker';
import ToolShell from './ToolShell';

export default function WebToolRunner({
  title,
  teaches,
  actionLabel,
  onRun,
  children,
}: {
  title: string;
  teaches: string;
  actionLabel: string;
  onRun: (targetId: string) => Promise<unknown>;
  children: (result: unknown) => React.ReactNode;
}) {
  const [targetId, setTargetId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);

  const run = async () => {
    if (!targetId) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await onRun(targetId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tool failed');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolShell title={title} teaches={teaches} outbound>
      <SentinelCard title="Run">
        <div className="flex flex-wrap items-end gap-3">
          <TargetPicker value={targetId} onChange={setTargetId} />
          <button
            type="button"
            disabled={!targetId || loading}
            onClick={() => void run()}
            className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-4 py-2 text-sm text-rose-100 hover:bg-rose-500/25 disabled:opacity-50"
          >
            {loading ? 'Running…' : actionLabel}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-amber-200">{error}</p>}
      </SentinelCard>
      {result != null ? children(result) : null}
    </ToolShell>
  );
}
