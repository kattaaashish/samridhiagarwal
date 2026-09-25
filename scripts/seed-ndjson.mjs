#!/usr/bin/env node
/**
 * Converts seed/content.json into seed/out/seed.ndjson for `sanity dataset import`.
 * Local placeholder images become uploaded Sanity image assets via `_sanityAsset`.
 * Local placeholder videos are dropped (add Cloudflare Stream IDs in the Studio later).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const docs = JSON.parse(readFileSync(resolve(root, 'seed/content.json'), 'utf8'));

function convert(node) {
  if (Array.isArray(node)) return node.map(convert);
  if (!node || typeof node !== 'object') return node;
  const out = {};
  for (const [k, v] of Object.entries(node)) {
    if (k === '_gen' || k === 'localVideo') continue;
    out[k] = convert(v);
  }
  if (node._type === 'image' && node.localSrc) {
    const file = resolve(root, 'public', `.${node.localSrc}.jpg`);
    if (!existsSync(file)) console.warn('missing placeholder, run `pnpm media:gen` first:', file);
    delete out.localSrc; delete out.width; delete out.height;
    out._sanityAsset = `image@file://${file}`;
  }
  return out;
}

mkdirSync(resolve(root, 'seed/out'), { recursive: true });
const lines = docs.map((d) => JSON.stringify(convert(d)));
writeFileSync(resolve(root, 'seed/out/seed.ndjson'), lines.join('\n') + '\n');
console.log(`Wrote ${lines.length} documents to seed/out/seed.ndjson`);
