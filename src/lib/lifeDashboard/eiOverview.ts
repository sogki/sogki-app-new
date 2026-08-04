import type { InvestmentSnapshot, LifeDashboardPayload } from './types';
import { getInvested, loadVuagConfig } from './vuagConfig';
import { resolveMarketSession, speakMarketSession } from './marketHours';

/** Conversational money phrasing for TTS. */
export function speakMoney(value: number): string {
  const abs = Math.abs(value);
  const pounds = Math.floor(abs);
  const pence = Math.round((abs - pounds) * 100);
  const sign = value < 0 ? 'minus ' : '';
  if (pence <= 0) return `${sign}${pounds} pounds`;
  if (pence === 1) return `${sign}${pounds} pounds and 1 pence`;
  return `${sign}${pounds} pounds and ${pence} pence`;
}

export function speakPct(value: number): string {
  const rounded = Math.abs(value).toFixed(Math.abs(value) >= 10 ? 1 : 2);
  if (value > 0.05) return `up about ${rounded} percent`;
  if (value < -0.05) return `down about ${rounded} percent`;
  return 'pretty much flat';
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
    return `I couldn't get a live Vanguard quote just now — refresh investments and ask me again.`;
  }

  const session = inv.marketSession ?? resolveMarketSession(inv.marketState);
  const dayMove = speakPct(inv.dailyChangePct);
  const series = inv.series?.['1M']?.length
    ? inv.series['1M']
    : inv.series?.['1W']?.length
      ? inv.series['1W']
      : inv.series?.['1D'] ?? [];
  const chartTrend = trendFromSeries(series);
  const chartPhrase =
    chartTrend === 'up'
      ? 'Over the last month, the chart has been drifting higher'
      : chartTrend === 'down'
        ? 'Over the last month, the chart has been drifting lower'
        : 'Over the last month, the chart has mostly been sideways';

  const bits: string[] = [
    `${speakMarketSession(session)}.`,
    `Vanguard is ${dayMove} on the day, around ${speakMoney(inv.price)} a share.`,
  ];

  if (inv.holdings > 0) {
    bits.push(`That puts your portfolio at about ${speakMoney(inv.portfolioValue)}.`);
    const invested = inv.invested ?? getInvested(loadVuagConfig());
    if (invested != null && invested > 0) {
      const pnl = inv.portfolioValue - invested;
      bits.push(
        pnl >= 0
          ? `You're sitting on an unrealised gain of roughly ${speakMoney(pnl)}.`
          : `You're down about ${speakMoney(Math.abs(pnl))} unrealised.`
      );
    }
    if (Math.abs(inv.todayGainLoss) >= 0.01) {
      bits.push(
        inv.todayGainLoss >= 0
          ? `Today's move is worth about ${speakMoney(inv.todayGainLoss)}.`
          : `Today's move costs you about ${speakMoney(Math.abs(inv.todayGainLoss))}.`
      );
    }
  }

  bits.push(`${chartPhrase}.`);
  return bits.join(' ');
}

export function buildWeatherOverview(payload: LifeDashboardPayload): string {
  const w = payload.weather;
  const next = w.forecast?.[0];
  const place = w.location.replace(/United Kingdom/i, 'the UK');
  let line = `It's ${w.condition.toLowerCase()} in ${place}, around ${w.temperatureC} degrees — highs near ${w.highC}, lows around ${w.lowC}.`;
  if (next) {
    line += ` Looking ahead to ${next.day}, it's shaping up ${next.condition.toLowerCase()} with a high of about ${next.highC}.`;
  }
  return line;
}

export function buildHabitsOverview(payload: LifeDashboardPayload): string {
  const habits = payload.habits ?? [];
  const done = habits.filter((h) => h.completed).length;
  const left = habits.filter((h) => !h.completed);
  if (!habits.length) return `You haven't set up any habits yet.`;
  if (!left.length) return `Nice one — you've cleared all ${done} habits for today.`;
  if (left.length === 1) return `You've done ${done} of ${habits.length} habits. Still left: ${left[0]!.label}.`;
  const names = left
    .slice(0, 3)
    .map((h) => h.label)
    .join(', ');
  const more = left.length > 3 ? `, plus ${left.length - 3} more` : '';
  return `You've knocked out ${done} of ${habits.length} habits. Still on the list: ${names}${more}.`;
}

export function buildFullOverview(
  payload: LifeDashboardPayload,
  inv: InvestmentSnapshot | null
): string {
  return [
    `Here's a quick rundown.`,
    buildInvestmentOverview(inv),
    buildWeatherOverview(payload),
    buildHabitsOverview(payload),
    `Want me to dig into anything?`,
  ].join(' ');
}
