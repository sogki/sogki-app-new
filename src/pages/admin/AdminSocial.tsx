import { useEffect, useState } from 'react';
import { adminApi } from '../../lib/adminApi';

export default function AdminSocial() {
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.social()
      .then(setLinks)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400">Loading...</div>;
  if (error) return <div className="text-red-400">Error: {error}</div>;

  return (
    <div>
      <h1 className="text-2xl font-mono font-bold mb-6">Social Links</h1>
      <p className="text-gray-400 mb-8">Manage global social media links (navbar, footer, hero).</p>
      <div className="space-y-4">
        {links.map((l) => (
          <div key={l.id} className="p-4 rounded-xl border border-white/10 bg-white/5">
            <h2 className="font-mono font-semibold text-white capitalize">{l.platform}</h2>
            <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-sm text-purple-400 hover:underline">
              {l.url}
            </a>
            {l.handle && <p className="text-xs text-gray-500">{l.handle}</p>}
          </div>
        ))}
      </div>
      <p className="text-gray-500 text-sm mt-6">
        Full edit UI coming next. Use the admin-api Edge Function for now.
      </p>
    </div>
  );
}
