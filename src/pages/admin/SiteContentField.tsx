import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';

type SiteContentItem = {
  id: string;
  key: string;
  value: unknown;
  content_type: string;
  label: string | null;
};

export function SiteContentField({
  item,
  onSave,
  saving,
}: {
  item: SiteContentItem;
  onSave: (key: string, value: unknown) => void;
  saving: boolean;
}) {
  const [value, setValue] = useState(stringifyValue(item.value));

  useEffect(() => setValue(stringifyValue(item.value)), [item.value]);

  const handleSave = () => {
    const parsed = parseValue(value, item.content_type);
    if (parsed !== undefined) onSave(item.key, parsed);
    else alert('Invalid value');
  };

  if (item.content_type === 'boolean') {
    const boolVal = item.value === true || item.value === 'true';
    return (
      <div className="flex items-center justify-between gap-4 py-2">
        <label className="text-sm text-gray-300">{item.label ?? item.key}</label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={boolVal}
            onChange={(e) => onSave(item.key, e.target.checked)}
            className="rounded border-white/20 bg-white/5 text-purple-500"
          />
          <span className="text-sm text-gray-400">Show section</span>
        </label>
      </div>
    );
  }

  const isMultiline = item.content_type === 'richtext' || (item.content_type === 'json' && typeof item.value === 'object');
  return (
    <div className="py-2">
      <label className="block text-sm text-gray-400 mb-1">{item.label ?? item.key}</label>
      <div className="flex gap-2">
        {isMultiline ? (
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={4}
            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-purple-400/50 outline-none resize-y"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-purple-400/50 outline-none"
          />
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 text-purple-300 text-sm shrink-0 disabled:opacity-50"
        >
          <Save size={14} />
        </button>
      </div>
    </div>
  );
}

function stringifyValue(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  return JSON.stringify(v, null, 2);
}

function parseValue(s: string, contentType: string): unknown {
  const t = s.trim();
  if (contentType === 'boolean') return t === 'true' || t === '1';
  if (contentType === 'number') {
    const n = Number(t);
    return isNaN(n) ? undefined : n;
  }
  if (contentType === 'json') {
    try {
      return JSON.parse(t || 'null');
    } catch {
      return undefined;
    }
  }
  return t;
}
