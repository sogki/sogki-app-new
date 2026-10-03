import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { sentinelApi } from '../../../lib/sentinel/api';
import type { Target } from '../../../lib/sentinel/types';

export default function TargetPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (targetId: string) => void;
}) {
  const [targets, setTargets] = useState<Target[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void sentinelApi
      .listTargets()
      .then((list) => {
        setTargets(list);
        if (!value && list[0]) onChange(list[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load targets'));
  }, []);

  if (error) return <p className="text-sm text-amber-200">{error}</p>;
  if (!targets.length) {
    return (
      <p className="text-sm text-zinc-500">
        No targets yet.{' '}
        <Link to="/admin/sentinel/targets" className="text-rose-300 hover:underline">
          Add an authorised target
        </Link>
        .
      </p>
    );
  }

  return (
    <label className="block min-w-[16rem] flex-1 text-sm">
      <span className="mb-1 block text-zinc-500">Authorised target</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-zinc-100 outline-none focus:border-rose-400/40"
      >
        {targets.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} — {t.url}
          </option>
        ))}
      </select>
    </label>
  );
}
