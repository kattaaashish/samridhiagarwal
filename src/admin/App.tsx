/** /admin shell: navigation + hash routes (#/artwork, #/artwork/<id>, #/siteSettings). */
import { useEffect, useState } from 'react';
import { api } from './api';
import { Editor } from './Editor';
import { ListView } from './ListView';
import { CONTENT_TYPES, SINGLETONS, TYPES, type ContentType } from './schema';
import { ToastProvider } from './ui';

const CONTENT = CONTENT_TYPES.filter((t) => !SINGLETONS.has(t));
const PAGES = CONTENT_TYPES.filter((t) => SINGLETONS.has(t));

function parse(hash: string): { type: ContentType; id?: string } {
  const [, t, id] = hash.replace(/^#/, '').split('/');
  const type = (CONTENT_TYPES as readonly string[]).includes(t) ? (t as ContentType) : 'artwork';
  return { type, id: SINGLETONS.has(type) ? type : id };
}

export default function App() {
  const [route, setRoute] = useState(() => parse(location.hash));
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const on = () => { setRoute(parse(location.hash)); setMenuOpen(false); scrollTo(0, 0); };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);

  const link = (t: ContentType) => (
    <a key={t} href={`#/${t}`} className="admin-nav-link" aria-current={route.type === t ? 'page' : undefined}>{TYPES[t].plural}</a>
  );

  return (
    <ToastProvider>
      <div className="admin-shell">
        <header className="admin-top">
          <a href="#/artwork" className="font-display text-xl">Studio admin</a>
          <button type="button" className="btn btn-ghost min-h-10 px-4 py-2 text-sm lg:hidden" aria-expanded={menuOpen} aria-controls="admin-nav" onClick={() => setMenuOpen((o) => !o)}>{menuOpen ? 'Close' : 'Menu'}</button>
        </header>
        <nav id="admin-nav" className={`admin-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Admin">
          <p className="admin-nav-heading">Content</p>
          {CONTENT.map(link)}
          <p className="admin-nav-heading">Pages &amp; settings</p>
          {PAGES.map(link)}
          <div className="mt-auto grid gap-1 pt-6">
            <a href="/" target="_blank" rel="noopener" className="admin-nav-link">View site ↗</a>
            <button type="button" className="admin-nav-link text-left" onClick={async () => { await api.logout().catch(() => {}); location.reload(); }}>Log out</button>
          </div>
        </nav>
        <main className="admin-main" id="admin-main">
          {route.id ? <Editor key={route.id} type={route.type} id={route.id} /> : <ListView type={route.type} />}
        </main>
      </div>
    </ToastProvider>
  );
}
