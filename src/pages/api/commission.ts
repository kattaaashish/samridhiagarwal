import type { APIRoute } from 'astro';
import { z } from 'zod';
import { formEndpoint } from '@/lib/forms/handler';
import { sendMail, summaryMail } from '@/lib/forms/resend';

export const prerender = false;

const MAX_FILES = 5;
const MAX_SIZE = 8 * 1024 * 1024;

const schema = z.object({
  name: z.string().min(2, 'please enter your name').max(120),
  email: z.email('please enter a valid email'),
  phone: z.string().max(40).optional(),
  location: z.string().max(120).optional(),
  moment: z.string().min(10, 'tell me a little more about the moment').max(3000),
  size: z.string().max(120).optional(),
  colours: z.string().max(200).optional(),
  occasion: z.string().max(80).optional(),
  budget: z.string().min(1, 'please choose a budget range').max(60),
  deadline: z.string().max(20).optional(),
});

export const POST: APIRoute = formEndpoint('commission', schema, async (d, form, env) => {
  const files = form.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_FILES) return { ok: false, message: `Please attach at most ${MAX_FILES} photos.` };
  for (const f of files) {
    if (!f.type.startsWith('image/')) return { ok: false, message: `${f.name} is not an image.` };
    if (f.size > MAX_SIZE) return { ok: false, message: `${f.name} is larger than 8 MB.` };
  }

  const links: string[] = [];
  if (files.length) {
    if (!env.UPLOADS) {
      console.warn('[forms] UPLOADS R2 binding missing; photos not stored');
    } else {
      const folder = `commissions/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}`;
      for (const f of files) {
        const safe = f.name.replace(/[^\w.\-]+/g, '_').slice(-80);
        const key = `${folder}/${safe}`;
        await env.UPLOADS.put(key, await f.arrayBuffer(), { httpMetadata: { contentType: f.type }, customMetadata: { from: d.email } });
        links.push(env.UPLOADS_PUBLIC_URL ? `${env.UPLOADS_PUBLIC_URL.replace(/\/$/, '')}/${key}` : `r2://${key}`);
      }
    }
  }

  const to = env.NOTIFY_EMAIL ?? 'hello@samridhiagarwal.com';
  const from = env.FROM_EMAIL ?? 'Website <onboarding@resend.dev>';
  const title = `Commission enquiry from ${d.name}${d.occasion ? ` (${d.occasion})` : ''}`;
  const { text, html } = summaryMail(title, [
    ['Name', d.name], ['Email', d.email], ['Phone / WhatsApp', d.phone], ['Location', d.location],
    ['The moment', d.moment], ['Size', d.size], ['Colours', d.colours], ['Occasion', d.occasion],
    ['Budget', d.budget], ['Deadline', d.deadline], ['Photos', files.length ? `${files.length} attached` : 'none'],
  ], links);
  const sent = await sendMail(env.RESEND_API_KEY, { to, from, replyTo: d.email, subject: title, text, html });
  return sent.ok
    ? { ok: true, message: "Thank you! Your commission enquiry has arrived. I'll be in touch within two working days." }
    : { ok: false, message: 'Your enquiry could not be sent. Please try WhatsApp instead.', status: 502 };
}, { limit: 3, windowSec: 600 });

export const GET: APIRoute = ({ redirect }) => redirect('/commissions', 302);
