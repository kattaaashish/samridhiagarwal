/** Short link /whatsapp → the WhatsApp number in Site settings (so it follows dashboard edits). */
import type { APIRoute } from 'astro';
import { getSite } from '@/lib/data';

export const GET: APIRoute = async ({ locals }) => {
  const { settings } = await getSite(locals);
  const number = String(settings.whatsappNumber ?? '').replace(/\D/g, '');
  return new Response(null, { status: 302, headers: { Location: number ? `https://wa.me/${number}` : '/contact', 'Cache-Control': 'no-store' } });
};
