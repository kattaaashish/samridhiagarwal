/**
 * Turns an array of raw Sanity-shaped documents (from the API or seed/content.json)
 * into the typed Site model. All references are resolved here by id, so weak/dangling
 * references (deleted collections or occasions) simply drop out and never break a build.
 */
import { toImageSource, toMediaRef } from './media';
import type { Artwork, Collection, Exhibition, MediaRef, Occasion, Post, Site, Taxon, Testimonial } from './types';

type Doc = Record<string, any> & { _id: string; _type: string };

const slugOf = (d: any): string => d?.slug?.current ?? d?.slug ?? '';
const list = <T>(v: T[] | undefined | null): T[] => (Array.isArray(v) ? v : []);
const mediaList = (v: any[] | undefined): MediaRef[] => list(v).map(toMediaRef).filter((m): m is MediaRef => !!m);
const byOrder = (a: Taxon, b: Taxon) => (a.order < b.order ? -1 : a.order > b.order ? 1 : a.name.localeCompare(b.name));

function taxon(d: Doc): Taxon {
  return {
    id: d._id,
    name: d.name ?? 'Untitled',
    slug: slugOf(d) || d._id,
    intro: d.intro,
    cover: toMediaRef(d.cover),
    order: d.orderRank ?? '~',
  };
}

export function normalize(docs: Doc[], opts: { today?: Date } = {}): Site {
  const today = opts.today ?? new Date();
  const published = docs.filter((d) => !d._id.startsWith('drafts.'));
  const byType = (t: string) => published.filter((d) => d._type === t);
  const byId = new Map(published.map((d) => [d._id, d]));

  // Visible taxonomies only. Hidden or deleted → not resolvable → dropped everywhere.
  const collections: Collection[] = byType('collection')
    .filter((d) => d.visible !== false)
    .map(taxon)
    .sort(byOrder);
  const occasions: Occasion[] = byType('occasion')
    .filter((d) => d.visible !== false)
    .map((d) => ({ ...taxon(d), seasonStart: d.seasonStart, seasonEnd: d.seasonEnd }))
    .sort(byOrder);
  const collectionById = new Map(collections.map((c) => [c.id, c]));
  const occasionById = new Map(occasions.map((o) => [o.id, o]));

  const resolveRefs = <T>(refs: any[] | undefined, map: Map<string, T>): T[] =>
    list(refs)
      .map((r) => (r?._ref ? map.get(r._ref) : undefined))
      .filter((x): x is T => !!x);

  const artworks: Artwork[] = byType('artwork')
    .map((d) => ({
      id: d._id,
      title: d.title ?? 'Untitled',
      slug: slugOf(d) || d._id,
      note: d.note ?? '',
      width: Number(d.width) || 0,
      height: Number(d.height) || 0,
      depth: d.depth != null ? Number(d.depth) : undefined,
      materials: d.materials ?? '',
      price: Number(d.price) || 0,
      status: (['available', 'sold', 'made-to-order'].includes(d.status) ? d.status : 'available') as Artwork['status'],
      featured: !!d.featured,
      etsyUrl: d.etsyUrl || undefined,
      collections: resolveRefs(d.collections, collectionById),
      occasions: resolveRefs(d.occasions, occasionById),
      media: mediaList(d.media),
      seoDescription: d.seoDescription,
    }))
    .filter((a) => a.media.length > 0 || import.meta.env?.DEV)
    .sort((a, b) => Number(b.featured) - Number(a.featured) || a.title.localeCompare(b.title));
  const artworkById = new Map(artworks.map((a) => [a.id, a]));

  const exhibitions: Exhibition[] = byType('exhibition')
    .map((d) => {
      const end = d.endDate ?? d.startDate;
      return {
        id: d._id,
        name: d.name ?? 'Untitled',
        slug: slugOf(d) || d._id,
        venue: d.venue ?? '',
        city: d.city ?? '',
        startDate: d.startDate ?? '',
        endDate: end ?? '',
        description: d.description ?? '',
        gallery: mediaList(d.gallery),
        upcoming: !!end && new Date(end + 'T23:59:59') >= today,
      };
    })
    .sort((a, b) => (a.startDate < b.startDate ? 1 : -1));

  const posts: Post[] = byType('post')
    .map((d) => ({
      id: d._id,
      title: d.title ?? 'Untitled',
      slug: slugOf(d) || d._id,
      publishedAt: d.publishedAt ?? '',
      excerpt: d.excerpt ?? '',
      cover: toMediaRef(d.cover),
      artworks: resolveRefs(d.artworks, artworkById),
      body: list(d.body),
    }))
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
  const postById = new Map(posts.map((p) => [p.id, p]));

  const testimonials: Testimonial[] = byType('testimonial').map((d) => ({
    id: d._id,
    name: d.name ?? '',
    city: d.city ?? '',
    quote: d.quote ?? '',
    photo: toMediaRef(d.photo),
  }));

  const s = byId.get('siteSettings') ?? byType('siteSettings')[0] ?? {};
  const settings: Site['settings'] = {
    siteName: s.siteName ?? 'Samridhi Agarwal',
    tagline: s.tagline ?? '',
    statement: s.statement ?? '',
    shortBio: s.shortBio ?? '',
    heroVideos: mediaList(s.heroVideos),
    teaser: s.teaser ? { title: s.teaser.title ?? '', launchDate: s.teaser.launchDate, copy: s.teaser.copy, enabled: s.teaser.enabled !== false } : undefined,
    storyPost: s.storyPost?._ref ? postById.get(s.storyPost._ref) : posts[0],
    whatsappNumber: String(s.whatsappNumber ?? '').replace(/\D/g, ''),
    email: s.email ?? '',
    instagram: s.instagram,
    etsy: s.etsy,
    seoTitle: s.seoTitle ?? s.siteName ?? 'Samridhi Agarwal',
    seoDescription: s.seoDescription ?? '',
    ogImage: toImageSource(s.ogImage),
    footerFaqs: list(s.footerFaqs).map((f: any) => ({ q: f.q ?? '', a: f.a ?? '' })),
  };

  const a = byId.get('aboutPage') ?? byType('aboutPage')[0] ?? {};
  const about: Site['about'] = {
    heading: a.heading ?? 'About',
    intro: a.intro ?? '',
    process: list(a.process).map((p: any) => ({ title: p.title ?? '', text: p.text ?? '' })),
    exampleMoment: a.exampleMoment ?? '',
    exampleArtwork: a.exampleArtwork?._ref ? artworkById.get(a.exampleArtwork._ref) : undefined,
    studioMedia: mediaList(a.studioMedia),
    portrait: toMediaRef(a.portrait),
  };

  const c = byId.get('commissionsPage') ?? byType('commissionsPage')[0] ?? {};
  const commissions: Site['commissions'] = {
    heading: c.heading ?? 'Commissions',
    intro: c.intro ?? '',
    steps: list(c.steps).map((p: any) => ({ title: p.title ?? '', text: p.text ?? '', duration: p.duration })),
    whatToShare: list(c.whatToShare),
    typicalTimeline: c.typicalTimeline ?? '',
    priceGuide: c.priceGuide ?? '',
  };

  return { settings, collections, occasions, artworks, exhibitions, posts, testimonials, about, commissions };
}

