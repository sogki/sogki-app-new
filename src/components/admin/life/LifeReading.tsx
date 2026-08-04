import { useState } from 'react';
import { Pencil } from 'lucide-react';
import AdminCard from '../AdminCard';
import AdminButton from '../AdminButton';
import { AdminInput, AdminLabel } from '../AdminField';
import type { LifeReading } from '../../../lib/lifeDashboard/types';
import { clampPct } from '../../../lib/lifeDashboard/format';

type LifeReadingProps = {
  reading: LifeReading;
  onChange: (reading: LifeReading) => void;
  expanded?: boolean;
};

export default function LifeReadingWidget({ reading, onChange, expanded }: LifeReadingProps) {
  const [editing, setEditing] = useState(false);
  const remaining = Math.max(0, reading.totalPages - reading.currentPage);
  const pct = clampPct(reading.currentPage, reading.totalPages);

  return (
    <AdminCard
      id="widget-reading"
      title="Reading"
      className="h-full"
      actions={
        <div className="mr-14">
          <AdminButton size="sm" variant="ghost" onClick={() => setEditing((v) => !v)}>
            <Pencil size={12} />
            {editing ? 'Done' : 'Edit'}
          </AdminButton>
        </div>
      }
    >
      {editing ? (
        <div className={`space-y-3 ${expanded ? 'max-w-md' : ''}`}>
          <div>
            <AdminLabel>Book</AdminLabel>
            <AdminInput
              value={reading.currentBook}
              onChange={(e) => onChange({ ...reading, currentBook: e.target.value })}
            />
          </div>
          <div>
            <AdminLabel>Author</AdminLabel>
            <AdminInput
              value={reading.author}
              onChange={(e) => onChange({ ...reading, author: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <AdminLabel>Page</AdminLabel>
              <AdminInput
                type="number"
                value={reading.currentPage}
                onChange={(e) =>
                  onChange({ ...reading, currentPage: Number(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <AdminLabel>Total</AdminLabel>
              <AdminInput
                type="number"
                value={reading.totalPages}
                onChange={(e) =>
                  onChange({ ...reading, totalPages: Number(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <AdminLabel>Done</AdminLabel>
              <AdminInput
                type="number"
                value={reading.booksCompleted}
                onChange={(e) =>
                  onChange({ ...reading, booksCompleted: Number(e.target.value) || 0 })
                }
              />
            </div>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm font-medium text-white">{reading.currentBook}</p>
          <p className="mt-1 text-xs text-gray-500">{reading.author}</p>

          <div className="mt-4 space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500/80 to-purple-400/80"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span className="font-mono tabular-nums text-gray-400">
                Page {reading.currentPage} / {reading.totalPages}
              </span>
              <span className="font-mono tabular-nums">{pct.toFixed(0)}%</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/5 pt-4">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-500">Remaining</p>
              <p className="mt-1 text-sm font-mono text-white tabular-nums">{remaining} pages</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-500">Completed</p>
              <p className="mt-1 text-sm font-mono text-white tabular-nums">
                {reading.booksCompleted} books
              </p>
            </div>
          </div>
        </>
      )}
    </AdminCard>
  );
}
