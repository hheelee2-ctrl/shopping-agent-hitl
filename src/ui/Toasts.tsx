import { useCallback, useEffect, useRef, useState } from 'react';
import { photoUrl } from '../store/photos';

export interface Toast {
  id: number;
  /** ok: 담김·완료 / warn: 담은 상품의 조건이 바뀜 / err: 담지 못함 */
  tone: 'ok' | 'warn' | 'err';
  title: string;
  sub?: string;
  /** 사진을 보여줄 상품 */
  pid?: string;
  action?: { label: string; run: () => void };
}

const LIFE = 5200;

/** 화면 왼쪽 아래에 쌓이는 알림. 마우스를 올리면 사라지지 않고 기다린다. */
export function useToasts() {
  const [items, setItems] = useState<Toast[]>([]);
  const seq = useRef(0);
  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = ++seq.current;
    setItems((xs) => [...xs.slice(-2), { ...t, id }]);
    return id;
  }, []);
  const drop = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  return { items, push, drop };
}

export function Toasts({ items, drop, closeLabel }: { items: Toast[]; drop: (id: number) => void; closeLabel: string }) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {items.map((t) => <ToastItem key={t.id} t={t} drop={drop} closeLabel={closeLabel} />)}
    </div>
  );
}

function ToastItem({ t, drop, closeLabel }: { t: Toast; drop: (id: number) => void; closeLabel: string }) {
  const [hold, setHold] = useState(false);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (hold) return;
    const a = window.setTimeout(() => setLeaving(true), LIFE);
    return () => window.clearTimeout(a);
  }, [hold]);
  useEffect(() => {
    if (!leaving) return;
    const b = window.setTimeout(() => drop(t.id), 260);
    return () => window.clearTimeout(b);
  }, [leaving, drop, t.id]);
  const src = t.pid ? photoUrl(t.pid) : null;
  return (
    <div className={`toast ${t.tone} ${leaving ? 'out' : ''}`} onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)} onFocus={() => setHold(true)} onBlur={() => setHold(false)}>
      {t.pid ? <span className="toast-ph sw">{src && <img className="ph" src={src} alt="" />}</span> : <span className="toast-dot" aria-hidden />}
      <div className="toast-m">
        <b>{t.title}</b>
        {t.sub && <span>{t.sub}</span>}
      </div>
      {t.action && (
        <button className="toast-act" onClick={() => { t.action!.run(); setLeaving(true); }}>{t.action.label}</button>
      )}
      <button className="toast-x" aria-label={closeLabel} onClick={() => setLeaving(true)}>
        <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden><path d="M2 2l8 8M10 2l-8 8" /></svg>
      </button>
    </div>
  );
}
