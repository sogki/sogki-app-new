import { useState } from 'react';
import SentinelCard from '../../../../components/admin/sentinel/SentinelCard';
import TargetPicker from '../../../../components/admin/sentinel/TargetPicker';
import ToolShell from '../../../../components/admin/sentinel/ToolShell';
import { sentinelApi } from '../../../../lib/sentinel/api';

type FileResult = {
  name: string;
  url: string;
  status_code: number | null;
  bytes: number;
  body_preview: string;
  notes: string[];
  error: string | null;
};

type Result = {
  base_url: string;
  files: FileResult[];
};

export default function DisclosureAnalyzer() {
  const [targetId, setTargetId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const run = async () => {
    if (!targetId) return;
    setLoading(true);
    setError(null);
    try {
      const data = (await sentinelApi.toolDisclosure({
        target_id: targetId,
      })) as unknown as Result;
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Disclosure analysis failed');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolShell
      title="Disclosure Analyzer"
      teaches="What this teaches: public metadata files are intentional disclosures — useful for operators and attackers alike."
      outbound
    >
      <SentinelCard title="Analyse">
        <div className="flex flex-wrap items-end gap-3">
          <TargetPicker value={targetId} onChange={setTargetId} />
          <button
            type="button"
            disabled={!targetId || loading}
            onClick={() => void run()}
            className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-4 py-2 text-sm text-rose-100 hover:bg-rose-500/25 disabled:opacity-50"
          >
            {loading ? 'Fetching…' : 'Analyse public files'}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-amber-200">{error}</p>}
      </SentinelCard>

      {result?.files.map((file) => (
        <SentinelCard key={file.name} title={file.name}>
          <p className="font-mono text-xs text-zinc-500">{file.url}</p>
          <p className="mt-1 text-sm text-zinc-300">
            Status: <span className="font-mono">{file.status_code ?? '—'}</span>
            {file.bytes ? ` · ${file.bytes} bytes` : ''}
          </p>
          <ul className="mt-2 list-inside list-disc text-sm text-zinc-400">
            {file.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          {file.body_preview && (
            <pre className="mt-3 max-h-56 overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-[11px] text-zinc-400">
              {file.body_preview}
            </pre>
          )}
        </SentinelCard>
      ))}
    </ToolShell>
  );
}
