import SentinelCard from '../../../../components/admin/sentinel/SentinelCard';
import WebToolRunner from '../../../../components/admin/sentinel/WebToolRunner';
import { sentinelApi } from '../../../../lib/sentinel/api';

type EmailAuthResult = {
  hostname: string;
  apex: string;
  spf: { present: boolean; records: string[] };
  dmarc: { present: boolean; name: string; records: string[] };
  dkim: {
    present: boolean;
    selectors_checked: string[];
    records: { selector: string; name: string; value: string }[];
  };
  issues: string[];
  limitations: string;
};

function Flag({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-xs font-medium ${
        ok ? 'bg-emerald-500/15 text-emerald-200' : 'bg-amber-500/15 text-amber-100'
      }`}
    >
      {label}: {ok ? 'present' : 'missing'}
    </span>
  );
}

export default function EmailAuth() {
  return (
    <WebToolRunner
      title="Email Auth DNS"
      teaches="What this teaches: SPF, DMARC, and DKIM are public DNS signals for mail authenticity — presence is not the same as a correct policy."
      actionLabel="Check email DNS"
      onRun={(targetId) => sentinelApi.toolEmailAuth({ target_id: targetId })}
    >
      {(raw) => {
        const r = raw as EmailAuthResult;
        return (
          <>
            <SentinelCard title="Domain">
              <p className="font-mono text-sm text-zinc-100">{r.apex}</p>
              <p className="mt-1 text-xs text-zinc-500">From host {r.hostname}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Flag ok={r.spf.present} label="SPF" />
                <Flag ok={r.dmarc.present} label="DMARC" />
                <Flag ok={r.dkim.present} label="DKIM (common selectors)" />
              </div>
              <p className="mt-3 text-xs text-zinc-500">{r.limitations}</p>
            </SentinelCard>
            {r.issues.length > 0 && (
              <SentinelCard title="Gaps">
                <ul className="list-inside list-disc space-y-1 text-sm text-amber-100">
                  {r.issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              </SentinelCard>
            )}
            <SentinelCard title="SPF">
              {r.spf.records.length ? (
                r.spf.records.map((rec) => (
                  <pre
                    key={rec}
                    className="mb-2 overflow-x-auto rounded-lg border border-white/10 bg-black/30 p-3 font-mono text-[11px] text-zinc-300"
                  >
                    {rec}
                  </pre>
                ))
              ) : (
                <p className="text-sm text-zinc-500">No v=spf1 TXT on apex.</p>
              )}
            </SentinelCard>
            <SentinelCard title="DMARC">
              <p className="mb-2 font-mono text-xs text-zinc-500">{r.dmarc.name}</p>
              {r.dmarc.records.length ? (
                r.dmarc.records.map((rec) => (
                  <pre
                    key={rec}
                    className="mb-2 overflow-x-auto rounded-lg border border-white/10 bg-black/30 p-3 font-mono text-[11px] text-zinc-300"
                  >
                    {rec}
                  </pre>
                ))
              ) : (
                <p className="text-sm text-zinc-500">No v=DMARC1 record.</p>
              )}
            </SentinelCard>
            <SentinelCard title="DKIM (common selectors)">
              {r.dkim.records.length ? (
                <div className="space-y-2">
                  {r.dkim.records.map((rec) => (
                    <div
                      key={rec.name}
                      className="rounded-lg border border-white/10 bg-black/30 px-3 py-2"
                    >
                      <p className="font-mono text-xs text-rose-200">
                        {rec.selector} → {rec.name}
                      </p>
                      <pre className="mt-1 overflow-x-auto font-mono text-[11px] text-zinc-400">
                        {rec.value}
                      </pre>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">
                  None of: {r.dkim.selectors_checked.slice(0, 6).join(', ')}…
                </p>
              )}
            </SentinelCard>
          </>
        );
      }}
    </WebToolRunner>
  );
}
