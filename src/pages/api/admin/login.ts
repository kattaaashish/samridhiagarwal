import type { APIRoute } from 'astro';
import { SESSION_COOKIE, adminEnv, createSession, safeEqual } from '@/lib/admin/auth';
import { json } from '@/lib/admin/http';
import { clientIp } from '@/lib/forms/env';

export const prerender = false;

const MAX_ATTEMPTS = 8;
const WINDOW_SECONDS = 15 * 60;

export const POST: APIRoute = async (ctx) => {
  const { ADMIN_PASSWORD, SESSION_SECRET } = adminEnv(ctx.locals);
  if (!ADMIN_PASSWORD || !SESSION_SECRET) return json({ error: 'Admin login is not set up yet (ADMIN_PASSWORD / SESSION_SECRET).' }, 503);

  const kv = (ctx.locals as any).runtime?.env?.RATE_LIMIT;
  const key = `admin-login:${clientIp(ctx.request)}`;
  const attempts = Number((await kv?.get(key)) ?? 0);
  if (attempts >= MAX_ATTEMPTS) return json({ error: 'Too many attempts. Please wait 15 minutes and try again.' }, 429);

  let password = '';
  try {
    password = String(((await ctx.request.json()) as any)?.password ?? '');
  } catch {}
  if (!password || !(await safeEqual(password, ADMIN_PASSWORD))) {
    await kv?.put(key, String(attempts + 1), { expirationTtl: WINDOW_SECONDS });
    return json({ error: 'That password is not right.' }, 401);
  }
  await kv?.delete(key);
  const session = await createSession(SESSION_SECRET);
  ctx.cookies.set(SESSION_COOKIE, session.value, { httpOnly: true, secure: ctx.url.protocol === 'https:', sameSite: 'strict', path: '/', maxAge: session.maxAge });
  return json({ ok: true });
};
