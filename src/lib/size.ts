/**
 * Artwork sizes are entered in inches. Documents saved before the switch (and the seed) hold cm
 * and have no `sizeUnit`; they are converted on read, so nothing in D1 needs rewriting.
 */
export const CM_PER_IN = 2.54;

const num = (v: unknown) => (v === '' || v == null || Number.isNaN(Number(v)) ? undefined : Number(v));
const toIn = (cm: number) => cm / CM_PER_IN;
const round1 = (n: number) => Math.round(n * 10) / 10;

export interface InchSize { width?: number; height?: number; depth?: number }

export function sizeInInches(d: Record<string, any>): InchSize {
  const conv = d.sizeUnit === 'in' ? (v: number) => v : toIn;
  const pick = (k: 'width' | 'height' | 'depth') => { const v = num(d[k]); return v === undefined ? undefined : conv(v); };
  return { width: pick('width'), height: pick('height'), depth: pick('depth') };
}

/** Same document with width/height/depth in inches (to 0.1) and `sizeUnit: 'in'`, for the admin editor. */
export function withInches(d: Record<string, any>): Record<string, any> {
  if (d.sizeUnit === 'in') return d;
  const next: Record<string, any> = { ...d, sizeUnit: 'in' };
  const s = sizeInInches(d);
  for (const k of ['width', 'height', 'depth'] as const) {
    if (s[k] === undefined) delete next[k];
    else next[k] = round1(s[k]!);
  }
  return next;
}

export const inToCm = (n: number) => n * CM_PER_IN;
