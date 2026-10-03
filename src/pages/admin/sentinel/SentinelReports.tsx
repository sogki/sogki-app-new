import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import SentinelCard from '../../../components/admin/sentinel/SentinelCard';
import FindingRow from '../../../components/admin/sentinel/FindingRow';
import ScoreDisplay from '../../../components/admin/sentinel/ScoreDisplay';
import { getAdminToken } from '../../../lib/adminApi';
import { sentinelApi } from '../../../lib/sentinel/api';
import type { Report, Scan } from '../../../lib/sentinel/types';

export default function SentinelReports() {
  const [params, setParams] = useSearchParams();
  const [scans, setScans] = useState<Scan[]>([]);
  const [scanId, setScanId] = useState(params.get('scan') || '');
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void sentinelApi
      .listScans()
      .then((list) => {
        const completed = list.filter((s) => s.status === 'completed');
        setScans(completed);
        if (!scanId && completed[0]) setScanId(completed[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load scans'));
  }, []);

  useEffect(() => {
    if (!scanId) {
      setReport(null);
      return;
    }
    const next = new URLSearchParams(params);
    next.set('scan', scanId);
    setParams(next, { replace: true });
    void sentinelApi
      .getReport(scanId)
      .then(setReport)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load report'));
  }, [scanId]);

  const downloadPdf = async () => {
    if (!scanId) return;
    const token = getAdminToken();
    if (!token) {
      setError('Not authenticated');
      return;
    }
    try {
      const pdfUrl = await sentinelApi.getReportPdfUrl(scanId);
      const res = await fetch(pdfUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`PDF failed: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sentinel-report-${scanId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PDF download failed');
    }
  };

  return (
    <div className="space-y-4">
      <SentinelCard
        title="Private assessment report"
        actions={
          report ? (
            <button
              type="button"
              onClick={() => void downloadPdf()}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5"
            >
              Download PDF
            </button>
          ) : null
        }
      >
        <label className="text-sm">
          <span className="mb-1 block text-zinc-500">Completed scan</span>
          <select
            value={scanId}
            onChange={(e) => setScanId(e.target.value)}
            className="w-full max-w-xl rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-zinc-100"
          >
            {!scans.length && <option value="">No completed scans</option>}
            {scans.map((s) => (
              <option key={s.id} value={s.id}>
                {s.target_name || s.target_url} —{' '}
                {s.finished_at ? new Date(s.finished_at).toLocaleString() : s.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </label>
        {error && <p className="mt-3 text-sm text-amber-200">{error}</p>}
      </SentinelCard>

      {report && (
        <>
          <SentinelCard title="Executive summary">
            <div className="mb-4 grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500">Target</p>
                <p className="mt-1 text-sm text-zinc-100">{report.target_name}</p>
                <p className="text-xs text-zinc-500">{report.target_url}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500">Scan date</p>
                <p className="mt-1 text-sm text-zinc-100">
                  {new Date(report.scan_date).toLocaleString()}
                </p>
              </div>
              <ScoreDisplay score={report.score} size="sm" />
            </div>
            <p className="text-sm leading-relaxed text-zinc-300">{report.executive_summary}</p>
          </SentinelCard>

          <SentinelCard title="Recommendations">
            <ul className="list-inside list-disc space-y-1 text-sm text-zinc-300">
              {report.recommendations.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </SentinelCard>

          <SentinelCard title="Findings">
            <div className="space-y-2">
              {report.findings.map((f) => (
                <FindingRow key={f.id} finding={f} />
              ))}
            </div>
          </SentinelCard>

          <SentinelCard title="Scan limitations">
            <p className="text-sm leading-relaxed text-zinc-400">{report.limitations}</p>
          </SentinelCard>
        </>
      )}
    </div>
  );
}
