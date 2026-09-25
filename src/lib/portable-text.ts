/** Minimal Portable Text → HTML renderer (no client JS, no React) for journal bodies. */
import { toImageSource } from './media';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function renderPortableText(blocks: any[]): string {
  let html = '';
  let listOpen: string | null = null;
  const closeList = () => { if (listOpen) { html += `</${listOpen}>`; listOpen = null; } };

  for (const b of blocks ?? []) {
    if (b._type === 'image') {
      closeList();
      const img = toImageSource(b);
      if (img) {
        const srcset = img.srcset ? ` srcset="${esc(img.srcset)}" sizes="(min-width: 768px) 42rem, 100vw"` : '';
        const modern = img.modernSrcset ? `<source type="${img.modernType}" srcset="${esc(img.modernSrcset)}" sizes="(min-width: 768px) 42rem, 100vw">` : '';
        html += `<figure class="my-8 rounded-xl overflow-hidden bg-surface"><picture>${modern}<img src="${esc(img.src)}"${srcset} width="${img.width}" height="${img.height}" alt="${esc(b.alt ?? '')}" loading="lazy" decoding="async"></picture>${b.caption ? `<figcaption class="text-sm text-muted mt-2">${esc(b.caption)}</figcaption>` : ''}</figure>`;
      }
      continue;
    }
    if (b._type !== 'block') continue;
    const marks: Record<string, any> = Object.fromEntries((b.markDefs ?? []).map((m: any) => [m._key, m]));
    const inner = (b.children ?? [])
      .map((c: any) => {
        let t = esc(c.text ?? '');
        for (const m of c.marks ?? []) {
          if (m === 'strong') t = `<strong>${t}</strong>`;
          else if (m === 'em') t = `<em>${t}</em>`;
          else if (m === 'code') t = `<code>${t}</code>`;
          else if (marks[m]?._type === 'link') t = `<a href="${esc(marks[m].href ?? '#')}" rel="noopener">${t}</a>`;
        }
        return t;
      })
      .join('');
    if (b.listItem) {
      const tag = b.listItem === 'number' ? 'ol' : 'ul';
      if (listOpen !== tag) { closeList(); html += `<${tag}>`; listOpen = tag; }
      html += `<li>${inner}</li>`;
      continue;
    }
    closeList();
    const style = b.style ?? 'normal';
    if (style === 'blockquote') html += `<blockquote>${inner}</blockquote>`;
    else if (/^h[1-6]$/.test(style)) html += `<${style === 'h1' ? 'h2' : style}>${inner}</${style === 'h1' ? 'h2' : style}>`;
    else html += `<p>${inner}</p>`;
  }
  closeList();
  return html;
}
