import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { adminApi } from '../../lib/adminApi';
import AdminPageLayout from './AdminPageLayout';
import { SiteContentField } from './SiteContentField';
import { AdminSectionCard } from './AdminSectionCard';

type SiteContentItem = {
  id: string;
  key: string;
  value: unknown;
  content_type: string;
  label: string | null;
  sort_order: number;
};

const FLAG_GROUPS: { label: string; labelJp: string; keys: string[] }[] = [
  { label: 'Hero', labelJp: 'ヒーロー', keys: ['feature.show_hero'] },
  { label: 'About', labelJp: '私について', keys: ['feature.show_about'] },
  { label: 'Features', labelJp: '提供する価値', keys: ['feature.show_features'] },
  { label: 'Projects', labelJp: 'プロジェクト', keys: ['feature.show_projects'] },
  { label: 'Contact', labelJp: 'お問い合わせ', keys: ['feature.show_contact'] },
];

export default function AdminSettings() {
  const [items, setItems] = useState<SiteContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const fetch = () => {
    setLoading(true);
    setError(null);
    adminApi
      .siteContent('feature_flags')
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

  const itemsByKey = Object.fromEntries(items.map((i) => [i.key, i]));

  return (
    <AdminPageLayout
      title="Feature Flags"
      titleJp="設定"
      description="Show or hide sections on the main site. Toggle sections on/off."
      loading={loading}
      error={error}
      onRetry={fetch}
    >
      <div className="space-y-3">
        {FLAG_GROUPS.map((group) => {
          const groupItems = group.keys
            .map((k) => itemsByKey[k])
            .filter(Boolean)
            .sort((a, b) => a.sort_order - b.sort_order);
          if (groupItems.length === 0) return null;
          return (
            <motion.div key={group.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <AdminSectionCard label={group.label} labelJp={group.labelJp}>
                <div className="px-4 pb-4">
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
            </motion.div>
          );
        })}
      </div>
    </AdminPageLayout>
  );
}
