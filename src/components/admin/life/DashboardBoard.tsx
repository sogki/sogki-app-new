import { useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import type {
  DashboardLayout,
  DashboardWidgetId,
  DashboardWidgetSpan,
  InvestmentSnapshot,
  LifeDashboardPayload,
} from '../../../lib/lifeDashboard/types';
import { defaultDashboardLayout } from '../../../lib/lifeDashboard/defaults';
import DashboardWidgetShell from './DashboardWidgetShell';
import LifeWelcome from './LifeWelcome';
import LifeInvestments from './LifeInvestments';
import LifeGoals from './LifeGoals';
import LifeHabits from './LifeHabits';
import LifeReadingWidget from './LifeReading';
import LifeJobSearchWidget from './LifeJobSearch';
import LifeProjects from './LifeProjects';
import LifeNotes from './LifeNotes';
import LifeScans from './LifeScans';
import LifeWeatherWidget from './LifeWeather';
import LifeSiteTools from './LifeSiteTools';
import LifeQuickActions from './LifeQuickActions';
import LifeAssistant from './LifeAssistant';

const TITLES: Record<DashboardWidgetId, string> = {
  welcome: 'Welcome',
  assistant: 'Ei',
  investments: 'Investments',
  goals: 'Goals',
  habits: 'Habits',
  reading: 'Reading',
  jobSearch: 'Job Search',
  projects: 'Projects',
  notes: 'Notes',
  scans: 'Scans',
  weather: 'Weather',
  siteTools: 'Site tools',
  quickActions: 'Quick Actions',
};

type DashboardBoardProps = {
  payload: LifeDashboardPayload;
  layout: DashboardLayout;
  investmentFallback: InvestmentSnapshot;
  onPayloadChange: (next: LifeDashboardPayload) => void;
  onLayoutChange: (next: DashboardLayout) => void;
  expandedId: DashboardWidgetId | null;
  onExpand: (id: DashboardWidgetId | null) => void;
  onDashboardMutate?: () => void;
};

export default function DashboardBoard({
  payload,
  layout,
  investmentFallback,
  onPayloadChange,
  onLayoutChange,
  expandedId,
  onExpand,
  onDashboardMutate,
}: DashboardBoardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  );

  const order = layout.order?.length ? layout.order : defaultDashboardLayout().order;
  const spans = layout.spans ?? defaultDashboardLayout().spans;

  const patchPayload = useCallback(
    (partial: Partial<LifeDashboardPayload>) => {
      onPayloadChange({ ...payload, ...partial });
    },
    [onPayloadChange, payload]
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(active.id as DashboardWidgetId);
    const newIndex = order.indexOf(over.id as DashboardWidgetId);
    if (oldIndex < 0 || newIndex < 0) return;
    onLayoutChange({
      ...layout,
      order: arrayMove(order, oldIndex, newIndex),
    });
  };

  const renderWidget = (id: DashboardWidgetId, expanded: boolean) => {
    switch (id) {
      case 'welcome':
        return <LifeWelcome displayName={payload.displayName} />;
      case 'assistant':
        return <LifeAssistant payload={payload} expanded={expanded} onDashboardMutate={onDashboardMutate} />;
      case 'investments':
        return <LifeInvestments fallback={investmentFallback} expanded={expanded} />;
      case 'goals':
        return (
          <LifeGoals
            goals={payload.goals}
            onChange={(goals) => patchPayload({ goals })}
            expanded={expanded}
          />
        );
      case 'habits':
        return (
          <LifeHabits
            habits={payload.habits}
            completions={payload.habitCompletions}
            onChange={(habits, habitCompletions) =>
              patchPayload({ habits, habitCompletions })
            }
            expanded={expanded}
          />
        );
      case 'reading':
        return (
          <LifeReadingWidget
            reading={payload.reading}
            onChange={(reading) => patchPayload({ reading })}
            expanded={expanded}
          />
        );
      case 'jobSearch':
        return (
          <LifeJobSearchWidget
            data={payload.jobSearch}
            onChange={(jobSearch) => patchPayload({ jobSearch })}
            expanded={expanded}
          />
        );
      case 'projects':
        return (
          <LifeProjects
            projects={payload.projects}
            onChange={(projects) => patchPayload({ projects })}
            expanded={expanded}
          />
        );
      case 'notes':
        return (
          <LifeNotes
            notes={payload.notes}
            onChange={(notes) => patchPayload({ notes })}
            expanded={expanded}
          />
        );
      case 'scans':
        return (
          <LifeScans
            scans={payload.scans ?? []}
            onChange={(scans) => patchPayload({ scans })}
            expanded={expanded}
          />
        );
      case 'weather':
        return <LifeWeatherWidget weather={payload.weather} />;
      case 'siteTools':
        return <LifeSiteTools />;
      case 'quickActions':
        return <LifeQuickActions links={payload.links} />;
      default:
        return null;
    }
  };

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
            {order.map((id) => {
              const span = (spans[id] ?? 1) as DashboardWidgetSpan;
              return (
                <DashboardWidgetShell
                  key={id}
                  id={id}
                  title={TITLES[id]}
                  span={span}
                  expanded={false}
                  bare={id === 'welcome'}
                  onExpand={() => onExpand(id)}
                  onCollapse={() => onExpand(null)}
                >
                  {renderWidget(id, false)}
                </DashboardWidgetShell>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {expandedId && (
        <DashboardWidgetShell
          id={expandedId}
          title={TITLES[expandedId]}
          span={4}
          expanded
          onExpand={() => {}}
          onCollapse={() => onExpand(null)}
        >
          {renderWidget(expandedId, true)}
        </DashboardWidgetShell>
      )}
    </>
  );
}
