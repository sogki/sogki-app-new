/** Shared types mirrored from the web Life Dashboard. */

export type InvestmentRange = '1D' | '1W' | '1M' | '6M' | '1Y' | 'ALL';

export type InvestmentPoint = {
  t: string;
  value: number;
};

export type InvestmentSnapshot = {
  symbol: string;
  name: string;
  currency: string;
  price: number;
  feedPrice?: number;
  dailyChangePct: number;
  portfolioValue: number;
  todayGainLoss: number;
  holdings: number;
  invested?: number;
  marketState?: string;
  marketSession?: 'open' | 'closed' | 'pre' | 'post';
  series: Record<InvestmentRange, InvestmentPoint[]>;
};

export type LifeGoal = {
  id: string;
  title: string;
  current: number;
  target: number;
  currency?: string;
  color?: string;
};

export type LifeHabit = {
  id: string;
  label: string;
  completed: boolean;
  streak: number;
};

export type LifeReading = {
  currentBook: string;
  author: string;
  currentPage: number;
  totalPages: number;
  booksCompleted: number;
};

export type LifeJobSearch = {
  applicationsSent: number;
  interviews: number;
  offers: number;
  rejected: number;
  upcomingUcAppointment: string | null;
};

export type LifeProjectStatus = 'active' | 'paused' | 'planning' | 'shipped';

export type LifeProject = {
  id: string;
  name: string;
  description: string;
  status: LifeProjectStatus;
  stack: string[];
  updatedAt: string;
  githubUrl?: string;
  url?: string;
};

export type LifeNote = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  updatedAt: string;
};

export type LifeReminder = {
  id: string;
  title: string;
  dueAt?: string | null;
  done: boolean;
  createdAt: string;
};

export type LifeWeather = {
  location: string;
  temperatureC: number;
  condition: string;
  highC: number;
  lowC: number;
  forecast: Array<{ day: string; highC: number; lowC: number; condition: string }>;
};

export type LifeDashboardPayload = {
  displayName: string;
  goals: LifeGoal[];
  habits: LifeHabit[];
  reading: LifeReading;
  jobSearch: LifeJobSearch;
  projects: LifeProject[];
  notes: LifeNote[];
  reminders: LifeReminder[];
  weather: LifeWeather;
  links: {
    portfolio: string;
    github: string;
    linkedin: string;
  };
  habitCompletions?: {
    date: string;
    completedIds: string[];
  };
};

export type LifeDashboardState = {
  payload: LifeDashboardPayload;
  layout: {
    order: string[];
    spans: Record<string, number>;
  };
};

export type ProjectStatus =
  | 'live'
  | 'closed_beta'
  | 'in_development'
  | 'offline'
  | 'ceased';

export type ProjectTier = 'main' | 'featured' | 'supporting';

export type Project = {
  id: string;
  title: string;
  title_jp: string | null;
  description: string;
  technologies: string[];
  github: string | null;
  demo: string | null;
  featured: boolean;
  color: string | null;
  sort_order: number;
  slug: string | null;
  status: ProjectStatus;
  tier: ProjectTier;
  tagline: string | null;
  status_note: string | null;
  long_description: string | null;
  hero_image_url: string | null;
  screenshots: string[];
  metrics: Array<{ label: string; value: string }>;
  accent_color: string | null;
  show_demo_link: boolean;
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  live: 'Live',
  closed_beta: 'Closed Beta',
  in_development: 'In Development',
  offline: 'Offline',
  ceased: 'Ceased',
};

export const LIFE_PROJECT_STATUS_LABELS: Record<LifeProjectStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  planning: 'Planning',
  shipped: 'Shipped',
};
