/** List of one content type: create, open, filter, drag to reorder, bulk-create artwork drafts. */
import { useEffect, useMemo, useState } from 'react';
import { api, current, docState, type DocRow } from './api';
import { DropZone, UploadProgress, useUploads } from './MediaFields';
import { Sortable } from './Sortable';
import { TYPES, emptyDoc, type ContentType } from './schema';
import { thumbUrl, titleFromFile, uploadMedia } from './media';
import { StateBadge, useToast } from './ui';

const inr = (n: unknown) => (typeof n === 'number' ? `₹${n.toLocaleString('en-IN')}` : '');
const STATUS: Record<string, string> = { available: 'Available', sold: 'Sold', 'made-to-order': 'Made to order' };

function subtitle(type: ContentType, d: Record<string, any>): string {
  switch (type) {
    case 'artwork': return [STATUS[d.status] ?? 'Available', inr(d.price), d.width && d.height ? `${d.width} × ${d.height} cm` : ''].filter(Boolean).join(' · ');
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

export function ListView({ type }: { type: ContentType }) {
  const def = TYPES[type];
  const toast = useToast();
  const [rows, setRows] = useState<DocRow[] | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const { jobs, run, clearErrors } = useUploads();

  const load = () => api.list(type).then(setRows).catch((e) => toast.error(e.message));
  useEffect(() => { setRows(null); setFilter('all'); setQ(''); load(); }, [type]);

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

  const counts = rows ? { draft: rows.filter((r) => docState(r) === 'draft').length, live: rows.filter((r) => docState(r) !== 'draft').length } : { draft: 0, live: 0 };
  const canDrag = def.orderable && filter === 'all' && !q;

  const rowView = (r: DocRow, handle?: React.ReactNode) => {
    const d = current(r);
    const src = thumb(type, d);
    return (
      <div className="admin-row">
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
    </div>
  );
}
