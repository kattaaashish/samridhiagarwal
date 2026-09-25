/** Header: mobile menu toggle, disclosure submenus, close on Escape / outside click / navigation. */
function init() {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header || header.dataset.ready) return;
  header.dataset.ready = '1';
  const toggle = header.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const panel = header.querySelector<HTMLElement>('[data-menu-panel]');
  const setOpen = (open: boolean) => {
    header.dataset.open = open ? 'true' : 'false';
    toggle?.setAttribute('aria-expanded', String(open));
    toggle && (toggle.querySelector('[data-label]')!.textContent = open ? 'Close' : 'Menu');
    document.documentElement.style.overflow = open && matchMedia('(max-width: 1023px)').matches ? 'hidden' : '';
    if (open) panel?.querySelector<HTMLElement>('a,button')?.focus();
  };
  toggle?.addEventListener('click', () => setOpen(header.dataset.open !== 'true'));
  header.querySelectorAll<HTMLButtonElement>('[data-submenu-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') === 'true';
      header.querySelectorAll<HTMLButtonElement>('[data-submenu-toggle]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
      btn.setAttribute('aria-expanded', String(!open));
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      header.querySelectorAll<HTMLButtonElement>('[data-submenu-toggle][aria-expanded="true"]').forEach((b) => { b.setAttribute('aria-expanded', 'false'); b.focus(); });
    }
  });
  document.addEventListener('click', (e) => {
    if (!header.contains(e.target as Node)) header.querySelectorAll<HTMLButtonElement>('[data-submenu-toggle]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  });
  document.addEventListener('astro:before-swap', () => setOpen(false), { once: true });
  // Shadow on scroll
  const onScroll = () => header.classList.toggle('is-scrolled', scrollY > 8);
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });
}
init();
document.addEventListener('astro:page-load', init);

export {};
