import type { APIRoute } from 'astro';
export const GET: APIRoute = ({ site }) => {
  const base = (site ?? new URL('https://samridhiagarwal.com')).toString().replace(/\/$/, '');
  return new Response(`User-agent: *\nAllow: /\nDisallow: /studio\nDisallow: /api/\n\nSitemap: ${base}/sitemap-index.xml\n`, {
    headers: { 'Content-Type': 'text/plain' },
  });
};
