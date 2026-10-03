import SentinelCard from '../../../../components/admin/sentinel/SentinelCard';
import WebToolRunner from '../../../../components/admin/sentinel/WebToolRunner';
import { sentinelApi } from '../../../../lib/sentinel/api';

export default function HstsPreload() {
  return (
    <WebToolRunner
      title="HSTS Preload Check"
      teaches="What this teaches: preload readiness is stricter than simply sending an HSTS header."
      actionLabel="Check preload readiness"
      onRun={(targetId) => sentinelApi.toolHstsPreload({ target_id: targetId })}
    >
      {(raw) => {
        const r = raw as {
          preload_ready: boolean;
          hsts: string | null;
          note: string;
          checks: { name: string; pass: boolean; detail: string }[];
        };
        return (
          <>
            <SentinelCard title={r.preload_ready ? 'Ready (checklist)' : 'Not ready'}>
              <p className="font-mono text-xs text-zinc-400">{r.hsts || 'No HSTS header'}</p>
              <p className="mt-2 text-xs text-zinc-500">{r.note}</p>
            </SentinelCard>
            <SentinelCard title="Checklist">
              <ul className="space-y-2">
                {r.checks.map((c) => (
                  <li
                    key={c.name}
                    className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="text-zinc-200">{c.name}</p>
                      <p className="font-mono text-[11px] text-zinc-500">{c.detail}</p>
                    </div>
                    <span className={c.pass ? 'text-emerald-300' : 'text-rose-300'}>
                      {c.pass ? 'PASS' : 'FAIL'}
                    </span>
                  </li>
                ))}
              </ul>
            </SentinelCard>
          </>
        );
      }}
    </WebToolRunner>
  );
}
