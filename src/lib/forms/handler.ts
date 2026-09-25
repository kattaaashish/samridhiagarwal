/**
 * Shared request pipeline for all form endpoints:
 *  parse → honeypot → Turnstile → rate limit → zod validate → handler → JSON or redirect.
 */
import type { APIContext } from 'astro';
import type { ZodType } from 'zod';
import { clientIp, formEnv, type FormEnv } from './env';
import { rateLimit } from './rate-limit';
import { verifyTurnstile } from './turnstile';

export interface HandlerResult { ok: boolean; message: string; status?: number }

const wantsJson = (req: Request) => (req.headers.get('accept') ?? '').includes('application/json');

function respond(ctx: APIContext, formName: string, result: HandlerResult, redirectTo: string) {
  if (wantsJson(ctx.request)) {
    return new Response(JSON.stringify({ ok: result.ok, message: result.message }), {
      status: result.status ?? (result.ok ? 200 : 400),
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
  // No-JS path: static pages can't read query params at build time, so land on the
  // on-demand /sent page, which links back to where the visitor came from.
  const url = new URL('/sent', ctx.url);
  url.searchParams.set('form', formName);
  url.searchParams.set('back', redirectTo);
  if (!result.ok) url.searchParams.set('error', result.message);
  return Response.redirect(url.toString(), 303);
}

export function formEndpoint<T>(
  formName: string,
  schema: ZodType<T>,
  handle: (data: T, form: FormData, env: FormEnv, ctx: APIContext) => Promise<HandlerResult>,
  opts: { limit?: number; windowSec?: number } = {},
) {
  return async (ctx: APIContext): Promise<Response> => {
    const env = formEnv(ctx);
    let form: FormData;
    try {
      form = await ctx.request.formData();
    } catch {
      return respond(ctx, formName, { ok: false, message: 'Could not read the form. Please try again.' }, '/');
    }
    const redirectTo = String(form.get('_redirect') ?? '/').replace(/[^\w\-\/]/g, '') || '/';

    // Honeypot: real users never fill this.
    if (String(form.get('website') ?? '').trim()) return respond(ctx, formName, { ok: true, message: 'Thank you.' }, redirectTo);

    const ip = clientIp(ctx.request);
    const ts = await verifyTurnstile(form.get('cf-turnstile-response') as string | null, env.TURNSTILE_SECRET_KEY, ip);
    if (!ts.ok) return respond(ctx, formName, { ok: false, message: ts.reason!, status: 403 }, redirectTo);

    if (!(await rateLimit(env.RATE_LIMIT, `${formName}:${ip}`, opts.limit ?? 5, opts.windowSec ?? 600)))
      return respond(ctx, formName, { ok: false, message: 'Too many messages from this connection. Please try again in a few minutes.', status: 429 }, redirectTo);

    const raw: Record<string, unknown> = {};
    for (const [k, v] of form.entries()) if (typeof v === 'string') raw[k] = v.trim();
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return respond(ctx, formName, { ok: false, message: first ? `${labelFor(String(first.path[0] ?? ''))}: ${first.message}` : 'Please check the form.' }, redirectTo);
    }
    try {
      const result = await handle(parsed.data, form, env, ctx);
      return respond(ctx, formName, result, redirectTo);
    } catch (e) {
      console.error(`[forms:${formName}]`, e);
      return respond(ctx, formName, { ok: false, message: 'Something went wrong on my side. Please try again or WhatsApp me.', status: 500 }, redirectTo);
    }
  };
}

const labelFor = (field: string) => field.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
