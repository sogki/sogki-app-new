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
    const token = getAdminToken();
    if (!token) throw new Error('Not authenticated');
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('filename', file.name);
    if (blogId) form.append('blog_id', blogId);
    if (alt) form.append('alt', alt);

    const res = await fetch(`${FUNCTIONS_URL}/admin-api/blogs/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(resolveApiError(data, res.status));
    }
    return (data as { url: string }).url;
  },

  resourcePacks: () => adminApi.get('resourcepacks'),
  updateResourcePack: (id: string, data: unknown) => adminApi.patch(`resourcepacks/${id}`, data),
  deleteResourcePack: (id: string) => adminApi.delete(`resourcepacks/${id}`),
  binderShowcases: () => adminApi.get('binder_showcases'),
  createBinderShowcase: (data: unknown) => adminApi.post('binder_showcases', data),
  updateBinderShowcase: (id: string, data: unknown) => adminApi.patch(`binder_showcases/${id}`, data),
  deleteBinderShowcase: (id: string) => adminApi.delete(`binder_showcases/${id}`),
  createBinderShowcaseImage: (data: unknown) => adminApi.post('binder_showcase_images', data),
  updateBinderShowcaseImage: (id: string, data: unknown) => adminApi.patch(`binder_showcase_images/${id}`, data),
  deleteBinderShowcaseImage: (id: string) => adminApi.delete(`binder_showcase_images/${id}`),
  createBinderShowcaseSet: (data: unknown) => adminApi.post('binder_showcase_sets', data),
  updateBinderShowcaseSet: (id: string, data: unknown) => adminApi.patch(`binder_showcase_sets/${id}`, data),
  deleteBinderShowcaseSet: (id: string) => adminApi.delete(`binder_showcase_sets/${id}`),

  uploadBinderShowcaseImage: async (file: File): Promise<{ url: string; path: string }> => {
    const token = getAdminToken();
    if (!token) throw new Error('Not authenticated');
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('filename', file.name);
    const res = await fetch(`${FUNCTIONS_URL}/admin-api/binder_showcases/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(resolveApiError(data, res.status));
    }
    return data as { url: string; path: string };
  },

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
    const token = getAdminToken();
    if (!token) throw new Error('Not authenticated');

    const form = new FormData();
    form.append('file', file, file.name);
    form.append('filename', file.name);
    form.append('name', data.name);
    form.append('version', data.version);
    form.append('is_active', String(Boolean(data.is_active)));
    form.append('auto_deactivate_previous', String(Boolean(data.auto_deactivate_previous)));
    if (data.group_key) form.append('group_key', data.group_key);
    if (data.description) form.append('description', data.description);

    const res = await fetch(`${FUNCTIONS_URL}/admin-api/resourcepacks/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(resolveApiError(payload, res.status));
    }
    return payload;
  },
};
