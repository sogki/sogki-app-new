import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminApi } from '../../lib/adminApi';
import type { BinderShowcase, BinderShowcaseImage, BinderShowcaseSet } from '../../lib/siteData';
import AdminPageLayout from './AdminPageLayout';
import { Plus, Pencil, Trash2, X, Upload, ImageIcon } from 'lucide-react';

type EditingBinder = Partial<BinderShowcase> & {
  binder_showcase_images: BinderShowcaseImage[];
  binder_showcase_sets: BinderShowcaseSet[];
};

export default function AdminBinderShowcase() {
  const [showcases, setShowcases] = useState<BinderShowcase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingBinder | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = (await adminApi.binderShowcases()) as BinderShowcase[];
      setShowcases(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setShowcases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleDeleteShowcase = async (id: string) => {
    if (!confirm('Delete this binder showcase and all its images and set progress rows?')) return;
    try {
      await adminApi.deleteBinderShowcase(id);
      setEditing((e) => (e?.id === id ? null : e));
      fetchList();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  const refreshListAndReselect = async (selectId?: string) => {
    const list = (await adminApi.binderShowcases()) as BinderShowcase[];
    setShowcases(Array.isArray(list) ? list : []);
    if (selectId) {
      const row = list.find((x) => x.id === selectId);
      if (row) setEditing(row);
    }
  };

  return (
    <AdminPageLayout
      title="Binder showcases"
      titleJp="バインダー"
      description="Manage collection page binders: photos (carousel), copy, and optional per-binder master set progress. Images upload to the blog-images bucket under binder-showcase/."
      loading={loading}
      error={error}
      onRetry={fetchList}
    >
      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={() =>
            setEditing({
              title: '',
              title_jp: null,
              description: null,
              sort_order: showcases.length,
              binder_showcase_images: [],
              binder_showcase_sets: [],
            })
          }
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 text-purple-300 text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add showcase
        </button>
      </div>

      <div className="space-y-3">
        {showcases.length === 0 && !loading && (
          <p className="text-gray-500 text-sm">No showcases yet. Add one to appear on the public /collection page.</p>
        )}
        {showcases.map((s, i) => (
          <motion.div
            key={s.id}
            className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-wrap items-start justify-between gap-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-white font-mono">{s.title || '(untitled)'}</h2>
              {s.title_jp && <p className="text-sm text-purple-300/90 mt-0.5">{s.title_jp}</p>}
              {s.description && <p className="text-sm text-gray-400 mt-2 line-clamp-3">{s.description}</p>}
              <p className="text-xs text-gray-600 mt-2 font-mono">
                {s.binder_showcase_images?.length ?? 0} image(s) · {s.binder_showcase_sets?.length ?? 0} set row(s) · sort{' '}
                {s.sort_order}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(s)}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white"
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleDeleteShowcase(s.id)}
                className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 border border-white/10 text-gray-400 hover:text-red-400"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {editing && (
          <ShowcaseEditorModal
            showcase={editing}
            onClose={() => setEditing(null)}
            saving={saving}
            setSaving={setSaving}
            onRefresh={refreshListAndReselect}
            onDeleteShowcase={editing.id ? () => handleDeleteShowcase(editing.id as string) : undefined}
          />
        )}
      </AnimatePresence>
    </AdminPageLayout>
  );
}

function ShowcaseEditorModal({
  showcase,
  onClose,
  saving,
  setSaving,
  onRefresh,
  onDeleteShowcase,
}: {
  showcase: Partial<BinderShowcase> & {
    binder_showcase_images: BinderShowcaseImage[];
    binder_showcase_sets: BinderShowcaseSet[];
  };
  onClose: () => void;
  saving: boolean;
  setSaving: (v: boolean) => void;
  onRefresh: (selectId?: string) => Promise<void>;
  onDeleteShowcase?: () => void;
}) {
  const isNew = !showcase.id;
  const [title, setTitle] = useState(showcase.title ?? '');
  const [titleJp, setTitleJp] = useState(showcase.title_jp ?? '');
  const [description, setDescription] = useState(showcase.description ?? '');
  const [sortOrder, setSortOrder] = useState(showcase.sort_order ?? 0);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setTitle(showcase.title ?? '');
    setTitleJp(showcase.title_jp ?? '');
    setDescription(showcase.description ?? '');
    setSortOrder(showcase.sort_order ?? 0);
  }, [showcase.id]);

  const images = showcase.binder_showcase_images ?? [];
  const sets = showcase.binder_showcase_sets ?? [];

  const saveMeta = async () => {
    if (!title.trim()) {
      alert('Title is required');
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        const created = (await adminApi.createBinderShowcase({
          title: title.trim(),
          title_jp: titleJp.trim() || null,
          description: description.trim() || null,
          sort_order: sortOrder,
        })) as { id: string };
        await onRefresh(created.id);
      } else {
        await adminApi.updateBinderShowcase(showcase.id as string, {
          title: title.trim(),
          title_jp: titleJp.trim() || null,
          description: description.trim() || null,
          sort_order: sortOrder,
        });
        await onRefresh(showcase.id as string);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const onPickImages = async (files: FileList | null) => {
    if (!files?.length || !showcase.id) return;
    setUploading(true);
    try {
      let nextOrder =
        images.reduce((m, img) => Math.max(m, img.sort_order ?? 0), -1) + 1;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const { url, path } = await adminApi.uploadBinderShowcaseImage(file);
        await adminApi.createBinderShowcaseImage({
          showcase_id: showcase.id,
          public_url: url,
          storage_path: path,
          sort_order: nextOrder++,
        });
      }
      await onRefresh(showcase.id as string);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async (img: BinderShowcaseImage) => {
    if (!confirm('Remove this image from the showcase?')) return;
    try {
      await adminApi.deleteBinderShowcaseImage(img.id);
      await onRefresh(showcase.id as string);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const patchImageOrder = async (img: BinderShowcaseImage, sort_order: number) => {
    try {
      await adminApi.updateBinderShowcaseImage(img.id, { sort_order });
      await onRefresh(showcase.id as string);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const addSetRow = async () => {
    if (!showcase.id) return;
    setSaving(true);
    try {
      const nextOrder = sets.reduce((m, s) => Math.max(m, s.sort_order ?? 0), -1) + 1;
      await adminApi.createBinderShowcaseSet({
        showcase_id: showcase.id,
        name: 'Set name',
        name_jp: '',
        description: null,
        completed: 0,
        total: 1,
        sort_order: nextOrder,
      });
      await onRefresh(showcase.id as string);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to add set');
    } finally {
      setSaving(false);
    }
  };

  const saveSet = async (row: BinderShowcaseSet, data: Partial<BinderShowcaseSet>) => {
    try {
      await adminApi.updateBinderShowcaseSet(row.id, data);
      await onRefresh(showcase.id as string);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const removeSet = async (row: BinderShowcaseSet) => {
    if (!confirm('Remove this master set row?')) return;
    try {
      await adminApi.deleteBinderShowcaseSet(row.id);
      await onRefresh(showcase.id as string);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    }
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
        className="relative w-full max-w-2xl rounded-xl border border-white/10 bg-black p-6 max-h-[92vh] overflow-y-auto"
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white font-mono">
            {isNew ? 'New binder showcase' : 'Edit binder showcase'}
          </h3>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <Input label="Title" value={title} onChange={setTitle} required />
            <Input label="Title (JP)" value={titleJp} onChange={setTitleJp} />
            <div>
              <label className="block text-sm text-gray-400 mb-1">Short description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-purple-400/50 outline-none text-sm"
                placeholder="Optional — appears under the title on the public page"
              />
            </div>
            <Input label="Sort order" type="number" value={String(sortOrder)} onChange={(v) => setSortOrder(Number(v))} />
            <button
              type="button"
              disabled={saving}
              onClick={saveMeta}
              className="px-4 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 text-purple-300 text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Saving…' : isNew ? 'Create showcase' : 'Save title & description'}
            </button>
          </div>

          {!isNew && (
            <>
              <div className="border-t border-white/10 pt-6">
                <h4 className="text-sm font-medium text-white font-mono mb-3 flex items-center gap-2">
                  <ImageIcon size={16} className="text-fuchsia-400" />
                  Images (carousel)
                </h4>
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-sm cursor-pointer hover:bg-white/10">
                  <Upload size={16} />
                  {uploading ? 'Uploading…' : 'Upload images'}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => onPickImages(e.target.files)}
                  />
                </label>
                <p className="text-xs text-gray-500 mt-2">Multiple images enable carousel, dots, and arrows on the site.</p>
                <ul className="mt-4 space-y-3">
                  {images.map((img) => (
                    <li key={img.id} className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                      <img src={img.public_url} alt="" className="w-16 h-16 object-cover rounded border border-white/10" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 font-mono truncate">{img.public_url}</p>
                        <label className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                          Order
                          <input
                            type="number"
                            defaultValue={img.sort_order}
                            className="w-20 px-2 py-1 rounded bg-black/50 border border-white/10 text-white text-xs"
                            onBlur={(e) => patchImageOrder(img, Number(e.target.value) || 0)}
                          />
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(img)}
                        className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 border border-red-500/20"
                      >
                        <Trash2 size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t border-white/10 pt-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-white font-mono">Master set progress (optional)</h4>
                  <button
                    type="button"
                    onClick={addSetRow}
                    disabled={saving}
                    className="text-xs px-3 py-1.5 rounded-lg bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-300"
                  >
                    + Add row
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Each row shows a percentage and gradient bar from Completed ÷ Total. Add an optional short description
                  per set (shown above the bar on the site). If you add no rows, this block is hidden for the binder.
                </p>
                {sets.map((row) => (
                  <SetRowForm key={row.id} row={row} onSave={saveSet} onDelete={removeSet} />
                ))}
              </div>
            </>
          )}

          <div className="flex justify-between pt-4 border-t border-white/10">
            <div>
              {onDeleteShowcase && (
                <button
                  type="button"
                  onClick={() => {
                    onDeleteShowcase();
                    onClose();
                  }}
                  className="px-4 py-2 rounded-lg text-red-400 hover:bg-red-500/20 border border-red-500/30 text-sm"
                >
                  Delete entire showcase
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SetRowForm({
  row,
  onSave,
  onDelete,
}: {
  row: BinderShowcaseSet;
  onSave: (row: BinderShowcaseSet, data: Partial<BinderShowcaseSet>) => void;
  onDelete: (row: BinderShowcaseSet) => void;
}) {
  const [name, setName] = useState(row.name);
  const [nameJp, setNameJp] = useState(row.name_jp ?? '');
  const [setDescription, setSetDescription] = useState(row.description ?? '');
  const [completed, setCompleted] = useState(String(row.completed));
  const [total, setTotal] = useState(String(row.total));
  const [sortOrder, setSortOrder] = useState(String(row.sort_order));

  useEffect(() => {
    setName(row.name);
    setNameJp(row.name_jp ?? '');
    setSetDescription(row.description ?? '');
    setCompleted(String(row.completed));
    setTotal(String(row.total));
    setSortOrder(String(row.sort_order));
  }, [row.id]);

  return (
    <div className="p-3 rounded-lg bg-white/5 border border-white/10 mb-3 space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input label="Set name" value={name} onChange={setName} />
        <Input label="Set name (JP)" value={nameJp} onChange={setNameJp} />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Short description (optional)</label>
        <textarea
          value={setDescription}
          onChange={(e) => setSetDescription(e.target.value)}
          rows={2}
          placeholder="e.g. Missing only secret rares from booster boxes"
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:border-purple-400/50 outline-none text-sm"
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Input label="Completed" type="number" value={completed} onChange={setCompleted} />
        <Input label="Total" type="number" value={total} onChange={setTotal} />
        <Input label="Order" type="number" value={sortOrder} onChange={setSortOrder} />
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={() => onDelete(row)}
          className="px-3 py-1.5 text-xs rounded-lg text-red-400 border border-red-500/30 hover:bg-red-500/10"
        >
          Remove
        </button>
        <button
          type="button"
          onClick={() =>
            onSave(row, {
              name: name.trim() || 'Set',
              name_jp: nameJp.trim() || null,
              description: setDescription.trim() || null,
              completed: Math.max(0, parseInt(completed, 10) || 0),
              total: Math.max(1, parseInt(total, 10) || 1),
              sort_order: parseInt(sortOrder, 10) || 0,
            })
          }
          className="px-3 py-1.5 text-xs rounded-lg bg-purple-500/20 border border-purple-400/30 text-purple-300"
        >
          Save row
        </button>
      </div>
    </div>
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
        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-purple-400/50 outline-none text-sm"
        required={required}
      />
    </div>
  );
}
