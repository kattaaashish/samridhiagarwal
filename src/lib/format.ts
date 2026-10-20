import type { Artwork, SiteSettings } from './types';
import { inToCm } from './size';

export const formatINR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

/** Sizes are stored in inches; shown as "24 × 36 in (61 × 91 cm)". */
export const formatSize = (a: Pick<Artwork, 'width' | 'height' | 'depth'>) => {
  const dims = [a.width, a.height, ...(a.depth ? [a.depth] : [])];
  return `${dims.map(trim).join(' × ')} in (${dims.map((n) => Math.round(inToCm(n))).join(' × ')} cm)`;
};

export const trim = (n: number) => n.toFixed(1).replace(/\.0$/, '');

/** What to show in a price slot: "Sold", the price (only when prices are switched on), or nothing. */
export const priceLabel = (a: Pick<Artwork, 'price' | 'status'>, settings: Pick<SiteSettings, 'showPrices'>) =>
  a.status === 'sold' ? 'Sold' : settings.showPrices && a.price > 0 ? formatINR(a.price) : undefined;

export const formatDate = (iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) =>
  iso ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', ...opts }).format(new Date(iso)) : '';

export function formatDateRange(start: string, end: string) {
  if (!start) return '';
  if (!end || end === start) return formatDate(start);
  const s = new Date(start), e = new Date(end);
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth())
    return `${s.getDate()}–${formatDate(end)}`;
  if (s.getFullYear() === e.getFullYear())
    return `${formatDate(start, { day: 'numeric', month: 'long' })} – ${formatDate(end)}`;
  return `${formatDate(start)} – ${formatDate(end)}`;
}

export const statusLabel: Record<Artwork['status'], string> = {
  available: 'Available',
  sold: 'Sold',
  'made-to-order': 'Made to order',
};

export const whatsappLink = (number: string, text: string) =>
  `https://wa.me/${number}?text=${encodeURIComponent(text)}`;

export const excerpt = (s: string, n = 155) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…');

/** Clean route path for the current page (build output uses file-based .html names). */
export const pagePath = (url: URL) => url.pathname.replace(/\.html$/, '').replace(/\/index$/, '/') || '/';
