import { useMemo, useState } from 'react';
import SentinelCard from '../../../../components/admin/sentinel/SentinelCard';
import ToolShell from '../../../../components/admin/sentinel/ToolShell';
import { scorePassword } from '../../../../lib/sentinel/localCrypto';

export default function PasswordStrength() {
  const [password, setPassword] = useState('');
  const result = useMemo(() => scorePassword(password), [password]);

  return (
    <ToolShell
      title="Password Strength"
      teaches="What this teaches: length and unpredictability beat character-class checklists alone — and common patterns destroy entropy."
    >
      <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-zinc-400">
        Analysed only in this browser tab. Nothing is stored or sent to the API.
      </div>

      <SentinelCard title="Password">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-zinc-100 outline-none focus:border-rose-400/40"
          placeholder="Type a password to evaluate locally"
          autoComplete="new-password"
        />
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-zinc-400">Strength</span>
            <span className="font-mono text-zinc-100">
              {result.label} ({result.score}/5)
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-rose-400/80 transition-all"
              style={{ width: `${(result.score / 5) * 100}%` }}
            />
          </div>
        </div>
      </SentinelCard>

      <SentinelCard title="Guidance">
        <ul className="list-inside list-disc space-y-1 text-sm text-zinc-400">
          {result.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </SentinelCard>
    </ToolShell>
  );
}
