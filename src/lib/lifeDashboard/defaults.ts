import type {
  DashboardLayout,
  LifeDashboardPayload,
} from './types';

export function defaultDashboardLayout(): DashboardLayout {
  return {
    order: [
      'welcome',
      'assistant',
      'investments',
      'goals',
      'habits',
      'reading',
      'jobSearch',
      'projects',
      'notes',
      'scans',
      'weather',
      'siteTools',
      'quickActions',
    ],
    spans: {
      welcome: 4,
      assistant: 2,
      investments: 2,
      goals: 1,
      habits: 1,
      reading: 1,
      jobSearch: 1,
      projects: 2,
      notes: 2,
      scans: 2,
      weather: 1,
      siteTools: 2,
      quickActions: 1,
    },
  };
}

export function defaultLifeDashboardPayload(): LifeDashboardPayload {
  return {
    displayName: 'Sogki',
    goals: [
      { id: 'emergency', title: 'Emergency Fund', current: 2400, target: 6000, currency: '£' },
      { id: 'camaro', title: 'Camaro Fund', current: 1850, target: 12000, currency: '£' },
      { id: 'driving', title: 'Driving Lessons', current: 320, target: 800, currency: '£' },
      { id: 'invest', title: 'Investment Target', current: 16, target: 50000, currency: '£' },
    ],
    habits: [
      { id: 'walk', label: 'Walk', completed: false, streak: 4 },
      { id: 'workout', label: 'Workout', completed: false, streak: 2 },
      { id: 'read', label: 'Read', completed: true, streak: 9 },
      { id: 'job', label: 'Apply for Job', completed: false, streak: 1 },
      { id: 'water', label: 'Drink Water', completed: true, streak: 12 },
      { id: 'code', label: 'Programming Practice', completed: false, streak: 6 },
    ],
    reading: {
      currentBook: 'Designing Data-Intensive Applications',
      author: 'Martin Kleppmann',
      currentPage: 186,
      totalPages: 614,
      booksCompleted: 7,
    },
    jobSearch: {
      applicationsSent: 18,
      interviews: 3,
      offers: 0,
      rejected: 5,
      upcomingUcAppointment: '2026-08-12T10:30:00.000Z',
    },
    projects: [
      {
        id: 'binderly',
        name: 'BinderlyTCG',
        description: 'Pokemon card collection platform with pricing and set tracking.',
        status: 'active',
        stack: ['React', 'TypeScript', 'Next.js', 'PostgreSQL'],
        updatedAt: '2026-08-01T14:00:00.000Z',
        githubUrl: 'https://github.com/sogki/binderly',
        url: 'https://binderlytcg.com',
      },
      {
        id: 'website',
        name: 'Personal Website',
        description: 'Portfolio, admin tooling, and personal systems on sogki.dev.',
        status: 'active',
        stack: ['React', 'Supabase', 'Vite', 'Tailwind'],
        updatedAt: '2026-08-04T11:00:00.000Z',
        githubUrl: 'https://github.com/sogki',
        url: 'https://sogki.dev',
      },
    ],
    notes: [
      {
        id: 'n1',
        title: 'This week',
        body: 'Finish CV polish, ship Life Dashboard, follow up on two applications.',
        pinned: true,
        updatedAt: '2026-08-04T08:00:00.000Z',
      },
      {
        id: 'n2',
        title: 'UC reminder',
        body: 'Bring bank statements and job log to the next appointment.',
        pinned: true,
        updatedAt: '2026-08-03T16:00:00.000Z',
      },
    ],
    scans: [],
    reminders: [
      {
        id: 'r1',
        title: 'UC appointment — bring bank statements & job log',
        dueAt: '2026-08-12T10:30:00.000Z',
        done: false,
        createdAt: '2026-08-03T16:00:00.000Z',
      },
    ],
    weather: {
      location: 'United Kingdom',
      temperatureC: 18,
      condition: 'Partly cloudy',
      highC: 21,
      lowC: 13,
      forecast: [
        { day: 'Wed', highC: 20, lowC: 12, condition: 'Cloudy' },
        { day: 'Thu', highC: 22, lowC: 14, condition: 'Sunny' },
        { day: 'Fri', highC: 19, lowC: 13, condition: 'Rain' },
        { day: 'Sat', highC: 17, lowC: 11, condition: 'Showers' },
      ],
    },
    links: {
      portfolio: '/',
      github: 'https://github.com/sogki',
      linkedin: 'https://www.linkedin.com/in/sogki',
    },
    habitCompletions: { date: '', completedIds: [] },
  };
}
