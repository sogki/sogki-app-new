import { useState } from 'react';
import SentinelCard from '../../../../components/admin/sentinel/SentinelCard';
import TargetPicker from '../../../../components/admin/sentinel/TargetPicker';
import ToolShell from '../../../../components/admin/sentinel/ToolShell';
import { sentinelApi } from '../../../../lib/sentinel/api';

type HeaderRow = {
  name: string;
  value: string;
  note: string;
  security_relevant: boolean;
};

type Result = {
  requested_url: string;
  final_url: string;
  status_code: number;
  error: string | null;
  headers: HeaderRow[];
  missing_security_headers: { name: string; note: string }[];
};

export default function HeaderLab() {
  const [targetId, setTargetId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const run = async () => {
    if (!targetId) return;
    setLoading(true);
    setError(null);
    try {
      const data = (await sentinelApi.toolHeaders({ target_id: targetId })) as unknown as Result;
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Header lab failed');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolShell
      title="Header Lab"
      teaches="What this teaches: browsers enforce many security decisions from response headers alone."
      outbound
    >
      <SentinelCard title="Inspect">
        <div className="flex flex-wrap items-end gap-3">
          <TargetPicker value={targetId} onChange={setTargetId} />
          <button
            type="button"
            disabled={!targetId || loading}
            onClick={() => void run()}
            className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-4 py-2 text-sm text-rose-100 hover:bg-rose-500/25 disabled:opacity-50"
          >
            {loading ? 'Fetching…' : 'Fetch headers'}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-amber-200">{error}</p>}
      </SentinelCard>

      {result && (
        <>
          <SentinelCard title="Response">
            <dl className="grid gap-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-zinc-500">Status</dt>
                <dd className="font-mono text-zinc-100">{result.status_code}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-zinc-500">Final URL</dt>
                <dd className="truncate font-mono text-xs text-zinc-300">{result.final_url}</dd>
              </div>
            </dl>
          </SentinelCard>

          <SentinelCard title="Headers">
            <div className="space-y-2">
              {result.headers.map((h) => (
                <div
                  key={h.name}
                  className={`rounded-lg border px-3 py-2 ${
                    h.security_relevant
                      ? 'border-rose-500/20 bg-rose-500/[0.06]'
                      : 'border-white/10 bg-black/20'
                  }`}
                >
                  <p className="font-mono text-xs text-rose-200">{h.name}</p>
                  <p className="mt-1 break-all font-mono text-xs text-zinc-300">{h.value}</p>
                  <p className="mt-1 text-[11px] text-zinc-500">{h.note}</p>
                </div>
              ))}
            </div>
          </SentinelCard>

          {result.missing_security_headers.length > 0 && (
            <SentinelCard title="Missing security-relevant headers">
              <ul className="space-y-2 text-sm text-zinc-400">
                {result.missing_security_headers.map((m) => (
                  <li key={m.name}>
                    <span className="font-mono text-zinc-200">{m.name}</span> — {m.note}
                  </li>
                ))}
              </ul>
            </SentinelCard>
          )}
        </>
      )}
    </ToolShell>
  );
}
