import type { Severity } from '../../../lib/sentinel/types';
import { severityLabel } from '../../../lib/sentinel/severity';

const STYLES: Record<Severity, string> = {
  critical: 'border-rose-500/40 bg-rose-500/15 text-rose-200',
  high: 'border-orange-500/40 bg-orange-500/15 text-orange-200',
  medium: 'border-amber-500/40 bg-amber-500/15 text-amber-100',
  low: 'border-sky-500/40 bg-sky-500/15 text-sky-200',
  informational: 'border-zinc-500/40 bg-zinc-500/15 text-zinc-300',
};

export default function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${STYLES[severity]}`}
    >
      {severityLabel(severity)}
    </span>
  );
}
