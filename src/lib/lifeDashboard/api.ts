import { adminApi } from '../adminApi';
import type {
  DashboardLayout,
  DashboardWidgetId,
  LifeDashboardPayload,
  LifeDashboardState,
} from './types';
import { defaultLifeDashboardPayload, defaultDashboardLayout } from './defaults';

export function normalizeLayout(raw: unknown): DashboardLayout {
  const base = defaultDashboardLayout();
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Partial<DashboardLayout>;
  const order = Array.isArray(obj.order)
    ? (obj.order.filter((id): id is DashboardWidgetId => typeof id === 'string') as DashboardWidgetId[])
    : base.order;
  // Ensure all known widgets exist once
  const known = new Set(base.order);
  const seen = new Set<string>();
  const cleaned: DashboardWidgetId[] = [];
  for (const id of order) {
    if (known.has(id) && !seen.has(id)) {
      cleaned.push(id);
      seen.add(id);
    }
  }
  for (const id of base.order) {
    if (!seen.has(id)) cleaned.push(id);
  }

  // Keep Assistant directly under Welcome.
  const withoutAssistant = cleaned.filter((id) => id !== 'assistant');
  const welcomeIdx = withoutAssistant.indexOf('welcome');
  const insertAt = welcomeIdx >= 0 ? welcomeIdx + 1 : 0;
  withoutAssistant.splice(insertAt, 0, 'assistant');

  return {
    order: withoutAssistant,
    spans: {
      ...base.spans,
      ...(obj.spans ?? {}),
      welcome: 4,
      assistant: 2,
      investments: 2,
      goals: 1,
    },
  };
}

export function normalizePayload(raw: unknown): LifeDashboardPayload {
  const base = defaultLifeDashboardPayload();
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Partial<LifeDashboardPayload>;
  return {
    ...base,
    ...obj,
    goals: Array.isArray(obj.goals) ? obj.goals : base.goals,
    habits: Array.isArray(obj.habits) ? obj.habits : base.habits,
    projects: Array.isArray(obj.projects) ? obj.projects : base.projects,
    notes: Array.isArray(obj.notes) ? obj.notes : base.notes,
    reading: obj.reading ? { ...base.reading, ...obj.reading } : base.reading,
    jobSearch: obj.jobSearch ? { ...base.jobSearch, ...obj.jobSearch } : base.jobSearch,
    weather: obj.weather ? { ...base.weather, ...obj.weather } : base.weather,
    links: obj.links ? { ...base.links, ...obj.links } : base.links,
    habitCompletions: obj.habitCompletions ?? base.habitCompletions,
  };
}

export async function fetchLifeDashboard(): Promise<LifeDashboardState> {
  const data = await adminApi.lifeDashboard();
  return {
    payload: normalizePayload(data?.payload),
    layout: normalizeLayout(data?.layout),
  };
}

export async function saveLifeDashboard(partial: {
  payload?: LifeDashboardPayload;
  layout?: DashboardLayout;
}): Promise<LifeDashboardState> {
  const data = await adminApi.saveLifeDashboard(partial);
  return {
    payload: normalizePayload(data?.payload),
    layout: normalizeLayout(data?.layout),
  };
}
