import { useMemo, useState } from 'react';
import SentinelCard from '../../../../components/admin/sentinel/SentinelCard';
import ToolShell from '../../../../components/admin/sentinel/ToolShell';
import { interpretTimestamp } from '../../../../lib/sentinel/localLabs';

export default function TimestampLab() {
  const [input, setInput] = useState(String(Math.floor(Date.now() / 1000)));
  const result = useMemo(() => interpretTimestamp(input), [input]);

  return (
    <ToolShell
      title="Cron / Timestamp Lab"
      teaches="What this teaches: unix time and JWT exp claims are easy to misread across seconds vs milliseconds."
    >
      <SentinelCard title="Input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-zinc-100"
          placeholder="1710000000 or 2026-10-03T12:00:00Z"
        />
        <button
          type="button"
          className="mt-2 text-xs text-rose-300 hover:underline"
          onClick={() => setInput(String(Math.floor(Date.now() / 1000)))}
        >
          Use now (unix seconds)
        </button>
      </SentinelCard>
      <SentinelCard title="Interpreted">
        {result.error ? (
          <p className="text-sm text-amber-200">{result.error}</p>
        ) : (
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-zinc-500">UTC</dt>
              <dd className="font-mono text-zinc-100">{result.asDateUtc}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-zinc-500">Unix seconds</dt>
              <dd className="font-mono text-zinc-100">{result.asUnixSeconds}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-zinc-500">Unix millis</dt>
              <dd className="font-mono text-zinc-100">{result.asUnixMillis}</dd>
            </div>
          </dl>
        )}
      </SentinelCard>
    </ToolShell>
  );
}
