import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Finding, TriageStatus } from '../../../lib/sentinel/types';
import { sentinelApi } from '../../../lib/sentinel/api';
import SeverityBadge from './SeverityBadge';

const TRIAGE_OPTIONS: { value: TriageStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'fixed', label: 'Fixed' },
];

export default function FindingRow({
  finding,
  onUpdated,
}: {
  finding: Finding;
  onUpdated?: (next: Finding) => void;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<TriageStatus>(finding.triage_status || 'open');
  const [notes, setNotes] = useState(finding.triage_notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveTriage = async (nextStatus: TriageStatus, nextNotes: string) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await sentinelApi.updateFindingTriage(finding.id, {
        triage_status: nextStatus,
        triage_notes: nextNotes,
      });
      setStatus(updated.triage_status);
      setNotes(updated.triage_notes);
      onUpdated?.(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save triage');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-black/20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
      >
        <SeverityBadge severity={finding.severity} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-100">{finding.title}</p>
          <p className="mt-0.5 text-[11px] uppercase tracking-wide text-zinc-500">
            {finding.category.replace(/_/g, ' ')} · {status}
          </p>
        </div>
        <ChevronDown
          size={16}
          className={`mt-1 shrink-0 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="space-y-3 border-t border-white/5 px-4 py-3 text-sm text-zinc-300">
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Description
            </p>
            <p className="mt-1 leading-relaxed">{finding.description}</p>
          </section>
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Evidence
            </p>
            <pre className="mt-1 overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-xs text-zinc-400">
              {finding.evidence || '—'}
            </pre>
          </section>
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Impact
            </p>
            <p className="mt-1 leading-relaxed">{finding.impact}</p>
          </section>
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Recommendation
            </p>
            <p className="mt-1 leading-relaxed">{finding.remediation}</p>
          </section>
          {finding.references?.length > 0 && (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                References
              </p>
              <ul className="mt-1 list-inside list-disc space-y-1 text-xs text-rose-200/80">
                {finding.references.map((ref) => (
                  <li key={ref}>
                    <a href={ref} target="_blank" rel="noreferrer" className="hover:underline">
                      {ref}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className="rounded-lg border border-white/10 bg-black/30 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Triage
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <label className="text-xs text-zinc-400">
                Status
                <select
                  value={status}
                  disabled={saving}
                  onChange={(e) => {
                    const next = e.target.value as TriageStatus;
                    setStatus(next);
                    void saveTriage(next, notes);
                  }}
                  className="mt-1 block rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-zinc-100"
                >
                  {TRIAGE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="min-w-[12rem] flex-1 text-xs text-zinc-400">
                Notes
                <input
                  value={notes}
                  disabled={saving}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={() => {
                    if (notes !== (finding.triage_notes || '')) {
                      void saveTriage(status, notes);
                    }
                  }}
                  placeholder="Why accepted / how fixed…"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-zinc-100"
                />
              </label>
            </div>
            {error && <p className="mt-2 text-xs text-amber-200">{error}</p>}
          </section>
        </div>
      )}
    </div>
  );
}
