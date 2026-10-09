#!/usr/bin/env node
/**
 * Writes seed/out/seed.sql: every document in seed/content.json as a published row of the
 * D1 `documents` table. Existing rows with the same id are left untouched (INSERT OR IGNORE),
 * so re-running never overwrites edits made in /admin.
 *   pnpm db:seed:local   → local wrangler D1
 *   pnpm db:seed:remote  → production D1 (first set-up only)
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';

const docs = JSON.parse(readFileSync(new URL('../seed/content.json', import.meta.url), 'utf8'));
const strip = (v) => {
  if (Array.isArray(v)) return v.map(strip);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).filter(([k]) => k !== '_gen').map(([k, x]) => [k, strip(x)]));
  return v;
};
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const lines = docs
  .filter((d) => !d._id.startsWith('drafts.'))
  .map((d) => `INSERT OR IGNORE INTO documents (id, type, published, published_at) VALUES (${q(d._id)}, ${q(d._type)}, ${q(JSON.stringify(strip(d)))}, datetime('now'));`);
mkdirSync(new URL('../seed/out/', import.meta.url), { recursive: true });
writeFileSync(new URL('../seed/out/seed.sql', import.meta.url), lines.join('\n') + '\n');
console.log(`Wrote ${lines.length} documents to seed/out/seed.sql`);
