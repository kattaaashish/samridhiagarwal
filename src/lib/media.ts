import type { ImageSource, MediaRef } from './types';

/** Widths the admin produces when it resizes an upload (only those ≤ the original are kept). */
export const UPLOAD_WIDTHS = [480, 960, 1440, 2048];
const SEED_WIDTHS = [480, 960, 1440];

/** Public URL of a file in the MEDIA bucket (served by src/pages/files/[...key].ts). */
export const fileUrl = (key: string) => `/files/${key}`;

/**
 * Accepts an uploaded image ({ r2, ext, widths, width, height }) or a seed placeholder
 * ({ localSrc, width, height }).
 */
export function toImageSource(image: any, opts: { aspect?: number } = {}): ImageSource | undefined {
  if (!image) return undefined;
  if (image.r2) {
    const w: number = image.width ?? 1440;
    const h: number = image.height ?? Math.round(w / (opts.aspect ?? 0.8));
    const widths: number[] = (Array.isArray(image.widths) && image.widths.length ? image.widths : [w]).slice().sort((a: number, b: number) => a - b);
    const url = (x: number) => fileUrl(`${image.r2}-${x}.${image.ext ?? 'webp'}`);
    const main = widths.filter((x) => x <= 1440).at(-1) ?? widths[0];
    return {
      src: url(main),
      srcset: widths.map((x) => `${url(x)} ${x}w`).join(', '),
      small: url(widths[0]),
      width: w,
      height: h,
    };
  }
  if (image.localSrc) {
    const w: number = image.width ?? 1200;
    const h: number = image.height ?? Math.round(w / (opts.aspect ?? 0.8));
    const widths = SEED_WIDTHS.filter((x) => x <= w);
    return {
      src: `${image.localSrc}.jpg`,
      srcset: undefined,
      modernSrcset: widths.map((x) => `${image.localSrc}-${x}.webp ${x}w`).join(', '),
      modernType: 'image/webp',
      small: widths.length ? `${image.localSrc}-${widths[0]}.webp` : `${image.localSrc}.jpg`,
      width: w,
      height: h,
    };
  }
  return undefined;
}

/** Accepts a `media` object (poster image + optional looping video). Always yields a poster. */
export function toMediaRef(m: any): MediaRef | undefined {
  if (!m) return undefined;
  const poster = toImageSource(m.image);
  if (!poster) return undefined;
  let video: MediaRef['video'];
  if (m.video?.r2) video = { mp4: fileUrl(m.video.r2) };
  else if (m.localVideo) video = { mp4: m.localVideo };
  const hs = m.image?.hotspot;
  const focus = hs && typeof hs.x === 'number' && typeof hs.y === 'number' ? `${Math.round(hs.x * 100)}% ${Math.round(hs.y * 100)}%` : undefined;
  return { poster, video, alt: m.alt ?? '', aspect: poster.width / poster.height, focus };
}

/** Absolute URL of an image for Open Graph / JSON-LD. */
export function ogImageUrl(img: ImageSource | undefined, siteUrl: string): string | undefined {
  if (!img) return undefined;
  return new URL(img.src, siteUrl).toString();
}
