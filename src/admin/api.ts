/** Browser-side calls to /api/admin/*. Errors carry the server's human message. */
import type { ContentType } from './schema';

export interface DocRow {
  id: string;
  type: ContentType;
  draft: Record<string, any> | null;
  published: Record<string, any> | null;
  updatedAt: string;
  publishedAt: string | null;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) }, credentials: 'same-origin' });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    location.reload(); // back to the login screen
  }
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

export const api = {
  list: (type: ContentType) => call<{ docs: DocRow[] }>(`/api/admin/docs?type=${type}`).then((r) => r.docs),
  get: (id: string) => call<{ doc: DocRow }>(`/api/admin/docs/${id}`).then((r) => r.doc),
  create: (type: ContentType, draft: Record<string, any>) => call<{ doc: DocRow }>('/api/admin/docs', { method: 'POST', body: JSON.stringify({ type, draft }) }).then((r) => r.doc),
  save: (id: string, draft: Record<string, any>) => call<{ doc: DocRow }>(`/api/admin/docs/${id}`, { method: 'PUT', body: JSON.stringify({ draft }) }).then((r) => r.doc),
  action: (id: string, action: 'publish' | 'unpublish' | 'discard') => call<{ doc: DocRow }>(`/api/admin/docs/${id}/${action}`, { method: 'POST' }).then((r) => r.doc),
  remove: (id: string) => call(`/api/admin/docs/${id}`, { method: 'DELETE' }),
  reorder: (type: ContentType, ids: string[]) => call('/api/admin/reorder', { method: 'POST', body: JSON.stringify({ type, ids }) }),
  logout: () => call('/api/admin/logout', { method: 'POST' }),
  async upload(key: string, body: Blob): Promise<void> {
    const res = await fetch(`/api/admin/files/${key}`, { method: 'PUT', body, credentials: 'same-origin' });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Upload failed (${res.status})`);
  },
};

/** The version being edited: unpublished draft if any, else the live one. */
export const current = (row: DocRow) => row.draft ?? row.published ?? {};

export type DocState = 'draft' | 'published' | 'changed';
export const docState = (row: DocRow): DocState => (!row.published ? 'draft' : row.draft ? 'changed' : 'published');

export const newKey = () => Math.random().toString(36).slice(2, 10);
