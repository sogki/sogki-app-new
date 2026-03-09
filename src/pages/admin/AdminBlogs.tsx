import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminApi } from '../../lib/adminApi';
import AdminPageLayout from './AdminPageLayout';
import { BlogEditor } from '../../components/blog/BlogEditor';
import { Plus, Pencil, Trash2, X, ExternalLink } from 'lucide-react';

type Blog = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  preview_image_url: string | null;
  published_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function AdminBlogs() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Blog | null | 'new'>(null);
  const [saving, setSaving] = useState(false);

  const fetch = () => {
    setLoading(true);
    setError(null);
    adminApi
      .blogs()
      .then(setBlogs)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => fetch(), []);

  const handleSave = async (data: Partial<Blog>) => {
    setSaving(true);
    try {
      if (editing === 'new') {
        await adminApi.createBlog(data);
      } else if (editing?.id) {
        await adminApi.updateBlog(editing.id, data);
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
    if (!confirm('Delete this blog post?')) return;
    try {
      await adminApi.deleteBlog(id);
      setEditing(null);
      fetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  return (
    <AdminPageLayout
      title="Blogs"
      titleJp="ブログ"
      description="Create and edit blog posts. Use the editor to place images exactly where you want them—they stay in position when published."
      loading={loading}
      error={error}
      onRetry={fetch}
    >
      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 text-purple-300 text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          New Post
        </button>
      </div>
      <div className="space-y-4">
        {blogs.map((b, i) => (
          <motion.div
            key={b.id}
            className="relative overflow-hidden p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-purple-400/30 transition-all duration-150 group"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <span
              className="absolute inset-0 flex items-center justify-end pr-6 text-4xl font-light text-purple-400/10 pointer-events-none select-none"
              aria-hidden
            >
              記事
            </span>
            <div className="relative flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-white font-mono">{b.title}</h2>
                <p className="text-sm text-gray-400 mt-1">{b.slug}</p>
                <div className="flex items-center gap-4 mt-2">
                  {b.published_at ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30">
                      Published
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                      Draft
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    {new Date(b.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => setEditing(b)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white"
                  aria-label="Edit"
                >
                  <Pencil size={14} />
                </button>
                <a
                  href={`/blog/${b.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white"
                  aria-label="View"
                >
                  <ExternalLink size={14} />
                </a>
                <button
                  type="button"
                  onClick={() => handleDelete(b.id)}
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
          <BlogModal
            blog={editing === 'new' ? null : editing}
            onClose={() => setEditing(null)}
            onSave={handleSave}
            saving={saving}
            onDelete={editing !== 'new' && editing?.id ? () => handleDelete(editing.id) : undefined}
          />
        )}
      </AnimatePresence>
    </AdminPageLayout>
  );
}

function BlogModal({
  blog,
  onClose,
  onSave,
  saving,
  onDelete,
}: {
  blog: Blog | null;
  onClose: () => void;
  onSave: (data: Partial<Blog>) => void;
  saving: boolean;
  onDelete?: () => void;
}) {
  const [title, setTitle] = useState(blog?.title ?? '');
  const [slug, setSlug] = useState(blog?.slug ?? '');
  const [excerpt, setExcerpt] = useState(blog?.excerpt ?? '');
  const [content, setContent] = useState(blog?.content ?? '');
  const [previewImageUrl, setPreviewImageUrl] = useState(blog?.preview_image_url ?? '');
  const [publish, setPublish] = useState(!!blog?.published_at);

  useEffect(() => {
    if (!blog && title) setSlug(slugify(title));
  }, [title, blog]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title,
      slug: slug || slugify(title),
      excerpt: excerpt || null,
      content,
      preview_image_url: previewImageUrl || null,
      published_at: publish ? (blog?.published_at ?? new Date().toISOString()) : null,
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
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl border border-white/10 bg-black p-6"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <span
          className="absolute inset-0 flex items-center justify-end pr-8 text-6xl font-light text-purple-400/10 pointer-events-none select-none"
          aria-hidden
        >
          {blog ? '編集' : '追加'}
        </span>
        <div className="relative flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white font-mono">
            {blog ? 'Edit Post' : 'New Post'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
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
              <label className="block text-sm text-gray-400 mb-1">Slug (URL)</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="auto-generated"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-purple-400/50 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Excerpt</label>
            <input
              type="text"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Short summary for preview"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-purple-400/50 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Preview image URL</label>
            <input
              type="url"
              value={previewImageUrl}
              onChange={(e) => setPreviewImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-purple-400/50 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Content</label>
            <BlogEditor
              value={content}
              onChange={setContent}
              blogId={blog?.id}
              placeholder="Write your post. Use the toolbar to insert images—they appear exactly where you place them."
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={publish}
                onChange={(e) => setPublish(e.target.checked)}
                className="rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-300">Publish now</span>
            </label>
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
