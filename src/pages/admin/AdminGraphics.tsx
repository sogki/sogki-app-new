import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminApi } from '../../lib/adminApi';
import AdminPageLayout from './AdminPageLayout';
import { Plus, Pencil, Trash2, X, ChevronDown, ChevronRight } from 'lucide-react';

type Collection = { id: string; client: string; summary: string; sort_order: number };
type Asset = {
  id: string;
  collection_id: string;
  title: string;
  category: string;
  description: string;
  tools: string[];
  thumbnail_class_name?: string;
  media_urls: string[];
  sort_order: number;
};

export default function AdminGraphics() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [assetsByCollection, setAssetsByCollection] = useState<Record<string, Asset[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const fetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cols, allAssets] = await Promise.all([
        adminApi.collections(),
        adminApi.assets(),
      ]);
      setCollections(cols ?? []);
      const byCol: Record<string, Asset[]> = {};
      for (const a of allAssets ?? []) {
        const cid = a.collection_id;
        if (!byCol[cid]) byCol[cid] = [];
        byCol[cid].push(a);
      }
      for (const cid of Object.keys(byCol)) {
        byCol[cid].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      }
      setAssetsByCollection(byCol);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSaveCollection = async (data: Partial<Collection>) => {
    setSaving(true);
    try {
      if (editingCollection?.id) {
        await adminApi.updateCollection(editingCollection.id, data);
      } else {
        await adminApi.createCollection(data);
      }
      setEditingCollection(null);
      fetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCollection = async (id: string) => {
    if (!confirm('Delete this collection and all its assets?')) return;
    try {
      await adminApi.deleteCollection(id);
      setEditingCollection(null);
      fetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  const handleSaveAsset = async (data: Partial<Asset>) => {
    setSaving(true);
    try {
      if (editingAsset?.id) {
        await adminApi.updateAsset(editingAsset.id, data);
      } else {
        await adminApi.createAsset(data);
      }
      setEditingAsset(null);
      fetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!confirm('Delete this asset?')) return;
    try {
      await adminApi.deleteAsset(id);
      setEditingAsset(null);
      fetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  return (
    <AdminPageLayout
      title="Graphics Portfolio"
      titleJp="グラフィックデザイン"
      description="Manage collections and assets. Upload images to the graphics-design-portfolio bucket, then add paths here."
      loading={loading}
      error={error}
      onRetry={fetch}
    >
      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={() => setEditingCollection({} as Collection)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 text-purple-300 text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add Collection
        </button>
      </div>
      <div className="space-y-2">
        {collections.map((c, i) => (
          <motion.div
            key={c.id}
            className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <span className="absolute inset-0 flex items-center justify-end pr-6 text-4xl font-light text-purple-400/10 pointer-events-none select-none" aria-hidden>コレクション</span>
            <div
              className="relative flex items-center gap-2 p-4 hover:bg-white/5 cursor-pointer group"
              onClick={() => toggleExpand(c.id)}
            >
              {expanded.has(c.id) ? (
                <ChevronDown size={18} className="text-gray-400" />
              ) : (
                <ChevronRight size={18} className="text-gray-400" />
              )}
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-white font-mono">{c.client}</h2>
                <p className="text-sm text-gray-400 mt-0.5">{c.summary}</p>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setEditingCollection(c); }}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDeleteCollection(c.id); }}
                  className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 border border-white/10 text-gray-400 hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingAsset({ collection_id: c.id } as Asset);
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-xs"
                >
                  <Plus size={12} /> Asset
                </button>
              </div>
            </div>
            <AnimatePresence>
              {expanded.has(c.id) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-white/10"
                >
                  <div className="p-4 space-y-2">
                    {(assetsByCollection[c.id] ?? []).length === 0 ? (
                      <p className="text-sm text-gray-500">No assets yet.</p>
                    ) : (
                      (assetsByCollection[c.id] ?? []).map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-black/30 group/row"
                        >
                          <span className="text-sm text-gray-300">{a.title}</span>
                          <div className="flex gap-1 opacity-0 group-hover/row:opacity-100">
                            <button
                              type="button"
                              onClick={() => setEditingAsset(a)}
                              className="p-1.5 rounded text-gray-400 hover:text-white"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAsset(a.id)}
                              className="p-1.5 rounded text-gray-400 hover:text-red-400"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {editingCollection && (
          <CollectionModal
            collection={editingCollection}
            onClose={() => setEditingCollection(null)}
            onSave={handleSaveCollection}
            saving={saving}
            onDelete={editingCollection.id ? () => handleDeleteCollection(editingCollection.id) : undefined}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingAsset && (
          <AssetModal
            asset={editingAsset}
            collections={collections}
            onClose={() => setEditingAsset(null)}
            onSave={handleSaveAsset}
            saving={saving}
            onDelete={editingAsset.id ? () => handleDeleteAsset(editingAsset.id) : undefined}
          />
        )}
      </AnimatePresence>
    </AdminPageLayout>
  );
}

function CollectionModal({
  collection,
  onClose,
  onSave,
  saving,
  onDelete,
}: {
  collection: Partial<Collection>;
  onClose: () => void;
  onSave: (data: Partial<Collection>) => void;
  saving: boolean;
  onDelete?: () => void;
}) {
  const [client, setClient] = useState(collection.client ?? '');
  const [summary, setSummary] = useState(collection.summary ?? '');
  const [sortOrder, setSortOrder] = useState(collection.sort_order ?? 0);

  return (
    <Modal title={collection.id ? 'Edit Collection' : 'Add Collection'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ client, summary, sort_order: sortOrder });
        }}
        className="space-y-4"
      >
        <Input label="Client" value={client} onChange={setClient} required />
        <div>
          <label className="block text-sm text-gray-400 mb-1">Summary</label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-purple-400/50 outline-none"
            required
          />
        </div>
        <Input label="Sort order" type="number" value={String(sortOrder)} onChange={(v) => setSortOrder(Number(v))} />
        <ModalFooter onClose={onClose} saving={saving} onDelete={onDelete} />
      </form>
    </Modal>
  );
}

function AssetModal({
  asset,
  collections,
  onClose,
  onSave,
  saving,
  onDelete,
}: {
  asset: Partial<Asset>;
  collections: Collection[];
  onClose: () => void;
  onSave: (data: Partial<Asset>) => void;
  saving: boolean;
  onDelete?: () => void;
}) {
  const [collectionId, setCollectionId] = useState(asset.collection_id ?? '');
  const [title, setTitle] = useState(asset.title ?? '');
  const [category, setCategory] = useState(asset.category ?? '');
  const [description, setDescription] = useState(asset.description ?? '');
  const [tools, setTools] = useState((asset.tools ?? []).join(', '));
  const [mediaUrls, setMediaUrls] = useState((asset.media_urls ?? []).join('\n'));
  const [sortOrder, setSortOrder] = useState(asset.sort_order ?? 0);

  return (
    <Modal title={asset.id ? 'Edit Asset' : 'Add Asset'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            collection_id: collectionId,
            title,
            category,
            description,
            tools: tools.split(',').map((t) => t.trim()).filter(Boolean),
            media_urls: mediaUrls.split('\n').map((u) => u.trim()).filter(Boolean),
            sort_order: sortOrder,
          });
        }}
        className="space-y-4"
      >
        <div>
          <label className="block text-sm text-gray-400 mb-1">Collection</label>
          <select
            value={collectionId}
            onChange={(e) => setCollectionId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-purple-400/50 outline-none"
            required
          >
            {collections.map((c) => (
              <option key={c.id} value={c.id} className="bg-black">{c.client}</option>
            ))}
          </select>
        </div>
        <Input label="Title" value={title} onChange={setTitle} required />
        <Input label="Category" value={category} onChange={setCategory} required />
        <div>
          <label className="block text-sm text-gray-400 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-purple-400/50 outline-none"
            required
          />
        </div>
        <Input label="Tools (comma-separated)" value={tools} onChange={setTools} />
        <div>
          <label className="block text-sm text-gray-400 mb-1">Media URLs (one per line, paths in bucket or full URLs)</label>
          <textarea
            value={mediaUrls}
            onChange={(e) => setMediaUrls(e.target.value)}
            rows={3}
            placeholder="path/to/image.jpg"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-purple-400/50 outline-none font-mono text-sm"
          />
        </div>
        <Input label="Sort order" type="number" value={String(sortOrder)} onChange={(v) => setSortOrder(Number(v))} />
        <ModalFooter onClose={onClose} saving={saving} onDelete={onDelete} />
      </form>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
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
        className="relative w-full max-w-lg rounded-xl border border-white/10 bg-black p-6 max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white font-mono">{title}</h3>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

function Input({
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
        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-purple-400/50 outline-none"
        required={required}
      />
    </div>
  );
}

function ModalFooter({
  onClose,
  saving,
  onDelete,
}: {
  onClose: () => void;
  saving: boolean;
  onDelete?: () => void;
}) {
  return (
    <div className="flex justify-between pt-4">
      <div>
        {onDelete && (
          <button type="button" onClick={onDelete} className="px-4 py-2 rounded-lg text-red-400 hover:bg-red-500/20 border border-red-500/30 text-sm">
            Delete
          </button>
        )}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-sm">
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
  );
}
