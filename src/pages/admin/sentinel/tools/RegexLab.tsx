import { useMemo, useState } from 'react';
import SentinelCard from '../../../../components/admin/sentinel/SentinelCard';
import ToolShell from '../../../../components/admin/sentinel/ToolShell';
import { runRegex } from '../../../../lib/sentinel/localLabs';

export default function RegexLab() {
  const [pattern, setPattern] = useState('\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b');
  const [flags, setFlags] = useState('gi');
  const [input, setInput] = useState('Contact sec@example.com or admin@sogki.dev');
  const result = useMemo(() => runRegex(pattern, flags, input), [pattern, flags, input]);

  return (
    <ToolShell
      title="Regex Lab"
      teaches="What this teaches: pattern matching is powerful and easy to get subtly wrong."
    >
      <SentinelCard title="Pattern">
        <div className="grid gap-3 md:grid-cols-[1fr_6rem]">
          <input
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-zinc-100"
          />
          <input
            value={flags}
            onChange={(e) => setFlags(e.target.value)}
            className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-zinc-100"
            placeholder="flags"
          />
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={5}
          className="mt-3 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-zinc-100"
        />
      </SentinelCard>
      <SentinelCard title="Matches">
        {!result.ok ? (
          <p className="text-sm text-amber-200">{result.error}</p>
        ) : !result.matches.length ? (
          <p className="text-sm text-zinc-500">No matches.</p>
        ) : (
          <ul className="space-y-1 font-mono text-xs text-zinc-300">
            {result.matches.map((m, i) => (
              <li key={`${m.index}-${i}`}>
                @{m.index}: {m.text}
                {m.groups.length ? ` · groups=${JSON.stringify(m.groups)}` : ''}
              </li>
            ))}
          </ul>
        )}
      </SentinelCard>
    </ToolShell>
  );
}
