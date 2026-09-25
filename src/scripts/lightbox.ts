type Item = { src: string; srcset?: string; alt: string; width: number; height: number };

function init() {
  const dialog = document.querySelector<HTMLDialogElement>('[data-lightbox-dialog]');
  if (!dialog || dialog.dataset.ready) return;
  dialog.dataset.ready = '1';
  const img = dialog.querySelector<HTMLImageElement>('[data-lb-img]')!;
  const stage = dialog.querySelector<HTMLElement>('[data-lb-stage]')!;
  const caption = dialog.querySelector<HTMLElement>('[data-lb-caption]')!;
  let items: Item[] = [];
  let index = 0;
  let opener: HTMLElement | null = null;

  // Zoom / pan state
  let scale = 1, tx = 0, ty = 0;
  const MIN = 1, MAX = 5;
  const render = () => { img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`; stage.classList.toggle('is-zoomed', scale > 1); };
  const clamp = () => {
    const sw = stage.clientWidth, sh = stage.clientHeight;
    const iw = img.clientWidth * scale, ih = img.clientHeight * scale;
    const baseX = (sw - img.clientWidth) / 2, baseY = (sh - img.clientHeight) / 2;
    // Centre when the scaled image is smaller than the stage; otherwise keep it covering the stage.
    tx = iw <= sw ? (sw - iw) / 2 - baseX : Math.min(-baseX, Math.max(sw - iw - baseX, tx));
    ty = ih <= sh ? (sh - ih) / 2 - baseY : Math.min(-baseY, Math.max(sh - ih - baseY, ty));
  };
  const resetZoom = () => { scale = 1; tx = 0; ty = 0; render(); };
  const zoomAt = (factor: number, cx?: number, cy?: number) => {
    const rect = img.getBoundingClientRect();
    const px = cx ?? rect.left + rect.width / 2, py = cy ?? rect.top + rect.height / 2;
    const prev = scale;
    scale = Math.min(MAX, Math.max(MIN, scale * factor));
    const k = scale / prev;
    // Zoom around the pointer.
    tx = px - stage.getBoundingClientRect().left - (px - stage.getBoundingClientRect().left - tx) * k;
    ty = py - stage.getBoundingClientRect().top - (py - stage.getBoundingClientRect().top - ty) * k;
    if (scale === 1) { tx = 0; ty = 0; } else clamp();
    render();
  };

  const show = (i: number) => {
    index = (i + items.length) % items.length;
    const it = items[index];
    img.src = it.src; img.srcset = it.srcset ?? ''; img.sizes = '100vw'; img.alt = it.alt;
    img.width = it.width; img.height = it.height;
    caption.textContent = items.length > 1 ? `${it.alt} (${index + 1} of ${items.length})` : it.alt;
    dialog.querySelectorAll<HTMLElement>('[data-lb-prev],[data-lb-next]').forEach((b) => (b.hidden = items.length < 2));
    resetZoom();
  };

  const open = (group: Item[], i: number, from: HTMLElement) => {
    items = group; opener = from;
    show(i);
    dialog.showModal();
    document.documentElement.style.overflow = 'hidden';
    dialog.querySelector<HTMLElement>('[data-lb-close]')?.focus();
  };
  const close = () => { dialog.close(); };
  dialog.addEventListener('close', () => { document.documentElement.style.overflow = ''; opener?.focus(); });

  document.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-lightbox]');
    if (!btn) return;
    const groupId = btn.dataset.lightbox!;
    const data = document.querySelector<HTMLScriptElement>(`script[data-lightbox-group="${groupId}"]`);
    if (!data) return;
    e.preventDefault();
    open(JSON.parse(data.textContent || '[]') as Item[], Number(btn.dataset.index ?? 0), btn);
  });

  dialog.querySelector('[data-lb-close]')?.addEventListener('click', close);
  dialog.querySelector('[data-lb-prev]')?.addEventListener('click', () => show(index - 1));
  dialog.querySelector('[data-lb-next]')?.addEventListener('click', () => show(index + 1));
  dialog.querySelector('[data-lb-zoom-in]')?.addEventListener('click', () => zoomAt(1.5));
  dialog.querySelector('[data-lb-zoom-out]')?.addEventListener('click', () => zoomAt(1 / 1.5));
  dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(index - 1);
    else if (e.key === 'ArrowRight') show(index + 1);
    else if (e.key === '+' || e.key === '=') zoomAt(1.5);
    else if (e.key === '-') zoomAt(1 / 1.5);
    else if (e.key === '0') resetZoom();
    // Escape closes natively.
  });

  // Wheel zoom
  stage.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX, e.clientY); }, { passive: false });

  // Pointer: drag to pan, pinch to zoom, double-tap to toggle
  const pointers = new Map<number, { x: number; y: number }>();
  let lastDist = 0, lastTap = 0, dragStart: { x: number; y: number; tx: number; ty: number } | null = null;
  stage.addEventListener('pointerdown', (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    stage.setPointerCapture(e.pointerId);
    if (pointers.size === 1) {
      dragStart = { x: e.clientX, y: e.clientY, tx, ty };
      const now = Date.now();
      if (now - lastTap < 300) { scale > 1 ? resetZoom() : zoomAt(2.5, e.clientX, e.clientY); }
      lastTap = now;
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      lastDist = Math.hypot(a.x - b.x, a.y - b.y);
      dragStart = null;
    }
    stage.classList.add('is-dragging');
  });
  stage.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (lastDist) zoomAt(dist / lastDist, (a.x + b.x) / 2, (a.y + b.y) / 2);
      lastDist = dist;
    } else if (dragStart && scale > 1) {
      tx = dragStart.tx + (e.clientX - dragStart.x);
      ty = dragStart.ty + (e.clientY - dragStart.y);
      clamp(); render();
    }
  });
  const up = (e: PointerEvent) => { pointers.delete(e.pointerId); if (pointers.size < 2) lastDist = 0; if (!pointers.size) { dragStart = null; stage.classList.remove('is-dragging'); } };
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);
}
init();
document.addEventListener('astro:page-load', init);

export {};
