import { useState } from 'react';
import SentinelCard from '../../../../components/admin/sentinel/SentinelCard';
import ToolShell from '../../../../components/admin/sentinel/ToolShell';
import { PLAYBOOKS } from '../../../../lib/sentinel/playbooks';

export default function Playbooks() {
  const [active, setActive] = useState(PLAYBOOKS[0]?.id ?? '');
  const pb = PLAYBOOKS.find((p) => p.id === active) ?? PLAYBOOKS[0];

  return (
    <ToolShell
      title="Finding Playbooks"
      teaches="What this teaches: security findings are only useful if you can explain impact and remediation clearly."
    >
      <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
        <SentinelCard title="Topics">
          <ul className="space-y-1">
            {PLAYBOOKS.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setActive(p.id)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                    p.id === active
                      ? 'bg-rose-500/15 text-rose-200'
                      : 'text-zinc-400 hover:bg-white/5'
                  }`}
                >
                  {p.title}
                </button>
              </li>
            ))}
          </ul>
        </SentinelCard>
        {pb && (
          <div className="space-y-3">
            <SentinelCard title={pb.title}>
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">{pb.category}</p>
            </SentinelCard>
            <SentinelCard title="Why it matters">
              <p className="text-sm leading-relaxed text-zinc-300">{pb.whyItMatters}</p>
            </SentinelCard>
            <SentinelCard title="How I would explain it">
              <p className="text-sm leading-relaxed text-zinc-300">{pb.howToExplain}</p>
            </SentinelCard>
            <SentinelCard title="Remediation talk track">
              <p className="text-sm leading-relaxed text-zinc-300">{pb.remediationTalkTrack}</p>
            </SentinelCard>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
