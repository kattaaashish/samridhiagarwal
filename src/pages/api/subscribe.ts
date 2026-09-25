import type { APIRoute } from 'astro';
import { z } from 'zod';
import { formEndpoint } from '@/lib/forms/handler';
import { sendMail, summaryMail } from '@/lib/forms/resend';

export const prerender = false;

const schema = z.object({
  email: z.email('please enter a valid email'),
  topic: z.string().max(80).default('general'),
});

export const POST: APIRoute = formEndpoint('subscribe', schema, async (d, _form, env) => {
  const email = d.email.toLowerCase();
  if (env.SUBSCRIBERS) {
    const key = `sub:${d.topic}:${email}`;
    if (await env.SUBSCRIBERS.get(key)) return { ok: true, message: "You're already on the list." };
    await env.SUBSCRIBERS.put(key, JSON.stringify({ email, topic: d.topic, at: new Date().toISOString() }));
  } else {
    console.warn('[forms] SUBSCRIBERS KV binding missing; not stored');
  }
  const to = env.NOTIFY_EMAIL ?? 'hello@samridhiagarwal.com';
  const from = env.FROM_EMAIL ?? 'Website <onboarding@resend.dev>';
  const { text, html } = summaryMail(`New sign-up: ${d.topic}`, [['Email', email], ['Topic', d.topic]]);
  await sendMail(env.RESEND_API_KEY, { to, from, subject: `New sign-up (${d.topic}): ${email}`, text, html });
  return { ok: true, message: "You're on the list. I'll write to you first." };
}, { limit: 5, windowSec: 600 });

export const GET: APIRoute = ({ redirect }) => redirect('/', 302);