/* ---------- Derived helpers used by pages ---------- */

export function artworksIn(site: Site, kind: 'collection' | 'occasion', id: string): Artwork[] {
  return site.artworks.filter((a) => (kind === 'collection' ? a.collections : a.occasions).some((t) => t.id === id));
}

/** Occasions whose seasonal window starts within `weeksAhead` weeks (or is currently open). */
export function seasonalOccasions(site: Site, today = new Date(), weeksAhead = 6): Occasion[] {
  const horizon = new Date(today.getTime() + weeksAhead * 7 * 86400000);
  return site.occasions.filter((o) => {
    if (!o.seasonStart || !o.seasonEnd) return false;
    const start = new Date(o.seasonStart);
    const end = new Date(o.seasonEnd + 'T23:59:59');
    return start <= horizon && end >= today;
  });
}

export function relatedArtworks(site: Site, art: Artwork, limit = 4): Artwork[] {
  const score = (b: Artwork) =>
    b.collections.filter((c) => art.collections.some((x) => x.id === c.id)).length * 2 +
    b.occasions.filter((o) => art.occasions.some((x) => x.id === o.id)).length;
  return site.artworks
    .filter((b) => b.id !== art.id)
    .map((b) => ({ b, s: score(b) }))
    .filter((x) => x.s > 0)
    .sort((x, y) => y.s - x.s)
    .slice(0, limit)
    .map((x) => x.b);
}

export const SIZE_BUCKETS = [
  { id: 'small', label: 'Small (under 50 cm)', test: (a: Artwork) => Math.max(a.width, a.height) < 50 },
  { id: 'medium', label: 'Medium (50 to 90 cm)', test: (a: Artwork) => Math.max(a.width, a.height) >= 50 && Math.max(a.width, a.height) < 90 },
  { id: 'large', label: 'Large (90 cm and up)', test: (a: Artwork) => Math.max(a.width, a.height) >= 90 },
];

export const PRICE_BUCKETS = [
  { id: 'p1', label: 'Under ₹25,000', test: (a: Artwork) => a.price < 25000 },
  { id: 'p2', label: '₹25,000 to ₹50,000', test: (a: Artwork) => a.price >= 25000 && a.price < 50000 },
  { id: 'p3', label: '₹50,000 to ₹1,00,000', test: (a: Artwork) => a.price >= 50000 && a.price < 100000 },
  { id: 'p4', label: 'Over ₹1,00,000', test: (a: Artwork) => a.price >= 100000 },
];
