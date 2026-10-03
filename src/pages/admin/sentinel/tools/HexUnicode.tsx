import { useMemo, useState } from 'react';
import SentinelCard from '../../../../components/admin/sentinel/SentinelCard';
import ToolShell from '../../../../components/admin/sentinel/ToolShell';
import { inspectUnicode } from '../../../../lib/sentinel/localLabs';

export default function HexUnicode() {
  const [input, setInput] = useState('paypal.com vs paypa1.com · café vs cafe\u0301');
  const rows = useMemo(() => inspectUnicode(input), [input]);

  return (
    <ToolShell
      title="Hex / Unicode Inspector"
      teaches="What this teaches: lookalike characters and combining marks can hide in plain sight."
    >
      <SentinelCard title="Input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-zinc-100"
        />
      </SentinelCard>
      <SentinelCard title="Code points">
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="text-zinc-500">
              <tr>
                <th className="py-1">Char</th>
                <th>Code</th>
                <th>Hex</th>
                <th>Category</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {rows.map((r, i) => (
                <tr key={`${r.codePoint}-${i}`} className="border-t border-white/5">
                  <td className="py-1">{r.char}</td>
                  <td>{r.codePoint}</td>
                  <td>{r.hex}</td>
                  <td>{r.category}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SentinelCard>
    </ToolShell>
  );
}
