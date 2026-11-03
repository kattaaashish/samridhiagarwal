/** List of one content type: create, open, filter, drag to reorder, bulk-create artwork drafts, bulk publish/unpublish/delete. */
import { useEffect, useMemo, useState } from 'react';
import { api, current, docState, type DocRow } from './api';
import { DropZone, UploadProgress, useUploads } from './MediaFields';
import { Sortable } from './Sortable';
import { TYPES, emptyDoc, type ContentType } from './schema';
import { thumbUrl, titleFromFile, uploadMedia } from './media';
import { StateBadge, useToast } from './ui';
import { sizeInInches } from '@/lib/size';
import { trim } from '@/lib/format';

const sizeLabel = (d: Record<string, any>) => { const s = sizeInInches(d); return s.width && s.height ? `${trim(s.width)} × ${trim(s.height)} in` : ''; };
const inr = (n: unknown) => (typeof n === 'number' ? `₹${n.toLocaleString('en-IN')}` : '');
const STATUS: Record<string, string> = { available: 'Available', sold: 'Sold', 'made-to-order': 'Made to order' };

function subtitle(type: ContentType, d: Record<string, any>): string {
  switch (type) {
    case 'artwork': return [STATUS[d.status] ?? 'Available', inr(d.price), sizeLabel(d)].filter(Boolean).join(' · ');
    case 'collection': return d.visible === false ? 'Hidden from the site' : '';
    case 'occasion': return [d.visible === false ? 'Hidden from the site' : '', d.seasonStart ? `Season ${d.seasonStart} to ${d.seasonEnd ?? '…'}` : ''].filter(Boolean).join(' · ');
    case 'exhibition': {
      const end = d.endDate ?? d.startDate;
      const upcoming = end && new Date(`${end}T23:59:59`) >= new Date();
      return [d.venue, d.city, d.startDate, end ? (upcoming ? 'Upcoming' : 'Past') : ''].filter(Boolean).join(' · ');
    }
    case 'post': return d.publishedAt ?? '';
    case 'testimonial': return d.city ?? '';
    default: return '';
  }
}

function thumb(type: ContentType, d: Record<string, any>) {
  const f = TYPES[type].thumbField;
  const v = f ? d[f] : undefined;
  return thumbUrl(Array.isArray(v) ? v[0] : v);
}

type Filter = 'all' | 'draft' | 'live';
type BulkAction = 'publish' | 'unpublish' | 'delete';

/** Run fn over items, a few at a time, collecting failures instead of stopping. */
async function each<T>(items: T[], fn: (x: T) => Promise<unknown>, limit = 4) {
  const failed: { item: T; error: string }[] = [];
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(limit, queue.length) }, async () => {
    for (let x = queue.shift(); x !== undefined; x = queue.shift()) {
      try { await fn(x); } catch (e) { failed.push({ item: x, error: (e as Error).message }); }
    }
  }));
  return failed;
}

