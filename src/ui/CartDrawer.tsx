import type { Lang } from '../engine/types';
import type { StoreState } from '../store/types';
import { C, money, t } from './copy';

interface Props {
  lang: Lang;
  open: boolean;
  state: StoreState;
  onClose: () => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
  readOnly?: boolean;
}

export function CartDrawer({ lang, open, state, onClose, onRemove, onCheckout, readOnly }: Props) {
  const total = state.cart.reduce((s, l) => s + l.priceAtAdd * l.qty, 0);
  return (
    <aside className={`drawer ${open ? 'open' : ''}`} aria-hidden={!open} aria-label={t(C.cart, lang)}>
      <div className="drawer-head">
        <h2>{t(C.cart, lang)}</h2>
        <button className="btn sm" onClick={onClose}>{t(C.close, lang)}</button>
      </div>
      {state.cart.length === 0 ? (
        <p className="note">{t(C.empty, lang)}</p>
      ) : (
        <ul className="lines">
          {state.cart.map((l) => {
            const p = state.products[l.productId];
            return (
              <li key={l.productId}>
                <div>
                  <div className="name">{t(p.name, lang)} ×{l.qty}</div>
                  <div className="stock">{money(l.priceAtAdd * l.qty, lang)}{l.addedBy === 'agent' ? ` · ${t(C.byAgent, lang)}` : ''}</div>
                </div>
                <button className="btn sm" disabled={readOnly} onClick={() => onRemove(l.productId)}>{t(C.remove, lang)}</button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="total-row">
        <span>{t(C.total, lang)}</span>
        <strong>{money(total, lang)}</strong>
      </div>
      <button className="btn primary" disabled={state.cart.length === 0 || readOnly} onClick={onCheckout}>{t(C.checkout, lang)}</button>
      {state.orders.length > 0 && <p className="note">{t(C.orders, lang)}: {state.orders.length}</p>}
    </aside>
  );
}
