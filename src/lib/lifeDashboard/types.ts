/** Shared types for Life Dashboard — swap mock loaders for real APIs later. */

export type InvestmentRange = '1D' | '1W' | '1M' | '6M' | '1Y' | 'ALL';

export type InvestmentPoint = {
  t: string; // ISO timestamp or label
  value: number;
};

export type InvestmentSnapshot = {
  symbol: string;
  name: string;
  currency: string;
  /** Valuation £/unit (broker mark when set, else feed). */
  price: number;
  /** Delayed public feed £/unit. */
  feedPrice?: number;
  dailyChangePct: number;
  portfolioValue: number;
  todayGainLoss: number;
  holdings: number;
  /** Cost basis when known (ISA). */
  invested?: number;
  /** LSE session for VUAG.L — from Yahoo when available. */
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
  upcomingUcAppointment: string | null; // ISO date
};

export type LifeProjectStatus = 'active' | 'paused' | 'planning' | 'shipped';

export type LifeProject = {
  id: string;
  name: string;
  description: string;
  status: LifeProjectStatus;
  stack: string[];
  updatedAt: string; // ISO
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

export type LifeDashboardData = {
  displayName: string;
  investment: InvestmentSnapshot;
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
  /** Daily habit completion tracker (synced in payload). */
  habitCompletions?: {
    date: string;
    completedIds: string[];
  };
};

export type DashboardWidgetId =
  | 'welcome'
  | 'assistant'
  | 'investments'
  | 'goals'
  | 'habits'
  | 'reading'
  | 'jobSearch'
  | 'projects'
  | 'notes'
  | 'weather'
  | 'siteTools'
  | 'quickActions';

/** Column span on a 4-column desktop grid (1–4). */
export type DashboardWidgetSpan = 1 | 2 | 3 | 4;

export type DashboardLayout = {
  order: DashboardWidgetId[];
  spans: Partial<Record<DashboardWidgetId, DashboardWidgetSpan>>;
};

/** Payload stored in life_dashboard_state (no live investment quote). */
export type LifeDashboardPayload = Omit<LifeDashboardData, 'investment'>;

export type LifeDashboardState = {
  payload: LifeDashboardPayload;
  layout: DashboardLayout;
};
