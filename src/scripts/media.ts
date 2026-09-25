/**
 * Video behaviour for every <figure data-media>. Loaded once, survives view transitions.
 *  - Poster-only when prefers-reduced-motion, Save-Data, or a slow connection.
 *  - IntersectionObserver lazy-loads sources, plays in view, pauses out of view.
 *  - At most MAX_PLAYING videos decode at once; the most visible win.
 */
const MAX_PLAYING = 2;

type Conn = { saveData?: boolean; effectiveType?: string };
const conn = (navigator as any).connection as Conn | undefined;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const slow = !!conn && (conn.saveData === true || /(^|-)2g$/.test(conn.effectiveType ?? ''));

function stillOnly() {
  return reduced.matches || slow;
}

const visible = new Map<HTMLVideoElement, number>(); // video → intersection ratio
let io: IntersectionObserver | undefined;

function loadSources(v: HTMLVideoElement) {
  if (v.dataset.loaded) return;
  v.querySelectorAll<HTMLSourceElement>('source[data-src]').forEach((s) => {
    s.src = s.dataset.src!;
    s.removeAttribute('data-src');
  });
  v.dataset.loaded = '1';
  v.preload = 'metadata';
  v.load();
}

function play(v: HTMLVideoElement) {
  loadSources(v);
  v.play().then(() => v.classList.add('is-playing')).catch(() => {/* autoplay blocked: poster stays */});
}

function pause(v: HTMLVideoElement) {
  if (!v.paused) v.pause();
  v.classList.remove('is-playing');
}

function reconcile() {
  const ranked = [...visible.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v);
  ranked.forEach((v, i) => (i < MAX_PLAYING ? play(v) : pause(v)));
}

function observe(root: ParentNode = document) {
  if (stillOnly()) {
    root.querySelectorAll<HTMLVideoElement>('video[data-video]').forEach((v) => {
      pause(v);
      v.removeAttribute('autoplay');
      v.remove(); // poster <picture> remains
    });
    return;
  }
  io ??= new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const v = e.target as HTMLVideoElement;
        if (e.isIntersecting) visible.set(v, e.intersectionRatio + (v.closest('[data-priority]') ? 1 : 0));
        else { visible.delete(v); pause(v); }
      }
      reconcile();
    },
    { rootMargin: '25% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
  );
  root.querySelectorAll<HTMLVideoElement>('video[data-video]').forEach((v) => {
    if (v.dataset.observed) return;
    v.dataset.observed = '1';
    v.removeAttribute('autoplay'); // we control playback from here on
    v.addEventListener('playing', () => v.classList.add('is-playing'));
    io!.observe(v);
  });
}

function teardown() {
  io?.disconnect();
  io = undefined;
  visible.clear();
}

document.documentElement.classList.remove('no-js');
observe();
document.addEventListener('astro:before-swap', teardown);
document.addEventListener('astro:page-load', () => observe());
document.addEventListener('visibilitychange', () => (document.hidden ? visible.forEach((_, v) => pause(v)) : reconcile()));
reduced.addEventListener?.('change', () => { teardown(); observe(); });

export {};
