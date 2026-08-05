import type {
  InvestmentPoint,
  InvestmentRange,
  LifeDashboardData,
} from './types';

function buildSeries(
  points: number,
  start: number,
  volatility: number,
  trend: number
): InvestmentPoint[] {
  const out: InvestmentPoint[] = [];
  let value = start;
  const now = Date.now();
  const stepMs =
    points <= 24
      ? 60 * 60 * 1000
      : points <= 40
        ? 24 * 60 * 60 * 1000
        : 7 * 24 * 60 * 60 * 1000;

  for (let i = 0; i < points; i++) {
    const noise = (Math.sin(i * 1.7) + Math.cos(i * 0.9)) * volatility;
    value = Math.max(1, value + trend + noise);
    out.push({
      t: new Date(now - (points - 1 - i) * stepMs).toISOString(),
      value: Number(value.toFixed(2)),
    });
  }
  return out;
}

const series: Record<InvestmentRange, InvestmentPoint[]> = {
  '1D': buildSeries(24, 78.2, 0.18, 0.02),
  '1W': buildSeries(28, 76.4, 0.35, 0.05),
  '1M': buildSeries(30, 74.1, 0.55, 0.12),
  '6M': buildSeries(26, 68.5, 0.9, 0.35),
  '1Y': buildSeries(24, 62.0, 1.2, 0.55),
  ALL: buildSeries(36, 48.0, 1.6, 0.7),
};

/** Mock Life Dashboard payload. Replace with API clients later. */
export async function fetchLifeDashboardData(): Promise<LifeDashboardData> {
  // Simulate async fetch so call sites already await a Promise.
  await Promise.resolve();

  const last = series['1D'][series['1D'].length - 1]?.value ?? 79.4;
  const prev = series['1D'][series['1D'].length - 2]?.value ?? last;
  const holdings = 0; // Live holdings come from vuagConfig / LifeInvestments
  const price = last;
  const dailyChangePct = ((price - prev) / prev) * 100;
  const portfolioValue = holdings * price;
  const todayGainLoss = holdings * (price - prev);

  return {
    displayName: 'Sogki',
    investment: {
      symbol: 'VUAG',
      name: 'Vanguard S&P 500 UCITS ETF Acc',
      currency: 'GBP',
      price,
      dailyChangePct,
      portfolioValue,
      todayGainLoss,
      holdings,
      series,
    },
    goals: [
      { id: 'emergency', title: 'Emergency Fund', current: 2400, target: 6000, currency: '£' },
      { id: 'camaro', title: 'Camaro Fund', current: 1850, target: 12000, currency: '£' },
      { id: 'driving', title: 'Driving Lessons', current: 320, target: 800, currency: '£' },
      { id: 'invest', title: 'Investment Target', current: 32750, target: 50000, currency: '£' },
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
      {
        id: 'future',
        name: 'Future Projects',
        description: 'Ideas in the pipeline — product experiments and tooling.',
        status: 'planning',
        stack: ['TBD'],
        updatedAt: '2026-07-20T09:00:00.000Z',
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
  };
}
