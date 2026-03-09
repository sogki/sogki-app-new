import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { adminApi } from '../../lib/adminApi';
import AdminPageLayout from './AdminPageLayout';
import { SiteContentField } from './SiteContentField';
import { AdminSectionCard } from './AdminSectionCard';
import { ChevronDown, ChevronRight } from 'lucide-react';

type SiteContentItem = {
  id: string;
  key: string;
  value: unknown;
  content_type: string;
  section: string;
  label: string | null;
  sort_order: number;
};

const SECTIONS = [
  { id: 'hero', label: 'Hero', labelJp: 'ヒーロー' },
  { id: 'about', label: 'About', labelJp: '私について' },
  { id: 'features', label: 'Features', labelJp: '提供する価値' },
];

// Group keys within each section for clearer organization
const HERO_GROUPS: { label: string; labelJp: string; keys: string[] }[] = [
  { label: 'Title & Subtitle', labelJp: 'タイトル', keys: ['hero.title', 'hero.subtitle_jp', 'hero.subtitle'] },
  { label: 'Description', labelJp: '説明', keys: ['hero.description_1', 'hero.description_2'] },
  { label: 'Call to Action', labelJp: 'ボタン', keys: ['hero.cta_projects', 'hero.cta_contact'] },
];
const ABOUT_GROUPS: { label: string; labelJp: string; keys: string[] }[] = [
  { label: 'Section Titles', labelJp: '見出し', keys: ['about.section_title', 'about.section_title_jp'] },
  { label: 'Bio', labelJp: '自己紹介', keys: ['about.bio_1', 'about.bio_2', 'about.bio_3'] },
  { label: 'Stats', labelJp: '数字で見る実績', keys: ['about.stats_title', 'about.stats_title_jp', 'about.stats'] },
  { label: 'Starmap', labelJp: 'スターマップ', keys: ['about.starmap_label'] },
];
const FEATURES_GROUPS: { label: string; labelJp: string; keys: string[] }[] = [
  { label: 'Section Titles', labelJp: '見出し', keys: ['features.section_title', 'features.section_title_jp'] },
];

export default function AdminHome() {
  const [items, setItems] = useState<SiteContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['hero']));

  const fetch = () => {
    setLoading(true);
    setError(null);
    adminApi
      .siteContent()
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => fetch(), []);

  const handleSave = async (key: string, value: unknown) => {
    setSaving(key);
    try {
      await adminApi.updateSiteContent(key, value);
      fetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(null);
    }
  };

  const bySection = items.reduce<Record<string, SiteContentItem[]>>((acc, item) => {
    if (!SECTIONS.some((s) => s.id === item.section)) return acc;
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {});

  const getGroups = (sectionId: string) => {
    if (sectionId === 'hero') return HERO_GROUPS;
    if (sectionId === 'about') return ABOUT_GROUPS;
    if (sectionId === 'features') return FEATURES_GROUPS;
    return [];
  };

  return (
    <AdminPageLayout
      title="Home Page Content"
      titleJp="ホーム"
      description="Edit Hero, About, and Features section content on the main site."
      loading={loading}
      error={error}
      onRetry={fetch}
    >
      <div className="space-y-3">
        {SECTIONS.map((section) => {
          const sectionItems = (bySection[section.id] ?? []).sort((a, b) => a.sort_order - b.sort_order);
          if (sectionItems.length === 0) return null;
          const isExpanded = expanded.has(section.id);
          const groups = getGroups(section.id);
          const itemsByKey = Object.fromEntries(sectionItems.map((i) => [i.key, i]));
          return (
            <motion.div
              key={section.id}
              className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span
                className="absolute inset-0 flex items-center justify-end pr-6 text-5xl font-light text-purple-400/10 pointer-events-none select-none"
                aria-hidden
              >
                {section.labelJp}
              </span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setExpanded((prev) => {
                      const next = new Set(prev);
                      if (next.has(section.id)) next.delete(section.id);
                      else next.add(section.id);
                      return next;
                    })
                  }
                  className="w-full flex items-center gap-2 p-4 text-left hover:bg-white/5 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown size={18} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={18} className="text-gray-400" />
                  )}
                  <span className="font-semibold text-white font-mono">{section.label}</span>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4 border-t border-white/10 pt-4">
                    {groups.map((group) => {
                      const groupItems = group.keys
                        .map((k) => itemsByKey[k])
                        .filter(Boolean)
                        .sort((a, b) => a.sort_order - b.sort_order);
                      if (groupItems.length === 0) return null;
                      return (
                        <AdminSectionCard key={group.label} label={group.label} labelJp={group.labelJp}>
                          <div className="px-4 pb-4 space-y-4">
                            {groupItems.map((item) => (
                              <SiteContentField
                                key={item.id}
                                item={item}
                                onSave={handleSave}
                                saving={saving === item.key}
                              />
                            ))}
                          </div>
                        </AdminSectionCard>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </AdminPageLayout>
  );
}
