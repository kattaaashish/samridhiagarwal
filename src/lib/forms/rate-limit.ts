import type { KVNamespace } from '@cloudflare/workers-types';
/** Fixed-window per-IP rate limit in KV. Falls back to process memory in dev. */
const memory = new Map<string, { n: number; exp: number }>();

export async function rateLimit(kv: KVNamespace | undefined, key: string, limit = 5, windowSec = 600): Promise<boolean> {
  const now = Date.now();
  if (!kv) {
    const cur = memory.get(key);
    if (!cur || cur.exp < now) { memory.set(key, { n: 1, exp: now + windowSec * 1000 }); return true; }
    cur.n++;
    return cur.n <= limit;
  }
  const bucket = Math.floor(now / (windowSec * 1000));
  const k = `rl:${key}:${bucket}`;
  const n = Number((await kv.get(k)) ?? 0) + 1;
  await kv.put(k, String(n), { expirationTtl: windowSec + 60 });
  return n <= limit;
}
