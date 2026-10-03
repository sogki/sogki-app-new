import { useEffect, useState, type FormEvent } from 'react';
import SentinelCard from '../../../components/admin/sentinel/SentinelCard';
import { sentinelApi } from '../../../lib/sentinel/api';
import type { Target } from '../../../lib/sentinel/types';

export default function SentinelTargets() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setTargets(await sentinelApi.listTargets());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load targets');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await sentinelApi.createTarget({
        name: name.trim(),
        url: url.trim(),
        target_type: 'website',
        notes: notes.trim() || undefined,
      });
      setName('');
      setUrl('');
      setNotes('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save target');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    try {
      await sentinelApi.deleteTarget(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete target');
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-zinc-400">
        Targets are private to your Sentinel instance. Only add hosts you own or are authorised to
        test.
      </div>

      <SentinelCard title="Add authorised target">
        <form onSubmit={(e) => void onSubmit(e)} className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-zinc-500">Name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="sogki.dev"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-zinc-100 outline-none focus:border-rose-400/40"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-zinc-500">URL</span>
            <input
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://sogki.dev"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-zinc-100 outline-none focus:border-rose-400/40"
            />
          </label>
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block text-zinc-500">Notes (optional)</span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Personal site — authorised owner"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-zinc-100 outline-none focus:border-rose-400/40"
            />
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-4 py-2 text-sm text-rose-100 hover:bg-rose-500/25 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save target'}
            </button>
          </div>
        </form>
        {error && <p className="mt-3 text-sm text-amber-200">{error}</p>}
      </SentinelCard>

      <SentinelCard title="Saved targets">
        {!targets.length ? (
          <p className="text-sm text-zinc-500">No targets saved.</p>
        ) : (
          <ul className="space-y-2">
            {targets.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-100">{t.name}</p>
                  <p className="text-xs text-zinc-500">{t.url}</p>
                  <p className="mt-1 text-[11px] text-zinc-600">
                    Type: {t.target_type}
                    {t.last_scan_at
                      ? ` · Last scan ${new Date(t.last_scan_at).toLocaleDateString()}`
                      : ' · Never scanned'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-rose-200">
                    {t.last_score === null ? '—' : t.last_score}
                  </span>
                  <button
                    type="button"
                    onClick={() => void onDelete(t.id)}
                    className="rounded-lg px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/10"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SentinelCard>
    </div>
  );
}
