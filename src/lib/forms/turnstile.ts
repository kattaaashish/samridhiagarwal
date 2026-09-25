/** Verifies a Turnstile token. Skips (with a warning) when no secret is configured. */
export async function verifyTurnstile(token: string | null, secret: string | undefined, ip: string): Promise<{ ok: boolean; reason?: string }> {
  if (!secret) {
    console.warn('[forms] TURNSTILE_SECRET_KEY not set; skipping verification');
    return { ok: true };
  }
  if (!token) return { ok: false, reason: 'Please complete the spam check and try again.' };
  const body = new FormData();
  body.set('secret', secret);
  body.set('response', token);
  if (ip !== 'unknown') body.set('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    const data = (await res.json()) as { success: boolean; 'error-codes'?: string[] };
    return data.success ? { ok: true } : { ok: false, reason: 'Spam check failed. Please refresh and try again.' };
  } catch {
    return { ok: false, reason: 'Could not verify the spam check. Please try again.' };
  }
}
