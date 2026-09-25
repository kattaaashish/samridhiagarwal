/**
 * Progressive enhancement for [data-enhanced-form]: submits via fetch, shows inline
 * status, resets Turnstile, and validates files client-side. Without JS the form does a
 * normal POST and the server redirects back with ?sent= or ?error=.
 */
function setStatus(form: HTMLFormElement, msg: string, ok: boolean) {
  const box = form.querySelector<HTMLElement>('[data-form-status]');
  if (!box) return;
  box.innerHTML = '';
  const p = document.createElement('p');
  p.className = ok ? 'rounded-xl bg-surface px-4 py-3 text-ink' : 'rounded-xl bg-accent/10 px-4 py-3 text-accent-ink';
  p.textContent = msg;
  box.append(p);
}

function validateFiles(form: HTMLFormElement): string | null {
  for (const input of form.querySelectorAll<HTMLInputElement>('input[type=file]')) {
    const files = Array.from(input.files ?? []);
    const maxFiles = Number(input.dataset.maxFiles ?? 5);
    const maxSize = Number(input.dataset.maxSize ?? 8388608);
    if (files.length > maxFiles) return `Please attach at most ${maxFiles} photos.`;
    for (const f of files) {
      if (!f.type.startsWith('image/')) return `${f.name} is not an image.`;
      if (f.size > maxSize) return `${f.name} is larger than ${Math.round(maxSize / 1048576)} MB.`;
    }
  }
  return null;
}

function enhance(form: HTMLFormElement) {
  if (form.dataset.enhanced) return;
  form.dataset.enhanced = '1';
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const fileError = validateFiles(form);
    if (fileError) return setStatus(form, fileError, false);
    const btn = form.querySelector<HTMLButtonElement>('button[type=submit]');
    const label = btn?.textContent ?? '';
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
    try {
      const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (res.ok && data.ok) {
        setStatus(form, form.querySelector<HTMLElement>('[data-form-status]')?.dataset.successText ?? data.message ?? 'Sent. Thank you!', true);
        form.reset();
      } else {
        setStatus(form, data.message ?? 'Something went wrong. Please try again or WhatsApp me.', false);
      }
    } catch {
      setStatus(form, 'Network problem. Please try again in a moment.', false);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = label; }
      (window as any).turnstile?.reset?.();
    }
  });
}

function init() { document.querySelectorAll<HTMLFormElement>('form[data-enhanced-form]').forEach(enhance); }
init();
document.addEventListener('astro:page-load', init);

export {};
