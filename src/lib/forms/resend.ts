/** Sends an email through Resend's REST API. Logs instead when no API key is configured. */
export interface Mail { to: string; from: string; replyTo?: string; subject: string; text: string; html?: string }

export async function sendMail(apiKey: string | undefined, mail: Mail): Promise<{ ok: boolean; error?: string }> {
  if (!apiKey) {
    console.warn('[forms] RESEND_API_KEY not set; email not sent. Would send:\n', mail.subject, '\n', mail.text);
    return { ok: true };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: mail.from, to: [mail.to], reply_to: mail.replyTo, subject: mail.subject, text: mail.text, html: mail.html }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('[forms] Resend error', res.status, err);
    return { ok: false, error: 'Email could not be sent.' };
  }
  return { ok: true };
}

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

/** Readable summary email: a labelled list of fields plus attachment links. */
export function summaryMail(title: string, fields: Array<[string, string | undefined]>, links: string[] = []) {
  const rows = fields.filter(([, v]) => v && v.trim());
  const text = [title, '', ...rows.map(([k, v]) => `${k}: ${v}`), ...(links.length ? ['', 'Attachments:', ...links] : [])].join('\n');
  const html = `<div style="font-family:system-ui,sans-serif;max-width:640px;color:#1F1B18"><h2 style="font-weight:500">${esc(title)}</h2><table cellpadding="6" style="border-collapse:collapse">${rows
    .map(([k, v]) => `<tr><td style="color:#6B625B;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="white-space:pre-wrap">${esc(v!)}</td></tr>`)
    .join('')}</table>${links.length ? `<h3 style="font-weight:500">Attachments</h3><ul>${links.map((l) => `<li><a href="${esc(l)}">${esc(l)}</a></li>`).join('')}</ul>` : ''}</div>`;
  return { text, html };
}
