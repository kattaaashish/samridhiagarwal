/** Renders one schema field as a form control. */
import { useEffect, useId, useState } from 'react';
import { api, current, docState, newKey, type DocRow } from './api';
import { TYPES, type Field, type ContentType } from './schema';
import { ImageField, MediaField, MediaListField, useUploads, DropZone, UploadProgress } from './MediaFields';
import { Sortable } from './Sortable';
import { thumbUrl, uploadImage } from './media';

const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

export interface FieldProps {
  field: Field;
  value: any;
  onChange: (v: any) => void;
  doc: Record<string, any>;
  invalid?: boolean;
}

export function FieldRow({ field, value, onChange, doc, invalid }: FieldProps) {
  const id = useId();
  const isGroup = ['mediaList', 'media', 'image', 'refs', 'stringList', 'objectList', 'object', 'blocks', 'select', 'boolean'].includes(field.type);
  const label = (
    <>
      {field.label}
      {field.required && <span className="text-accent-ink" aria-hidden="true"> *</span>}
    </>
  );
  const help = field.help && <p id={`${id}-help`} className="text-sm text-muted">{field.help}</p>;
  const control = <Control field={field} value={value} onChange={onChange} doc={doc} id={id} describedBy={field.help ? `${id}-help` : undefined} />;
  if (field.type === 'boolean') return <div className="admin-field">{control}{help}</div>;
  return isGroup ? (
    <fieldset className={`admin-field ${invalid ? 'is-invalid' : ''}`} aria-describedby={field.help ? `${id}-help` : undefined}>
      <legend className="admin-label">{label}</legend>
      {help}
      {control}
      {invalid && <p className="text-sm text-accent-ink">This is needed before publishing.</p>}
    </fieldset>
  ) : (
    <div className={`admin-field ${invalid ? 'is-invalid' : ''}`}>
      <label htmlFor={id} className="admin-label">{label}</label>
      {help}
      {control}
      {invalid && <p className="text-sm text-accent-ink">This is needed before publishing.</p>}
    </div>
  );
}

function Control({ field, value, onChange, doc, id, describedBy }: FieldProps & { id: string; describedBy?: string }) {
  const common = { id, 'aria-describedby': describedBy, className: 'input' };
  switch (field.type) {
    case 'string':
      return <input {...common} type="text" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
    case 'url':
      return <input {...common} type="url" inputMode="url" placeholder="https://" value={value ?? ''} onChange={(e) => onChange(e.target.value.trim() || undefined)} />;
    case 'date':
      return <input {...common} type="date" value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)} className="input max-w-56" />;
    case 'number':
      return <input {...common} type="number" inputMode="decimal" min={field.min} step="any" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))} className="input max-w-56" />;
    case 'text': {
      const len = String(value ?? '').length;
      return (
        <div>
          <textarea {...common} rows={field.rows ?? 3} value={value ?? ''} onChange={(e) => onChange(e.target.value)} style={{ minHeight: `${(field.rows ?? 3) * 1.6 + 1.5}rem` }} />
          {field.max && <p className={`mt-1 text-right text-xs ${len > field.max ? 'text-accent-ink' : 'text-muted'}`}>{len} / {field.max}</p>}
        </div>
      );
    }
    case 'boolean':
      return (
        <label className="admin-switch">
          <input type="checkbox" role="switch" checked={!!value} onChange={(e) => onChange(e.target.checked)} aria-describedby={describedBy} />
          <span aria-hidden="true" />
          <span className="admin-label">{field.label}</span>
        </label>
      );
    case 'select':
      return (
        <div className="flex flex-wrap gap-2" role="radiogroup">
          {field.options.map((o) => (
            <label key={o.value} className="chip relative">
              <input type="radio" name={id} value={o.value} checked={(value ?? field.initial) === o.value} onChange={() => onChange(o.value)} />
              {o.label}
            </label>
          ))}
        </div>
      );
    case 'slug': {
      const v = value?.current ?? '';
      return (
        <div className="flex flex-wrap items-center gap-2">
          <input {...common} type="text" value={v} placeholder={slugify(doc[field.source] ?? '') || 'made-from-the-title'} onChange={(e) => onChange(e.target.value ? { current: slugify(e.target.value) } : undefined)} className="input max-w-md flex-1" />
          <button type="button" className="btn btn-ghost min-h-10 px-4 py-2 text-sm" onClick={() => onChange({ current: slugify(doc[field.source] ?? '') })}>Make from {field.source}</button>
        </div>
      );
    }
    case 'media':
      return <MediaField value={value} onChange={onChange} />;
    case 'mediaList':
      return <MediaListField value={value} onChange={onChange} max={field.max} />;
    case 'image':
      return <ImageField value={value} onChange={onChange} />;
    case 'ref':
      return <RefPicker to={field.to} value={value?._ref ? [value._ref] : []} single onChange={(ids) => onChange(ids[0] ? { _type: 'reference', _ref: ids[0] } : undefined)} />;
    case 'refs':
      return <RefPicker to={field.to} value={(value ?? []).map((r: any) => r._ref)} onChange={(ids) => onChange(ids.map((x) => ({ _type: 'reference', _ref: x, _key: x })))} />;
    case 'stringList':
      return <StringList value={value ?? []} onChange={onChange} itemLabel={field.itemLabel ?? 'Item'} />;
    case 'objectList':
      return <ObjectList field={field} value={value ?? []} onChange={onChange} />;
    case 'object':
      return (
        <div className="grid gap-4 rounded-xl border border-line p-4">
          {field.fields.map((f) => (
            <FieldRow key={f.name} field={f} doc={value ?? {}} value={value?.[f.name]} onChange={(v) => onChange({ ...(value ?? {}), [f.name]: v })} />
          ))}
        </div>
      );
    case 'blocks':
      return <Blocks value={value ?? []} onChange={onChange} />;
  }
}

