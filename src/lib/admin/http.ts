/** Wrapper for /api/admin/* routes: session check, same-origin check, JSON in/out, errors. */
import type { APIContext, APIRoute } from 'astro';
import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { isAdmin } from './auth';
import { HttpError } from './store';

export interface AdminCtx {
  ctx: APIContext;
  db: D1Database;
  media?: R2Bucket;
}

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export function adminRoute(handler: (a: AdminCtx) => Promise<unknown>): APIRoute {
  return async (ctx) => {
    if (!(await isAdmin(ctx.locals, ctx.cookies))) return json({ error: 'Please log in again.' }, 401);
    // Cookies are SameSite=Strict already; also refuse writes that come from another site.
    const origin = ctx.request.headers.get('origin');
    if (ctx.request.method !== 'GET' && origin && new URL(origin).host !== ctx.url.host) return json({ error: 'Forbidden' }, 403);
    const env = (ctx.locals as any).runtime?.env ?? {};
    if (!env.DB) return json({ error: 'Database is not connected.' }, 500);
    try {
      const out = await handler({ ctx, db: env.DB, media: env.MEDIA });
      return out instanceof Response ? out : json(out ?? { ok: true });
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      console.error('[admin]', e);
      return json({ error: 'Something went wrong. Please try again.' }, 500);
    }
  };
}

export async function readJson<T = any>(ctx: APIContext): Promise<T> {
  try {
    return (await ctx.request.json()) as T;
  } catch {
    throw new HttpError(400, 'Invalid request');
  }
}
