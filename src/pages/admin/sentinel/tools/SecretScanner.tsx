import { useMemo, useState } from 'react';
import SentinelCard from '../../../../components/admin/sentinel/SentinelCard';
import ToolShell from '../../../../components/admin/sentinel/ToolShell';
import { scanSecrets } from '../../../../lib/sentinel/localLabs';

export default function SecretScanner() {
  const [text, setText] = useState(
    'example env\nAWS_KEY=AKIAIOSFODNN7EXAMPLE\nTOKEN=ghp_exampleExampleExampleExample12\n'
  );
  const hits = useMemo(() => scanSecrets(text), [text]);

  return (
    <ToolShell
      title="Secret Pattern Scanner"
      teaches="What this teaches: secret scanners are noisy — paste scope and false positives are part of the job."
    >
      <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-zinc-400">
        Paste-only, local analysis. Expect false positives. Never paste production secrets into shared machines.
      </div>
      <SentinelCard title="Paste">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-zinc-100"
        />
      </SentinelCard>
      <SentinelCard title={`${hits.length} hit(s)`}>
        {!hits.length ? (
          <p className="text-sm text-zinc-500">No patterns matched.</p>
        ) : (
          <ul className="space-y-2">
            {hits.map((h, i) => (
              <li
                key={`${h.label}-${h.index}-${i}`}
                className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm"
              >
                <p className="text-rose-200">{h.label}</p>
                <p className="mt-1 break-all font-mono text-xs text-zinc-400">
                  @{h.index}: {h.match}
                </p>
              </li>
            ))}
          </ul>
        )}
      </SentinelCard>
    </ToolShell>
  );
}
