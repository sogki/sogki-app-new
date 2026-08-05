import type { ProjectStatus } from '../lib/projectTypes';
import { PROJECT_STATUS_LABELS } from '../lib/projectTypes';

const STATUS_STYLES: Record<ProjectStatus, string> = {
  live: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  closed_beta: 'bg-amber-500/15 text-amber-200 border-amber-400/35',
  in_development: 'bg-sky-500/15 text-sky-200 border-sky-400/30',
  offline: 'bg-white/5 text-gray-400 border-white/15',
  ceased: 'bg-white/5 text-gray-500 border-white/10',
};

type ProjectStatusBadgeProps = {
  status: ProjectStatus;
  className?: string;
};

export default function ProjectStatusBadge({ status, className = '' }: ProjectStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${STATUS_STYLES[status]} ${className}`}
    >
      {PROJECT_STATUS_LABELS[status]}
    </span>
  );
}
