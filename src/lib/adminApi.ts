import { SUPABASE_URL } from '../config/bootstrap';

const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

export function getAdminToken(): string | null {
  return localStorage.getItem('admin_token');
}

export function setAdminToken(token: string): void {
  localStorage.setItem('admin_token', token);
}

export function clearAdminToken(): void {
  localStorage.removeItem('admin_token');
}

async function adminFetch(path: string, options: RequestInit = {}) {
  const token = getAdminToken();
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
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const adminApi = {
  get: (path: string) => adminFetch(path),
  post: (path: string, body: unknown) =>
    adminFetch(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: (path: string, body: unknown) =>
    adminFetch(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path: string) => adminFetch(path, { method: 'DELETE' }),

  collections: () => adminApi.get('collections'),
  assets: (collectionId?: string) =>
    adminApi.get(collectionId ? `assets?collection_id=${collectionId}` : 'assets'),
  createCollection: (data: unknown) => adminApi.post('collections', data),
  updateCollection: (id: string, data: unknown) => adminApi.patch(`collections/${id}`, data),
  deleteCollection: (id: string) => adminApi.delete(`collections/${id}`),
  createAsset: (data: unknown) => adminApi.post('assets', data),
  updateAsset: (id: string, data: unknown) => adminApi.patch(`assets/${id}`, data),
  deleteAsset: (id: string) => adminApi.delete(`assets/${id}`),

  blogs: () => adminApi.get('blogs'),
  blog: (id: string) => adminApi.get(`blogs/${id}`),
  createBlog: (data: unknown) => adminApi.post('blogs', data),
  updateBlog: (id: string, data: unknown) => adminApi.patch(`blogs/${id}`, data),
  deleteBlog: (id: string) => adminApi.delete(`blogs/${id}`),

  projects: () => adminApi.get('projects'),
  createProject: (data: unknown) => adminApi.post('projects', data),
  updateProject: (id: string, data: unknown) => adminApi.patch(`projects/${id}`, data),
  deleteProject: (id: string) => adminApi.delete(`projects/${id}`),

  social: () => adminApi.get('social'),
  updateSocial: (id: string, data: unknown) => adminApi.patch(`social/${id}`, data),
  createSocial: (data: unknown) => adminApi.post('social', data),
  deleteSocial: (id: string) => adminApi.delete(`social/${id}`),

  footer: () => adminApi.get('footer'),
  updateFooter: (key: string, value: unknown) => adminApi.post('footer', { key, value }),
};
