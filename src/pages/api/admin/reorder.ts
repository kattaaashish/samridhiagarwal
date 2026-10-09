/** POST { type, ids } → display order, live immediately. */
import { adminRoute, readJson } from '@/lib/admin/http';
import { HttpError, isContentType, reorder } from '@/lib/admin/store';
import { TYPES } from '@/admin/schema';

export const prerender = false;

export const POST = adminRoute(async ({ ctx, db }) => {
  const { type, ids } = await readJson(ctx);
  if (!isContentType(type) || !TYPES[type].orderable) throw new HttpError(400, 'This list cannot be reordered');
  if (!Array.isArray(ids) || ids.length > 500 || !ids.every((x) => typeof x === 'string')) throw new HttpError(400, 'Invalid order');
  await reorder(db, type, ids);
  return { ok: true };
});
