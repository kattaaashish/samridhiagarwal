/** Normalised content model consumed by pages. Produced by normalize.ts from Sanity or seed docs. */

export interface ImageSource {
  /** Default src (largest reasonable) */
  src: string;
  /** Responsive candidates, e.g. "url 480w, url 960w" */
  srcset?: string;
  /** Optional modern-format srcset for a <source> element (local placeholders use WebP) */
  modernSrcset?: string;
  modernType?: string;
  /** Small (~480w) variant used for the <video poster> attribute */
  small?: string;
  width: number;
  height: number;
  /** For Sanity images: raw source to build custom crops (OG etc.) */
  sanity?: unknown;
}

export interface VideoSource {
  hls?: string;
  mp4?: string;
}

export interface MediaRef {
  poster: ImageSource;
  video?: VideoSource;
  alt: string;
  /** width / height */
  aspect: number;
}

export interface Taxon {
  id: string;
  name: string;
  slug: string;
  intro?: string;
  cover?: MediaRef;
  order: string;
}

export interface Collection extends Taxon {}

export interface Occasion extends Taxon {
  seasonStart?: string;
  seasonEnd?: string;
}

export type ArtworkStatus = 'available' | 'sold' | 'made-to-order';

export interface Artwork {
  id: string;
  title: string;
  slug: string;
  note: string;
  width: number;
  height: number;
  depth?: number;
  materials: string;
  price: number;
  status: ArtworkStatus;
  featured: boolean;
  etsyUrl?: string;
  collections: Collection[];
  occasions: Occasion[];
  media: MediaRef[];
  seoDescription?: string;
}

export interface Exhibition {
  id: string;
  name: string;
  slug: string;
  venue: string;
  city: string;
  startDate: string;
  endDate: string;
  description: string;
  gallery: MediaRef[];
  upcoming: boolean;
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  publishedAt: string;
  excerpt: string;
  cover?: MediaRef;
  artworks: Artwork[];
  body: unknown[];
}

export interface Testimonial {
  id: string;
  name: string;
  city: string;
  quote: string;
  photo?: MediaRef;
}

export interface Faq { q: string; a: string }

export interface SiteSettings {
  siteName: string;
  tagline: string;
  statement: string;
  shortBio: string;
  heroVideos: MediaRef[];
  teaser?: { title: string; launchDate?: string; copy?: string; enabled: boolean };
  storyPost?: Post;
  whatsappNumber: string;
  email: string;
  instagram?: string;
  etsy?: string;
  seoTitle: string;
  seoDescription: string;
  ogImage?: ImageSource;
  footerFaqs: Faq[];
}

export interface ProcessStep { title: string; text: string; duration?: string }

export interface AboutPage {
  heading: string;
  intro: string;
  process: ProcessStep[];
  exampleMoment: string;
  exampleArtwork?: Artwork;
  studioMedia: MediaRef[];
  portrait?: MediaRef;
}

export interface CommissionsPage {
  heading: string;
  intro: string;
  steps: ProcessStep[];
  whatToShare: string[];
  typicalTimeline: string;
  priceGuide: string;
}

export interface Site {
  settings: SiteSettings;
  collections: Collection[];
  occasions: Occasion[];
  artworks: Artwork[];
  exhibitions: Exhibition[];
  posts: Post[];
  testimonials: Testimonial[];
  about: AboutPage;
  commissions: CommissionsPage;
}
