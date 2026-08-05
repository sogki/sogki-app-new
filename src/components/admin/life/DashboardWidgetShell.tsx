import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Expand, GripVertical, Minimize2 } from 'lucide-react';
import type { DashboardWidgetId, DashboardWidgetSpan } from '../../../lib/lifeDashboard/types';
import AdminButton from '../AdminButton';

const SPAN_CLASS: Record<DashboardWidgetSpan, string> = {
  1: 'md:col-span-1',
  2: 'md:col-span-2',
  3: 'md:col-span-3',
  4: 'md:col-span-4',
};

type DashboardWidgetShellProps = {
  id: DashboardWidgetId;
  title: string;
  span: DashboardWidgetSpan;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  children: React.ReactNode;
  /** Hide chrome chrome for welcome hero */
  bare?: boolean;
};

export default function DashboardWidgetShell({
  id,
  title,
  span,
  expanded,
  onExpand,
  onCollapse,
  children,
  bare = false,
}: DashboardWidgetShellProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: expanded,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    opacity: isDragging ? 0.85 : 1,
  };

  if (expanded) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-black/80 p-3 backdrop-blur-sm sm:p-6">
        <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0c] shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <h2 className="text-sm font-medium text-white font-mono">{title}</h2>
            <AdminButton size="sm" variant="ghost" onClick={onCollapse}>
              <Minimize2 size={14} />
              Close
            </AdminButton>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`col-span-1 ${SPAN_CLASS[span]} ${isDragging ? 'cursor-grabbing' : ''}`}
      data-widget={id}
    >
      {bare ? (
        <div className="relative h-full">
          <button
            type="button"
            className="absolute right-3 top-3 z-10 rounded-lg border border-white/10 bg-black/40 p-1.5 text-gray-400 opacity-70 backdrop-blur hover:opacity-100 hover:text-white"
            aria-label={`Drag ${title}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical size={14} />
          </button>
          {children}
        </div>
      ) : (
        <div className="relative h-full min-h-0">
          <div className="pointer-events-none absolute right-3 top-3 z-10 flex gap-1">
            <button
              type="button"
              className="pointer-events-auto rounded-lg border border-white/10 bg-black/40 p-1.5 text-gray-400 backdrop-blur hover:text-white"
              aria-label={`Expand ${title}`}
              onClick={onExpand}
            >
              <Expand size={14} />
            </button>
            <button
              type="button"
              className="pointer-events-auto cursor-grab rounded-lg border border-white/10 bg-black/40 p-1.5 text-gray-400 backdrop-blur hover:text-white active:cursor-grabbing"
              aria-label={`Drag ${title}`}
              {...attributes}
              {...listeners}
            >
              <GripVertical size={14} />
            </button>
          </div>
          {children}
        </div>
      )}
    </div>
  );
}
