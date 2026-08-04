import { getAdminToken } from '../adminApi';
import { SUPABASE_URL } from '../../config/bootstrap';
import type { InvestmentPoint, InvestmentRange, InvestmentSnapshot } from './types';
import { fetchVuagConfig, getInvested, loadVuagConfig } from './vuagConfig';

const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

type VuagApiResponse = {
  symbol: string;
  name: string;
  currency: string;
  price: number;
  previousClose: number;
  dailyChangePct: number;
  series: InvestmentPoint[];
};

const RANGE_QUERY: Record<InvestmentRange, { range: string; interval: string }> = {
  '1D': { range: '1d', interval: '5m' },
  '1W': { range: '5d', interval: '30m' },
  '1M': { range: '1mo', interval: '1d' },
  '6M': { range: '6mo', interval: '1d' },
  '1Y': { range: '1y', interval: '1d' },
  ALL: { range: 'max', interval: '1wk' },
};

/**
 * Public VUAG.L feed drives price, chart, and 24h move.
 * Your saved holdings + invested drive portfolio value and unrealised return.
 */
export async function fetchVuagQuote(range: InvestmentRange): Promise<InvestmentSnapshot> {
  let config = loadVuagConfig();
  try {
    config = await fetchVuagConfig();
  } catch {
    /* keep cache */
  }

  const q = RANGE_QUERY[range];
  const token = getAdminToken();
  if (!token) throw new Error('Not authenticated');

  const url = new URL(`${FUNCTIONS_URL}/market-vuag`);
  url.searchParams.set('symbol', config.symbol || 'VUAG.L');
  url.searchParams.set('range', q.range);
  url.searchParams.set('interval', q.interval);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json().catch(() => ({}))) as VuagApiResponse & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `VUAG quote failed (${res.status})`);
  }

  const holdings = config.holdings;
  const price = data.price;
  const previousClose = data.previousClose || price;
  const dailyChangePct =
    data.dailyChangePct ??
    (previousClose ? ((price - previousClose) / previousClose) * 100 : 0);

  const series = {
    '1D': [] as InvestmentPoint[],
    '1W': [] as InvestmentPoint[],
    '1M': [] as InvestmentPoint[],
    '6M': [] as InvestmentPoint[],
    '1Y': [] as InvestmentPoint[],
    ALL: [] as InvestmentPoint[],
    [range]: data.series ?? [],
  };

  return {
    symbol: 'VUAG',
    name: config.name || data.name || 'Vanguard S&P 500 UCITS ETF Acc (LSE)',
    currency: data.currency || 'GBP',
    price,
    feedPrice: price,
    dailyChangePct,
    portfolioValue: holdings * price,
    todayGainLoss: holdings * (price - previousClose),
    holdings,
    invested: getInvested(config) ?? undefined,
    series,
  };
}
