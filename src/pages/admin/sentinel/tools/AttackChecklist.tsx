import { useEffect, useState } from 'react';
import SentinelCard from '../../../../components/admin/sentinel/SentinelCard';
import TargetPicker from '../../../../components/admin/sentinel/TargetPicker';
import ToolShell from '../../../../components/admin/sentinel/ToolShell';
import {
  defaultChecklist,
  loadChecklist,
  saveChecklist,
  type ChecklistItem,
} from '../../../../lib/sentinel/checklist';

export default function AttackChecklist() {
  const [targetId, setTargetId] = useState('');
  const [items, setItems] = useState<ChecklistItem[]>(defaultChecklist());

  useEffect(() => {
    if (!targetId) return;
    setItems(loadChecklist(targetId));
  }, [targetId]);

  const update = (next: ChecklistItem[]) => {
    setItems(next);
    if (targetId) saveChecklist(targetId, next);
  };

  const done = items.filter((i) => i.done).length;

  return (
    <ToolShell
      title="Attack Surface Checklist"
      teaches="What this teaches: automation is incomplete — a checklist keeps authorised assessments deliberate."
    >
      <SentinelCard title="Target">
        <TargetPicker value={targetId} onChange={setTargetId} />
        <p className="mt-2 text-xs text-zinc-500">
          Progress is stored in this browser only ({done}/{items.length} done).
        </p>
      </SentinelCard>
      <SentinelCard title="Checklist">
        <ul className="space-y-3">
          {items.map((item, idx) => (
            <li key={item.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
              <label className="flex items-start gap-3 text-sm text-zinc-200">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx] = { ...item, done: e.target.checked };
                    update(next);
                  }}
                  className="mt-1"
                />
                <span className={item.done ? 'text-zinc-500 line-through' : ''}>{item.label}</span>
              </label>
              <input
                value={item.notes}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = { ...item, notes: e.target.value };
                  update(next);
                }}
                placeholder="Notes (local only)"
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-zinc-300"
              />
            </li>
          ))}
        </ul>
      </SentinelCard>
    </ToolShell>
  );
}
