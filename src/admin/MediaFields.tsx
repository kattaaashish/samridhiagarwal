/** Media inputs: drop zone (files or whole folders), sortable media lists, single media, focal point. */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { filesFromDrop, isImage, isVideo, thumbUrl, uploadImage, uploadMedia, type MediaItem, type UploadedImage } from './media';
import { Sortable } from './Sortable';

interface Job { id: string; name: string; progress: number; error?: string }

/** Runs uploads two at a time and reports progress per file. */
export function useUploads() {
  const [jobs, setJobs] = useState<Job[]>([]);
  async function run<T>(files: File[], work: (f: File, onProgress: (p: number) => void) => Promise<T>): Promise<T[]> {
    const batch: Job[] = files.map((f) => ({ id: crypto.randomUUID() as string, name: f.name, progress: 0 }));
    setJobs((j) => [...j, ...batch]);
    const set = (id: string, patch: Partial<Job>) => setJobs((j) => j.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const results: (T | undefined)[] = new Array(files.length);
    let next = 0;
    const worker = async () => {
      while (next < files.length) {
        const i = next++;
        const id = batch[i].id;
        try {
          results[i] = await work(files[i], (p) => set(id, { progress: p }));
          set(id, { progress: 1 });
        } catch (e) {
          set(id, { error: (e as Error).message });
        }
      }
    };
    await Promise.all([worker(), worker()]);
    // Clear this batch's finished rows after a moment; keep failures visible.
    const done = new Set<string>(batch.map((b) => b.id));
    setTimeout(() => setJobs((j) => j.filter((x) => x.error || !done.has(x.id))), 2500);
    return results.filter((r): r is T => r !== undefined);
  }
  return { jobs, run, clearErrors: () => setJobs((j) => j.filter((x) => !x.error)) };
}

export function UploadProgress({ jobs, onDismiss }: { jobs: Job[]; onDismiss?: () => void }) {
  if (!jobs.length) return null;
  return (
    <div className="mt-3 grid gap-1.5 text-sm" aria-live="polite">
      {jobs.map((j) => (
        <div key={j.id} className="flex items-center gap-3">
          <span className="min-w-0 flex-1 truncate">{j.name}</span>
          {j.error ? <span className="text-accent-ink">{j.error}</span> : j.progress >= 1 ? <span className="text-muted">Done</span> : (
            <span className="admin-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(j.progress * 100)} aria-label={`Uploading ${j.name}`}>
              <span style={{ width: `${Math.max(4, j.progress * 100)}%` }} />
            </span>
          )}
        </div>
      ))}
      {onDismiss && jobs.some((j) => j.error) && <button type="button" className="link justify-self-start text-sm" onClick={onDismiss}>Dismiss errors</button>}
    </div>
  );
}

/** Drop files or folders here, or pick them. */
export function DropZone({ onFiles, accept = 'media', multiple = true, title, hint, compact = false }: {
  onFiles: (files: File[]) => void; accept?: 'media' | 'image'; multiple?: boolean; title: string; hint?: ReactNode; compact?: boolean;
}) {
  const [over, setOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const keep = (files: File[]) => files.filter((f) => isImage(f) || (accept === 'media' && isVideo(f)));
  const take = (files: File[]) => {
    const ok = keep(files);
    if (ok.length) onFiles(multiple ? ok : ok.slice(0, 1));
  };
  useEffect(() => {
    folderInput.current?.setAttribute('webkitdirectory', '');
  }, []);
  return (
    <div
      className={`admin-drop ${over ? 'is-over' : ''} ${compact ? 'is-compact' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={async (e) => { e.preventDefault(); setOver(false); take(await filesFromDrop(e.dataTransfer)); }}
    >
      <p className="font-medium">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <button type="button" className="btn btn-secondary min-h-10 px-4 py-2 text-sm" onClick={() => fileInput.current?.click()}>
          Choose {accept === 'image' ? (multiple ? 'images' : 'an image') : multiple ? 'files' : 'a file'}
        </button>
        {multiple && <button type="button" className="btn btn-ghost min-h-10 px-4 py-2 text-sm" onClick={() => folderInput.current?.click()}>Choose a folder</button>}
      </div>
      <input ref={fileInput} type="file" hidden multiple={multiple} accept={accept === 'image' ? 'image/*' : 'image/*,video/*'} onChange={(e) => { take([...(e.target.files ?? [])]); e.target.value = ''; }} />
      <input ref={folderInput} type="file" hidden multiple onChange={(e) => { take([...(e.target.files ?? [])].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))); e.target.value = ''; }} />
    </div>
  );
}

/** Click on the image to choose the point that must stay in view when it's cropped. */
export function FocalPointDialog({ image, onSave, onClose }: { image: UploadedImage | any; onSave: (h: { x: number; y: number }) => void; onClose: () => void }) {
  const [point, setPoint] = useState<{ x: number; y: number }>(image.hotspot ?? { x: 0.5, y: 0.5 });
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  const src = thumbUrl(image, 1440);
  const pos = `${Math.round(point.x * 100)}% ${Math.round(point.y * 100)}%`;
  const move = (dx: number, dy: number) => setPoint((p) => ({ x: Math.min(1, Math.max(0, p.x + dx)), y: Math.min(1, Math.max(0, p.y + dy)) }));
  return (
    <dialog ref={ref} className="admin-dialog" onClose={onClose} aria-labelledby="focal-title">
      <h2 id="focal-title" className="text-2xl">Focus point</h2>
      <p className="mt-1 text-sm text-muted">Click the part of the picture that must always stay visible. Use the arrow keys for small moves. Crops on the site keep this point in view.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-[2fr_1fr]">
        <div
          className="relative cursor-crosshair select-none self-start justify-self-center overflow-hidden rounded-lg bg-surface"
          tabIndex={0}
          role="application"
          aria-label={`Focus point at ${pos}. Use arrow keys to move.`}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 0.1 : 0.02;
            const map: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
            if (map[e.key]) { e.preventDefault(); move(...map[e.key]); }
          }}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setPoint({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
          }}
        >
          <img src={src} alt="" className="block h-auto max-h-[60dvh] w-auto max-w-full" draggable={false} />
          <span className="admin-focus-dot" style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }} aria-hidden="true" />
        </div>
        <div className="grid content-start gap-3">
          <p className="text-sm font-medium">How crops will look</p>
          <div className="flex flex-wrap items-end gap-3">
            {[['Wide screen', '16 / 9'], ['Phone', '9 / 16'], ['Square', '1 / 1']].map(([label, ratio]) => (
              <figure key={label} className="grid gap-1">
                <img src={src} alt="" className="h-28 w-auto rounded-md object-cover" style={{ aspectRatio: ratio, objectPosition: pos }} />
                <figcaption className="text-xs text-muted">{label}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="btn btn-ghost" onClick={() => ref.current?.close()}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={() => { onSave(point); ref.current?.close(); }}>Save focus point</button>
      </div>
    </dialog>
  );
}

function MediaCard({ item, onChange, onRemove, handle, badge }: { item: MediaItem; onChange: (m: MediaItem) => void; onRemove: () => void; handle?: ReactNode; badge?: string }) {
  const [focal, setFocal] = useState(false);
  const src = thumbUrl(item);
  return (
    <div className="admin-media-card">
      <div className="relative aspect-square overflow-hidden rounded-md bg-surface">
        {src && <img src={src} alt="" className="h-full w-full object-cover" style={{ objectPosition: item.image?.hotspot ? `${item.image.hotspot.x * 100}% ${item.image.hotspot.y * 100}%` : undefined }} loading="lazy" />}
        <div className="absolute left-1.5 top-1.5 flex gap-1">
          {badge && <span className="badge bg-bg text-ink">{badge}</span>}
          {(item.video || (item as any).localVideo) && <span className="badge bg-ink text-bg">Video</span>}
        </div>
        {handle && <div className="absolute right-1.5 top-1.5">{handle}</div>}
      </div>
      <label className="mt-2 grid gap-1 text-xs text-muted">
        Description for screen readers
        <input className="input !min-h-9 !py-1.5 text-sm" value={item.alt ?? ''} onChange={(e) => onChange({ ...item, alt: e.target.value })} placeholder="What's in the picture" />
      </label>
      <div className="mt-1.5 flex justify-between gap-2 text-sm">
        <button type="button" className="link" onClick={() => setFocal(true)}>Focus point</button>
        <button type="button" className="link" onClick={onRemove}>Remove</button>
      </div>
      {focal && <FocalPointDialog image={item.image} onClose={() => setFocal(false)} onSave={(hotspot) => onChange({ ...item, image: { ...item.image, hotspot } })} />}
    </div>
  );
}

export function MediaListField({ value, onChange, max }: { value: MediaItem[] | undefined; onChange: (v: MediaItem[]) => void; max?: number }) {
  const items = (value ?? []).map((m) => (m._key ? m : { ...m, _key: Math.random().toString(36).slice(2, 10) }));
  const { jobs, run, clearErrors } = useUploads();
  // Keep a ref to the latest list so items finishing out of order are all kept.
  const latest = useRef(items);
  latest.current = items;
  const add = async (files: File[]) => {
    const room = max ? Math.max(0, max - items.length) : files.length;
    await run(files.slice(0, room), async (f, p) => {
      const m = await uploadMedia(f, p);
      latest.current = [...latest.current, m];
      onChange(latest.current);
      return m;
    });
  };
  const full = !!max && items.length >= max;
  return (
    <div>
      {items.length > 0 && (
        <Sortable
          items={items}
          getId={(m) => m._key}
          onChange={onChange}
          layout="grid"
          label="picture"
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
          render={(m, i, handle) => (
            <MediaCard item={m} handle={items.length > 1 ? handle : undefined} badge={i === 0 && !max ? 'Main' : undefined}
              onChange={(next) => onChange(items.map((x) => (x._key === m._key ? next : x)))}
              onRemove={() => onChange(items.filter((x) => x._key !== m._key))} />
          )}
        />
      )}
      {!full && (
        <div className={items.length ? 'mt-3' : ''}>
          <DropZone onFiles={add} compact={items.length > 0} title={items.length ? 'Add more: drop photos, videos or a folder' : 'Drop photos, videos or a whole folder here'} hint={max ? `Up to ${max}.` : 'They are resized and compressed automatically.'} />
        </div>
      )}
      <UploadProgress jobs={jobs} onDismiss={clearErrors} />
    </div>
  );
}

export function MediaField({ value, onChange }: { value: MediaItem | undefined; onChange: (v: MediaItem | undefined) => void }) {
  const { jobs, run, clearErrors } = useUploads();
  const add = async (files: File[]) => { const [m] = await run(files.slice(0, 1), uploadMedia); if (m) onChange(m); };
  return (
    <div>
      {value?.image ? (
        <div className="max-w-56"><MediaCard item={value} onChange={onChange} onRemove={() => onChange(undefined)} /></div>
      ) : (
        <DropZone onFiles={add} multiple={false} title="Drop a photo or video here" />
      )}
      <UploadProgress jobs={jobs} onDismiss={clearErrors} />
    </div>
  );
}

export function ImageField({ value, onChange }: { value: UploadedImage | undefined; onChange: (v: UploadedImage | undefined) => void }) {
  const { jobs, run, clearErrors } = useUploads();
  const add = async (files: File[]) => { const [img] = await run(files.slice(0, 1), (f, p) => uploadImage(f, p)); if (img) onChange(img); };
  const src = thumbUrl(value);
  return (
    <div>
      {src ? (
        <div className="flex items-end gap-3">
          <img src={src} alt="" className="h-28 w-auto rounded-md bg-surface" />
          <button type="button" className="link text-sm" onClick={() => onChange(undefined)}>Remove</button>
        </div>
      ) : (
        <DropZone onFiles={add} accept="image" multiple={false} title="Drop an image here" />
      )}
      <UploadProgress jobs={jobs} onDismiss={clearErrors} />
    </div>
  );
}
