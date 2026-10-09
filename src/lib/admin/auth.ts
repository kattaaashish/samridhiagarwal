/**
 * /admin login: one password (ADMIN_PASSWORD secret) → a signed, HttpOnly session cookie.
 * Cookie value is `<expiresMs>.<hmac>`, HMAC-SHA256 over the expiry with SESSION_SECRET.
 */
import type { AstroCookies } from 'astro';

export const SESSION_COOKIE = 'admin_session';
const SESSION_DAYS = 30;
const enc = new TextEncoder();

export interface AdminEnv {
  ADMIN_PASSWORD?: string;
  SESSION_SECRET?: string;
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Constant-time string comparison (compares SHA-256 digests so lengths never leak). */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const [x, y] = await Promise.all([a, b].map((s) => crypto.subtle.digest('SHA-256', enc.encode(s))));
  const ua = new Uint8Array(x), ub = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < ua.length; i++) diff |= ua[i] ^ ub[i];
  return diff === 0;
}

export async function createSession(secret: string, now = Date.now()): Promise<{ value: string; maxAge: number }> {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  const exp = String(now + maxAge * 1000);
  return { value: `${exp}.${await hmac(secret, exp)}`, maxAge };
}

export async function verifySession(secret: string | undefined, value: string | undefined, now = Date.now()): Promise<boolean> {
  if (!secret || !value) return false;
  const [exp, sig] = value.split('.');
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < now) return false;
  return safeEqual(sig, await hmac(secret, exp));
}

export function adminEnv(locals: unknown): AdminEnv {
  const runtime = (locals as any)?.runtime?.env ?? {};
  const e = import.meta.env as Record<string, string | undefined>;
  return { ADMIN_PASSWORD: runtime.ADMIN_PASSWORD ?? e.ADMIN_PASSWORD, SESSION_SECRET: runtime.SESSION_SECRET ?? e.SESSION_SECRET };
}

export async function isAdmin(locals: unknown, cookies: AstroCookies): Promise<boolean> {
  return verifySession(adminEnv(locals).SESSION_SECRET, cookies.get(SESSION_COOKIE)?.value);
}
