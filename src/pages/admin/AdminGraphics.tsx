import { useEffect, useState } from 'react';
import { adminApi } from '../../lib/adminApi';

export default function AdminGraphics() {
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.collections()
      .then(setCollections)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400">Loading...</div>;
  if (error) return <div className="text-red-400">Error: {error}</div>;

  return (
    <div>
      <h1 className="text-2xl font-mono font-bold mb-6">Graphics Portfolio</h1>
      <p className="text-gray-400 mb-8">
        Manage collections and assets. Upload new images to the graphics-design-portfolio bucket, then add assets here.
      </p>
      <div className="space-y-4">
        {collections.map((c) => (
          <div
            key={c.id}
            className="p-4 rounded-xl border border-white/10 bg-white/5"
          >
            <h2 className="font-mono font-semibold text-white">{c.client}</h2>
            <p className="text-sm text-gray-400">{c.summary}</p>
          </div>
        ))}
      </div>
      <p className="text-gray-500 text-sm mt-6">
        Full CRUD UI for collections and assets coming next. Use the admin-api Edge Function for now.
      </p>
    </div>
  );
}
