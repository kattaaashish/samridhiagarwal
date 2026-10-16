/** Edit one document. Changes save as a draft automatically; Publish puts them on the site. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, current, docState, type DocRow } from './api';
import { FieldRow } from './Fields';
import { SINGLETONS, TYPES, missingRequired, type ContentType } from './schema';
import { StateBadge, useToast } from './ui';
import { withInches } from '@/lib/size';

export function sitePath(type: ContentType, doc: Record<string, any>): string | undefined {
  const slug = doc.slug?.current;
  switch (type) {
    case 'artwork': return slug && `/artwork/${slug}`;
    case 'collection': return slug && `/collections/${slug}`;
    case 'occasion': return slug && `/gifting/${slug}`;
    case 'post': return slug && `/journal/${slug}`;
    case 'exhibition': return '/exhibitions';
    case 'aboutPage': return '/about';
    case 'commissionsPage': return '/commissions';
    default: return '/';
  }
}

/** Older artworks hold cm; show them in inches. Saved as inches on the next edit. */
const forEditing = (type: ContentType, d: Record<string, any>) => (type === 'artwork' ? withInches(d) : d);

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function Editor({ type, id }: { type: ContentType; id: string }) {
  const def = TYPES[type];
  const toast = useToast();
  const [row, setRow] = useState<DocRow | null>(null);
  const [doc, setDoc] = useState<Record<string, any>>({});
  const [save, setSave] = useState<SaveState>('idle');
  const [invalid, setInvalid] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState(def.groups?.[0]);
  const docRef = useRef(doc);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setRow(null);
    api.get(id).then((r) => { setRow(r); const d = forEditing(type, current(r)); setDoc(d); docRef.current = d; }).catch((e) => toast.error(e.message));
  }, [id]);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    if (!dirty.current) return;
    dirty.current = false;
    setSave('saving');
    try {
      setRow(await api.save(id, docRef.current));
      setSave('saved');
    } catch (e) {
      dirty.current = true;
      setSave('error');
      throw e;
    }
  }, [id]);

  // Save when leaving the page or switching documents.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty.current) { e.preventDefault(); flush().catch(() => {}); } };
    addEventListener('beforeunload', warn);
    return () => { removeEventListener('beforeunload', warn); flush().catch(() => {}); };
  }, [flush]);

  const change = (name: string, value: any) => {
    const next = { ...docRef.current, [name]: value };
    if (value === undefined) delete next[name];
    docRef.current = next;
    setDoc(next);
    dirty.current = true;
    setSave('idle');
    if (invalid.has(name)) setInvalid((s) => { const n = new Set(s); n.delete(name); return n; });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => flush().catch((e) => toast.error(`Not saved: ${e.message}`)), 700);
  };

  const act = async (action: 'publish' | 'unpublish' | 'discard') => {
    setBusy(true);
    try {
      await flush();
      if (action === 'publish') {
        const missing = def.fields.filter((f) => missingRequired(type, docRef.current).includes(f.label));
        if (missing.length) {
          setInvalid(new Set(missing.map((f) => f.name)));
          const first = missing[0];
          if (first.group) setTab(first.group);
          toast.error(`Please fill in: ${missing.map((f) => f.label).join(', ')}`);
          return;
        }
      }
      if (action === 'discard' && !confirm('Throw away the changes you made since the last publish?')) return;
      if (action === 'unpublish' && !confirm('Take this off the website? It stays here as a draft.')) return;
      const r = await api.action(id, action);
      setSave('idle');
      setRow(r);
      const d = forEditing(type, current(r));
      setDoc(d);
      docRef.current = d;
      toast.success(action === 'publish' ? 'Published. It is live on the site now.' : action === 'unpublish' ? 'Taken off the site. Saved as a draft.' : 'Changes discarded.');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const extra = type === 'collection' || type === 'occasion' ? ' Its artworks stay on the site; they just lose this grouping.' : '';
    if (!confirm(`Delete "${doc[def.titleField] || 'this item'}" for good?${extra}`)) return;
    try {
      clearTimeout(timer.current);
      dirty.current = false;
      await api.remove(id);
      toast.success('Deleted.');
      location.hash = `#/${type}`;
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (!row) return <p className="text-muted">Loading…</p>;
  const state = docState(row);
  const singleton = SINGLETONS.has(type);
  const path = row.published ? sitePath(type, row.published) : undefined;
  const groups = def.groups;
  const fields = def.fields.filter((f) => !groups || (f.group ?? groups[0]) === tab);
  const title = singleton ? def.label : doc[def.titleField] || `Untitled ${def.label.toLowerCase()}`;

  return (
    <div>
      {!singleton && <a href={`#/${type}`} className="link text-sm">← All {def.plural.toLowerCase()}</a>}
      <div className="admin-editor-bar">
        <div className="min-w-0">
          <h1 className="truncate text-2xl md:text-3xl">{title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            <StateBadge state={state} />
            <span aria-live="polite">{save === 'saving' ? 'Saving…' : save === 'saved' ? 'Draft saved' : save === 'error' ? 'Not saved, retrying when you edit' : ''}</span>
            {path && <a className="link" href={path} target="_blank" rel="noopener">View on site ↗</a>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {state === 'changed' && <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => act('discard')}>Discard changes</button>}
          {state !== 'draft' && !singleton && <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => act('unpublish')}>Unpublish</button>}
          {state === 'published' && !dirty.current ? (
            <span className="btn btn-ghost pointer-events-none" aria-label="Published, no unpublished changes">Published ✓</span>
          ) : (
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => act('publish')}>
              {state === 'changed' ? 'Publish changes' : 'Publish'}
            </button>
          )}
        </div>
      </div>

      {groups && (
        <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Sections">
          {groups.map((g) => {
            const bad = def.fields.some((f) => (f.group ?? groups[0]) === g && invalid.has(f.name));
            return (
              <button key={g} type="button" role="tab" aria-selected={tab === g} className="chip" aria-pressed={tab === g} onClick={() => setTab(g)}>
                {g}{bad && <span className="text-accent" aria-label="needs attention"> •</span>}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid max-w-3xl gap-7" role={groups ? 'tabpanel' : undefined}>
        {fields.map((f) => (
          <FieldRow key={`${id}:${f.name}`} field={f} value={doc[f.name]} doc={doc} invalid={invalid.has(f.name)} onChange={(v) => change(f.name, v)} />
        ))}
      </div>

      {!singleton && (
        <div className="mt-12 max-w-3xl border-t border-line pt-6">
          <button type="button" className="btn btn-secondary !border-accent-ink !text-accent-ink hover:!bg-accent-ink hover:!text-bg" onClick={remove}>Delete {def.label.toLowerCase()}</button>
        </div>
      )}
    </div>
  );
}
