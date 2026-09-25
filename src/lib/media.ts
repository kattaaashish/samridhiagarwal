import { createImageUrlBuilder } from '@sanity/image-url';
import type { ImageSource, MediaRef } from './types';

const WIDTHS = [480, 960, 1440];

export interface MediaEnv {
  projectId?: string;
  dataset?: string;
  streamCustomerCode?: string;
}

let env: MediaEnv = {};
export function configureMedia(e: MediaEnv) { env = e; }

function sanityBuilder() {
  if (!env.projectId) return null;
  return createImageUrlBuilder({ projectId: env.projectId, dataset: env.dataset ?? 'production' });
}

/** Accepts a Sanity image (asset ref) or a seed image ({ localSrc, width, height }). */
export function toImageSource(image: any, opts: { aspect?: number } = {}): ImageSource | undefined {
  if (!image) return undefined;
  if (image.localSrc) {
    const w: number = image.width ?? 1200;
    const h: number = image.height ?? Math.round(w / (opts.aspect ?? 0.8));
    const widths = WIDTHS.filter((x) => x <= w);
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
  const b = sanityBuilder();
  if (!b || !image.asset?._ref) return undefined;
  const dims = parseAssetDims(image.asset._ref);
  const w = dims?.w ?? 1200;
  const h = dims?.h ?? 1500;
  const build = (width: number) => {
    let u = b.image(image).width(width).auto('format').quality(78).fit('max');
    if (opts.aspect) u = u.height(Math.round(width / opts.aspect)).fit('crop');
    return u.url();
  };
  return {
    src: build(1200),
    srcset: WIDTHS.map((x) => `${build(x)} ${x}w`).join(', '),
    small: build(480),
    width: opts.aspect ? 1200 : w,
    height: opts.aspect ? Math.round(1200 / opts.aspect) : h,
    sanity: image,
  };
}

/** e.g. image-abc123-1200x1500-jpg */
function parseAssetDims(ref: string): { w: number; h: number } | null {
  const m = /-(\d+)x(\d+)-/.exec(ref);
  return m ? { w: Number(m[1]), h: Number(m[2]) } : null;
}

export function streamUrls(uid: string) {
  const code = env.streamCustomerCode;
  if (!code) return undefined;
  const base = `https://customer-${code}.cloudflarestream.com/${uid}`;
  return {
    hls: `${base}/manifest/video.m3u8`,
    mp4: `${base}/downloads/default.mp4`,
    poster: `${base}/thumbnails/thumbnail.jpg?time=1s&width=1200`,
  };
}

/** Accepts a `media` object from Sanity or seed. Always yields a poster. */
export function toMediaRef(m: any): MediaRef | undefined {
  if (!m) return undefined;
  let poster = toImageSource(m.image);
  let video: MediaRef['video'];
  if (m.localVideo) video = { mp4: m.localVideo };
  else if (m.streamId) {
    const s = streamUrls(m.streamId);
    if (s) {
      video = { hls: s.hls, mp4: s.mp4 };
      if (!poster) poster = { src: s.poster, small: s.poster.replace('width=1200', 'width=480'), width: 1200, height: 900 };
    }
  }
  if (!poster) return undefined;
  return { poster, video, alt: m.alt ?? '', aspect: poster.width / poster.height };
}

/** Absolute URL for a 1200x630 OG crop of an image. */
export function ogImageUrl(img: ImageSource | undefined, siteUrl: string): string | undefined {
  if (!img) return undefined;
  const b = sanityBuilder();
  if (img.sanity && b) return b.image(img.sanity as any).width(1200).height(630).fit('crop').format('jpg').quality(80).url();
  return new URL(img.src, siteUrl).toString();
}
