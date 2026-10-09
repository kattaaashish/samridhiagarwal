/** POST publish | unpublish | discard */
import { adminRoute } from '@/lib/admin/http';
import { HttpError, discardDraft, getDoc, publishDoc, unpublishDoc } from '@/lib/admin/store';
import { missingRequired } from '@/admin/schema';

export const prerender = false;

export const POST = adminRoute(async ({ ctx, db }) => {
  const { id, action } = ctx.params as { id: string; action: string };
  const row = await getDoc(db, id);
  if (!row) throw new HttpError(404, 'Not found');
  if (action === 'publish') {
    const missing = missingRequired(row.type, row.draft ?? row.published ?? {});
    if (missing.length) throw new HttpError(422, `Please fill in: ${missing.join(', ')}`);
    return { doc: await publishDoc(db, id) };
  }
  if (action === 'unpublish') return { doc: await unpublishDoc(db, id) };
  if (action === 'discard') return { doc: await discardDraft(db, id) };
  throw new HttpError(404, 'Not found');
});
