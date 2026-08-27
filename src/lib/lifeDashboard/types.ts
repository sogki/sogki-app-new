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

export type LifeScan = {
  id: string;
  title: string;
  text: string;
  createdAt: string;
  source?: 'camera' | 'library' | 'qr';
  mode?: 'ocr' | 'qr' | 'barcode' | 'identify' | 'translate';
  /** Stable id for memory / duplicate detection (barcode, QR, or text hash). */
  fingerprint?: string | null;
  /** Last time this fingerprint was scanned (may differ from createdAt). */
  lastSeenAt?: string | null;
  /** How many times this item has been remembered. */
  scanCount?: number;
  /** Compressed JPEG data URL for the captured camera/library frame (optional). */
  imageDataUrl?: string | null;
  /** Catalog / product lookup image URL (barcode scans). */
  productImageUrl?: string | null;
  locationLabel?: string | null;
  latitude?: number | null;
  longitude?: number | null;
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

/** Presence / travel memory — where you've been relative to home. */
export type LifePresenceCheckIn = {
  id: string;
  at: string;
  lat: number;
  lng: number;
  label: string;
  awayFromHome: boolean;
  distanceKm?: number;
};

export type LifePresence = {
  trackingEnabled: boolean;
  homeLabel?: string | null;
  homeLat?: number | null;
  homeLng?: number | null;
  /** Distance from home before a visit counts as "away" (default 3). */
  homeRadiusKm?: number;
  checkIns: LifePresenceCheckIn[];
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
  scans: LifeScan[];
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
  presence?: LifePresence;
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
  | 'scans'
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
