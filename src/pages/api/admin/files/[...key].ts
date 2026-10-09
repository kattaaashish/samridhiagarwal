/**
 * PUT raw file body → MEDIA bucket. The dashboard resizes images in the browser first and
 * picks a fresh random key per upload; existing keys are never overwritten (served immutable).
 */
import { adminRoute } from '@/lib/admin/http';
import { HttpError } from '@/lib/admin/store';

export const prerender = false;

const KEY = /^site\/[0-9a-f-]{36}(?:-\d{2,4})?\.(webp|jpg|png|mp4|webm|mov)$/;
const TYPES: Record<string, string> = { webp: 'image/webp', jpg: 'image/jpeg', png: 'image/png', mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' };
const MAX_BYTES = 95 * 1024 * 1024; // Workers request body limit is 100 MB

export const PUT = adminRoute(async ({ ctx, media }) => {
  const key = ctx.params.key ?? '';
  const m = KEY.exec(key);
  if (!m) throw new HttpError(400, 'Invalid file name');
  if (!media) throw new HttpError(500, 'Media storage is not connected.');
  const size = Number(ctx.request.headers.get('content-length') ?? 0);
  if (size > MAX_BYTES) throw new HttpError(413, 'That file is over 95 MB. Please trim or compress it.');
  if (await media.head(key)) throw new HttpError(409, 'File already exists');
  const body = await ctx.request.arrayBuffer();
  if (body.byteLength === 0 || body.byteLength > MAX_BYTES) throw new HttpError(413, 'That file is empty or over 95 MB.');
  await media.put(key, body, { httpMetadata: { contentType: TYPES[m[1]] } });
  return { key, url: `/files/${key}` };
});
