/** Client-side filtering of [data-artwork] cards via data attributes; syncs to the URL query. */
function init() {
  document.querySelectorAll<HTMLFormElement>('form[data-filters]').forEach((form) => {
    if (form.dataset.ready) return;
    form.dataset.ready = '1';
    const root = form.closest<HTMLElement>('[data-grid]')!;
    const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-artwork]'));
    const count = form.querySelector<HTMLElement>('[data-count]');
    const clear = form.querySelector<HTMLElement>('[data-clear]');
    const empty = root.querySelector<HTMLElement>('[data-empty]');
    const attr: Record<string, string> = { collections: 'collections', occasions: 'occasions', size: 'size', price: 'price' };

    const apply = (push = true) => {
      const fd = new FormData(form);
      const active: Record<string, string[]> = {};
      for (const [k, v] of fd.entries()) (active[k] ??= []).push(String(v));
      let shown = 0;
      for (const card of cards) {
        const ok = Object.entries(active).every(([k, vals]) => {
          const have = (card.dataset[attr[k]] ?? '').split(' ').filter(Boolean);
          return vals.some((v) => have.includes(v));
        });
        card.hidden = !ok;
        if (ok) shown++;
      }
      if (count) count.textContent = `${shown} ${shown === 1 ? 'piece' : 'pieces'}`;
      const any = Object.keys(active).length > 0;
      clear?.classList.toggle('hidden', !any);
      empty?.classList.toggle('hidden', shown > 0);
      if (push) {
        const url = new URL(location.href);
        url.search = new URLSearchParams(fd as any).toString();
        history.replaceState(null, '', url);
      }
    };

    // Restore from URL
    const params = new URLSearchParams(location.search);
    form.querySelectorAll<HTMLInputElement>('input[type=checkbox]').forEach((i) => { i.checked = params.getAll(i.name).includes(i.value); });
    form.addEventListener('change', () => apply());
    form.addEventListener('submit', (e) => { e.preventDefault(); apply(); });
    form.addEventListener('reset', () => setTimeout(() => apply(), 0));
    apply(false);
  });
}
init();
document.addEventListener('astro:page-load', init);

export {};
