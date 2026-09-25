/** Scroll-reveal for .reveal elements. CSS handles the animation and reduced motion. */
let io: IntersectionObserver | undefined;
function init() {
  const els = document.querySelectorAll<HTMLElement>('.reveal:not(.is-visible)');
  if (!els.length) return;
  io ??= new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-visible'); io!.unobserve(e.target); } }),
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
  );
  els.forEach((el) => {
    // Stagger siblings that share a parent.
    const idx = Array.from(el.parentElement?.children ?? []).indexOf(el);
    if (idx > 0 && el.parentElement?.dataset.stagger !== undefined) el.style.setProperty('--reveal-delay', `${Math.min(idx, 6) * 70}ms`);
    io!.observe(el);
  });
}
init();
document.addEventListener('astro:page-load', init);

export {};
