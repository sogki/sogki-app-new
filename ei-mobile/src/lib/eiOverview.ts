import type { InvestmentSnapshot, LifeDashboardPayload, LifeReminder, LifeWeather } from './types';
import { marketSessionBadge, resolveMarketSession } from './marketHours';

/** Display money as £100.50 (not spoken "pounds and pence"). */
export function formatBriefMoney(value: number, digits = 2): string {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-GB', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${value < 0 ? '−' : ''}£${formatted}`;
}

export function formatBriefPct(value: number): string {
  const rounded = Math.abs(value).toFixed(Math.abs(value) >= 10 ? 1 : 2);
  if (value > 0.05) return `+${rounded}%`;
  if (value < -0.05) return `−${rounded}%`;
  return 'flat';
}

function trendFromSeries(series: { value: number }[]): 'up' | 'down' | 'flat' {
  if (!series || series.length < 2) return 'flat';
  const first = series[0]?.value ?? 0;
  const last = series[series.length - 1]?.value ?? 0;
  const delta = last - first;
  if (Math.abs(delta) / Math.max(1, Math.abs(first)) < 0.002) return 'flat';
  return delta > 0 ? 'up' : 'down';
}

function section(title: string, lines: string[]): string {
  if (!lines.length) return '';
  return [`## ${title}`, ...lines.map((l) => `• ${l}`)].join('\n');
}

export function buildInvestmentOverview(inv: InvestmentSnapshot | null): string {
  if (!inv || !(inv.price > 0)) {
    return section('Vanguard', ['Live quote unavailable — pull to refresh.']);
  }

  const session = inv.marketSession ?? resolveMarketSession(inv.marketState);
  const series = inv.series?.['1M']?.length
    ? inv.series['1M']
    : inv.series?.['1W']?.length
      ? inv.series['1W']
      : inv.series?.['1D'] ?? [];
  const chartTrend = trendFromSeries(series);
  const chartLine =
    chartTrend === 'up'
      ? '1M trend: higher'
      : chartTrend === 'down'
        ? '1M trend: lower'
        : '1M trend: sideways';

  const lines: string[] = [
    marketSessionBadge(session).label,
    `Day ${formatBriefPct(inv.dailyChangePct)} · ${formatBriefMoney(inv.price, 3)}/share`,
  ];

  if (inv.holdings > 0) {
    lines.push(`Portfolio ${formatBriefMoney(inv.portfolioValue)}`);
    if (inv.invested != null && inv.invested > 0) {
      const pnl = inv.portfolioValue - inv.invested;
      lines.push(
        pnl >= 0
          ? `Unrealised ${formatBriefMoney(pnl)}`
          : `Unrealised ${formatBriefMoney(pnl)}`
      );
    }
    if (Math.abs(inv.todayGainLoss) >= 0.01) {
      lines.push(`Today ${formatBriefMoney(inv.todayGainLoss)}`);
    }
  } else {
    lines.push('No holdings set');
  }

  lines.push(chartLine);
  return section('Vanguard', lines);
}

export function buildWeatherOverview(
  payload: LifeDashboardPayload,
  weatherOverride?: LifeWeather | null
): string {
  const w = weatherOverride ?? payload.weather;
  if (!w?.location) return section('Weather', ['No weather data loaded.']);
  const place = w.location.replace(/United Kingdom/i, 'UK');
  const lines = [
    `${w.condition} in ${place}`,
    `Now ${w.temperatureC}°C · H ${w.highC}° / L ${w.lowC}°`,
  ];
  const next = w.forecast?.[0];
  if (next) {
    lines.push(`${next.day}: ${next.condition}, high ${next.highC}°`);
  }
  return section('Weather', lines);
}

export function buildHabitsOverview(payload: LifeDashboardPayload): string {
  const habits = payload.habits ?? [];
  const done = habits.filter((h) => h.completed).length;
  const left = habits.filter((h) => !h.completed);
  if (!habits.length) return section('Habits', ['None configured.']);
  if (!left.length) return section('Habits', [`All ${done} done for today.`]);
  const names = left.slice(0, 4).map((h) => h.label);
  const more = left.length > 4 ? ` (+${left.length - 4} more)` : '';
  return section('Habits', [
    `${done} of ${habits.length} complete`,
    `Left: ${names.join(', ')}${more}`,
  ]);
}

export function buildRemindersOverview(payload: LifeDashboardPayload): string {
  const reminders = (payload.reminders ?? []).filter((r) => !r.done);
  if (!reminders.length) return section('Reminders', ['None open.']);
  const lines = reminders.slice(0, 5).map((r) => formatReminderLine(r));
  if (reminders.length > 5) lines.push(`+${reminders.length - 5} more`);
  return section('Reminders', lines);
}

export function formatReminderLine(r: LifeReminder): string {
  if (r.dueAt) {
    const d = new Date(r.dueAt);
    if (!Number.isNaN(d.getTime())) {
      const label = d.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
      return `${r.title} · ${label}`;
    }
  }
  return r.title;
}

export function buildGoalsOverview(payload: LifeDashboardPayload): string {
  const goals = payload.goals ?? [];
  if (!goals.length) return '';
  const lines = goals.slice(0, 3).map((g) => {
    const cur = g.currency ?? '£';
    const pct = g.target > 0 ? Math.round((g.current / g.target) * 100) : 0;
    return `${g.title}: ${cur}${Math.round(g.current).toLocaleString('en-GB')} / ${cur}${Math.round(g.target).toLocaleString('en-GB')} (${pct}%)`;
  });
  if (goals.length > 3) lines.push(`+${goals.length - 3} more`);
  return section('Goals', lines);
}

export function buildFullOverview(
  payload: LifeDashboardPayload,
  inv: InvestmentSnapshot | null,
  weatherOverride?: LifeWeather | null
): string {
  return [
    '# Overview',
    '',
    buildRemindersOverview(payload),
    '',
    buildInvestmentOverview(inv),
    '',
    buildGoalsOverview(payload),
    '',
    buildHabitsOverview(payload),
    '',
    buildWeatherOverview(payload, weatherOverride),
  ]
    .filter((block, i, arr) => {
      if (!block) return false;
      if (block === '' && (!arr[i - 1] || arr[i - 1] === '')) return false;
      return true;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function buildEiContext(
  payload: LifeDashboardPayload,
  weatherOverride?: LifeWeather | null
): string {
  const habits = payload.habits ?? [];
  const done = habits.filter((h) => h.completed).length;
  const openReminders = (payload.reminders ?? [])
    .filter((r) => !r.done)
    .map((r) => r.title)
    .join(', ');
  const projects = (payload.projects ?? [])
    .filter((p) => p.status === 'active' || p.status === 'planning')
    .map((p) => p.name)
    .join(', ');
  const w = weatherOverride ?? payload.weather;
  const weather =
    w?.location ? `${w.condition}, ${w.temperatureC}C in ${w.location}` : 'unknown';
  return `Weather: ${weather}. Habits: ${done}/${habits.length} done. Reminders: ${openReminders || 'none'}. Active projects: ${projects || 'none'}.`;
}
