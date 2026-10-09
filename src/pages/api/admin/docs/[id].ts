/** GET one document · PUT { draft } saves the draft · DELETE removes it. */
import { adminRoute, readJson } from '@/lib/admin/http';
import { HttpError, deleteDoc, getDoc, isContentType, saveDraft } from '@/lib/admin/store';
import { SINGLETONS } from '@/admin/schema';

export const prerender = false;

const ID = /^[\w.-]{1,64}$/;

export const GET = adminRoute(async ({ ctx, db }) => {
  const id = ctx.params.id!;
  if (!ID.test(id)) throw new HttpError(404, 'Not found');
  const doc = await getDoc(db, id);
  // Settings pages exist from the start, even before their first save.
  if (!doc && SINGLETONS.has(id as any)) return { doc: { id, type: id, draft: null, published: null, updatedAt: '', publishedAt: null } };
  if (!doc) throw new HttpError(404, 'Not found');
  return { doc };
});

export const PUT = adminRoute(async ({ ctx, db }) => {
  const id = ctx.params.id!;
  if (!ID.test(id)) throw new HttpError(404, 'Not found');
  const { draft } = await readJson(ctx);
  if (!draft || typeof draft !== 'object') throw new HttpError(400, 'Invalid draft');
  const existing = await getDoc(db, id);
  const type = existing?.type ?? (SINGLETONS.has(id as any) ? id : null);
  if (!isContentType(type)) throw new HttpError(404, 'Not found');
  return { doc: await saveDraft(db, id, type, draft) };
});

export const DELETE = adminRoute(async ({ ctx, db }) => {
  const id = ctx.params.id!;
  if (!ID.test(id)) throw new HttpError(404, 'Not found');
  await deleteDoc(db, id);
  return { ok: true };
});
