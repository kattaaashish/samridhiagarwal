/**
 * Proves the CMS-driven behaviour: adding, renaming, reordering, hiding and deleting a
 * collection or occasion updates nav data, filters and artwork groupings, and never orphans
 * or drops an artwork.
 */
import { describe, it, expect } from 'vitest';
import { normalize, artworksIn, seasonalOccasions, relatedArtworks } from '@/lib/normalize';
import seed from '../seed/content.json';

const clone = () => JSON.parse(JSON.stringify(seed)) as any[];
const TODAY = new Date('2026-09-25');

describe('seed content', () => {
  it('normalises fully with every artwork present', () => {
    const site = normalize(clone(), { today: TODAY });
    expect(site.collections.map((c) => c.name)).toEqual(['Everyday Moments', 'Quiet Thoughts', 'Big Feelings', 'Home and Belonging', 'Celebrations']);
    expect(site.occasions.map((o) => o.name)).toEqual(['Diwali', 'Weddings', 'Griha Pravesh', 'Raksha Bandhan', 'Anniversaries', 'Birthdays']);
    expect(site.artworks).toHaveLength(11);
    expect(site.exhibitions).toHaveLength(2);
    expect(site.posts).toHaveLength(3);
    expect(site.testimonials).toHaveLength(4);
    for (const a of site.artworks) expect(a.media.length).toBeGreaterThan(0);
  });

  it('derives upcoming/past exhibitions from dates, newest first', () => {
    const site = normalize(clone(), { today: TODAY });
    expect(site.exhibitions[0].name).toBe('Gold in the Ordinary');
    expect(site.exhibitions[0].upcoming).toBe(true);
    expect(site.exhibitions[1].upcoming).toBe(false);
  });

  it('features seasonal occasions within ~6 weeks', () => {
    const site = normalize(clone(), { today: TODAY });
    expect(seasonalOccasions(site, TODAY).map((o) => o.name)).toEqual(['Diwali']);
    expect(seasonalOccasions(site, new Date('2026-06-01')).map((o) => o.name)).toEqual([]);
    expect(seasonalOccasions(site, new Date('2026-12-01')).map((o) => o.name)).toEqual(['Weddings']);
  });
});

describe('collections: add / rename / reorder / hide / delete', () => {
  it('add: a new collection appears in nav order with its artworks', () => {
    const docs = clone();
    docs.push({ _id: 'collection.new', _type: 'collection', name: 'Monsoon', slug: { current: 'monsoon' }, visible: true, orderRank: '0|a00000!' });
    const art = docs.find((d) => d._id === 'artwork.after-the-rain-balcony');
    art.collections.push({ _type: 'reference', _ref: 'collection.new', _weak: true, _key: 'cX' });
    const site = normalize(docs, { today: TODAY });
    expect(site.collections[0].name).toBe('Monsoon');
    expect(artworksIn(site, 'collection', 'collection.new').map((a) => a.slug)).toEqual(['after-the-rain-balcony']);
  });

  it('rename: name and slug flow through to artworks', () => {
    const docs = clone();
    const c = docs.find((d) => d._id === 'collection.big-feelings');
    c.name = 'Loud Feelings'; c.slug = { current: 'loud-feelings' };
    const site = normalize(docs, { today: TODAY });
    const art = site.artworks.find((a) => a.slug === 'marigold-morning')!;
    expect(art.collections.map((x) => x.slug)).toContain('loud-feelings');
    expect(site.collections.find((x) => x.id === 'collection.big-feelings')!.name).toBe('Loud Feelings');
  });

  it('reorder: orderRank drives order everywhere', () => {
    const docs = clone();
    docs.find((d) => d._id === 'collection.celebrations').orderRank = '0|000000:';
    const site = normalize(docs, { today: TODAY });
    expect(site.collections[0].name).toBe('Celebrations');
  });

  it('hide: hidden collection vanishes from nav and artwork chips; artworks stay', () => {
    const docs = clone();
    docs.find((d) => d._id === 'collection.everyday-moments').visible = false;
    const site = normalize(docs, { today: TODAY });
    expect(site.collections.map((c) => c.id)).not.toContain('collection.everyday-moments');
    expect(site.artworks).toHaveLength(11);
    const chai = site.artworks.find((a) => a.slug === 'chai-at-six')!;
    expect(chai.collections.map((c) => c.id)).toEqual(['collection.quiet-thoughts']);
  });

  it('delete: dangling weak references are dropped, nothing orphaned or unpublished', () => {
    const docs = clone().filter((d) => d._id !== 'collection.home-and-belonging');
    const site = normalize(docs, { today: TODAY });
    expect(site.collections).toHaveLength(4);
    expect(site.artworks).toHaveLength(11);
    const firstNight = site.artworks.find((a) => a.slug === 'first-night-new-house')!;
    expect(firstNight.collections).toEqual([]); // only grouping was deleted → simply ungrouped
    expect(firstNight.occasions.length).toBeGreaterThan(0); // occasions untouched
    expect(relatedArtworks(site, firstNight).length).toBeGreaterThan(0); // still related via occasions
  });

  it('zero collections: site still normalises, artworks intact', () => {
    const docs = clone().filter((d) => d._type !== 'collection');
    const site = normalize(docs, { today: TODAY });
    expect(site.collections).toEqual([]);
    expect(site.artworks).toHaveLength(11);
    for (const a of site.artworks) expect(a.collections).toEqual([]);
  });
});

