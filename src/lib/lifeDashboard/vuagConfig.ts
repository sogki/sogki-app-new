import { adminApi } from '../adminApi';

const CACHE_KEY = 'life-dashboard-vuag';

export type VuagConfig = {
  /** Number of VUAG units (fractional OK) */
  holdings: number;
  /** Total amount invested / cost basis in GBP */
  invested?: number;
  /** @deprecated Prefer `invested`. */
  avgCost?: number;
  /** Yahoo / LSE ticker */
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

function fromRow(row: LifeInvestmentRow | null | undefined): VuagConfig {
  if (!row) return { ...DEFAULT_CONFIG };
  const holdings = Number(row.holdings);
  const investedRaw = row.invested;
  const invested =
    investedRaw != null && investedRaw !== '' && Number.isFinite(Number(investedRaw))
      ? Number(investedRaw)
      : undefined;
  return {
    symbol: typeof row.symbol === 'string' ? row.symbol : DEFAULT_CONFIG.symbol,
    name: typeof row.name === 'string' ? row.name : DEFAULT_CONFIG.name,
    exchange: typeof row.exchange === 'string' ? row.exchange : DEFAULT_CONFIG.exchange,
    holdings: Number.isFinite(holdings) ? holdings : 0,
    invested,
  };
}

function cacheWrite(config: VuagConfig): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(config));
  } catch {
    /* ignore quota */
  }
}

/** Sync read from local cache (instant UI). Prefer `fetchVuagConfig` for source of truth. */
export function loadVuagConfig(): VuagConfig {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(raw) as Partial<VuagConfig>;
    const holdings = Number.isFinite(Number(parsed.holdings)) ? Number(parsed.holdings) : 0;
    let invested: number | undefined =
      parsed.invested != null && Number.isFinite(Number(parsed.invested))
        ? Number(parsed.invested)
        : undefined;
    const avgCost =
      parsed.avgCost != null && Number.isFinite(Number(parsed.avgCost))
        ? Number(parsed.avgCost)
        : undefined;
    if (invested == null && avgCost != null && holdings > 0) {
      invested = avgCost * holdings;
    }
    return {
      symbol: typeof parsed.symbol === 'string' ? parsed.symbol : DEFAULT_CONFIG.symbol,
      name: typeof parsed.name === 'string' ? parsed.name : DEFAULT_CONFIG.name,
      exchange: typeof parsed.exchange === 'string' ? parsed.exchange : DEFAULT_CONFIG.exchange,
      holdings,
      invested,
      avgCost,
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

/** Load holdings from database (admin-api). Caches locally for offline/mobile snappiness. */
export async function fetchVuagConfig(): Promise<VuagConfig> {
  const row = (await adminApi.lifeInvestment('VUAG.L')) as LifeInvestmentRow;
  const config = fromRow(row);
  cacheWrite(config);
  return config;
}

/** Persist holdings to database and refresh local cache. */
export async function saveVuagConfig(config: VuagConfig): Promise<VuagConfig> {
  const payload = {
    symbol: config.symbol || 'VUAG.L',
    name: config.name || DEFAULT_CONFIG.name,
    exchange: config.exchange || 'LSE',
    holdings: config.holdings,
    invested: config.invested ?? null,
  };
  const row = (await adminApi.saveLifeInvestment(payload)) as LifeInvestmentRow;
  const saved = fromRow(row);
  cacheWrite(saved);
  return saved;
}

/** Cost basis in GBP, if known. */
export function getInvested(config: VuagConfig): number | null {
  if (config.invested != null && Number.isFinite(config.invested) && config.invested > 0) {
    return config.invested;
  }
  if (config.avgCost != null && config.holdings > 0) {
    return config.avgCost * config.holdings;
  }
  return null;
}

export function getAvgCost(config: VuagConfig): number | null {
  const invested = getInvested(config);
  if (invested == null || config.holdings <= 0) return null;
  return invested / config.holdings;
}
