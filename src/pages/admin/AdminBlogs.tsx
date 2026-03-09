import { useEffect, useState } from 'react';
import { adminApi } from '../../lib/adminApi';

export default function AdminBlogs() {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.blogs()
      .then(setBlogs)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400">Loading...</div>;
  if (error) return <div className="text-red-400">Error: {error}</div>;

  return (
    <div>
      <h1 className="text-2xl font-mono font-bold mb-6">Blogs</h1>
      <p className="text-gray-400 mb-8">
        Create and edit blog posts. Supports markdown, preview images, and draggable images.
      </p>
      {blogs.length === 0 ? (
        <p className="text-gray-500">No blogs yet. Create your first post.</p>
      ) : (
        <div className="space-y-4">
          {blogs.map((b) => (
            <div key={b.id} className="p-4 rounded-xl border border-white/10 bg-white/5">
              <h2 className="font-mono font-semibold text-white">{b.title}</h2>
              <p className="text-sm text-gray-400">{b.slug}</p>
              {b.published_at ? (
                <span className="text-xs text-green-400">Published</span>
              ) : (
                <span className="text-xs text-yellow-400">Draft</span>
              )}
            </div>
          ))}
        </div>
      )}
      <p className="text-gray-500 text-sm mt-6">
        Full editor with markdown, image upload, and preview coming next.
      </p>
    </div>
  );
}
