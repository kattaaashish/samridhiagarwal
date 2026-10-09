/** Small shared bits: publish-state badge and toasts. */
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { DocState } from './api';

export function StateBadge({ state }: { state: DocState }) {
  const map = { draft: ['Draft', 'admin-badge-draft'], published: ['Live', 'admin-badge-live'], changed: ['Live · unpublished changes', 'admin-badge-changed'] } as const;
  const [label, cls] = map[state];
  return <span className={`badge ${cls}`}>{label}</span>;
}

interface Toast { id: number; kind: 'success' | 'error'; text: string }
const Ctx = createContext<{ success: (t: string) => void; error: (t: string) => void }>({ success: () => {}, error: () => {} });
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast['kind'], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 8000 : 4000);
  }, []);
  return (
    <Ctx.Provider value={{ success: (t) => push('success', t), error: (t) => push('error', t) }}>
      {children}
      <div className="admin-toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`admin-toast ${t.kind === 'error' ? 'is-error' : ''}`}>
            <span className="flex-1">{t.text}</span>
            <button type="button" aria-label="Dismiss" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}>×</button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
