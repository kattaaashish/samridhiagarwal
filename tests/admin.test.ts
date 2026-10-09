/** Pure pieces of the /admin back end: slugs, sessions, required fields, uploaded-image URLs. */
import { describe, it, expect } from 'vitest';
import { slugify, uniqueSlug } from '@/lib/admin/store';
import { createSession, verifySession } from '@/lib/admin/auth';
import { missingRequired, emptyDoc, TYPES, CONTENT_TYPES } from '@/admin/schema';
import { toImageSource, toMediaRef } from '@/lib/media';

describe('slugs', () => {
  it('makes readable web addresses', () => {
    expect(slugify('Chai at Six')).toBe('chai-at-six');
    expect(slugify('  Diwali & Dhanteras! ')).toBe('diwali-and-dhanteras');
    expect(slugify('Café Noël')).toBe('cafe-noel');
  });
  it('never reuses a taken slug', () => {
    expect(uniqueSlug('Golden hour', new Set())).toBe('golden-hour');
    expect(uniqueSlug('Golden hour', new Set(['golden-hour', 'golden-hour-2']))).toBe('golden-hour-3');
    expect(uniqueSlug('!!!', new Set())).toBe('untitled');
  });
});

describe('admin session', () => {
  it('accepts its own cookie and rejects tampering, other secrets and expiry', async () => {
    const now = Date.UTC(2026, 9, 9);
    const { value, maxAge } = await createSession('secret-a', now);
    expect(await verifySession('secret-a', value, now + 1000)).toBe(true);
    expect(await verifySession('secret-b', value, now + 1000)).toBe(false);
    expect(await verifySession('secret-a', value.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A')), now)).toBe(false);
    expect(await verifySession('secret-a', `${now + 10 ** 12}.${value.split('.')[1]}`, now)).toBe(false);
    expect(await verifySession('secret-a', value, now + maxAge * 1000 + 1)).toBe(false);
    expect(await verifySession(undefined, value, now)).toBe(false);
  });
});

describe('content types', () => {
  it('blocks publishing an artwork until the essentials are filled in', () => {
    const draft = { ...emptyDoc('artwork'), title: 'Golden hour', media: [] };
    expect(missingRequired('artwork', draft)).toEqual(['The moment behind the piece', 'Price (INR)', 'Width (cm)', 'Height (cm)', 'Photos & video']);
    const done = { ...draft, note: 'Light.', price: 0, width: 30, height: 40, media: [{}] };
    expect(missingRequired('artwork', done)).toEqual([]);
  });
  it('defaults new artworks to available and new collections to visible', () => {
    expect(emptyDoc('artwork').status).toBe('available');
    expect(emptyDoc('collection').visible).toBe(true);
  });
  it('lets collections and occasions be reordered, nothing else', () => {
    expect(CONTENT_TYPES.filter((t) => TYPES[t].orderable)).toEqual(['collection', 'occasion']);
  });
});

describe('uploaded media', () => {
  const image = { r2: 'site/abc', ext: 'webp', widths: [480, 960, 1440, 2048], width: 3000, height: 2000 };
  it('builds a srcset from the stored sizes and uses ≤1440 as the default', () => {
    const src = toImageSource(image)!;
    expect(src.src).toBe('/files/site/abc-1440.webp');
    expect(src.small).toBe('/files/site/abc-480.webp');
    expect(src.srcset).toContain('/files/site/abc-2048.webp 2048w');
    expect(src.width / src.height).toBeCloseTo(1.5);
  });
  it('keeps a small image at its own size', () => {
    expect(toImageSource({ ...image, widths: [400], width: 400, height: 500 })!.src).toBe('/files/site/abc-400.webp');
  });
  it('turns a focus point into object-position and serves uploaded video', () => {
    const m = toMediaRef({ image: { ...image, hotspot: { x: 0.25, y: 0.3 } }, video: { r2: 'site/v.mp4' }, alt: 'x' })!;
    expect(m.focus).toBe('25% 30%');
    expect(m.video?.mp4).toBe('/files/site/v.mp4');
  });
});
