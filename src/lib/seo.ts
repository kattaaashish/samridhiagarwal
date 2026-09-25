import type { Artwork, Exhibition, SiteSettings } from './types';
import { ogImageUrl } from './media';

export function artworkJsonLd(a: Artwork, settings: SiteSettings, siteUrl: string) {
  const url = new URL(`/artwork/${a.slug}`, siteUrl).toString();
  return {
    '@context': 'https://schema.org',
    '@type': 'VisualArtwork',
    name: a.title,
    url,
    image: a.media.map((m) => new URL(m.poster.src, siteUrl).toString()),
    description: a.seoDescription ?? a.note,
    artform: 'Painting',
    artMedium: a.materials,
    width: { '@type': 'Distance', name: `${a.width} cm` },
    height: { '@type': 'Distance', name: `${a.height} cm` },
    creator: personJsonLd(settings, siteUrl),
    offers: {
      '@type': 'Offer',
      price: a.price,
      priceCurrency: 'INR',
      availability: a.status === 'sold' ? 'https://schema.org/SoldOut' : a.status === 'made-to-order' ? 'https://schema.org/PreOrder' : 'https://schema.org/InStock',
      url,
    },
  };
}

export function personJsonLd(settings: SiteSettings, siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: settings.siteName,
    url: siteUrl,
    jobTitle: 'Contemporary artist',
    description: settings.shortBio,
    email: settings.email ? `mailto:${settings.email}` : undefined,
    sameAs: [settings.instagram, settings.etsy].filter(Boolean),
    image: ogImageUrl(settings.ogImage, siteUrl),
  };
}

export function exhibitionJsonLd(e: Exhibition, settings: SiteSettings, siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: e.name,
    description: e.description,
    startDate: e.startDate,
    endDate: e.endDate,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: { '@type': 'Place', name: e.venue, address: { '@type': 'PostalAddress', addressLocality: e.city, addressCountry: 'IN' } },
    image: e.gallery.map((m) => new URL(m.poster.src, siteUrl).toString()),
    performer: personJsonLd(settings, siteUrl),
    organizer: personJsonLd(settings, siteUrl),
    url: new URL('/exhibitions#' + e.slug, siteUrl).toString(),
  };
}
