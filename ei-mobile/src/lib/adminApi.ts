import * as SecureStore from 'expo-secure-store';
import { SUPABASE_URL } from '@/src/config/bootstrap';
import { normalizeDashboard } from './defaults';
import { resolveMarketSession } from './marketHours';
import type {
  InvestmentPoint,
  InvestmentRange,
  InvestmentSnapshot,
  LifeDashboardState,
  Project,
} from './types';

const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;
const TOKEN_KEY = 'ei_admin_token';

const RANGE_QUERY: Record<InvestmentRange, { range: string; interval: string }> = {
  '1D': { range: '1d', interval: '5m' },
  '1W': { range: '5d', interval: '30m' },
  '1M': { range: '1mo', interval: '1d' },
  '6M': { range: '6mo', interval: '1d' },
  '1Y': { range: '1y', interval: '1d' },
  ALL: { range: 'max', interval: '1wk' },
};

export async function getAdminToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setAdminToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearAdminToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

function resolveApiError(data: unknown, status: number): string {
  if (typeof data === 'string' && data.trim()) return data;
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const primary = obj.error;
    if (typeof primary === 'string' && primary.trim()) return primary;
    if (primary && typeof primary === 'object') {
      const nested = primary as Record<string, unknown>;
      if (typeof nested.message === 'string' && nested.message.trim()) return nested.message;
    }
    if (typeof obj.message === 'string' && obj.message.trim()) return obj.message;
  }
  return `HTTP ${status}`;
}

