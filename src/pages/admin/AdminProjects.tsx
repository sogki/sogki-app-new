import { useEffect, useState } from 'react';
import { adminApi } from '../../lib/adminApi';

export default function AdminProjects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.projects()
      .then(setProjects)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400">Loading...</div>;
  if (error) return <div className="text-red-400">Error: {error}</div>;

  return (
    <div>
      <h1 className="text-2xl font-mono font-bold mb-6">Projects</h1>
      <p className="text-gray-400 mb-8">Manage featured projects displayed on the portfolio.</p>
      <div className="space-y-4">
        {projects.map((p) => (
          <div key={p.id} className="p-4 rounded-xl border border-white/10 bg-white/5">
            <div className="flex items-center justify-between">
              <h2 className="font-mono font-semibold text-white">{p.title}</h2>
              {p.featured && <span className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-300">Featured</span>}
            </div>
            <p className="text-sm text-gray-400 mt-1">{p.description}</p>
            <div className="flex gap-2 mt-2">
              {p.demo && <a href={p.demo} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:underline">Demo</a>}
              {p.github && <a href={p.github} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:underline">GitHub</a>}
            </div>
          </div>
        ))}
      </div>
      <p className="text-gray-500 text-sm mt-6">
        Full CRUD UI coming next. Use the admin-api Edge Function for now.
      </p>
    </div>
  );
}
