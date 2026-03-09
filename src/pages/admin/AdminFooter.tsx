import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { adminApi } from '../../lib/adminApi';
import AdminPageLayout from './AdminPageLayout';
import { ExternalLink, Save } from 'lucide-react';

type FeaturedProject = { name: string; url: string };
type QuickLink = { name: string; href: string };
type Philosophy = { en?: string; jp?: string };

export default function AdminFooter() {
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const featured = (config.featured_projects as FeaturedProject[]) ?? [];
  const quickLinks = (config.quick_links as QuickLink[]) ?? [];
  const tagline = (config.tagline as string) ?? '';
  const philosophy = (config.philosophy as Philosophy) ?? {};

  const fetch = () => {
    setLoading(true);
    setError(null);
    adminApi
      .footer()
      .then(setConfig)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => fetch(), []);

  const updateKey = async (key: string, value: unknown) => {
    setSaving(key);
    try {
      await adminApi.updateFooter(key, value);
      setConfig((prev) => ({ ...prev, [key]: value }));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(null);
    }
  };

  return (
    <AdminPageLayout
      title="Footer Config"
      titleJp="フッター"
      description="Manage footer links, featured projects, and tagline."
      loading={loading}
      error={error}
      onRetry={fetch}
    >
      <div className="space-y-6">
        <FooterSection title="Tagline">
          <TaglineForm value={tagline} onSave={(v) => updateKey('tagline', v)} saving={saving === 'tagline'} />
        </FooterSection>

        <FooterSection title="Philosophy">
          <PhilosophyForm
            value={philosophy}
            onSave={(v) => updateKey('philosophy', v)}
            saving={saving === 'philosophy'}
          />
        </FooterSection>

        <FooterSection title="Featured Projects">
          <FeaturedProjectsForm
            value={featured}
            onSave={(v) => updateKey('featured_projects', v)}
            saving={saving === 'featured_projects'}
          />
        </FooterSection>

        <FooterSection title="Quick Links">
          <QuickLinksForm
            value={quickLinks}
            onSave={(v) => updateKey('quick_links', v)}
            saving={saving === 'quick_links'}
          />
        </FooterSection>
      </div>
    </AdminPageLayout>
  );
}

const FOOTER_SECTION_JP: Record<string, string> = {
  Tagline: 'タグライン',
  Philosophy: '哲学',
  'Featured Projects': '注目プロジェクト',
  'Quick Links': 'クイックリンク',
};

function FooterSection({ title, children }: { title: string; children: React.ReactNode }) {
  const labelJp = FOOTER_SECTION_JP[title] ?? undefined;
  return (
    <motion.div
      className="relative overflow-hidden p-4 rounded-xl border border-white/10 bg-white/5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {labelJp && (
        <span className="absolute inset-0 flex items-center justify-end pr-6 text-4xl font-light text-purple-400/10 pointer-events-none select-none" aria-hidden>{labelJp}</span>
      )}
      <div className="relative">
        <h2 className="font-semibold text-white mb-4 font-mono">{title}</h2>
        {children}
      </div>
    </motion.div>
  );
}

function TaglineForm({ value, onSave, saving }: { value: string; onSave: (v: string) => void; saving: boolean }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={v}
        onChange={(e) => setV(e.target.value)}
        className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-purple-400/50 outline-none"
        placeholder="Full-stack product engineering with a design-first edge"
      />
      <button
        type="button"
        onClick={() => onSave(v)}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 text-purple-300 text-sm disabled:opacity-50"
      >
        <Save size={14} />
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
}

function PhilosophyForm({
  value,
  onSave,
  saving,
}: {
  value: Philosophy;
  onSave: (v: Philosophy) => void;
  saving: boolean;
}) {
  const [jp, setJp] = useState(value.jp ?? '');
  const [en, setEn] = useState(value.en ?? '');
  useEffect(() => {
    setJp(value.jp ?? '');
    setEn(value.en ?? '');
  }, [value]);
  return (
    <div className="space-y-2">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Japanese</label>
        <input
          type="text"
          value={jp}
          onChange={(e) => setJp(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
          placeholder="美しさは簡潔にあり"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">English</label>
        <input
          type="text"
          value={en}
          onChange={(e) => setEn(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
          placeholder="Beauty lies in simplicity"
        />
      </div>
      <button
        type="button"
        onClick={() => onSave({ jp, en })}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 text-purple-300 text-sm disabled:opacity-50"
      >
        <Save size={14} />
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
}

function FeaturedProjectsForm({
  value,
  onSave,
  saving,
}: {
  value: FeaturedProject[];
  onSave: (v: FeaturedProject[]) => void;
  saving: boolean;
}) {
  const [items, setItems] = useState<FeaturedProject[]>(value);
  useEffect(() => setItems(value), [value]);

  const add = () => setItems([...items, { name: '', url: '' }]);
  const remove = (i: number) => setItems(items.filter((_, j) => j !== i));
  const update = (i: number, field: 'name' | 'url', val: string) => {
    const next = [...items];
    next[i] = { ...next[i], [field]: val };
    setItems(next);
  };

  return (
    <div className="space-y-3">
      {items.map((p, i) => (
        <div key={i} className="flex gap-2">
          <input
            type="text"
            value={p.name}
            onChange={(e) => update(i, 'name', e.target.value)}
            placeholder="Project name"
            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
          />
          <input
            type="url"
            value={p.url}
            onChange={(e) => update(i, 'url', e.target.value)}
            placeholder="https://..."
            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="px-2 py-2 rounded-lg text-red-400 hover:bg-red-500/20"
          >
            ×
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={add}
          className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-sm"
        >
          + Add
        </button>
        <button
          type="button"
          onClick={() => onSave(items)}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 text-purple-300 text-sm disabled:opacity-50"
        >
          <Save size={14} />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function QuickLinksForm({
  value,
  onSave,
  saving,
}: {
  value: QuickLink[];
  onSave: (v: QuickLink[]) => void;
  saving: boolean;
}) {
  const [items, setItems] = useState<QuickLink[]>(value);
  useEffect(() => setItems(value), [value]);

  const add = () => setItems([...items, { name: '', href: '' }]);
  const remove = (i: number) => setItems(items.filter((_, j) => j !== i));
  const update = (i: number, field: 'name' | 'href', val: string) => {
    const next = [...items];
    next[i] = { ...next[i], [field]: val };
    setItems(next);
  };

  return (
    <div className="space-y-3">
      {items.map((l, i) => (
        <div key={i} className="flex gap-2">
          <input
            type="text"
            value={l.name}
            onChange={(e) => update(i, 'name', e.target.value)}
            placeholder="Link name"
            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
          />
          <input
            type="text"
            value={l.href}
            onChange={(e) => update(i, 'href', e.target.value)}
            placeholder="/#section or https://..."
            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="px-2 py-2 rounded-lg text-red-400 hover:bg-red-500/20"
          >
            ×
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={add}
          className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-sm"
        >
          + Add
        </button>
        <button
          type="button"
          onClick={() => onSave(items)}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 text-purple-300 text-sm disabled:opacity-50"
        >
          <Save size={14} />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