export function ListView({ type }: { type: ContentType }) {
  const def = TYPES[type];
  const toast = useToast();
  const [rows, setRows] = useState<DocRow[] | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const { jobs, run, clearErrors } = useUploads();

  const load = () => api.list(type).then((r) => { setRows(r); setSelected((s) => new Set(r.filter((x) => s.has(x.id)).map((x) => x.id))); }).catch((e) => toast.error(e.message));
  useEffect(() => { setRows(null); setFilter('all'); setQ(''); setSelected(new Set()); load(); }, [type]);

  const sorted = useMemo(() => {
    if (!rows) return [];
    const r = [...rows];
    const key = (x: DocRow) => current(x);
    if (def.orderable) return r.sort((a, b) => String(key(a).orderRank ?? '').localeCompare(String(key(b).orderRank ?? '')));
    if (type === 'post') return r.sort((a, b) => String(key(b).publishedAt ?? '').localeCompare(String(key(a).publishedAt ?? '')));
    if (type === 'exhibition') return r.sort((a, b) => String(key(b).startDate ?? '').localeCompare(String(key(a).startDate ?? '')));
    return r; // newest edits first (server order)
  }, [rows, type]);

  const shown = sorted.filter((r) => {
    const s = docState(r);
    if (filter === 'draft' && s !== 'draft') return false;
    if (filter === 'live' && s === 'draft') return false;
    return !q || String(current(r)[def.titleField] ?? '').toLowerCase().includes(q.toLowerCase());
  });

  const create = async () => {
    try {
      const doc = await api.create(type, emptyDoc(type));
      location.hash = `#/${type}/${doc.id}`;
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  /** One artwork draft per dropped photo or video. */
  const bulkCreate = async (files: File[]) => {
    const made = await run(files, async (f, p) => {
      const media = await uploadMedia(f, p);
      return api.create('artwork', { ...emptyDoc('artwork'), title: titleFromFile(f.name), media: [media] });
    });
    if (made.length) toast.success(`${made.length} draft${made.length > 1 ? 's' : ''} created. Open each one to add details, then publish.`);
    load();
  };

  const reorder = async (next: DocRow[]) => {
    // Mirror the server's new ranks locally so the sorted list keeps the dragged order.
    const rank = (i: number) => String(i).padStart(5, '0');
    setRows(next.map((r, i) => ({ ...r, draft: r.draft && { ...r.draft, orderRank: rank(i) }, published: r.published && { ...r.published, orderRank: rank(i) } })));
    try {
      await api.reorder(type, next.map((r) => r.id));
      toast.success('New order saved. It is live on the site.');
    } catch (e) {
      toast.error((e as Error).message);
      load();
    }
  };

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allShown = shown.length > 0 && shown.every((r) => selected.has(r.id));
  const toggleAll = () => setSelected((s) => { const n = new Set(s); shown.forEach((r) => (allShown ? n.delete(r.id) : n.add(r.id))); return n; });
  const picked = (rows ?? []).filter((r) => selected.has(r.id));
  const name = (r: DocRow) => String(current(r)[def.titleField] || `Untitled ${def.label.toLowerCase()}`);
  const plural = (n: number) => `${n} ${n === 1 ? def.label.toLowerCase() : def.plural.toLowerCase()}`;

  const bulk = async (action: BulkAction) => {
    // Only act where it changes something: publishing live items without edits, or unpublishing drafts, is a no-op.
    const targets = action === 'publish' ? picked.filter((r) => docState(r) !== 'published')
      : action === 'unpublish' ? picked.filter((r) => docState(r) !== 'draft') : picked;
    const skipped = picked.length - targets.length;
    if (!targets.length) {
      toast.success(action === 'publish' ? 'All selected items are already live.' : 'All selected items are already drafts.');
      return;
    }
    if (action === 'delete') {
      const extra = type === 'collection' || type === 'occasion' ? ' Their artworks stay on the site; they just lose this grouping.' : '';
      if (!confirm(`Delete ${plural(targets.length)} for good? This cannot be undone.${extra}`)) return;
    }
    if (action === 'unpublish' && !confirm(`Take ${plural(targets.length)} off the website? They stay here as drafts.`)) return;
    setBulkBusy(true);
    const failed = await each(targets, (r) => (action === 'delete' ? api.remove(r.id) : api.action(r.id, action)));
    setBulkBusy(false);
    const done = targets.length - failed.length;
    const verb = action === 'publish' ? 'Published' : action === 'unpublish' ? 'Taken off the site' : 'Deleted';
    if (done) toast.success(`${verb}: ${plural(done)}.${skipped ? ` ${skipped} already ${action === 'publish' ? 'live' : 'drafts'}.` : ''}`);
    if (failed.length) toast.error(`${failed.length} not ${action === 'delete' ? 'deleted' : action === 'publish' ? 'published' : 'unpublished'}: ${failed.slice(0, 3).map((f) => `"${name(f.item)}" (${f.error})`).join('; ')}${failed.length > 3 ? '; …' : ''}. They are still selected.`);
    setSelected(new Set(failed.map((f) => f.item.id)));
    load();
  };

  const counts = rows ? { draft: rows.filter((r) => docState(r) === 'draft').length, live: rows.filter((r) => docState(r) !== 'draft').length } : { draft: 0, live: 0 };
  const canDrag = def.orderable && filter === 'all' && !q;

  const rowView = (r: DocRow, handle?: React.ReactNode) => {
    const d = current(r);
    const src = thumb(type, d);
    const on = selected.has(r.id);
    return (
      <div className={`admin-row${on ? ' is-selected' : ''}`}>
        <label className="admin-check" title="Select">
          <input type="checkbox" checked={on} onChange={() => toggle(r.id)} aria-label={`Select ${name(r)}`} />
        </label>
        {handle}
        <a href={`#/${type}/${r.id}`} className="admin-row-link">
          <span className="admin-thumb">{src ? <img src={src} alt="" loading="lazy" /> : null}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{d[def.titleField] || `Untitled ${def.label.toLowerCase()}`}</span>
            <span className="block truncate text-sm text-muted">{subtitle(type, d)}</span>
          </span>
          <StateBadge state={docState(r)} />
        </a>
      </div>
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl">{def.plural}</h1>
          {def.intro && <p className="mt-2 max-w-xl text-muted">{def.intro}</p>}
        </div>
        <button type="button" className="btn btn-primary" onClick={create}>+ New {def.label.toLowerCase()}</button>
      </div>

      {type === 'artwork' && (
        <div className="mt-6">
          <DropZone onFiles={bulkCreate} title="Drop photos or a whole folder to create drafts" hint="Each photo or video becomes its own artwork draft, named from the file. Nothing goes on the site until you publish it." />
          <UploadProgress jobs={jobs} onDismiss={clearErrors} />
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="mt-8 flex flex-wrap items-center gap-2">
          {(['all', 'draft', 'live'] as Filter[]).map((f) => (
            <button key={f} type="button" className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === 'all' ? `All (${rows.length})` : f === 'draft' ? `Drafts (${counts.draft})` : `Live (${counts.live})`}
            </button>
          ))}
          <label className="chip ml-auto !pr-3">
            <input type="checkbox" className="admin-check-all" checked={allShown} onChange={toggleAll} disabled={!shown.length} />
            <span aria-hidden="true" className="admin-check-box">{allShown ? '✓' : ''}</span>
            Select all{filter !== 'all' || q ? ' shown' : ''}
          </label>
          {rows.length > 8 && <input type="search" className="input !min-h-10 max-w-xs !py-2" placeholder="Search" aria-label={`Search ${def.plural.toLowerCase()}`} value={q} onChange={(e) => setQ(e.target.value)} />}
        </div>
      )}

      <div className="mt-4">
        {!rows ? <p className="text-muted">Loading…</p> : shown.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line p-8 text-center text-muted">{rows.length ? 'Nothing matches.' : `No ${def.plural.toLowerCase()} yet.`}</p>
        ) : canDrag ? (
          <Sortable items={shown} getId={(r) => r.id} onChange={reorder} label={def.label.toLowerCase()} className="grid gap-2" render={(r, _i, handle) => rowView(r, handle)} />
        ) : (
          <ul className="grid gap-2">{shown.map((r) => <li key={r.id}>{rowView(r)}</li>)}</ul>
        )}
        {def.orderable && !canDrag && rows && rows.length > 1 && <p className="mt-3 text-sm text-muted">Clear the filter to drag items into a new order.</p>}
      </div>

      {picked.length > 0 && (
        <div className="admin-bulkbar" role="region" aria-label="Bulk actions">
          <span className="font-medium">{picked.length} selected</span>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary !min-h-10 !py-2" disabled={bulkBusy} onClick={() => bulk('publish')}>Publish</button>
            <button type="button" className="btn btn-ghost !min-h-10 !py-2" disabled={bulkBusy} onClick={() => bulk('unpublish')}>Unpublish</button>
            <button type="button" className="btn btn-secondary !min-h-10 !py-2 !border-accent-ink !text-accent-ink hover:!bg-accent-ink hover:!text-bg" disabled={bulkBusy} onClick={() => bulk('delete')}>Delete</button>
            <button type="button" className="btn btn-ghost !min-h-10 !py-2" disabled={bulkBusy} onClick={() => setSelected(new Set())}>Clear</button>
          </div>
          {bulkBusy && <span className="text-sm text-muted">Working…</span>}
        </div>
      )}
    </div>
  );
}
