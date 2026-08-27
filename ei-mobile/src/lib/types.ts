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

/** OCR / QR capture saved from Camera → Tools → Scans. */
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
  /** Human-readable place name from reverse geocode. */
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

export type LifeDashboardPayload = {
  displayName: string;
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
  habitCompletions?: {
    date: string;
    completedIds: string[];
  };
  presence?: LifePresence;
};

export type LifeDashboardState = {
  payload: LifeDashboardPayload;
  layout: {
    order: string[];
    spans: Record<string, number>;
    /** Section ids hidden from the mobile dashboard (still in order). */
    hidden?: string[];
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
