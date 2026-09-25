import type { APIRoute } from 'astro';
import { z } from 'zod';
import { formEndpoint } from '@/lib/forms/handler';
import { sendMail, summaryMail } from '@/lib/forms/resend';

export const prerender = false;

const schema = z.object({
  name: z.string().min(2, 'please enter your name').max(120),
  email: z.email('please enter a valid email'),
  phone: z.string().max(40).optional(),
  location: z.string().max(120).optional(),
  artwork: z.string().max(200).optional(),
  occasion: z.string().max(80).optional(),
  giftWrap: z.string().optional(),
  giftNote: z.string().max(500).optional(),
  message: z.string().min(10, 'please write a few more words').max(3000),
});

export const POST: APIRoute = formEndpoint('enquiry', schema, async (d, _form, env) => {
  const to = env.NOTIFY_EMAIL ?? 'hello@samridhiagarwal.com';
  const from = env.FROM_EMAIL ?? 'Website <onboarding@resend.dev>';
  const title = d.artwork ? `Enquiry about "${d.artwork}" from ${d.name}` : `New enquiry from ${d.name}`;
  const { text, html } = summaryMail(title, [
    ['Name', d.name], ['Email', d.email], ['Phone / WhatsApp', d.phone], ['Location', d.location],
    ['Artwork', d.artwork], ['Occasion', d.occasion], ['Gift wrap', d.giftWrap ? 'Yes' : undefined], ['Gift note', d.giftNote],
    ['Message', d.message],
  ]);
  const sent = await sendMail(env.RESEND_API_KEY, { to, from, replyTo: d.email, subject: title, text, html });
  return sent.ok
    ? { ok: true, message: "Thank you, your enquiry is on its way. I'll reply within two working days." }
    : { ok: false, message: 'Your message could not be sent. Please try WhatsApp instead.', status: 502 };
});

export const GET: APIRoute = ({ redirect }) => redirect('/contact', 302);
