import { useEffect, useMemo, useState } from 'react';
import SentinelCard from '../../../components/admin/sentinel/SentinelCard';
import FindingRow from '../../../components/admin/sentinel/FindingRow';
import { sentinelApi } from '../../../lib/sentinel/api';
import type { Finding, Scan, Severity, TriageStatus } from '../../../lib/sentinel/types';

export default function SentinelFindings() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [scanId, setScanId] = useState('');
  const [findings, setFindings] = useState<Finding[]>([]);
  const [filter, setFilter] = useState<Severity | 'all'>('all');
  const [triageFilter, setTriageFilter] = useState<TriageStatus | 'all'>('open');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void sentinelApi
      .listScans()
      .then((list) => {
        const completed = list.filter((s) => s.status === 'completed');
        setScans(completed);
        if (completed[0]) setScanId(completed[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load scans'));
  }, []);

  useEffect(() => {
    if (!scanId) {
      setFindings([]);
      return;
    }
    void sentinelApi
      .getFindings(scanId)
      .then(setFindings)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load findings'));
  }, [scanId]);

  const filtered = useMemo(
    () =>
      findings.filter((f) => {
        if (filter !== 'all' && f.severity !== filter) return false;
        const status = f.triage_status || 'open';
        if (triageFilter !== 'all' && status !== triageFilter) return false;
        return true;
      }),
    [findings, filter, triageFilter]
  );

  return (
    <div className="space-y-4">
      <SentinelCard title="Findings browser">
        <div className="flex flex-wrap gap-3">
          <label className="min-w-[14rem] flex-1 text-sm">
            <span className="mb-1 block text-zinc-500">Scan</span>
            <select
              value={scanId}
              onChange={(e) => setScanId(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-zinc-100"
            >
              {!scans.length && <option value="">No completed scans</option>}
              {scans.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.target_name || s.target_url} —{' '}
                  {s.finished_at ? new Date(s.finished_at).toLocaleString() : s.status}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-zinc-500">Severity</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as Severity | 'all')}
              className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-zinc-100"
            >
              <option value="all">All</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="informational">Informational</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-zinc-500">Triage</span>
            <select
              value={triageFilter}
              onChange={(e) => setTriageFilter(e.target.value as TriageStatus | 'all')}
              className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-zinc-100"
            >
              <option value="open">Open</option>
              <option value="accepted">Accepted</option>
              <option value="fixed">Fixed</option>
              <option value="all">All</option>
            </select>
          </label>
        </div>
        {error && <p className="mt-3 text-sm text-amber-200">{error}</p>}
      </SentinelCard>

      <SentinelCard title={`${filtered.length} finding${filtered.length === 1 ? '' : 's'}`}>
        {!filtered.length ? (
          <p className="text-sm text-zinc-500">No findings for this filter.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((f) => (
              <FindingRow
                key={f.id}
                finding={f}
                onUpdated={(next) =>
                  setFindings((prev) => prev.map((row) => (row.id === next.id ? next : row)))
                }
              />
            ))}
          </div>
        )}
      </SentinelCard>
    </div>
  );
}
