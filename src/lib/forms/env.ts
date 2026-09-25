import type { APIContext } from 'astro';
import type { KVNamespace, R2Bucket } from '@cloudflare/workers-types';

export interface FormEnv {
  TURNSTILE_SECRET_KEY?: string;
  RESEND_API_KEY?: string;
  NOTIFY_EMAIL?: string;
  FROM_EMAIL?: string;
  PUBLIC_SITE_URL?: string;
  RATE_LIMIT?: KVNamespace;
  SUBSCRIBERS?: KVNamespace;
  UPLOADS?: R2Bucket;
  UPLOADS_PUBLIC_URL?: string;
}

/** Cloudflare bindings + secrets, falling back to import.meta.env for `astro dev`. */
export function formEnv(ctx: APIContext): FormEnv {
  const runtime = (ctx.locals as any).runtime?.env ?? {};
  const e = import.meta.env as Record<string, string | undefined>;
  return {
    TURNSTILE_SECRET_KEY: runtime.TURNSTILE_SECRET_KEY ?? e.TURNSTILE_SECRET_KEY,
    RESEND_API_KEY: runtime.RESEND_API_KEY ?? e.RESEND_API_KEY,
    NOTIFY_EMAIL: runtime.NOTIFY_EMAIL ?? e.NOTIFY_EMAIL,
    FROM_EMAIL: runtime.FROM_EMAIL ?? e.FROM_EMAIL,
    PUBLIC_SITE_URL: runtime.PUBLIC_SITE_URL ?? e.PUBLIC_SITE_URL,
    UPLOADS_PUBLIC_URL: runtime.UPLOADS_PUBLIC_URL ?? e.UPLOADS_PUBLIC_URL,
    RATE_LIMIT: runtime.RATE_LIMIT,
    SUBSCRIBERS: runtime.SUBSCRIBERS,
    UPLOADS: runtime.UPLOADS,
  };
}

export const clientIp = (req: Request) =>
  req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
