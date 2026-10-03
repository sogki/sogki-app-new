import { useEffect, useState } from 'react';
import SentinelCard from '../../../components/admin/sentinel/SentinelCard';
import { resolveSentinelBaseUrl, sentinelApi } from '../../../lib/sentinel/api';
import type { HealthResponse } from '../../../lib/sentinel/types';

export default function SentinelSettings() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [apiUrl, setApiUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void resolveSentinelBaseUrl().then(setApiUrl);
    void sentinelApi
      .health()
      .then(setHealth)
      .catch((e) => setError(e instanceof Error ? e.message : 'API unreachable'));
  }, []);

  return (
    <div className="space-y-4">
      <SentinelCard title="Scanner service">
        {error ? (
          <p className="text-sm text-amber-200">{error}</p>
        ) : health ? (
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Status</dt>
              <dd className="font-mono text-emerald-300">{health.status}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Service</dt>
              <dd className="font-mono text-zinc-200">{health.service}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Version</dt>
              <dd className="font-mono text-zinc-200">{health.version}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-zinc-500">Checking…</p>
        )}
      </SentinelCard>

      <SentinelCard title="Usage policy">
        <ul className="list-inside list-disc space-y-2 text-sm text-zinc-400">
          <li>Single-user private tool inside the admin ecosystem.</li>
          <li>Only assess systems you own, localhost/lab/CTF, or have explicit permission to test.</li>
          <li>Checks are passive and non-destructive — no exploitation or credential attacks.</li>
          <li>
            Sentinel Security Score is an internal prioritisation metric, not CVSS or a penetration
            test.
          </li>
          <li>Reports and findings are private and never exposed on the public site.</li>
        </ul>
      </SentinelCard>

      <SentinelCard title="Configuration (Supabase keys)">
        <p className="text-sm text-zinc-400">
          Citadel API URL:{' '}
          <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-xs text-zinc-200">
            {apiUrl || '…'}
          </code>
        </p>
        {health?.codename && (
          <p className="mt-2 text-xs text-zinc-500">
            Deploy codename: <code className="font-mono text-zinc-300">{health.codename}</code>
          </p>
        )}
        <p className="mt-2 text-xs text-zinc-600">
          Sourced from public <code className="font-mono">SENTINEL_API_URL</code> in{' '}
          <code className="font-mono">keys</code>. Local default is{' '}
          <code className="font-mono">http://127.0.0.1:8790</code>; production should be the Railway
          Citadel HTTPS URL. Auth uses your Discord admin JWT (or{' '}
          <code className="font-mono">ADMIN_DEV_TOKEN</code>); Citadel loads those private keys when{' '}
          <code className="font-mono">DATABASE_URL</code> is set.
        </p>
      </SentinelCard>
    </div>
  );
}