describe('occasions: add / rename / reorder / hide / delete', () => {
  it('add with season → appears and can be featured', () => {
    const docs = clone();
    docs.push({ _id: 'occasion.new', _type: 'occasion', name: 'Navratri', slug: { current: 'navratri' }, visible: true, orderRank: '0|a00000!', seasonStart: '2026-10-01', seasonEnd: '2026-10-12' });
    const site = normalize(docs, { today: TODAY });
    expect(site.occasions[0].name).toBe('Navratri');
    expect(seasonalOccasions(site, TODAY).map((o) => o.name)).toEqual(['Navratri', 'Diwali']);
  });

  it('rename + reorder', () => {
    const docs = clone();
    const o = docs.find((d) => d._id === 'occasion.birthdays');
    o.name = 'Birthdays & Milestones'; o.orderRank = '0|000000:';
    const site = normalize(docs, { today: TODAY });
    expect(site.occasions[0].name).toBe('Birthdays & Milestones');
    expect(site.artworks.find((a) => a.slug === 'two-threads')!.occasions.map((x) => x.name)).toContain('Birthdays & Milestones');
  });

  it('hide and delete never affect artworks', () => {
    const docs = clone();
    docs.find((d) => d._id === 'occasion.diwali').visible = false;
    const withoutWeddings = docs.filter((d) => d._id !== 'occasion.weddings');
    const site = normalize(withoutWeddings, { today: TODAY });
    expect(site.occasions.map((o) => o.id)).not.toContain('occasion.diwali');
    expect(site.occasions.map((o) => o.id)).not.toContain('occasion.weddings');
    expect(site.artworks).toHaveLength(11);
    const marigold = site.artworks.find((a) => a.slug === 'marigold-morning')!;
    expect(marigold.occasions.map((o) => o.id)).toEqual(['occasion.anniversaries']);
    expect(marigold.collections.length).toBe(2);
    expect(seasonalOccasions(site, TODAY)).toEqual([]);
  });

  it('twenty occasions are all listed in order', () => {
    const docs = clone().filter((d) => d._type !== 'occasion');
    for (let i = 0; i < 20; i++) docs.push({ _id: `occasion.${i}`, _type: 'occasion', name: `Occasion ${String(i).padStart(2, '0')}`, slug: { current: `o-${i}` }, visible: true, orderRank: `0|a${String(i).padStart(5, '0')}:` });
    const site = normalize(docs, { today: TODAY });
    expect(site.occasions).toHaveLength(20);
    expect(site.occasions[19].name).toBe('Occasion 19');
  });
});

describe('robustness', () => {
  it('ignores drafts and tolerates missing fields', () => {
    const docs = clone();
    docs.push({ _id: 'drafts.artwork.x', _type: 'artwork', title: 'Draft' });
    docs.push({ _id: 'artwork.broken', _type: 'artwork', title: 'Broken', media: [{ _type: 'media', alt: 'x', image: { _type: 'image', localSrc: '/media/x', width: 100, height: 100 } }], collections: [{ _ref: 'collection.does-not-exist' }, null, {}] });
    const site = normalize(docs, { today: TODAY });
    expect(site.artworks.find((a) => a.title === 'Draft')).toBeUndefined();
    const broken = site.artworks.find((a) => a.title === 'Broken')!;
    expect(broken.collections).toEqual([]);
    expect(broken.status).toBe('available');
  });
});
