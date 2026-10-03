import SentinelCard from '../../../../components/admin/sentinel/SentinelCard';
import WebToolRunner from '../../../../components/admin/sentinel/WebToolRunner';
import { sentinelApi } from '../../../../lib/sentinel/api';

export default function MethodProbe() {
  return (
    <WebToolRunner
      title="HTTP Method Probe"
      teaches="What this teaches: verb exposure is a clue, not proof of an attack surface — keep probes minimal."
      actionLabel="Probe methods"
      onRun={(targetId) => sentinelApi.toolMethods({ target_id: targetId })}
    >
      {(raw) => {
        const r = raw as {
          limitations: string;
          results: {
            method: string;
            status_code: number | null;
            allow: string | null;
            error: string | null;
          }[];
        };
        return (
          <SentinelCard title="Results">
            <p className="mb-3 text-xs text-zinc-500">{r.limitations}</p>
            <div className="space-y-2">
              {r.results.map((row) => (
                <div
                  key={row.method}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm"
                >
                  <span className="font-mono text-rose-200">{row.method}</span>
                  <span className="font-mono text-zinc-300">
                    {row.error || row.status_code}
                    {row.allow ? ` · Allow: ${row.allow}` : ''}
                  </span>
                </div>
              ))}
            </div>
          </SentinelCard>
        );
      }}
    </WebToolRunner>
  );
}
