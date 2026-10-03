import SentinelCard from '../../../../components/admin/sentinel/SentinelCard';
import WebToolRunner from '../../../../components/admin/sentinel/WebToolRunner';
import { sentinelApi } from '../../../../lib/sentinel/api';

export default function AssetInventory() {
  return (
    <WebToolRunner
      title="Asset Inventory"
      teaches="What this teaches: third-party scripts and mixed content expand your trust boundary."
      actionLabel="Inventory assets"
      onRun={(targetId) => sentinelApi.toolAssets({ target_id: targetId })}
    >
      {(raw) => {
        const r = raw as {
          page_host: string;
          third_party_count: number;
          mixed_content_count: number;
          assets: {
            kind: string;
            absolute_url: string;
            host: string;
            third_party: boolean;
            mixed_content: boolean;
          }[];
        };
        return (
          <>
            <SentinelCard title="Summary">
              <p className="text-sm text-zinc-300">
                Host <span className="font-mono">{r.page_host}</span> · {r.assets.length} assets ·{' '}
                {r.third_party_count} third-party · {r.mixed_content_count} mixed content
              </p>
            </SentinelCard>
            <SentinelCard title="Assets">
              <div className="max-h-[28rem] space-y-1 overflow-auto">
                {r.assets.map((a, i) => (
                  <div
                    key={`${a.absolute_url}-${i}`}
                    className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[11px]"
                  >
                    <span className="font-mono text-rose-200">{a.kind}</span>
                    {a.third_party && (
                      <span className="ml-2 text-sky-300">third-party</span>
                    )}
                    {a.mixed_content && (
                      <span className="ml-2 text-amber-200">mixed</span>
                    )}
                    <p className="mt-1 break-all font-mono text-zinc-400">{a.absolute_url}</p>
                  </div>
                ))}
              </div>
            </SentinelCard>
          </>
        );
      }}
    </WebToolRunner>
  );
}
