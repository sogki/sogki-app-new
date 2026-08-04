import { adminApi } from '../adminApi';

const CACHE_KEY = 'life-dashboard-vuag';

export type VuagConfig = {
  /** Fractional VUAG units — set by converting ISA value ÷ live feed price. */
  holdings: number;
  /** Total cost basis in GBP (what you paid into the ISA position). */
  invested?: number;
  symbol: string;
  name?: string;
  exchange?: string;
};

const DEFAULT_CONFIG: VuagConfig = {
  holdings: 0,
  symbol: 'VUAG.L',
  name: 'Vanguard S&P 500 UCITS ETF Acc (LSE)',
  exchange: 'LSE',
};

type LifeInvestmentRow = {
  symbol?: string;
  name?: string;
  exchange?: string;
  holdings?: number | string;
  invested?: number | string | null;
};

function numOrUndef(raw: unknown): number | undefined {
  if (raw == null || raw === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function fromRow(row: LifeInvestmentRow | null | undefined): VuagConfig {
  if (!row) return { ...DEFAULT_CONFIG };
  const holdings = Number(row.holdings);
  return {
    symbol: typeof row.symbol === 'string' ? row.symbol : DEFAULT_CONFIG.symbol,
    name: typeof row.name === 'string' ? row.name : DEFAULT_CONFIG.name,
    exchange: typeof row.exchange === 'string' ? row.exchange : DEFAULT_CONFIG.exchange,
    holdings: Number.isFinite(holdings) ? holdings : 0,
    invested: numOrUndef(row.invested),
  };
}

function cacheWrite(config: VuagConfig): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(config));
  } catch {
    /* ignore */
  }
}

export function loadVuagConfig(): VuagConfig {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(raw) as Partial<VuagConfig> & {
      avgCost?: number;
      brokerValue?: number;
      brokerPrice?: number;
    };
    const holdings = Number.isFinite(Number(parsed.holdings)) ? Number(parsed.holdings) : 0;
    let invested = numOrUndef(parsed.invested);
    if (invested == null && parsed.avgCost != null && holdings > 0) {
      invested = Number(parsed.avgCost) * holdings;
    }
    return {
      symbol: typeof parsed.symbol === 'string' ? parsed.symbol : DEFAULT_CONFIG.symbol,
      name: typeof parsed.name === 'string' ? parsed.name : DEFAULT_CONFIG.name,
      exchange: typeof parsed.exchange === 'string' ? parsed.exchange : DEFAULT_CONFIG.exchange,
      holdings,
      invested,
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export async function fetchVuagConfig(): Promise<VuagConfig> {
  const row = (await adminApi.lifeInvestment('VUAG.L')) as LifeInvestmentRow;
  const config = fromRow(row);
  cacheWrite(config);
  return config;
}

export async function saveVuagConfig(config: VuagConfig): Promise<VuagConfig> {
  const payload = {
    symbol: config.symbol || 'VUAG.L',
    name: config.name || DEFAULT_CONFIG.name,
    exchange: config.exchange || 'LSE',
    holdings: config.holdings,
    invested: config.invested ?? null,
    // Clear old broker overrides so feed drives stats again
    broker_price: null,
    broker_value: null,
    broker_day_pnl: null,
  };
  const row = (await adminApi.saveLifeInvestment(payload)) as LifeInvestmentRow;
  const saved = fromRow(row);
  cacheWrite(saved);
  return saved;
}

export function getInvested(config: VuagConfig): number | null {
  if (config.invested != null && Number.isFinite(config.invested) && config.invested > 0) {
    return config.invested;
  }
  return null;
}

export function investedFromReturn(value: number, rateOfReturnPct: number): number {
  return value / (1 + rateOfReturnPct / 100);
}

export function rateOfReturnPct(value: number, invested: number): number | null {
  if (!(invested > 0)) return null;
  return ((value - invested) / invested) * 100;
}
