import { useEffect, useState } from 'react';
import SentinelCard from '../../../../components/admin/sentinel/SentinelCard';
import ToolShell from '../../../../components/admin/sentinel/ToolShell';
import { sentinelApi } from '../../../../lib/sentinel/api';
import type { Scan } from '../../../../lib/sentinel/types';

export default function ScanDiff() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void sentinelApi
      .listScans()
      .then((list) => {
        const completed = list.filter((s) => s.status === 'completed');
        setScans(completed);
        if (completed[0]) setA(completed[0].id);
        if (completed[1]) setB(completed[1].id);
        else if (completed[0]) setB(completed[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load scans'));
  }, []);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(await sentinelApi.toolDiff({ scan_a: a, scan_b: b }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Diff failed');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const onlyA = (result?.only_in_a as { title: string; severity: string }[]) || [];
  const onlyB = (result?.only_in_b as { title: string; severity: string }[]) || [];
  const scanA = result?.scan_a as { score: number | null; target_url: string } | undefined;
  const scanB = result?.scan_b as { score: number | null; target_url: string } | undefined;

  return (
    <ToolShell
      title="Scan Diff"
      teaches="What this teaches: configuration changes should show up as score/finding deltas over time."
    >
      <SentinelCard title="Compare">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-zinc-500">Scan A (baseline)</span>
            <select
              value={a}
              onChange={(e) => setA(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-zinc-100"
            >
              {scans.map((s) => (
                <option key={s.id} value={s.id}>
                  {(s.target_name || s.target_url) +
                    ' · ' +
                    (s.finished_at ? new Date(s.finished_at).toLocaleString() : s.id.slice(0, 8))}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-zinc-500">Scan B (newer)</span>
            <select
              value={b}
              onChange={(e) => setB(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-zinc-100"
            >
              {scans.map((s) => (
                <option key={s.id} value={s.id}>
                  {(s.target_name || s.target_url) +
                    ' · ' +
                    (s.finished_at ? new Date(s.finished_at).toLocaleString() : s.id.slice(0, 8))}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          disabled={!a || !b || loading}
          onClick={() => void run()}
          className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/15 px-4 py-2 text-sm text-rose-100 disabled:opacity-50"
        >
          {loading ? 'Comparing…' : 'Diff scans'}
        </button>
        {error && <p className="mt-3 text-sm text-amber-200">{error}</p>}
      </SentinelCard>

      {result && (
        <>
          <SentinelCard title="Score delta">
            <p className="font-mono text-sm text-zinc-200">
              {scanA?.score ?? '—'} → {scanB?.score ?? '—'}
              {result.score_delta != null ? ` (Δ ${result.score_delta})` : ''}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {scanA?.target_url} vs {scanB?.target_url}
            </p>
          </SentinelCard>
          <div className="grid gap-3 lg:grid-cols-2">
            <SentinelCard title="Only in A">
              <ul className="space-y-1 text-sm text-zinc-400">
                {onlyA.length ? onlyA.map((f) => (
                  <li key={f.title}>
                    [{f.severity}] {f.title}
                  </li>
                )) : <li>None</li>}
              </ul>
            </SentinelCard>
            <SentinelCard title="Only in B">
              <ul className="space-y-1 text-sm text-zinc-400">
                {onlyB.length ? onlyB.map((f) => (
                  <li key={f.title}>
                    [{f.severity}] {f.title}
                  </li>
                )) : <li>None</li>}
              </ul>
            </SentinelCard>
          </div>
        </>
      )}
    </ToolShell>
  );
}
