import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import AdminCard from '../AdminCard';
import AdminButton from '../AdminButton';
import { AdminInput, AdminLabel } from '../AdminField';
import type { LifeGoal } from '../../../lib/lifeDashboard/types';
import { clampPct, formatMoney } from '../../../lib/lifeDashboard/format';

type LifeGoalsProps = {
  goals: LifeGoal[];
  onChange: (goals: LifeGoal[]) => void;
  expanded?: boolean;
};

export default function LifeGoals({ goals, onChange, expanded }: LifeGoalsProps) {
  const [editing, setEditing] = useState(false);

  const updateGoal = (id: string, patch: Partial<LifeGoal>) => {
    onChange(goals.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  };

  const removeGoal = (id: string) => {
    onChange(goals.filter((g) => g.id !== id));
  };

  const addGoal = () => {
    onChange([
      ...goals,
      {
        id: `goal-${Date.now()}`,
        title: 'New goal',
        current: 0,
        target: 1000,
        currency: '£',
      },
    ]);
    setEditing(true);
  };

  return (
    <AdminCard
      id="widget-goals"
      title="Goals"
      className="h-full"
      actions={
        <div className="mr-14 flex gap-1">
          <AdminButton size="sm" variant="ghost" onClick={() => setEditing((v) => !v)}>
            <Pencil size={12} />
            {editing ? 'Done' : 'Edit'}
          </AdminButton>
        </div>
      }
    >
      <div className={`space-y-4 ${expanded ? 'max-w-2xl' : ''}`}>
        {goals.map((goal) => {
          const pct = clampPct(goal.current, goal.target);
          const currency = goal.currency ?? '£';
          if (editing) {
            return (
              <div
                key={goal.id}
                className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3"
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1 space-y-2">
                    <AdminInput
                      value={goal.title}
                      onChange={(e) => updateGoal(goal.id, { title: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <AdminLabel>Current</AdminLabel>
                        <AdminInput
                          type="number"
                          value={goal.current}
                          onChange={(e) =>
                            updateGoal(goal.id, { current: Number(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div>
                        <AdminLabel>Target</AdminLabel>
                        <AdminInput
                          type="number"
                          value={goal.target}
                          onChange={(e) =>
                            updateGoal(goal.id, { target: Number(e.target.value) || 0 })
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <AdminButton size="sm" variant="ghost" onClick={() => removeGoal(goal.id)}>
                    <Trash2 size={12} />
                  </AdminButton>
                </div>
              </div>
            );
          }
          return (
            <div key={goal.id} className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-white">{goal.title}</p>
                <p className="shrink-0 text-xs font-mono text-purple-300 tabular-nums">
                  {pct.toFixed(0)}%
                </p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500/80 to-indigo-400/80 transition-[width]"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span className="font-mono tabular-nums text-gray-400">
                  {formatMoney(goal.current, currency, 0)}
                </span>
                <span className="font-mono tabular-nums">
                  Target {formatMoney(goal.target, currency, 0)}
                </span>
              </div>
            </div>
          );
        })}
        {editing && (
          <AdminButton size="sm" variant="secondary" onClick={addGoal}>
            <Plus size={12} />
            Add goal
          </AdminButton>
        )}
      </div>
    </AdminCard>
  );
}
