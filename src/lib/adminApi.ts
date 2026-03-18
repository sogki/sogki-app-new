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
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error';
    if (msg.includes('fetch') || msg.includes('Failed')) {
      throw new Error(
        'Cannot reach admin API. Ensure the admin-api Edge Function is deployed with verify_jwt = false (see supabase/config.toml).'
      );
    }
    throw err;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) throw new Error('Session expired. Please log in again.');
    throw new Error(resolveApiError(data, res.status));
  }
  return data;
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
      if (typeof nested.details === 'string' && nested.details.trim()) return nested.details;
      if (typeof nested.hint === 'string' && nested.hint.trim()) return nested.hint;
      if (typeof nested.code === 'string' && nested.code.trim()) return `Error code: ${nested.code}`;
    }
    if (typeof obj.message === 'string' && obj.message.trim()) return obj.message;
  }
  return `HTTP ${status}`;
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

  siteContent: (section?: string) =>
    adminApi.get(section ? `site_content?section=${encodeURIComponent(section)}` : 'site_content'),
  updateSiteContent: (key: string, value: unknown, meta?: { content_type?: string; section?: string; label?: string }) =>
    adminApi.post('site_content', { key, value, ...meta }),

  uploadBlogImage: async (file: File, blogId?: string, alt?: string): Promise<string> => {
    const reader = new FileReader();
    const base64 = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve((reader.result as string) ?? '');
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const data = await adminApi.post('blogs/upload', {
      file: base64,
      filename: file.name,
      blog_id: blogId || null,
      alt: alt || null,
    });
    return (data as { url: string }).url;
  },

  resourcePacks: () => adminApi.get('resourcepacks'),
  updateResourcePack: (id: string, data: unknown) => adminApi.patch(`resourcepacks/${id}`, data),
  deleteResourcePack: (id: string) => adminApi.delete(`resourcepacks/${id}`),
  uploadResourcePack: async (
    file: File,
    data: {
      name: string;
      version: string;
      description?: string;
      is_active: boolean;
      auto_deactivate_previous?: boolean;
      group_key?: string;
    }
  ) => {
    const reader = new FileReader();
    const base64 = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve((reader.result as string) ?? '');
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    return adminApi.post('resourcepacks/upload', {
      file: base64,
      filename: file.name,
      ...data,
    });
  },
};
