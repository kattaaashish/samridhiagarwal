/** Pages are rendered by the Worker, so public/_headers (static assets only) doesn't reach them. */
import { defineMiddleware } from 'astro:middleware';

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export const onRequest = defineMiddleware(async (_ctx, next) => {
  let res = await next();
  const missing = Object.entries(SECURITY_HEADERS).filter(([k]) => !res.headers.has(k));
  if (!missing.length) return res;
  // Some responses (e.g. Response.redirect) have immutable headers; copy those first.
  try {
    for (const [k, v] of missing) res.headers.set(k, v);
  } catch {
    res = new Response(res.body, res);
    for (const [k, v] of missing) res.headers.set(k, v);
  }
  return res;
});
