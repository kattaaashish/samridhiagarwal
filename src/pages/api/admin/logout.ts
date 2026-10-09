import type { APIRoute } from 'astro';
import { SESSION_COOKIE } from '@/lib/admin/auth';
import { json } from '@/lib/admin/http';

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
  cookies.delete(SESSION_COOKIE, { path: '/' });
  return json({ ok: true });
};
