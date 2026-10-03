import { getAdminToken } from '../adminApi';
import { getKey } from '../keys';
import type {
  DashboardData,
  Finding,
  HealthResponse,
  Report,
  Scan,
  Target,
  TriageStatus,
} from './types';

const DEFAULT_BASE = 'http://127.0.0.1:8790';

let cachedBase: string | null = null;

/** Resolve Sentinel API base URL from Supabase public keys (session-cached). */
export async function resolveSentinelBaseUrl(): Promise<string> {
  if (cachedBase) return cachedBase;
  try {
    const fromKeys = await getKey('SENTINEL_API_URL');
    const trimmed = fromKeys?.trim().replace(/\/$/, '');
    cachedBase = trimmed || DEFAULT_BASE;
  } catch {
    cachedBase = DEFAULT_BASE;
  }
  return cachedBase;
}

export function clearSentinelBaseUrlCache(): void {
  cachedBase = null;
}

async function sentinelFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAdminToken();
  if (!token) throw new Error('Not authenticated');

  const base = await resolveSentinelBaseUrl();
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      'Cannot reach Sentinel API. Start it with: cd sentinel && docker compose up --build'
    );
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    let msg =
      typeof data === 'object' && data && 'detail' in data
        ? String((data as { detail: unknown }).detail)
        : `HTTP ${res.status}`;
    if (msg === 'Not Found' || res.status === 404) {
      msg =
        'Sentinel API route not found. Restart the API from sentinel/ so tool routes are loaded (uvicorn on :8790).';
    } else if (res.status === 500) {
      msg = 'Sentinel API error (500). Check the uvicorn terminal, then restart the API.';
    }
    throw new Error(msg);
  }
  return data as T;
}

export const sentinelApi = {
  health: async () => {
    const base = await resolveSentinelBaseUrl();
    const res = await fetch(`${base}/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
    return (await res.json()) as HealthResponse;
  },

  dashboard: () => sentinelFetch<DashboardData>('/api/dashboard'),

  listTargets: () => sentinelFetch<Target[]>('/api/targets'),
  createTarget: (body: { name: string; url: string; target_type?: string; notes?: string }) =>
    sentinelFetch<Target>('/api/targets', { method: 'POST', body: JSON.stringify(body) }),
  deleteTarget: (id: string) =>
    sentinelFetch<{ ok: boolean }>(`/api/targets/${id}`, { method: 'DELETE' }),

  listScans: () => sentinelFetch<Scan[]>('/api/scans'),
  getScan: (id: string) => sentinelFetch<Scan>(`/api/scans/${id}`),
  createScan: (body: { target_id: string }) =>
    sentinelFetch<Scan>('/api/scans', { method: 'POST', body: JSON.stringify(body) }),
  getFindings: (scanId: string) => sentinelFetch<Finding[]>(`/api/scans/${scanId}/findings`),
  updateFindingTriage: (
    findingId: string,
    body: { triage_status?: TriageStatus; triage_notes?: string }
  ) =>
    sentinelFetch<Finding>(`/api/findings/${findingId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  getReport: (scanId: string) => sentinelFetch<Report>(`/api/reports/${scanId}`),
  getReportPdfUrl: async (scanId: string) => {
    const base = await resolveSentinelBaseUrl();
    return `${base}/api/reports/${scanId}/pdf`;
  },

  toolHeaders: (body: { target_id: string; url?: string }) =>
    sentinelFetch<Record<string, unknown>>('/api/tools/headers', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  toolTls: (body: { target_id: string; url?: string }) =>
    sentinelFetch<Record<string, unknown>>('/api/tools/tls', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  toolRedirects: (body: { target_id: string; url?: string }) =>
    sentinelFetch<Record<string, unknown>>('/api/tools/redirects', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  toolDisclosure: (body: { target_id: string; url?: string }) =>
    sentinelFetch<Record<string, unknown>>('/api/tools/disclosure', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  toolDns: (body: { target_id: string; url?: string }) =>
    sentinelFetch<Record<string, unknown>>('/api/tools/dns', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  toolEmailAuth: (body: { target_id: string; url?: string }) =>
    sentinelFetch<Record<string, unknown>>('/api/tools/email-auth', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  toolCsp: (body: { target_id: string; url?: string }) =>
    sentinelFetch<Record<string, unknown>>('/api/tools/csp', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  toolCookies: (body: { target_id: string; url?: string }) =>
    sentinelFetch<Record<string, unknown>>('/api/tools/cookies', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  toolMethods: (body: { target_id: string; url?: string }) =>
    sentinelFetch<Record<string, unknown>>('/api/tools/methods', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  toolAssets: (body: { target_id: string; url?: string }) =>
    sentinelFetch<Record<string, unknown>>('/api/tools/assets', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  toolHstsPreload: (body: { target_id: string; url?: string }) =>
    sentinelFetch<Record<string, unknown>>('/api/tools/hsts-preload', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  toolDiff: (body: { scan_a: string; scan_b: string }) =>
    sentinelFetch<Record<string, unknown>>('/api/tools/diff', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
