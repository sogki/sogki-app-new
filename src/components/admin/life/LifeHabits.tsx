import { useMemo, useState } from 'react';
import { Check, Pencil, Plus, Trash2 } from 'lucide-react';
import AdminCard from '../AdminCard';
import AdminButton from '../AdminButton';
import { AdminInput } from '../AdminField';
import type { LifeHabit } from '../../../lib/lifeDashboard/types';
import { todayKey } from '../../../lib/lifeDashboard/format';

type Completions = {
  date: string;
  completedIds: string[];
};

type LifeHabitsProps = {
  habits: LifeHabit[];
  completions?: Completions;
  onChange: (habits: LifeHabit[], completions: Completions) => void;
  expanded?: boolean;
};

export default function LifeHabits({
  habits,
  completions,
  onChange,
  expanded,
}: LifeHabitsProps) {
  const [editing, setEditing] = useState(false);
  const today = todayKey();
  const completedIds = useMemo(() => {
    if (completions?.date === today) return new Set(completions.completedIds ?? []);
    return new Set<string>();
  }, [completions, today]);

  const doneCount = [...completedIds].filter((id) => habits.some((h) => h.id === id)).length;
  const pct = habits.length ? Math.round((doneCount / habits.length) * 100) : 0;
  const bestStreak = useMemo(
    () => Math.max(0, ...habits.map((h) => h.streak)),
    [habits]
  );

  const emitCompletions = (ids: Set<string>) => {
    onChange(habits, { date: today, completedIds: [...ids] });
  };

  const toggle = (id: string) => {
    const next = new Set(completedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    emitCompletions(next);
  };

  const updateHabit = (id: string, patch: Partial<LifeHabit>) => {
    onChange(
      habits.map((h) => (h.id === id ? { ...h, ...patch } : h)),
      { date: today, completedIds: [...completedIds] }
    );
  };

  const removeHabit = (id: string) => {
    const next = new Set(completedIds);
    next.delete(id);
    onChange(
      habits.filter((h) => h.id !== id),
      { date: today, completedIds: [...next] }
    );
  };

  const addHabit = () => {
    onChange(
      [
        ...habits,
        {
          id: `habit-${Date.now()}`,
          label: 'New habit',
          completed: false,
          streak: 0,
        },
      ],
      { date: today, completedIds: [...completedIds] }
    );
    setEditing(true);
  };

  return (
    <AdminCard
      id="widget-habits"
      title="Habits"
      className="h-full"
      actions={
        <div className="mr-14 flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {doneCount}/{habits.length} · {pct}%
          </span>
          <AdminButton size="sm" variant="ghost" onClick={() => setEditing((v) => !v)}>
            <Pencil size={12} />
            {editing ? 'Done' : 'Edit'}
          </AdminButton>
        </div>
      }
    >
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-purple-400/70 transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mb-3 text-xs text-gray-500">Best streak · {bestStreak} days</p>
      <ul className={`space-y-1.5 ${expanded ? 'max-w-lg' : ''}`}>
        {habits.map((habit) => {
          const done = completedIds.has(habit.id);
          if (editing) {
            return (
              <li key={habit.id} className="flex items-center gap-2">
                <AdminInput
                  value={habit.label}
                  onChange={(e) => updateHabit(habit.id, { label: e.target.value })}
                  className="flex-1"
                />
                <AdminInput
                  type="number"
                  value={habit.streak}
                  onChange={(e) =>
                    updateHabit(habit.id, { streak: Number(e.target.value) || 0 })
                  }
                  className="w-16"
                />
                <AdminButton size="sm" variant="ghost" onClick={() => removeHabit(habit.id)}>
                  <Trash2 size={12} />
                </AdminButton>
              </li>
            );
          }
          return (
            <li key={habit.id}>
              <button
                type="button"
                onClick={() => toggle(habit.id)}
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  done
                    ? 'border-purple-400/25 bg-purple-500/10 text-purple-100'
                    : 'border-white/10 bg-black/20 text-gray-300 hover:bg-white/5'
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                    done
                      ? 'border-purple-400/40 bg-purple-500/30 text-purple-200'
                      : 'border-white/15 text-transparent'
                  }`}
                >
                  <Check size={12} />
                </span>
                <span className="flex-1 text-sm">{habit.label}</span>
                <span className="text-[11px] text-gray-500">{habit.streak}d</span>
              </button>
            </li>
          );
        })}
      </ul>
      {editing && (
        <AdminButton size="sm" variant="secondary" className="mt-3" onClick={addHabit}>
          <Plus size={12} />
          Add habit
        </AdminButton>
      )}
    </AdminCard>
  );
}
