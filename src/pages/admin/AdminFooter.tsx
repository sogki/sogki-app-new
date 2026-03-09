import { useEffect, useState } from 'react';
import { adminApi } from '../../lib/adminApi';

export default function AdminFooter() {
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.footer()
      .then(setConfig)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400">Loading...</div>;
  if (error) return <div className="text-red-400">Error: {error}</div>;

  const featured = (config.featured_projects as { name: string; url: string }[]) ?? [];
  const quickLinks = (config.quick_links as { name: string; href: string }[]) ?? [];
  const tagline = config.tagline as string;
  const philosophy = config.philosophy as { en?: string; jp?: string };

  return (
    <div>
      <h1 className="text-2xl font-mono font-bold mb-6">Footer Config</h1>
      <p className="text-gray-400 mb-8">Manage footer links, featured projects, and tagline.</p>
      <div className="space-y-6">
        <div className="p-4 rounded-xl border border-white/10 bg-white/5">
          <h2 className="font-mono font-semibold text-white mb-2">Featured Projects</h2>
          <ul className="space-y-1">
            {featured.map((p, i) => (
              <li key={i} className="text-sm text-gray-300">
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline"> {p.name}</a>
              </li>
            ))}
          </ul>
        </div>
        <div className="p-4 rounded-xl border border-white/10 bg-white/5">
          <h2 className="font-mono font-semibold text-white mb-2">Quick Links</h2>
          <ul className="space-y-1">
            {quickLinks.map((l, i) => (
              <li key={i} className="text-sm text-gray-300">
                {l.name} → {l.href}
              </li>
            ))}
          </ul>
        </div>
        <div className="p-4 rounded-xl border border-white/10 bg-white/5">
          <h2 className="font-mono font-semibold text-white mb-2">Tagline</h2>
          <p className="text-sm text-gray-400">{tagline}</p>
        </div>
        {philosophy && (
          <div className="p-4 rounded-xl border border-white/10 bg-white/5">
            <h2 className="font-mono font-semibold text-white mb-2">Philosophy</h2>
            <p className="text-sm text-gray-400">{philosophy.jp}</p>
            <p className="text-xs text-gray-500">{philosophy.en}</p>
          </div>
        )}
      </div>
      <p className="text-gray-500 text-sm mt-6">
        Full edit UI coming next. Use the admin-api Edge Function for now.
      </p>
    </div>
  );
}
