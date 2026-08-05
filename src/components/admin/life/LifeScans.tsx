import type { LifeScan } from '../../../lib/lifeDashboard/types';
import AdminCard from '../AdminCard';

type LifeScansProps = {
  scans: LifeScan[];
  onChange: (scans: LifeScan[]) => void;
  expanded?: boolean;
};

export default function LifeScans({ scans, onChange, expanded }: LifeScansProps) {
  const sorted = [...(scans ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <AdminCard id="widget-scans" title="Scans" className="h-full">
      <div className={expanded ? 'max-h-[70vh] space-y-2 overflow-y-auto' : 'space-y-2'}>
        {!sorted.length ? (
          <p className="text-xs text-gray-500">
            No scans yet — capture text or barcodes from the Ei mobile Camera.
          </p>
        ) : (
          sorted.map((scan) => {
            const hasCapture = Boolean(scan.imageDataUrl);
            const hasProduct = Boolean(scan.productImageUrl);
            return (
              <div
                key={scan.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{scan.title}</p>
                    <p className="text-[11px] text-slate-500">
                      {new Date(scan.createdAt).toLocaleString()}
                      {scan.locationLabel ? ` · ${scan.locationLabel}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onChange(scans.filter((s) => s.id !== scan.id))}
                    className="rounded-lg px-2 py-1 text-[11px] text-rose-300 hover:bg-rose-500/10"
                  >
                    Delete
                  </button>
                </div>

                {(hasProduct || hasCapture) && (
                  <div className="mb-2 grid grid-cols-2 gap-2">
                    {hasProduct ? (
                      <figure className="overflow-hidden rounded-lg border border-white/10 bg-black/40">
                        <figcaption className="px-2 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-violet-300">
                          Product
                        </figcaption>
                        <img
                          src={scan.productImageUrl!}
                          alt="Catalog product"
                          className="h-28 w-full object-contain p-1"
                        />
                      </figure>
                    ) : null}
                    {hasCapture ? (
                      <figure className="overflow-hidden rounded-lg border border-white/10 bg-black/40">
                        <figcaption className="px-2 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-violet-300">
                          Your scan
                        </figcaption>
                        <img
                          src={scan.imageDataUrl!}
                          alt="Captured scan"
                          className="h-28 w-full object-cover"
                        />
                      </figure>
                    ) : null}
                  </div>
                )}

                <pre className="whitespace-pre-wrap font-sans text-xs leading-5 text-slate-300">
                  {expanded ? scan.text : scan.text.slice(0, 220)}
                  {!expanded && scan.text.length > 220 ? '…' : ''}
                </pre>
              </div>
            );
          })
        )}
      </div>
    </AdminCard>
  );
}
