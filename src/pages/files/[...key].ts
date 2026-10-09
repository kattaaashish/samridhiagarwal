/**
 * Public media uploaded in /admin, streamed from the MEDIA R2 bucket.
 * Keys are content-unique and never overwritten, so responses are cached as immutable.
 * Supports Range requests (Safari needs them to play <video>).
 */
import type { APIRoute } from 'astro';
import type { R2Bucket } from '@cloudflare/workers-types';

export const prerender = false;

export const GET: APIRoute = async ({ params, request, locals }) => {
  const bucket = (locals as any).runtime?.env?.MEDIA as R2Bucket | undefined;
  const key = params.key ?? '';
  if (!bucket || !/^[\w\-./]+$/.test(key) || key.includes('..')) return new Response('Not found', { status: 404 });

  const range = parseRange(request.headers.get('range'));
  const obj = await bucket.get(key, range ? { range } : undefined);
  if (!obj) return new Response('Not found', { status: 404 });

  const headers = new Headers({
    'Content-Type': obj.httpMetadata?.contentType ?? 'application/octet-stream',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Accept-Ranges': 'bytes',
    ETag: obj.httpEtag,
  });
  if (request.headers.get('if-none-match') === obj.httpEtag) return new Response(null, { status: 304, headers });
  if (range && 'range' in obj && obj.range) {
    const r = obj.range as { offset?: number; length?: number; suffix?: number };
    const offset = r.suffix != null ? Math.max(0, obj.size - r.suffix) : r.offset ?? 0;
    const length = r.suffix != null ? obj.size - offset : r.length ?? obj.size - offset;
    headers.set('Content-Range', `bytes ${offset}-${offset + length - 1}/${obj.size}`);
    headers.set('Content-Length', String(length));
    return new Response(obj.body as unknown as ReadableStream, { status: 206, headers });
  }
  headers.set('Content-Length', String(obj.size));
  return new Response(obj.body as unknown as ReadableStream, { headers });
};

function parseRange(h: string | null): { offset: number; length?: number } | { suffix: number } | undefined {
  const m = h && /^bytes=(\d*)-(\d*)$/.exec(h.trim());
  if (!m || (!m[1] && !m[2])) return undefined;
  if (!m[1]) return { suffix: Number(m[2]) };
  const offset = Number(m[1]);
  return m[2] ? { offset, length: Number(m[2]) - offset + 1 } : { offset };
}
