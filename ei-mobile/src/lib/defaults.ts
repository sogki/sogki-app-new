import type { LifeDashboardPayload, LifeDashboardState } from './types';

export function defaultPayload(): LifeDashboardPayload {
  return {
    displayName: 'Commander',
    goals: [],
    habits: [],
    reading: {
      currentBook: '',
      author: '',
      currentPage: 0,
      totalPages: 1,
      booksCompleted: 0,
    },
    jobSearch: {
      applicationsSent: 0,
      interviews: 0,
      offers: 0,
      rejected: 0,
      upcomingUcAppointment: null,
    },
    projects: [],
    notes: [],
    scans: [],
    reminders: [],
    weather: {
      location: '',
      temperatureC: 0,
      condition: '',
      highC: 0,
      lowC: 0,
      forecast: [],
    },
    links: {
      portfolio: 'https://sogki.dev',
      github: 'https://github.com/sogki',
      linkedin: 'https://www.linkedin.com/in/jasonsws/',
    },
  };
}

export function normalizeDashboard(data: unknown): LifeDashboardState {
  const base = defaultPayload();
  const raw = (data && typeof data === 'object' ? data : {}) as {
    payload?: Partial<LifeDashboardPayload>;
    layout?: { order?: string[]; spans?: Record<string, number> };
  };
  const obj = raw.payload ?? {};
  return {
    payload: {
      ...base,
      ...obj,
      goals: Array.isArray(obj.goals) ? obj.goals : base.goals,
      habits: Array.isArray(obj.habits) ? obj.habits : base.habits,
      projects: Array.isArray(obj.projects) ? obj.projects : base.projects,
      notes: Array.isArray(obj.notes) ? obj.notes : base.notes,
      scans: Array.isArray((obj as { scans?: unknown }).scans)
        ? ((obj as { scans: LifeDashboardPayload['scans'] }).scans)
        : base.scans,
      reminders: Array.isArray((obj as { reminders?: unknown }).reminders)
        ? ((obj as { reminders: LifeDashboardPayload['reminders'] }).reminders)
        : base.reminders,
      reading: obj.reading ? { ...base.reading, ...obj.reading } : base.reading,
      jobSearch: obj.jobSearch ? { ...base.jobSearch, ...obj.jobSearch } : base.jobSearch,
      weather: obj.weather ? { ...base.weather, ...obj.weather } : base.weather,
      links: {
        portfolio:
          (typeof obj.links?.portfolio === 'string' && obj.links.portfolio.trim()) ||
          base.links.portfolio,
        github:
          (typeof obj.links?.github === 'string' && obj.links.github.trim()) ||
          base.links.github,
        linkedin:
          (typeof obj.links?.linkedin === 'string' && obj.links.linkedin.trim()) ||
          base.links.linkedin,
      },
      habitCompletions: obj.habitCompletions ?? base.habitCompletions,
    },
    layout: {
      order: Array.isArray(raw.layout?.order) ? raw.layout!.order : [],
      spans: raw.layout?.spans ?? {},
    },
  };
}
