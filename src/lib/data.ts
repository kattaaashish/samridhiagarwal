/**
 * Single entry point for content. Pages call `getSite(Astro.locals)`.
 *
 * With the Cloudflare `DB` binding (production, `wrangler dev`, `astro dev` via the platform
 * proxy) it reads every published document from D1, once per request. Without it (unit tests,
 * tooling) it falls back to seed/content.json.
 */
import type { D1Database } from '@cloudflare/workers-types';
import { normalize } from './normalize';
import type { Site } from './types';
import seed from '../../seed/content.json';

type Locals = { runtime?: { env?: { DB?: D1Database } }; site?: Promise<Site> };

let seedSite: Site | undefined;

export async function loadPublishedDocs(db: D1Database): Promise<any[]> {
  const { results } = await db.prepare('SELECT published FROM documents WHERE published IS NOT NULL').all<{ published: string }>();
  return results.map((r) => JSON.parse(r.published));
}

export function getSite(locals: unknown): Promise<Site> {
  const l = (locals ?? {}) as Locals;
  const db = l.runtime?.env?.DB;
  if (!db) return Promise.resolve((seedSite ??= normalize(seed as any)));
  l.site ??= loadPublishedDocs(db).then((docs) => normalize(docs));
  return l.site;
}
