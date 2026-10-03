import SentinelCard from '../../../../components/admin/sentinel/SentinelCard';
import WebToolRunner from '../../../../components/admin/sentinel/WebToolRunner';
import { sentinelApi } from '../../../../lib/sentinel/api';

type DnsResult = {
  hostname: string;
  records: { type: string; name: string; value: string }[];
  cname_chain: string[];
  addresses: string[];
  ptr: { ip: string; ptr: string }[];
  infrastructure_hints: string[];
  limitations: string;
  error: string | null;
};

export default function DnsMapper() {
  return (
    <WebToolRunner
      title="DNS Connection Mapper"
      teaches="What this teaches: public DNS shows IPs and CNAME/CDN paths — not a full proxy or subdomain inventory."
      actionLabel="Resolve DNS"
      onRun={(targetId) => sentinelApi.toolDns({ target_id: targetId })}
    >
      {(raw) => {
        const r = raw as DnsResult;
        return (
          <>
            {r.error && (
              <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                {r.error}
              </div>
            )}
            <SentinelCard title="Hostname">
              <p className="font-mono text-sm text-zinc-100">{r.hostname}</p>
              <p className="mt-2 text-xs text-zinc-500">{r.limitations}</p>
            </SentinelCard>
            <SentinelCard title="CNAME chain">
              <p className="font-mono text-xs text-zinc-300">{r.cname_chain.join(' → ')}</p>
            </SentinelCard>
            <SentinelCard title="Addresses">
              <ul className="space-y-1 font-mono text-sm text-zinc-200">
                {r.addresses.length ? r.addresses.map((a) => <li key={a}>{a}</li>) : <li>—</li>}
              </ul>
            </SentinelCard>
            {r.infrastructure_hints.length > 0 && (
              <SentinelCard title="Infrastructure hints">
                <ul className="list-inside list-disc text-sm text-sky-200">
                  {r.infrastructure_hints.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </SentinelCard>
            )}
            <SentinelCard title="Records">
              <div className="space-y-1">
                {r.records.map((rec, i) => (
                  <div
                    key={`${rec.type}-${rec.name}-${rec.value}-${i}`}
                    className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 font-mono text-[11px] text-zinc-300"
                  >
                    <span className="text-rose-200">{rec.type}</span> {rec.name} → {rec.value}
                  </div>
                ))}
              </div>
            </SentinelCard>
            {r.ptr.length > 0 && (
              <SentinelCard title="PTR">
                <ul className="space-y-1 font-mono text-xs text-zinc-300">
                  {r.ptr.map((p) => (
                    <li key={`${p.ip}-${p.ptr}`}>
                      {p.ip} → {p.ptr}
                    </li>
                  ))}
                </ul>
              </SentinelCard>
            )}
          </>
        );
      }}
    </WebToolRunner>
  );
}
