/** Sitemap built from live content on each request (pages render on demand, so no build-time sitemap). */
import type { APIRoute } from 'astro';
import { getSite } from '@/lib/data';

export const GET: APIRoute = async ({ site: siteUrl, locals }) => {
  const base = (siteUrl ?? new URL('https://samridhiagarwal.com')).toString().replace(/\/$/, '');
  const site = await getSite(locals);
  const paths = [
    '/', '/work', '/gifting', '/commissions', '/exhibitions', '/about', '/journal', '/contact',
    ...site.collections.map((c) => `/collections/${c.slug}`),
    ...site.occasions.map((o) => `/gifting/${o.slug}`),
    ...site.artworks.map((a) => `/artwork/${a.slug}`),
    ...site.posts.map((p) => `/journal/${p.slug}`),
  ];
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths
    .map((p) => `  <url><loc>${esc(base + (p === '/' ? '/' : p))}</loc></url>`)
    .join('\n')}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
};
