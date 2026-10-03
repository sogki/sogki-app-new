import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SentinelCard from '../../../components/admin/sentinel/SentinelCard';
import FindingRow from '../../../components/admin/sentinel/FindingRow';
import ScoreDisplay from '../../../components/admin/sentinel/ScoreDisplay';
import SeverityBadge from '../../../components/admin/sentinel/SeverityBadge';
import { sentinelApi } from '../../../lib/sentinel/api';
import type { Finding, Scan, Target } from '../../../lib/sentinel/types';

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'informational'] as const;

export default function SentinelScanner() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [targetId, setTargetId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scan, setScan] = useState<Scan | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);

  useEffect(() => {
    void sentinelApi
      .listTargets()
      .then((list) => {
        setTargets(list);
        if (list[0]) setTargetId(list[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load targets'));
  }, []);

  const runScan = async () => {
    if (!targetId) {
      setError('Save an authorised target first.');
      return;
    }
    setLoading(true);
    setError(null);
    setScan(null);
    setFindings([]);
    try {
      const created = await sentinelApi.createScan({ target_id: targetId });
      setScan(created);
      const found = await sentinelApi.getFindings(created.id);
      setFindings(found);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scan failed');
    } finally {
      setLoading(false);
    }
  };

  const grouped = SEVERITY_ORDER.map((sev) => ({
    severity: sev,
    items: findings.filter((f) => f.severity === sev),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
        Only scan systems you own or have explicit permission to test.
      </div>

      <SentinelCard title="Authorised target">
        {!targets.length ? (
          <p className="text-sm text-zinc-500">
            No targets yet.{' '}
            <Link to="/admin/sentinel/targets" className="text-rose-300 hover:underline">
              Add a target
            </Link>{' '}
            you are authorised to assess.
          </p>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-[16rem] flex-1 text-sm">
              <span className="mb-1 block text-zinc-500">Target</span>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-zinc-100 outline-none focus:border-rose-400/40"
              >
                {targets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.url}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={loading || !targetId}
              onClick={() => void runScan()}
              className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-4 py-2 text-sm text-rose-100 hover:bg-rose-500/25 disabled:opacity-50"
            >
              {loading ? 'Scanning…' : 'Start passive scan'}
            </button>
          </div>
        )}
        {error && <p className="mt-3 text-sm text-amber-200">{error}</p>}
      </SentinelCard>

      {scan && (
        <SentinelCard title="Scan result">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500">Target</p>
              <p className="mt-1 text-sm text-zinc-100">{scan.target_url}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500">Status</p>
              <p className="mt-1 text-sm capitalize text-zinc-100">{scan.status}</p>
              {scan.duration_ms != null && (
                <p className="text-[11px] text-zinc-500">{scan.duration_ms} ms</p>
              )}
            </div>
            <ScoreDisplay score={scan.score} size="sm" />
          </div>

          {scan.findings_summary && (
            <div className="mt-4 flex flex-wrap gap-2">
              {(
                [
                  ['critical', scan.findings_summary.critical],
                  ['high', scan.findings_summary.high],
                  ['medium', scan.findings_summary.medium],
                  ['low', scan.findings_summary.low],
                  ['informational', scan.findings_summary.informational],
                ] as const
              ).map(([sev, count]) => (
                <div
                  key={sev}
                  className="flex items-center gap-2 rounded-lg border border-white/10 px-2.5 py-1"
                >
                  <SeverityBadge severity={sev} />
                  <span className="font-mono text-sm text-zinc-200">{count}</span>
                </div>
              ))}
            </div>
          )}

          {scan.error_summary && (
            <p className="mt-3 text-sm text-amber-200">{scan.error_summary}</p>
          )}
        </SentinelCard>
      )}

      {grouped.map((group) => (
        <SentinelCard
          key={group.severity}
          title={`${group.severity.charAt(0).toUpperCase()}${group.severity.slice(1)} findings`}
        >
          <div className="space-y-2">
            {group.items.map((f) => (
              <FindingRow key={f.id} finding={f} />
            ))}
          </div>
        </SentinelCard>
      ))}
    </div>
  );
}
