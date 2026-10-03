import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SentinelCard from '../../../components/admin/sentinel/SentinelCard';
import ScoreChart from '../../../components/admin/sentinel/ScoreChart';
import { sentinelApi } from '../../../lib/sentinel/api';
import type { Scan, Target } from '../../../lib/sentinel/types';

export default function SentinelHistory() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [targetId, setTargetId] = useState('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([sentinelApi.listScans(), sentinelApi.listTargets()])
      .then(([scanList, targetList]) => {
        setScans(scanList);
        setTargets(targetList);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load history'));
  }, []);

  const filtered = useMemo(
    () => (targetId === 'all' ? scans : scans.filter((s) => s.target_id === targetId)),
    [scans, targetId]
  );

  const byTarget = useMemo(() => {
    const map = new Map<string, Scan[]>();
    for (const scan of filtered.filter((s) => s.status === 'completed' && s.score != null)) {
      const list = map.get(scan.target_id) ?? [];
      list.push(scan);
      map.set(scan.target_id, list);
    }
    return [...map.entries()].map(([id, list]) => {
      const target = targets.find((t) => t.id === id);
      const ordered = [...list].sort(
        (a, b) =>
          new Date(a.finished_at || a.created_at).getTime() -
          new Date(b.finished_at || b.created_at).getTime()
      );
      return {
        id,
        name: target?.name || ordered[0]?.target_url || id,
        scans: ordered,
        chart: ordered.map((s) => ({
          date: s.finished_at || s.created_at,
          score: s.score as number,
        })),
      };
    });
  }, [filtered, targets]);

  return (
    <div className="space-y-4">
      <SentinelCard title="Scan history">
        <label className="text-sm">
          <span className="mb-1 block text-zinc-500">Filter by target</span>
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-zinc-100"
          >
            <option value="all">All targets</option>
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        {error && <p className="mt-3 text-sm text-amber-200">{error}</p>}
      </SentinelCard>

      {byTarget.map((group) => (
        <SentinelCard key={group.id} title={group.name}>
          <p className="mb-3 font-mono text-sm text-zinc-400">
            {group.scans
              .map(
                (s) =>
                  `${new Date(s.finished_at || s.created_at).toLocaleDateString()} → ${s.score}`
              )
              .join(' · ')}
          </p>
          <ScoreChart points={group.chart} />
        </SentinelCard>
      ))}

      <SentinelCard title="All scans">
        {!filtered.length ? (
          <p className="text-sm text-zinc-500">No scans recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((scan) => (
              <li
                key={scan.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3"
              >
                <div>
                  <p className="text-sm text-zinc-100">{scan.target_name || scan.target_url}</p>
                  <p className="text-[11px] text-zinc-500">
                    {new Date(scan.created_at).toLocaleString()} · {scan.status}
                    {scan.duration_ms != null ? ` · ${scan.duration_ms} ms` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-rose-200">
                    {scan.score === null ? '—' : scan.score}
                  </span>
                  {scan.status === 'completed' && (
                    <Link
                      to={`/admin/sentinel/reports?scan=${scan.id}`}
                      className="text-xs text-zinc-400 hover:text-rose-200"
                    >
                      Report
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SentinelCard>
    </div>
  );
}