async function adminFetch(path: string, options: RequestInit = {}) {
  const token = await getAdminToken();
  if (!token) throw new Error('Not authenticated');

  const url = `${FUNCTIONS_URL}/admin-api/${path.replace(/^\//, '')}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) throw new Error('Session expired. Please log in again.');
    throw new Error(resolveApiError(data, res.status));
  }
  return data;
}

export const adminApi = {
  lifeDashboard: async (): Promise<LifeDashboardState> => {
    const data = await adminFetch('life-dashboard');
    return normalizeDashboard(data);
  },
  saveLifeDashboard: (data: { payload?: unknown; layout?: unknown }) =>
    adminFetch('life-dashboard', { method: 'PUT', body: JSON.stringify(data) }),

  lifeInvestment: (symbol = 'VUAG.L') =>
    adminFetch(`life_investments?symbol=${encodeURIComponent(symbol)}`),
  saveLifeInvestment: (data: {
    symbol?: string;
    holdings: number;
    invested?: number | null;
    name?: string;
    exchange?: string;
  }) => adminFetch('life_investments', { method: 'PUT', body: JSON.stringify(data) }),

  projects: async (): Promise<Project[]> => {
    const data = await adminFetch('projects');
    return Array.isArray(data) ? data : [];
  },

  blogs: () => adminFetch('blogs'),
  updateBlog: (id: string, data: unknown) =>
    adminFetch(`blogs/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  createBlog: (data: unknown) => adminFetch('blogs', { method: 'POST', body: JSON.stringify(data) }),
  deleteBlog: (id: string) => adminFetch(`blogs/${id}`, { method: 'DELETE' }),

  cvs: () => adminFetch('cvs'),
  cvSignedUrl: (id: string, expiresIn = 3600) =>
    adminFetch(`cvs/${id}/signed-url?expires_in=${expiresIn}`) as Promise<{
      id: string;
      signed_url: string;
      expires_in: number;
    }>,
  deleteCv: (id: string) => adminFetch(`cvs/${id}`, { method: 'DELETE' }),
  reextractCv: (id: string) =>
    adminFetch(`cvs/${id}/reextract`, { method: 'POST', body: '{}' }),
  uploadCv: async (params: {
    uri: string;
    fileName: string;
    mimeType: string;
    title: string;
    notes?: string;
    isActive?: boolean;
  }) => {
    const token = await getAdminToken();
    if (!token) throw new Error('Not authenticated');
    const form = new FormData();
    form.append('file', {
      uri: params.uri,
      name: params.fileName,
      type: params.mimeType || 'application/pdf',
    } as unknown as Blob);
    form.append('filename', params.fileName);
    form.append('title', params.title);
    form.append('is_active', String(params.isActive ?? true));
    if (params.notes) form.append('notes', params.notes);

    const res = await fetch(`${FUNCTIONS_URL}/admin-api/cvs/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(resolveApiError(data, res.status));
    return data;
  },
  sendCvEmail: async (payload: {
    cvId?: string;
    includeAll?: boolean;
    message?: string;
  }) => {
    const token = await getAdminToken();
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(`${FUNCTIONS_URL}/admin-cv-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(resolveApiError(data, res.status));
    return data as {
      ok: boolean;
      sent_to: string;
      count: number;
      attachments: number;
      previews: number;
    };
  },

  resourcePacks: () => adminFetch('resourcepacks'),
  updateResourcePack: (id: string, data: unknown) =>
    adminFetch(`resourcepacks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  binderShowcases: () => adminFetch('binder_showcases'),
  collectionMasterSets: () => adminFetch('collection_master_sets'),
  updateCollectionMasterSet: (id: string, data: unknown) =>
    adminFetch(`collection_master_sets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  siteContent: (section?: string) =>
    adminFetch(
      section ? `site_content?section=${encodeURIComponent(section)}` : 'site_content'
    ),
  updateSiteContent: (
    key: string,
    value: unknown,
    meta?: { content_type?: string; section?: string; label?: string }
  ) => adminFetch('site_content', { method: 'POST', body: JSON.stringify({ key, value, ...meta }) }),

  eiChat: async (payload: {
    message: string;
    context?: string;
  }): Promise<{ reply: string; didMutate?: boolean }> => {
    const token = await getAdminToken();
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(`${FUNCTIONS_URL}/ei-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(resolveApiError(data, res.status));
    const reply =
      typeof (data as { reply?: string }).reply === 'string'
        ? (data as { reply: string }).reply.trim()
        : '';
    if (!reply) throw new Error('Empty reply from Ei');
    return {
      reply,
      didMutate: Boolean((data as { didMutate?: boolean }).didMutate),
    };
  },

  eiVision: async (payload: {
    imageBase64: string;
    mode: 'identify' | 'translate';
  }): Promise<{ reply: string; mode: string }> => {
    const token = await getAdminToken();
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(`${FUNCTIONS_URL}/ei-vision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(resolveApiError(data, res.status));
    const reply =
      typeof (data as { reply?: string }).reply === 'string'
        ? (data as { reply: string }).reply.trim()
        : '';
    if (!reply) throw new Error('Empty vision reply');
    return {
      reply,
      mode: typeof (data as { mode?: string }).mode === 'string' ? (data as { mode: string }).mode : payload.mode,
    };
  },
};

type VuagApiResponse = {
  symbol: string;
  name: string;
  currency: string;
  price: number;
  previousClose: number;
  dailyChangePct: number;
  marketState?: string | null;
  series: InvestmentPoint[];
};

/**
 * Combines market-vuag feed with saved holdings from life_investments.
 */
export async function fetchVuagQuote(
  range: InvestmentRange = '1M',
  symbol = 'VUAG.L'
): Promise<InvestmentSnapshot> {
  const token = await getAdminToken();
  if (!token) throw new Error('Not authenticated');

  const q = RANGE_QUERY[range];
  const [quoteRes, holdingsData] = await Promise.all([
    fetch(
      `${FUNCTIONS_URL}/market-vuag?symbol=${encodeURIComponent(symbol)}&range=${q.range}&interval=${q.interval}`,
      { headers: { Authorization: `Bearer ${token}` } }
    ),
    adminApi.lifeInvestment(symbol).catch(() => null),
  ]);

  const data = (await quoteRes.json().catch(() => ({}))) as VuagApiResponse & { error?: string };
  if (!quoteRes.ok) {
    throw new Error(data.error || `VUAG quote failed (${quoteRes.status})`);
  }

  const holdings =
    holdingsData && typeof holdingsData === 'object' && 'holdings' in holdingsData
      ? Number((holdingsData as { holdings: number }).holdings) || 0
      : 0;
  const investedRaw =
    holdingsData && typeof holdingsData === 'object' && 'invested' in holdingsData
      ? (holdingsData as { invested: number | null }).invested
      : null;
  const invested =
    investedRaw != null && Number.isFinite(Number(investedRaw))
      ? Number(investedRaw)
      : undefined;
  const name =
    holdingsData &&
    typeof holdingsData === 'object' &&
    typeof (holdingsData as { name?: string }).name === 'string'
      ? (holdingsData as { name: string }).name
      : undefined;

  const price = data.price;
  const previousClose = data.previousClose || price;
  const dailyChangePct =
    data.dailyChangePct ??
    (previousClose ? ((price - previousClose) / previousClose) * 100 : 0);

  const empty: InvestmentPoint[] = [];
  return {
    symbol: 'VUAG',
    name: name || data.name || 'Vanguard S&P 500 UCITS ETF Acc (LSE)',
    currency: data.currency || 'GBP',
    price,
    feedPrice: price,
    dailyChangePct,
    portfolioValue: holdings * price,
    todayGainLoss: holdings * (price - previousClose),
    holdings,
    invested,
    marketState: data.marketState ?? undefined,
    marketSession: resolveMarketSession(data.marketState),
    series: {
      '1D': empty,
      '1W': empty,
      '1M': empty,
      '6M': empty,
      '1Y': empty,
      ALL: empty,
      [range]: data.series ?? [],
    },
  };
}
