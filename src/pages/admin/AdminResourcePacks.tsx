import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, Package, Pencil, Trash2, Upload, X } from 'lucide-react';
import { adminApi } from '../../lib/adminApi';
import AdminPageLayout from './AdminPageLayout';

type ResourcePack = {
  id: string;
  name: string;
  description: string | null;
  file_name: string;
  file_path: string;
  version: string;
  sha1: string;
  size: number;
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

export default function AdminResourcePacks() {
  const [packs, setPacks] = useState<ResourcePack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busyPackId, setBusyPackId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [version, setVersion] = useState('v1.0.0');
  const [description, setDescription] = useState('');
  const [editingPackId, setEditingPackId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [autoDeactivatePrevious, setAutoDeactivatePrevious] = useState(true);

  const activeCount = useMemo(() => packs.filter((p) => p.is_active).length, [packs]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.resourcePacks();
      setPacks((data as ResourcePack[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load resource packs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const getApiUrl = (id: string) => `${window.location.origin}/api/resourcepacks/${id}`;

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      alert('Please select a .zip file first.');
      return;
    }
    if (!file.name.toLowerCase().endsWith('.zip')) {
      alert('Only .zip files are allowed.');
      return;
    }

    setUploading(true);
    try {
      await adminApi.uploadResourcePack(file, {
        name,
        version,
        description: description || undefined,
        is_active: isActive,
        auto_deactivate_previous: autoDeactivatePrevious,
        group_key: name,
      });
      setFile(null);
      setName('');
      setVersion('v1.0.0');
      setDescription('');
      setIsActive(true);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleToggleActive = async (pack: ResourcePack) => {
    setBusyPackId(pack.id);
    try {
      await adminApi.updateResourcePack(pack.id, { is_active: !pack.is_active });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update');
    } finally {
      setBusyPackId(null);
    }
  };

  const handleDelete = async (pack: ResourcePack) => {
    if (!confirm(`Delete "${pack.name} ${pack.version}"? This removes the storage file too.`)) return;
    setBusyPackId(pack.id);
    try {
      await adminApi.deleteResourcePack(pack.id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setBusyPackId(null);
    }
  };

  const startEditingDescription = (pack: ResourcePack) => {
    setEditingPackId(pack.id);
    setEditingDescription(pack.description ?? '');
  };

  const cancelEditingDescription = () => {
    if (busyPackId) return;
    setEditingPackId(null);
    setEditingDescription('');
  };

  const saveEditingDescription = async (pack: ResourcePack) => {
    setBusyPackId(pack.id);
    try {
      await adminApi.updateResourcePack(pack.id, { description: editingDescription.trim() || null });
      await load();
      setEditingPackId(null);
      setEditingDescription('');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update description');
    } finally {
      setBusyPackId(null);
    }
  };

  const copyValue = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied((prev) => (prev === key ? null : prev)), 1200);
    } catch {
      alert('Failed to copy to clipboard.');
    }
  };

  return (
    <AdminPageLayout
      title="Resource Packs"
      titleJp="リソース"
      description="Upload and manage Minecraft resource pack ZIP files. Active packs are exposed at /api/resourcepacks/active."
      loading={loading}
      error={error}
      onRetry={load}
    >
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-6">
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Pack name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="base-pack"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-purple-400/50 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Version</label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="v1.0.0"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-purple-400/50 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">ZIP file</label>
              <input
                type="file"
                accept=".zip,application/zip"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 file:mr-3 file:border-0 file:bg-purple-500/20 file:px-3 file:py-1 file:rounded file:text-purple-300"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description (shown in mod UI)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this pack adds..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-purple-400/50 outline-none resize-y"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-white/20 bg-white/5 text-purple-500"
              />
              Mark uploaded pack as active
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={autoDeactivatePrevious}
                onChange={(e) => setAutoDeactivatePrevious(e.target.checked)}
                className="rounded border-white/20 bg-white/5 text-purple-500"
              />
              Auto-deactivate old active versions with same name
            </label>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Current active packs: <span className="text-gray-300">{activeCount}</span>
            </p>
            <button
              type="submit"
              disabled={uploading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 text-purple-300 text-sm font-medium disabled:opacity-50"
            >
              <Upload size={16} />
              {uploading ? 'Uploading...' : 'Upload Pack'}
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-3">
        {packs.map((pack, idx) => {
          const directUrl = getApiUrl(pack.id);
          const isEditingDescription = editingPackId === pack.id;
          return (
            <motion.div
              key={pack.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.02 }}
              className="rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Package size={16} className="text-purple-300" />
                    <h3 className="font-semibold text-white font-mono">{pack.name}</h3>
                    <span className="text-xs px-2 py-1 rounded-full border border-white/10 text-gray-300">
                      {pack.version}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full border ${
                        pack.is_active
                          ? 'border-emerald-400/40 text-emerald-300 bg-emerald-500/10'
                          : 'border-gray-500/30 text-gray-400 bg-white/5'
                      }`}
                    >
                      {pack.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1 break-all">{pack.file_name}</p>
                  {isEditingDescription ? (
                    <div className="mt-2 rounded-lg border border-white/10 bg-white/5 p-2 space-y-2">
                      <textarea
                        value={editingDescription}
                        onChange={(e) => setEditingDescription(e.target.value)}
                        rows={3}
                        placeholder="Add a description for this pack..."
                        className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white placeholder-gray-500 focus:border-purple-400/50 outline-none resize-y"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => saveEditingDescription(pack)}
                          disabled={busyPackId === pack.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 text-purple-300 text-sm disabled:opacity-50"
                        >
                          <Check size={14} />
                          Save Description
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditingDescription}
                          disabled={busyPackId === pack.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-sm disabled:opacity-50"
                        >
                          <X size={14} />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : pack.description ? (
                    <p className="text-sm text-gray-300 mt-1">{pack.description}</p>
                  ) : (
                    <p className="text-sm text-gray-500 mt-1 italic">No description yet.</p>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    <span>{formatBytes(pack.size)}</span>
                    <span className="mx-2">•</span>
                    <span>Uploaded {new Date(pack.created_at).toLocaleString()}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 break-all">
                    URL: <span className="text-gray-300">{directUrl}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 break-all">SHA1: {pack.sha1}</div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => copyValue(`url:${pack.id}`, directUrl)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-sm"
                  >
                    {copied === `url:${pack.id}` ? <Check size={14} /> : <Copy size={14} />}
                    Copy URL
                  </button>
                  <button
                    type="button"
                    onClick={() => copyValue(`sha1:${pack.id}`, pack.sha1)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-sm"
                  >
                    {copied === `sha1:${pack.id}` ? <Check size={14} /> : <Copy size={14} />}
                    Copy SHA1
                  </button>
                  <button
                    type="button"
                    onClick={() => startEditingDescription(pack)}
                    disabled={busyPackId === pack.id || (editingPackId !== null && editingPackId !== pack.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-sm disabled:opacity-50"
                  >
                    <Pencil size={14} />
                    {isEditingDescription ? 'Editing...' : 'Edit Description'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(pack)}
                    disabled={busyPackId === pack.id}
                    className="px-3 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 text-purple-300 text-sm disabled:opacity-50"
                  >
                    {pack.is_active ? 'Set Inactive' : 'Set Active'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(pack)}
                    disabled={busyPackId === pack.id}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-sm disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}

        {packs.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/15 bg-white/5 p-8 text-center text-gray-400 text-sm">
            No resource packs uploaded yet.
          </div>
        )}
      </div>
    </AdminPageLayout>
  );
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const rounded = value >= 10 ? value.toFixed(0) : value.toFixed(1);
  return `${rounded} ${units[unitIndex]}`;
}
