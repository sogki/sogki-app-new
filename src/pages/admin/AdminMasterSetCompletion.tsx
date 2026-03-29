import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { adminApi } from '../../lib/adminApi';
import { fetchCollectionMasterSetEntries, type CollectionMasterSetEntry } from '../../lib/siteData';
import AdminPageLayout from './AdminPageLayout';
import { Plus, Pencil, Trash2 } from 'lucide-react';

export default function AdminMasterSetCompletion() {
  const [entries, setEntries] = useState<CollectionMasterSetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    setError(null);
    try {
      // List uses the same public Supabase read as /collection (RLS: SELECT for anon). Edge Function
      // does not need to be redeployed just to load rows; saves/deletes still go through admin-api.
      const list = await fetchCollectionMasterSetEntries();
      setEntries(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this master set completion entry?')) return;
    try {
      await adminApi.deleteCollectionMasterSet(id);
      setEditingId(null);
      fetchList();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  return (
    <AdminPageLayout
      title="Master set completion"
      titleJp="マスターセット完成度"
      description="Global list for /collection: set title, your chosen completion % (0–100), description, and an optional subtitle under the percentage (e.g. card counts). Separate from binder showcases."
      loading={loading}
      error={error}
      onRetry={fetchList}
    >
      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={() => setEditingId('new')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 text-purple-300 text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add master set completion
        </button>
      </div>

      {entries.length === 0 && !loading && !editingId && (
        <p className="text-gray-500 text-sm mb-4">No entries yet. Add one to show a section on the public collection page.</p>
      )}

      <div className="space-y-3">
        {editingId === 'new' && (
          <EntryFormCard
            entry={null}
            onCancel={() => setEditingId(null)}
            onSaved={() => {
              setEditingId(null);
              fetchList();
            }}
            saving={saving}
            setSaving={setSaving}
          />
        )}
        {entries.map((row, i) => (
          <motion.div
            key={row.id}
            className="rounded-xl border border-white/10 bg-white/5 overflow-hidden"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            {editingId === row.id ? (
              <EntryFormCard
                entry={row}
                onCancel={() => setEditingId(null)}
                onSaved={() => {
                  setEditingId(null);
                  fetchList();
                }}
                saving={saving}
                setSaving={setSaving}
              />
            ) : (
              <div className="p-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold text-white font-mono">{row.title}</h2>
                  {row.title_jp ? <p className="text-sm text-purple-300/90">{row.title_jp}</p> : null}
                  <p className="text-sm text-fuchsia-300/90 mt-1 font-mono">{row.progress_percent}% complete</p>
                  {row.subtitle ? <p className="text-xs text-gray-500 mt-1">{row.subtitle}</p> : null}
                  {row.description ? (
                    <p className="text-sm text-gray-400 mt-2 line-clamp-3">{row.description}</p>
                  ) : null}
                  <p className="text-xs text-gray-600 mt-2">Sort order: {row.sort_order}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingId(row.id)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(row.id)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 border border-white/10 text-gray-400 hover:text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </AdminPageLayout>
  );
}

function EntryFormCard({
  entry,
  onCancel,
  onSaved,
  saving,
  setSaving,
}: {
  entry: CollectionMasterSetEntry | null;
  onCancel: () => void;
  onSaved: () => void;
  saving: boolean;
  setSaving: (v: boolean) => void;
}) {
  const [title, setTitle] = useState(entry?.title ?? '');
  const [titleJp, setTitleJp] = useState(entry?.title_jp ?? '');
  const [description, setDescription] = useState(entry?.description ?? '');
  const [progressPercent, setProgressPercent] = useState(String(entry?.progress_percent ?? 0));
  const [subtitle, setSubtitle] = useState(entry?.subtitle ?? '');
  const [sortOrder, setSortOrder] = useState(String(entry?.sort_order ?? 0));

  const save = async () => {
    const pct = Math.min(100, Math.max(0, parseInt(progressPercent, 10) || 0));
    if (!title.trim()) {
      alert('Title is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        title_jp: titleJp.trim() || null,
        description: description.trim() || null,
        progress_percent: pct,
        subtitle: subtitle.trim() || null,
        sort_order: parseInt(sortOrder, 10) || 0,
      };
      if (entry?.id) {
        await adminApi.updateCollectionMasterSet(entry.id, payload);
      } else {
        await adminApi.createCollectionMasterSet(payload);
      }
      onSaved();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 border border-purple-500/20 bg-purple-500/5 space-y-3">
      <p className="text-xs text-gray-500 font-mono mb-2">
        {entry ? 'Edit entry' : 'New entry — appears in the “Master set completion” section on /collection'}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Field label="Set title" value={title} onChange={setTitle} required />
        <Field label="Title (JP)" value={titleJp} onChange={setTitleJp} />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Longer copy shown above the progress bar"
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:border-purple-400/50 outline-none text-sm"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Field
          label="Completion % (0–100)"
          value={progressPercent}
          onChange={setProgressPercent}
          type="number"
          required
        />
        <div className="sm:col-span-2">
          <label className="block text-sm text-gray-400 mb-1">Subtitle (optional)</label>
          <input
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder='e.g. "182 / 198" or "Missing 3 promos"'
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:border-purple-400/50 outline-none text-sm"
          />
          <p className="text-[11px] text-gray-600 mt-1">Shown under the big % on the public page.</p>
        </div>
      </div>
      <Field label="Sort order" value={sortOrder} onChange={setSortOrder} type="number" />
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-sm"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-400/30 text-purple-300 text-sm font-medium disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-purple-400/50 outline-none text-sm"
        required={required}
      />
    </div>
  );
}
