/**
 * Content documents in D1 (table `documents`, see migrations/). Each row keeps the
 * published JSON the site reads and, separately, an unpublished draft being edited in /admin.
 */
import type { D1Database } from '@cloudflare/workers-types';
import { CONTENT_TYPES, SINGLETONS, slugSource, type ContentType } from '@/admin/schema';

export interface DocRow {
  id: string;
  type: ContentType;
  draft: Record<string, any> | null;
  published: Record<string, any> | null;
  updatedAt: string;
  publishedAt: string | null;
}

const parse = (r: any): DocRow => ({
  id: r.id,
  type: r.type,
  draft: r.draft ? JSON.parse(r.draft) : null,
  published: r.published ? JSON.parse(r.published) : null,
  updatedAt: r.updated_at,
  publishedAt: r.published_at,
});

export const isContentType = (t: unknown): t is ContentType => typeof t === 'string' && (CONTENT_TYPES as readonly string[]).includes(t);

export async function listDocs(db: D1Database, type: ContentType): Promise<DocRow[]> {
  const { results } = await db.prepare('SELECT * FROM documents WHERE type = ? ORDER BY updated_at DESC').bind(type).all();
  return results.map(parse);
}

export async function getDoc(db: D1Database, id: string): Promise<DocRow | null> {
  const r = await db.prepare('SELECT * FROM documents WHERE id = ?').bind(id).first();
  return r ? parse(r) : null;
}

/** Create or replace the draft. The stored JSON always carries the row's _id and _type. */
export async function saveDraft(db: D1Database, id: string, type: ContentType, draft: Record<string, any>): Promise<DocRow> {
  const doc = JSON.stringify({ ...draft, _id: id, _type: type });
  await db
    .prepare(
      `INSERT INTO documents (id, type, draft) VALUES (?1, ?2, ?3)
       ON CONFLICT(id) DO UPDATE SET draft = ?3, updated_at = datetime('now')`,
    )
    .bind(id, type, doc)
    .run();
  return (await getDoc(db, id))!;
}

export function slugify(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** First free slug among the other documents of the same type: "chai", "chai-2", … */
export function uniqueSlug(wanted: string, taken: Set<string>): string {
  const base = slugify(wanted) || 'untitled';
  let s = base;
  for (let i = 2; taken.has(s); i++) s = `${base}-${i}`;
  return s;
}

export async function publishDoc(db: D1Database, id: string): Promise<DocRow> {
  const row = await getDoc(db, id);
  if (!row) throw new HttpError(404, 'Not found');
  const doc: Record<string, any> = { ...(row.draft ?? row.published ?? {}), _id: id, _type: row.type };
  const source = slugSource(row.type);
  if (source && !SINGLETONS.has(row.type)) {
    const others = (await listDocs(db, row.type)).filter((r) => r.id !== id);
    const taken = new Set(others.flatMap((r) => [r.published?.slug?.current, r.draft?.slug?.current]).filter(Boolean));
    doc.slug = { current: uniqueSlug(doc.slug?.current || doc[source] || id, taken) };
  }
  await db
    .prepare(`UPDATE documents SET published = ?2, draft = NULL, published_at = datetime('now'), updated_at = datetime('now') WHERE id = ?1`)
    .bind(id, JSON.stringify(doc))
    .run();
  return (await getDoc(db, id))!;
}

/** Take a document off the site but keep its content as a draft. */
export async function unpublishDoc(db: D1Database, id: string): Promise<DocRow> {
  await db
    .prepare(`UPDATE documents SET draft = COALESCE(draft, published), published = NULL, published_at = NULL, updated_at = datetime('now') WHERE id = ?`)
    .bind(id)
    .run();
  return (await getDoc(db, id))!;
}

/** Throw away unpublished edits (only when a published version exists to fall back to). */
export async function discardDraft(db: D1Database, id: string): Promise<DocRow> {
  await db.prepare(`UPDATE documents SET draft = NULL, updated_at = datetime('now') WHERE id = ? AND published IS NOT NULL`).bind(id).run();
  return (await getDoc(db, id))!;
}

/**
 * Delete a document. References to it (e.g. artworks in a deleted collection) are left as
 * they are; normalize() drops references that don't resolve, so the artworks stay live.
 */
export async function deleteDoc(db: D1Database, id: string): Promise<void> {
  if (SINGLETONS.has(id as ContentType)) throw new HttpError(400, 'Settings pages cannot be deleted');
  await db.prepare('DELETE FROM documents WHERE id = ?').bind(id).run();
}

/** Display order: applied to both the draft and the published version, live immediately. */
export async function reorder(db: D1Database, type: ContentType, ids: string[]): Promise<void> {
  const stmts = ids.map((id, i) => {
    const rank = String(i).padStart(5, '0');
    return db
      .prepare(
        `UPDATE documents SET
           published = CASE WHEN published IS NULL THEN NULL ELSE json_set(published, '$.orderRank', ?3) END,
           draft = CASE WHEN draft IS NULL THEN NULL ELSE json_set(draft, '$.orderRank', ?3) END
         WHERE id = ?1 AND type = ?2`,
      )
      .bind(id, type, rank);
  });
  if (stmts.length) await db.batch(stmts);
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
