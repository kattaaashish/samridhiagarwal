/**
 * Upload pipeline, run in the browser so it works anywhere and costs nothing:
 * images are decoded, resized to a few widths and compressed (WebP, JPEG where the browser
 * can't encode WebP) before upload; videos are uploaded as-is with a poster frame taken
 * from the clip. Each upload gets a fresh random key, so files are never overwritten.
 */
import { api, newKey } from './api';
import { UPLOAD_WIDTHS } from '@/lib/media';

export interface UploadedImage {
  r2: string;
  ext: 'webp' | 'jpg';
  widths: number[];
  width: number;
  height: number;
  hotspot?: { x: number; y: number };
}
export interface MediaItem {
  _key: string;
  _type: 'media';
  image: UploadedImage;
  video?: { r2: string };
  alt: string;
}

const VIDEO_EXT: Record<string, string> = { 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' };
const MAX_VIDEO = 95 * 1024 * 1024;

export const isImage = (f: File) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|avif|heic|heif)$/i.test(f.name);
export const isVideo = (f: File) => f.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(f.name);

/** "IMG_2041 chai-at-six.jpg" → "Chai at six" style title from a file name. */
export function titleFromFile(name: string): string {
  const base = name.replace(/\.[^.]+$/, '').replace(/^(img|dsc|pxl|vid)[_-]?\d+[_\s-]*/i, '').replace(/[_-]+/g, ' ').trim();
  return base ? base[0].toUpperCase() + base.slice(1) : 'Untitled';
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((r) => canvas.toBlob(r, type, quality));
}

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  } catch {
    // Fallback (older Safari): let an <img> decode it.
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

let webpSupport: Promise<boolean> | undefined;
/** Safari can decode WebP but not encode it from a canvas; fall back to JPEG there. */
function canEncodeWebp(): Promise<boolean> {
  const c = document.createElement('canvas');
  c.width = c.height = 1;
  return (webpSupport ??= canvasBlob(c, 'image/webp', 0.8).then((b) => b?.type === 'image/webp'));
}

/** Resize + compress an image (or a video poster frame) and upload every size. */
export async function uploadImage(file: Blob, onProgress?: (p: number) => void): Promise<UploadedImage> {
  let src: ImageBitmap | HTMLImageElement;
  try {
    src = await decode(file);
  } catch {
    throw new Error('This image type cannot be read here. Please export it as JPEG or PNG (iPhone HEIC photos: Share → Save as JPEG).');
  }
  const width = 'naturalWidth' in src ? src.naturalWidth : src.width;
  const height = 'naturalHeight' in src ? src.naturalHeight : src.height;
  // Every standard width smaller than the original, plus the original (capped at the largest).
  const sizes = [...new Set([...UPLOAD_WIDTHS.filter((w) => w < width), Math.min(width, UPLOAD_WIDTHS.at(-1)!)])].sort((a, b) => a - b);
  const ext: 'webp' | 'jpg' = (await canEncodeWebp()) ? 'webp' : 'jpg';
  const id = crypto.randomUUID();
  for (let i = 0; i < sizes.length; i++) {
    const w = sizes[i];
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = Math.round((height / width) * w);
    const g = canvas.getContext('2d')!;
    g.imageSmoothingQuality = 'high';
    g.drawImage(src, 0, 0, canvas.width, canvas.height);
    const blob = await canvasBlob(canvas, ext === 'webp' ? 'image/webp' : 'image/jpeg', ext === 'webp' ? 0.82 : 0.85);
    if (!blob) throw new Error('Could not compress this image.');
    await api.upload(`site/${id}-${w}.${ext}`, blob);
    onProgress?.((i + 1) / sizes.length);
  }
  if ('close' in src) src.close();
  return { r2: `site/${id}`, ext, widths: sizes, width, height };
}

/** First frame of a video as a JPEG blob, used as its poster. */
async function posterFrame(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const v = document.createElement('video');
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.src = url;
    await new Promise<void>((ok, fail) => {
      v.onloadeddata = () => ok();
      v.onerror = () => fail(new Error('This video format cannot be played in the browser. Please export it as MP4 (H.264).'));
    });
    v.currentTime = Math.min(0.1, v.duration / 2 || 0);
    await new Promise((r) => (v.onseeked = r));
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d')!.drawImage(v, 0, 0);
    const blob = await canvasBlob(c, 'image/jpeg', 0.9);
    if (!blob) throw new Error('Could not read a frame from this video.');
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Any dropped/chosen file → a media item (image, or video + poster). */
export async function uploadMedia(file: File, onProgress?: (p: number) => void): Promise<MediaItem> {
  const alt = titleFromFile(file.name);
  if (isVideo(file)) {
    if (file.size > MAX_VIDEO) throw new Error(`${file.name} is over 95 MB. Please trim it to a short loop.`);
    const ext = VIDEO_EXT[file.type] ?? (file.name.split('.').pop()?.toLowerCase() === 'webm' ? 'webm' : file.name.toLowerCase().endsWith('.mov') ? 'mov' : 'mp4');
    const image = await uploadImage(await posterFrame(file), (p) => onProgress?.(p * 0.2));
    const key = `site/${crypto.randomUUID()}.${ext}`;
    await api.upload(key, file);
    onProgress?.(1);
    return { _key: newKey(), _type: 'media', image, video: { r2: key }, alt };
  }
  if (!isImage(file)) throw new Error(`${file.name} is not an image or video.`);
  return { _key: newKey(), _type: 'media', image: await uploadImage(file, onProgress), alt };
}

/** Files from a drop, including everything inside dropped folders (any depth). */
export async function filesFromDrop(dt: DataTransfer): Promise<File[]> {
  const entries = [...dt.items].map((i) => (i.kind === 'file' ? i.webkitGetAsEntry?.() : null)).filter(Boolean) as FileSystemEntry[];
  if (!entries.length) return [...dt.files];
  const out: File[] = [];
  const walk = async (e: FileSystemEntry): Promise<void> => {
    if (e.isFile) {
      out.push(await new Promise<File>((ok, fail) => (e as FileSystemFileEntry).file(ok, fail)));
    } else if (e.isDirectory) {
      const reader = (e as FileSystemDirectoryEntry).createReader();
      // readEntries returns batches; keep reading until empty.
      for (;;) {
        const batch = await new Promise<FileSystemEntry[]>((ok, fail) => reader.readEntries(ok, fail));
        if (!batch.length) break;
        for (const c of batch) await walk(c);
      }
    }
  };
  for (const e of entries) await walk(e);
  return out
    .filter((f) => !f.name.startsWith('.') && (isImage(f) || isVideo(f)))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

/** Image URL for the dashboard: the smallest stored size, or the largest up to `maxWidth`. */
export function thumbUrl(m: any, maxWidth = 0): string | undefined {
  const img = m?.image ?? m;
  if (img?.r2) {
    const widths: number[] = img.widths?.length ? img.widths : [img.width];
    const w = (maxWidth && widths.filter((x) => x <= maxWidth).at(-1)) || widths[0];
    return `/files/${img.r2}-${w}.${img.ext ?? 'webp'}`;
  }
  if (img?.localSrc) return maxWidth >= 960 && (img.width ?? 0) >= 960 ? `${img.localSrc}-960.webp` : `${img.localSrc}-480.webp`;
  return undefined;
}
