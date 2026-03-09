import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminApi } from '../../lib/adminApi';
import AdminPageLayout from './AdminPageLayout';
import { SiteContentField } from './SiteContentField';
import { AdminSectionCard } from './AdminSectionCard';
import { ExternalLink, Plus, Pencil, Trash2, X } from 'lucide-react';

const PROJECTS_HEADER_GROUPS: { label: string; labelJp: string; keys: string[] }[] = [
  { label: 'Section Headings', labelJp: '見出し', keys: ['projects.section_title', 'projects.section_title_jp'] },
  { label: 'Description', labelJp: '説明', keys: ['projects.section_description'] },
  { label: 'More Projects', labelJp: 'その他', keys: ['projects.more_title'] },
];

type SiteContentItem = {
  id: string;
  key: string;
  value: unknown;
  content_type: string;
  label: string | null;
  sort_order: number;
};

type Project = {
  id: string;
  title: string;
  title_jp?: string;
  description: string;
  technologies: string[];
  github?: string;
  demo?: string;
  featured: boolean;
  color?: string;
  sort_order: number;
};

const COLOR_OPTIONS = [
  'from-green-500 to-emerald-500',
  'from-indigo-500 to-blue-500',
  'from-purple-500 to-indigo-500',
  'from-yellow-500 to-orange-500',
  'from-cyan-500 to-teal-500',
];

export default function AdminProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [sectionContent, setSectionContent] = useState<SiteContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);
  const [contentSaving, setContentSaving] = useState<string | null>(null);

  const fetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const [proj, content] = await Promise.all([
        adminApi.projects(),
        adminApi.siteContent('projects'),
      ]);
      setProjects(proj);
      setSectionContent(content ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const handleContentSave = async (key: string, value: unknown) => {
    setContentSaving(key);
    try {
      await adminApi.updateSiteContent(key, value);
      fetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setContentSaving(null);
    }
  };

  const handleSave = async (data: Partial<Project>) => {
    setSaving(true);
    try {
      if (editing?.id) {
        await adminApi.updateProject(editing.id, data);
      } else {
        await adminApi.createProject(data);
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
    if (!confirm('Delete this project?')) return;
    try {
      await adminApi.deleteProject(id);
      setEditing(null);
      fetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  const sortedContent = [...sectionContent].sort((a, b) => a.sort_order - b.sort_order);

  const contentByKey = Object.fromEntries(sectionContent.map((i) => [i.key, i]));

  return (
    <AdminPageLayout
      title="Projects"
      titleJp="プロジェクト"
      description="Manage the projects section header and project list."
      loading={loading}
      error={error}
      onRetry={fetch}
    >
      {sortedContent.length > 0 && (
        <div className="mb-6 space-y-4">
          {PROJECTS_HEADER_GROUPS.map((group) => {
            const groupItems = group.keys
              .map((k) => contentByKey[k])
              .filter(Boolean)
              .sort((a, b) => a.sort_order - b.sort_order);
            if (groupItems.length === 0) return null;
            return (
              <motion.div key={group.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <AdminSectionCard label={group.label} labelJp={group.labelJp}>
                  <div className="px-4 pb-4 space-y-4">
                    {groupItems.map((item) => (
                      <SiteContentField
                        key={item.id}
                        item={item}
                        onSave={handleContentSave}
                        saving={contentSaving === item.key}
                      />
                    ))}
                  </div>
                </AdminSectionCard>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={() => setEditing({} as Project)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 text-purple-300 text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add Project
        </button>
      </div>
      <div className="space-y-4">
        {projects.map((p, i) => (
          <motion.div
            key={p.id}
            className="relative overflow-hidden p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-purple-400/30 transition-all duration-150 group"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <span
              className="absolute inset-0 flex items-center justify-end pr-6 text-4xl font-light text-purple-400/10 pointer-events-none select-none"
              aria-hidden
            >
              {p.title_jp || 'プロジェクト'}
            </span>
            <div className="relative flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-semibold text-white font-mono">{p.title}</h2>
                  {p.featured && (
                    <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30">
                      Featured
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400 mt-1">{p.description}</p>
                <div className="flex gap-4 mt-2">
                  {p.demo && (
                    <a
                      href={p.demo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      Demo <ExternalLink size={12} />
                    </a>
                  )}
                  {p.github && (
                    <a
                      href={p.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      GitHub <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => setEditing(p)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white"
                  aria-label="Edit"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
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
          <ProjectModal
            project={editing}
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

function ProjectModal({
  project,
  onClose,
  onSave,
  saving,
  onDelete,
}: {
  project: Partial<Project>;
  onClose: () => void;
  onSave: (data: Partial<Project>) => void;
  saving: boolean;
  onDelete?: () => void;
}) {
  const [title, setTitle] = useState(project.title ?? '');
  const [titleJp, setTitleJp] = useState(project.title_jp ?? '');
  const [description, setDescription] = useState(project.description ?? '');
  const [technologies, setTechnologies] = useState((project.technologies ?? []).join(', '));
  const [github, setGithub] = useState(project.github ?? '');
  const [demo, setDemo] = useState(project.demo ?? '');
  const [featured, setFeatured] = useState(project.featured ?? false);
  const [color, setColor] = useState(project.color ?? 'from-purple-500 to-indigo-500');
  const [sortOrder, setSortOrder] = useState(project.sort_order ?? 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title,
      title_jp: titleJp || undefined,
      description,
      technologies: technologies.split(',').map((t) => t.trim()).filter(Boolean),
      github: github || undefined,
      demo: demo || undefined,
      featured,
      color,
      sort_order: sortOrder,
    });
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
        className="relative w-full max-w-lg rounded-xl border border-white/10 bg-black p-6 max-h-[90vh] overflow-y-auto overflow-x-hidden"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <span
          className="absolute inset-0 flex items-center justify-end pr-8 text-6xl font-light text-purple-400/10 pointer-events-none select-none"
          aria-hidden
        >
          {project.id ? '編集' : '追加'}
        </span>
        <div className="relative flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white font-mono">
            {project.id ? 'Edit Project' : 'Add Project'}
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
            <label className="block text-sm text-gray-400 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-purple-400/50 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Title (Japanese)</label>
            <input
              type="text"
              value={titleJp}
              onChange={(e) => setTitleJp(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-purple-400/50 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-purple-400/50 outline-none resize-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Technologies (comma-separated)</label>
            <input
              type="text"
              value={technologies}
              onChange={(e) => setTechnologies(e.target.value)}
              placeholder="Next.js, React, TypeScript"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-purple-400/50 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">GitHub URL</label>
              <input
                type="url"
                value={github}
                onChange={(e) => setGithub(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-purple-400/50 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Demo URL</label>
              <input
                type="url"
                value={demo}
                onChange={(e) => setDemo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-purple-400/50 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Color gradient</label>
            <select
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-purple-400/50 outline-none"
            >
              {COLOR_OPTIONS.map((c) => (
                <option key={c} value={c} className="bg-black">
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-300">Featured</span>
            </label>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">Sort order</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="w-20 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
              />
            </div>
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
