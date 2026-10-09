/** GET ?type=artwork → list. POST { type, draft } → create a new draft. */
import { adminRoute, readJson } from '@/lib/admin/http';
import { HttpError, isContentType, listDocs, saveDraft } from '@/lib/admin/store';
import { SINGLETONS } from '@/admin/schema';

export const prerender = false;

export const GET = adminRoute(async ({ ctx, db }) => {
  const type = ctx.url.searchParams.get('type');
  if (!isContentType(type)) throw new HttpError(400, 'Unknown type');
  return { docs: await listDocs(db, type) };
});

export const POST = adminRoute(async ({ ctx, db }) => {
  const { type, draft } = await readJson(ctx);
  if (!isContentType(type) || SINGLETONS.has(type)) throw new HttpError(400, 'Unknown type');
  // New items go to the end of ordered lists until they are dragged.
  const doc = { orderRank: `z${Date.now()}`, ...(draft ?? {}) };
  return { doc: await saveDraft(db, crypto.randomUUID(), type, doc) };
});
