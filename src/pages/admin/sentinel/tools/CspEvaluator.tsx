import SentinelCard from '../../../../components/admin/sentinel/SentinelCard';
import WebToolRunner from '../../../../components/admin/sentinel/WebToolRunner';
import { sentinelApi } from '../../../../lib/sentinel/api';

export default function CspEvaluator() {
  return (
    <WebToolRunner
      title="CSP Evaluator"
      teaches="What this teaches: a CSP can be present and still weak — directives matter."
      actionLabel="Evaluate CSP"
      onRun={(targetId) => sentinelApi.toolCsp({ target_id: targetId })}
    >
      {(raw) => {
        const r = raw as {
          mode: string;
          csp: string | null;
          csp_report_only: string | null;
          directives: Record<string, string[]>;
          issues: { severity: string; title: string; detail: string }[];
        };
        return (
          <>
            <SentinelCard title={`Mode: ${r.mode}`}>
              <pre className="overflow-auto whitespace-pre-wrap font-mono text-xs text-zinc-300">
                {r.csp || r.csp_report_only || '—'}
              </pre>
            </SentinelCard>
            <SentinelCard title="Issues">
              {!r.issues.length ? (
                <p className="text-sm text-zinc-500">No heuristic issues flagged.</p>
              ) : (
                <ul className="space-y-2">
                  {r.issues.map((i) => (
                    <li
                      key={i.title + i.detail}
                      className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm"
                    >
                      <p className="text-rose-200">
                        [{i.severity}] {i.title}
                      </p>
                      <p className="mt-1 font-mono text-xs text-zinc-400">{i.detail}</p>
                    </li>
                  ))}
                </ul>
              )}
            </SentinelCard>
            <SentinelCard title="Directives">
              <pre className="overflow-auto font-mono text-xs text-zinc-300">
                {JSON.stringify(r.directives, null, 2)}
              </pre>
            </SentinelCard>
          </>
        );
      }}
    </WebToolRunner>
  );
}