/** Choose linked items (collections, occasions, artworks, posts). Drafts are listed and marked. */
function RefPicker({ to, value, onChange, single = false }: { to: ContentType; value: string[]; onChange: (ids: string[]) => void; single?: boolean }) {
  const [rows, setRows] = useState<DocRow[] | null>(null);
  const [q, setQ] = useState('');
  useEffect(() => { api.list(to).then(setRows).catch(() => setRows([])); }, [to]);
  const def = TYPES[to];
  if (!rows) return <p className="text-sm text-muted">Loading…</p>;
  if (!rows.length) return <p className="text-sm text-muted">No {def.plural.toLowerCase()} yet. <a className="link" href={`#/${to}`}>Create one</a>.</p>;
  const sorted = [...rows].sort((a, b) => String(current(a).orderRank ?? current(a)[def.titleField] ?? '').localeCompare(String(current(b).orderRank ?? current(b)[def.titleField] ?? '')));
  const shown = q ? sorted.filter((r) => String(current(r)[def.titleField] ?? '').toLowerCase().includes(q.toLowerCase())) : sorted;
  const toggle = (id: string) => onChange(single ? (value.includes(id) ? [] : [id]) : value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div className="grid gap-2">
      {rows.length > 12 && <input className="input max-w-sm" type="search" placeholder={`Search ${def.plural.toLowerCase()}`} value={q} onChange={(e) => setQ(e.target.value)} />}
      <div className="flex flex-wrap gap-2">
        {shown.map((r) => {
          const d = current(r);
          const hidden = d.visible === false;
          return (
            <label key={r.id} className="chip relative">
              <input type={single ? 'radio' : 'checkbox'} checked={value.includes(r.id)} onChange={() => toggle(r.id)} onClick={single && value.includes(r.id) ? () => onChange([]) : undefined} />
              {d[def.titleField] || 'Untitled'}
              {(docState(r) === 'draft' || hidden) && <span className="text-xs opacity-70">({docState(r) === 'draft' ? 'draft' : 'hidden'})</span>}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function StringList({ value, onChange, itemLabel }: { value: string[]; onChange: (v: string[]) => void; itemLabel: string }) {
  const items = value.map((text, i) => ({ id: `${i}:${text}`, text, i }));
  return (
    <div className="grid gap-2">
      {items.length > 0 && (
        <Sortable items={items} getId={(x) => String(x.i)} label={itemLabel.toLowerCase()} className="grid gap-2"
          onChange={(next) => onChange(next.map((x) => x.text))}
          render={(x, i, handle) => (
            <div className="flex items-center gap-2">
              {handle}
              <input className="input flex-1" aria-label={`${itemLabel} ${i + 1}`} value={x.text} onChange={(e) => onChange(value.map((v, k) => (k === i ? e.target.value : v)))} />
              <button type="button" className="admin-icon-btn" aria-label={`Remove ${itemLabel.toLowerCase()} ${i + 1}`} onClick={() => onChange(value.filter((_, k) => k !== i))}>×</button>
            </div>
          )}
        />
      )}
      <button type="button" className="btn btn-ghost min-h-10 justify-self-start px-4 py-2 text-sm" onClick={() => onChange([...value, ''])}>+ Add {itemLabel.toLowerCase()}</button>
    </div>
  );
}

function ObjectList({ field, value, onChange }: { field: Extract<Field, { type: 'objectList' }>; value: any[]; onChange: (v: any[]) => void }) {
  const items = value.map((v) => (v._key ? v : { ...v, _key: newKey() }));
  return (
    <div className="grid gap-3">
      {items.length > 0 && (
        <Sortable items={items} getId={(x) => x._key} label={field.itemLabel.toLowerCase()} className="grid gap-3" onChange={onChange}
          render={(item, i, handle) => (
            <div className="rounded-xl border border-line bg-bg p-4">
              <div className="mb-3 flex items-center gap-2">
                {handle}
                <span className="flex-1 text-sm font-medium">{field.itemLabel} {i + 1}</span>
                <button type="button" className="link text-sm" onClick={() => onChange(items.filter((x) => x._key !== item._key))}>Remove</button>
              </div>
              <div className="grid gap-4">
                {field.fields.map((f) => (
                  <FieldRow key={f.name} field={f} doc={item} value={item[f.name]} onChange={(v) => onChange(items.map((x) => (x._key === item._key ? { ...x, [f.name]: v } : x)))} />
                ))}
              </div>
            </div>
          )}
        />
      )}
      <button type="button" className="btn btn-ghost min-h-10 justify-self-start px-4 py-2 text-sm" onClick={() => onChange([...items, { _key: newKey() }])}>+ Add {field.itemLabel.toLowerCase()}</button>
    </div>
  );
}

/* ---------- Journal story: blocks stored in the shape lib/portable-text.ts renders ---------- */

const STYLES = [{ value: 'normal', label: 'Paragraph' }, { value: 'h2', label: 'Heading' }, { value: 'blockquote', label: 'Quote' }];
const blockText = (b: any) => (b.children ?? []).map((c: any) => c.text ?? '').join('');
const textBlock = (style: string, text = '') => ({ _type: 'block', _key: newKey(), style, markDefs: [], children: [{ _type: 'span', _key: newKey(), text, marks: [] }] });

function Blocks({ value, onChange }: { value: any[]; onChange: (v: any[]) => void }) {
  const items = value.map((b) => (b._key ? b : { ...b, _key: newKey() }));
  const { jobs, run, clearErrors } = useUploads();
  const update = (key: string, patch: any) => onChange(items.map((b) => (b._key === key ? { ...b, ...patch } : b)));
  const addImages = async (files: File[]) => {
    const imgs = await run(files, (f, p) => uploadImage(f, p));
    onChange([...items, ...imgs.map((img) => ({ _type: 'image', _key: newKey(), ...img, alt: '', caption: '' }))]);
  };
  return (
    <div className="grid gap-3">
      {items.length > 0 && (
        <Sortable items={items} getId={(b) => b._key} label="block" className="grid gap-3" onChange={onChange}
          render={(b, i, handle) => (
            <div className="flex gap-2 rounded-xl border border-line bg-bg p-3">
              <div className="pt-1">{handle}</div>
              <div className="grid min-w-0 flex-1 gap-2">
                {b._type === 'image' ? (
                  <div className="flex flex-wrap items-start gap-3">
                    <img src={thumbUrl(b)} alt="" className="h-24 w-auto rounded-md bg-surface" />
                    <div className="grid min-w-48 flex-1 gap-2">
                      <input className="input !min-h-9 !py-1.5 text-sm" placeholder="Description for screen readers" aria-label={`Image ${i + 1} description`} value={b.alt ?? ''} onChange={(e) => update(b._key, { alt: e.target.value })} />
                      <input className="input !min-h-9 !py-1.5 text-sm" placeholder="Caption (optional)" aria-label={`Image ${i + 1} caption`} value={b.caption ?? ''} onChange={(e) => update(b._key, { caption: e.target.value })} />
                    </div>
                  </div>
                ) : (
                  <>
                    <select className="input !min-h-9 max-w-40 !py-1 text-sm" aria-label={`Block ${i + 1} style`} value={b.style ?? 'normal'} onChange={(e) => update(b._key, { style: e.target.value })}>
                      {STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <textarea className={`input ${b.style === 'h2' ? 'font-display text-xl' : ''}`} rows={b.style === 'h2' ? 1 : 4} style={{ minHeight: b.style === 'h2' ? '3rem' : '7rem' }} aria-label={`Block ${i + 1} text`} value={blockText(b)}
                      onChange={(e) => update(b._key, { markDefs: [], children: [{ _type: 'span', _key: b.children?.[0]?._key ?? newKey(), text: e.target.value, marks: [] }] })} />
                  </>
                )}
              </div>
              <button type="button" className="admin-icon-btn self-start" aria-label={`Remove block ${i + 1}`} onClick={() => onChange(items.filter((x) => x._key !== b._key))}>×</button>
            </div>
          )}
        />
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-ghost min-h-10 px-4 py-2 text-sm" onClick={() => onChange([...items, textBlock('normal')])}>+ Paragraph</button>
        <button type="button" className="btn btn-ghost min-h-10 px-4 py-2 text-sm" onClick={() => onChange([...items, textBlock('h2')])}>+ Heading</button>
        <button type="button" className="btn btn-ghost min-h-10 px-4 py-2 text-sm" onClick={() => onChange([...items, textBlock('blockquote')])}>+ Quote</button>
      </div>
      <DropZone onFiles={addImages} accept="image" compact title="Add images to the story" hint="Drop one or many; they are added at the end, then drag them into place." />
      <UploadProgress jobs={jobs} onDismiss={clearErrors} />
    </div>
  );
}
