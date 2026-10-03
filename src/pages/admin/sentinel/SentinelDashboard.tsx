import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ToolCard from '../../../components/admin/sentinel/ToolCard';
import SentinelCard from '../../../components/admin/sentinel/SentinelCard';
import ScoreDisplay from '../../../components/admin/sentinel/ScoreDisplay';
import { sentinelApi } from '../../../lib/sentinel/api';
import { SENTINEL_TOOLS } from '../../../lib/sentinel/tools';
import type { DashboardData } from '../../../lib/sentinel/types';

const EMPTY: DashboardData = {
  system_status: 'offline',
  security_score: null,
  total_scans: 0,
  findings: { critical: 0, high: 0, medium: 0, low: 0, informational: 0, total: 0 },
  open_findings: { critical: 0, high: 0, medium: 0, low: 0, informational: 0, total: 0 },
  target_health: [],
  recent_scans: [],
  recent_targets: [],
  score_over_time: [],
};

export default function SentinelDashboard() {
  const [data, setData] = useState<DashboardData>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [rescanning, setRescanning] = useState<string | null>(null);

  const load = useCallback(() => {
    void sentinelApi
      .dashboard()
      .then((dash) => {
        setData(dash);
        setError(null);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load status');
        setData(EMPTY);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rescan = async (targetId: string) => {
    setRescanning(targetId);
    setError(null);
    try {
      await sentinelApi.createScan({ target_id: targetId });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Rescan failed');
    } finally {
      setRescanning(null);
    }
  };

  const statusColor =
    data.system_status === 'operational'
      ? 'bg-emerald-400'
      : data.system_status === 'degraded'
        ? 'bg-amber-400'
        : 'bg-zinc-500';

  const open = data.open_findings ?? data.findings;

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SentinelCard title="System">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${statusColor}`} />
            <span className="text-sm capitalize text-zinc-200">{data.system_status}</span>
          </div>
        </SentinelCard>
        <SentinelCard title="Score">
          <ScoreDisplay score={data.security_score} size="sm" />
        </SentinelCard>
        <SentinelCard title="Scans">
          <p className="font-mono text-2xl text-zinc-100">{data.total_scans}</p>
        </SentinelCard>
        <SentinelCard title="Open findings">
          <p className="font-mono text-2xl text-zinc-100">{open.total}</p>
          <p className="mt-1 text-[11px] text-zinc-500">
            {open.critical} crit · {open.high} high · {open.medium} med
          </p>
        </SentinelCard>
      </div>

      {data.target_health.length > 0 && (
        <section>
          <div className="mb-3">
            <h2 className="text-sm font-semibold tracking-wide text-zinc-200">Target health</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Latest score, open highs, and age of last scan — re-run from here.
            </p>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {data.target_health.map((row) => (
              <div
                key={row.target_id}
                className="rounded-xl border border-white/10 bg-[#0c0c0e] px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-100">{row.name}</p>
                    <p className="truncate font-mono text-[11px] text-zinc-500">{row.url}</p>
                  </div>
                  <ScoreDisplay score={row.last_score} size="sm" />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
                  <span>
                    Last scan:{' '}
                    {row.days_since_scan == null
                      ? 'never'
                      : row.days_since_scan === 0
                        ? 'today'
                        : `${row.days_since_scan}d ago`}
                  </span>
                  <span className="text-rose-200/90">
                    {row.open_critical} crit · {row.open_high} high open
                  </span>
                  <span>{row.open_total} open total</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={rescanning === row.target_id}
                    onClick={() => void rescan(row.target_id)}
                    className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-3 py-1.5 text-xs text-rose-100 hover:bg-rose-500/25 disabled:opacity-50"
                  >
                    {rescanning === row.target_id ? 'Scanning…' : 'Re-scan'}
                  </button>
                  <Link
                    to="/admin/sentinel/findings"
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5"
                  >
                    Findings
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-zinc-200">Tool launcher</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Web labs require an allowlisted target. Local tools never leave the browser.
            </p>
          </div>
          <Link to="/admin/sentinel/targets" className="text-xs text-rose-300 hover:underline">
            Manage targets
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {SENTINEL_TOOLS.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </section>

      {data.recent_scans.length > 0 && (
        <SentinelCard title="Recent scans">
          <ul className="space-y-2">
            {data.recent_scans.slice(0, 5).map((scan) => (
              <li
                key={scan.id}
                className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2"
              >
                <div>
                  <p className="text-sm text-zinc-100">{scan.target_name || scan.target_url}</p>
                  <p className="text-[11px] text-zinc-500">
                    {scan.finished_at
                      ? new Date(scan.finished_at).toLocaleString()
                      : scan.status}
                  </p>
                </div>
                <span className="font-mono text-sm text-rose-200">
                  {scan.score === null ? '—' : scan.score}
                </span>
              </li>
            ))}
          </ul>
        </SentinelCard>
      )}
    </div>
  );
}
