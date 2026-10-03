import { useState } from 'react';
import SentinelCard from '../../../../components/admin/sentinel/SentinelCard';
import TargetPicker from '../../../../components/admin/sentinel/TargetPicker';
import ToolShell from '../../../../components/admin/sentinel/ToolShell';
import { sentinelApi } from '../../../../lib/sentinel/api';

type Hop = {
  url: string;
  status_code: number;
  location?: string | null;
  final?: boolean;
};

type Result = {
  start_url: string;
  final_url: string;
  error: string | null;
  hop_count: number;
  hops: Hop[];
};

export default function RedirectMapper() {
  const [targetId, setTargetId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const run = async () => {
    if (!targetId) return;
    setLoading(true);
    setError(null);
    try {
      const data = (await sentinelApi.toolRedirects({ target_id: targetId })) as unknown as Result;
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Redirect map failed');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolShell
      title="Redirect Mapper"
      teaches="What this teaches: redirect chains decide canonical hosts, cookie scope, and whether HTTP reaches HTTPS."
      outbound
    >
      <SentinelCard title="Map">
        <div className="flex flex-wrap items-end gap-3">
          <TargetPicker value={targetId} onChange={setTargetId} />
          <button
            type="button"
            disabled={!targetId || loading}
            onClick={() => void run()}
            className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-4 py-2 text-sm text-rose-100 hover:bg-rose-500/25 disabled:opacity-50"
          >
            {loading ? 'Mapping…' : 'Map redirects'}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-amber-200">{error}</p>}
      </SentinelCard>

      {result && (
        <SentinelCard title={`${result.hop_count} hop(s)`}>
          {result.error && <p className="mb-3 text-sm text-amber-200">{result.error}</p>}
          <ol className="space-y-2">
            {result.hops.map((hop, i) => (
              <li
                key={`${hop.url}-${i}`}
                className="rounded-lg border border-white/10 bg-black/20 px-3 py-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-rose-200">
                    {hop.final ? 'FINAL' : hop.status_code}
                  </span>
                  <span className="break-all font-mono text-xs text-zinc-300">{hop.url}</span>
                </div>
                {hop.location && (
                  <p className="mt-1 break-all text-[11px] text-zinc-500">→ {hop.location}</p>
                )}
              </li>
            ))}
          </ol>
        </SentinelCard>
      )}
    </ToolShell>
  );
}
