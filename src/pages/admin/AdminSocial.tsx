import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminApi } from '../../lib/adminApi';
import AdminPageLayout from './AdminPageLayout';
import { ExternalLink, Plus, Pencil, Trash2, X } from 'lucide-react';

type SocialLink = {
  id: string;
  platform: string;
  url: string;
  handle?: string;
  description?: string;
  sort_order: number;
};

const PLATFORMS = ['github', 'twitter', 'x', 'linkedin', 'youtube', 'instagram', 'discord'];

export default function AdminSocial() {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<SocialLink | null>(null);
  const [saving, setSaving] = useState(false);

  const fetch = () => {
    setLoading(true);
    setError(null);
    adminApi
      .social()
      .then(setLinks)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => fetch(), []);

  const handleSave = async (data: Partial<SocialLink>) => {
    setSaving(true);
    try {
      if (editing?.id) {
        await adminApi.updateSocial(editing.id, data);
      } else {
        await adminApi.createSocial(data);
      }
      setEditing(null);
      fetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this social link?')) return;
    try {
      await adminApi.deleteSocial(id);
      setEditing(null);
      fetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  return (
    <AdminPageLayout
      title="Social Links"
      titleJp="ソーシャルリンク"
      description="Manage global social media links (navbar, footer, hero)."
      loading={loading}
      error={error}
      onRetry={fetch}
    >
      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={() => setEditing({} as SocialLink)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 text-purple-300 text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add Link
        </button>
      </div>
      <div className="space-y-4">
        {links.map((l, i) => (
          <motion.div
            key={l.id}
            className="relative overflow-hidden p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-purple-400/30 transition-all duration-150 group"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <span className="absolute inset-0 flex items-center justify-end pr-6 text-4xl font-light text-purple-400/10 pointer-events-none select-none" aria-hidden>リンク</span>
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-white font-mono capitalize">{l.platform}</h2>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-colors mt-1"
                >
                  {l.url} <ExternalLink size={12} />
                </a>
                {l.handle && <p className="text-xs text-gray-500 mt-1">{l.handle}</p>}
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => setEditing(l)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white"
                  aria-label="Edit"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(l.id)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 border border-white/10 text-gray-400 hover:text-red-400"
                  aria-label="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {editing && (
          <SocialModal
            link={editing}
            onClose={() => setEditing(null)}
            onSave={handleSave}
            saving={saving}
            onDelete={editing.id ? () => handleDelete(editing.id) : undefined}
          />
        )}
      </AnimatePresence>
    </AdminPageLayout>
  );
}

function SocialModal({
  link,
  onClose,
  onSave,
  saving,
  onDelete,
}: {
  link: Partial<SocialLink>;
  onClose: () => void;
  onSave: (data: Partial<SocialLink>) => void;
  saving: boolean;
  onDelete?: () => void;
}) {
  const [platform, setPlatform] = useState(link.platform ?? 'github');
  const [url, setUrl] = useState(link.url ?? '');
  const [handle, setHandle] = useState(link.handle ?? '');
  const [description, setDescription] = useState(link.description ?? '');
  const [sortOrder, setSortOrder] = useState(link.sort_order ?? 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ platform, url, handle: handle || undefined, description: description || undefined, sort_order: sortOrder });
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80" />
      <motion.div
        className="relative w-full max-w-md rounded-xl border border-white/10 bg-black p-6"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white font-mono">
            {link.id ? 'Edit Social Link' : 'Add Social Link'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-purple-400/50 outline-none"
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p} className="bg-black capitalize">
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-purple-400/50 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Handle (e.g. @username)</label>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="@sogki"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-purple-400/50 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explore my code repositories"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-purple-400/50 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Sort order</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
            />
          </div>

          <div className="flex justify-between pt-4">
            <div>
              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="px-4 py-2 rounded-lg text-red-400 hover:bg-red-500/20 border border-red-500/30 text-sm"
                >
                  Delete
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 text-purple-300 text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
