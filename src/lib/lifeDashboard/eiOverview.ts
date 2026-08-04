import type { InvestmentSnapshot, LifeDashboardPayload } from './types';
import { getInvested, loadVuagConfig } from './vuagConfig';

/** Money phrasing that TTS reads cleanly. */
export function speakMoney(value: number): string {
  const abs = Math.abs(value);
  const pounds = Math.floor(abs);
  const pence = Math.round((abs - pounds) * 100);
  const sign = value < 0 ? 'minus ' : '';
  if (pence <= 0) return `${sign}${pounds} pounds`;
  return `${sign}${pounds} pounds and ${pence} pence`;
}

export function speakPct(value: number): string {
  const rounded = Math.abs(value).toFixed(Math.abs(value) >= 10 ? 1 : 2);
  if (value > 0) return `up ${rounded} percent`;
  if (value < 0) return `down ${rounded} percent`;
  return 'unchanged';
}

function trendFromSeries(series: { value: number }[]): 'up' | 'down' | 'flat' {
  if (!series || series.length < 2) return 'flat';
  const first = series[0]?.value ?? 0;
  const last = series[series.length - 1]?.value ?? 0;
  const delta = last - first;
  if (Math.abs(delta) / Math.max(1, Math.abs(first)) < 0.002) return 'flat';
  return delta > 0 ? 'up' : 'down';
}

export function buildInvestmentOverview(inv: InvestmentSnapshot | null): string {
  if (!inv || !(inv.price > 0)) {
    return `I couldn't pull a live Vanguard quote. Refresh investments and I'll try again.`;
  }

  const dayMove = speakPct(inv.dailyChangePct);
  const series = inv.series?.['1M']?.length
    ? inv.series['1M']
    : inv.series?.['1W']?.length
      ? inv.series['1W']
      : inv.series?.['1D'] ?? [];
  const chartTrend = trendFromSeries(series);
  const chartPhrase =
    chartTrend === 'up'
      ? 'The month chart is trending up'
      : chartTrend === 'down'
        ? 'The month chart is trending down'
        : 'The month chart is holding sideways';

  const parts = [`Vanguard is ${dayMove} today, around ${speakMoney(inv.price)} a share.`];

  if (inv.holdings > 0) {
    parts.push(`Your portfolio sits at ${speakMoney(inv.portfolioValue)}.`);
    const invested = inv.invested ?? getInvested(loadVuagConfig());
    if (invested != null && invested > 0) {
      const pnl = inv.portfolioValue - invested;
      parts.push(
        pnl >= 0
          ? `Unrealised gain: ${speakMoney(pnl)}.`
          : `Unrealised loss: ${speakMoney(Math.abs(pnl))}.`
      );
    }
    if (inv.todayGainLoss !== 0) {
      parts.push(
        inv.todayGainLoss >= 0
          ? `Today's move adds roughly ${speakMoney(inv.todayGainLoss)}.`
          : `Today's move costs roughly ${speakMoney(Math.abs(inv.todayGainLoss))}.`
      );
    }
  }

  parts.push(`${chartPhrase}.`);
  return parts.join(' ');
}

export function buildWeatherOverview(payload: LifeDashboardPayload): string {
  const w = payload.weather;
  const next = w.forecast?.[0];
  let line = `Outside in ${w.location}: ${w.condition}, ${w.temperatureC} degrees. High ${w.highC}, low ${w.lowC}.`;
  if (next) {
    line += ` ${next.day} looks ${next.condition.toLowerCase()}, high ${next.highC}.`;
  }
  return line;
}

export function buildHabitsOverview(payload: LifeDashboardPayload): string {
  const habits = payload.habits ?? [];
  const done = habits.filter((h) => h.completed).length;
  const left = habits.filter((h) => !h.completed);
  if (!habits.length) return `No habits on the board yet.`;
  if (!left.length) return `All ${done} habits are cleared for today.`;
  const names = left
    .slice(0, 4)
    .map((h) => h.label)
    .join(', ');
  const more = left.length > 4 ? `, and ${left.length - 4} more` : '';
  return `${done} of ${habits.length} habits done. Still open: ${names}${more}.`;
}

export function buildFullOverview(
  payload: LifeDashboardPayload,
  inv: InvestmentSnapshot | null
): string {
  return [
    `Here's where things stand.`,
    buildInvestmentOverview(inv),
    buildWeatherOverview(payload),
    buildHabitsOverview(payload),
    `Anything else?`,
  ].join(' ');
}
