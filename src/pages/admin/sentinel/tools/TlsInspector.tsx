import { useState } from 'react';
import SentinelCard from '../../../../components/admin/sentinel/SentinelCard';
import TargetPicker from '../../../../components/admin/sentinel/TargetPicker';
import ToolShell from '../../../../components/admin/sentinel/ToolShell';
import { sentinelApi } from '../../../../lib/sentinel/api';

type TlsResult = {
  ok: boolean;
  url?: string;
  host?: string;
  port?: number;
  error?: string;
  tls_version?: string;
  cipher?: { name: string; protocol: string; bits: number } | null;
  subject?: Record<string, string>;
  issuer?: Record<string, string>;
  subject_alt_names?: string[];
  not_after?: string;
  days_remaining?: number | null;
  validated?: boolean;
};

export default function TlsInspector() {
  const [targetId, setTargetId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TlsResult | null>(null);

  const run = async () => {
    if (!targetId) return;
    setLoading(true);
    setError(null);
    try {
      const data = (await sentinelApi.toolTls({ target_id: targetId })) as unknown as TlsResult;
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'TLS inspection failed');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolShell
      title="TLS Inspector"
      teaches="What this teaches: certificate identity, expiry, and negotiated protocol version — without aggressive probing."
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
            {loading ? 'Checking…' : 'Inspect TLS'}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-amber-200">{error}</p>}
      </SentinelCard>

      {result && (
        <SentinelCard title="Certificate">
          {!result.ok ? (
            <p className="text-sm text-amber-200">{result.error || 'Inspection failed'}</p>
          ) : (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-zinc-500">Host</dt>
                <dd className="font-mono text-zinc-100">
                  {result.host}:{result.port}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">TLS version</dt>
                <dd className="font-mono text-zinc-100">{result.tls_version}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Subject CN</dt>
                <dd className="font-mono text-zinc-100">{result.subject?.commonName || '—'}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Issuer</dt>
                <dd className="font-mono text-zinc-100">
                  {result.issuer?.organizationName || result.issuer?.commonName || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Expires</dt>
                <dd className="font-mono text-zinc-100">
                  {result.not_after || '—'}
                  {result.days_remaining != null ? ` (${result.days_remaining}d)` : ''}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Cipher</dt>
                <dd className="font-mono text-zinc-100">{result.cipher?.name || '—'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-zinc-500">SANs</dt>
                <dd className="mt-1 font-mono text-xs text-zinc-300">
                  {(result.subject_alt_names || []).join(', ') || '—'}
                </dd>
              </div>
            </dl>
          )}
        </SentinelCard>
      )}
    </ToolShell>
  );
}
