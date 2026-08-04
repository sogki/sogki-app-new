import { useState } from 'react';
import { Pencil } from 'lucide-react';
import AdminCard from '../AdminCard';
import AdminButton from '../AdminButton';
import { AdminInput, AdminLabel } from '../AdminField';
import type { LifeJobSearch } from '../../../lib/lifeDashboard/types';
import { formatShortDate } from '../../../lib/lifeDashboard/format';

type LifeJobSearchProps = {
  data: LifeJobSearch;
  onChange: (data: LifeJobSearch) => void;
  expanded?: boolean;
};

export default function LifeJobSearchWidget({ data, onChange, expanded }: LifeJobSearchProps) {
  const [editing, setEditing] = useState(false);

  const stats = [
    { key: 'applicationsSent' as const, label: 'Applications' },
    { key: 'interviews' as const, label: 'Interviews' },
    { key: 'offers' as const, label: 'Offers' },
    { key: 'rejected' as const, label: 'Rejected' },
  ];

  const ucValue = data.upcomingUcAppointment
    ? data.upcomingUcAppointment.slice(0, 16)
    : '';

  return (
    <AdminCard
      id="widget-job-search"
      title="Job Search"
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
          <div className="grid grid-cols-2 gap-2">
            {stats.map((stat) => (
              <div key={stat.key}>
                <AdminLabel>{stat.label}</AdminLabel>
                <AdminInput
                  type="number"
                  value={data[stat.key]}
                  onChange={(e) =>
                    onChange({ ...data, [stat.key]: Number(e.target.value) || 0 })
                  }
                />
              </div>
            ))}
          </div>
          <div>
            <AdminLabel>UC appointment</AdminLabel>
            <AdminInput
              type="datetime-local"
              value={ucValue}
              onChange={(e) =>
                onChange({
                  ...data,
                  upcomingUcAppointment: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : null,
                })
              }
            />
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat) => (
              <div
                key={stat.key}
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-3"
              >
                <p className="text-[11px] uppercase tracking-wide text-gray-500">{stat.label}</p>
                <p className="mt-1 text-xl font-semibold font-mono text-white tabular-nums">
                  {data[stat.key]}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
            <p className="text-[11px] uppercase tracking-wide text-gray-500">
              Upcoming UC appointment
            </p>
            <p className="mt-1 text-sm text-gray-200">
              {data.upcomingUcAppointment
                ? formatShortDate(data.upcomingUcAppointment)
                : 'None scheduled'}
            </p>
          </div>
        </>
      )}
    </AdminCard>
  );
}
