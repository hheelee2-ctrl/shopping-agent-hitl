import { useEffect, useState } from 'react';
import type { L, Lang } from '../engine/types';
import { photoUrl } from '../store/photos';
import { arrivalLabel, dateLabel, returnLabel, sellerOf } from '../store/sellers';
import { quoteOf } from '../store/store';
import type { Order, StoreState } from '../store/types';
import { C, SV, money, t } from './copy';

export type DrawerTab = 'cart' | 'orders';

interface Props {
  lang: Lang;
  open: boolean;
  tab: DrawerTab;
  onTab: (t: DrawerTab) => void;
  state: StoreState;
  now: number;
  onClose: () => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
  readOnly?: boolean;
}

export function CartDrawer({ lang, open, tab, onTab, state, now, onClose, onRemove, onCheckout, readOnly }: Props) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  const groups = quoteOf(state.cart, now);
  const total = groups.reduce((a, g) => a + g.total, 0);
  const ship = groups.reduce((a, g) => a + g.shipping, 0);
  const count = state.cart.reduce((a, l) => a + l.qty, 0);

  return (
    <aside className={`drawer ${open ? 'open' : ''}`} aria-hidden={!open} aria-label={t(C.cart, lang)}>
      <div className="drawer-head">
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'cart'} onClick={() => onTab('cart')}>
            {t(SV.cartTab, lang)}{count > 0 && <span className="cnt">{count}</span>}
          </button>
          <button role="tab" aria-selected={tab === 'orders'} onClick={() => onTab('orders')}>
            {t(SV.ordersTab, lang)}{state.orders.length > 0 && <span className="cnt">{state.orders.length}</span>}
          </button>
        </div>
        <button className="btn sm" onClick={onClose}>{t(C.close, lang)}</button>
      </div>

      {tab === 'cart' ? (
        <>
          {groups.length === 0 ? (
            <p className="drawer-empty">{t(C.empty, lang)}</p>
          ) : (
            <div className="groups">
              {groups.map((g) => {
                const s = sellerOf(g.sellerId);
                const left = s.freeOver !== undefined && g.shipping > 0 ? s.freeOver - g.subtotal : 0;
                return (
                  <section key={g.sellerId} className="group">
                    <header>
                      <b>{t(s.name, lang)}</b>
                      <span>{t(arrivalLabel(g.arriveAt, now), lang)}</span>
                    </header>
                    <ul className="lines">
                      {g.lines.map((l) => {
                        const p = state.products[l.productId];
                        const src = photoUrl(l.productId);
                        return (
                          <li key={l.productId}>
                            <span className={`thumb sw sw-${p.colors[0]}`}>{src && <img className="ph" src={src} alt="" />}</span>
                            <div className="line-m">
                              <div className="name">{t(p.name, lang)}</div>
                              <div className="sub">
                                {l.size !== 'FREE' && <>{l.size}, </>}{l.qty}{lang === 'ko' ? '개' : ' pc'}
                                {l.addedBy === 'agent' && <em>{t(C.byAgent, lang)}</em>}
                              </div>
                            </div>
                            <div className="line-r">
                              <b>{money(l.priceAtAdd * l.qty, lang)}</b>
                              <button className="link-btn" disabled={readOnly} onClick={() => onRemove(l.productId)}>{t(C.remove, lang)}</button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                    <footer>
                      <span>{g.shipping > 0 ? SV.shipFee[lang](money(g.shipping, lang)) : t(SV.freeShip, lang)}</span>
                      {left > 0 && <span className="hint">{SV.freeLeft[lang](money(left, lang))}</span>}
                      <span className="ret">{t(returnLabel(s), lang)}</span>
                    </footer>
                  </section>
                );
              })}
              {groups.length > 1 && <p className="note">{SV.splitNote[lang](groups.length)}</p>}
            </div>
          )}
          <div className="checkout">
            <div className="addr"><span>{t(SV.address, lang)}</span><b>{t(SV.addressV, lang)}</b></div>
            <div className="sum">
              <span>{t(SV.subtotal, lang)} {money(total - ship, lang)}, {t(SV.shipTotal, lang)} {money(ship, lang)}</span>
              <strong>{money(total, lang)}</strong>
            </div>
            <button className="btn primary block" disabled={groups.length === 0 || readOnly} onClick={onCheckout}>{t(C.checkout, lang)}</button>
          </div>
        </>
      ) : (
        <Orders lang={lang} orders={state.orders} state={state} now={now} />
      )}
    </aside>
  );
}

type Stage = 'paid' | 'ready' | 'shipped' | 'transit' | 'arrived';

/** 지금 시각과 출고·도착 시각으로 정한 배송 단계. 시간이 흐르면 실제로 바뀐다. */
function stageOf(o: Order, now: number): Stage {
  if (now >= o.arriveAt) return 'arrived';
  if (now >= o.shipAt + 6 * 3600000) return 'transit';
  if (now >= o.shipAt) return 'shipped';
  if (now >= o.placedAt + 10 * 60000) return 'ready';
  return 'paid';
}

function Orders({ lang, orders, state, now }: { lang: Lang; orders: Order[]; state: StoreState; now: number }) {
  // 1분마다 배송 단계를 다시 계산한다
  const [, tick] = useState(0);
  useEffect(() => { const id = window.setInterval(() => tick((n) => n + 1), 60000); return () => window.clearInterval(id); }, []);
  if (orders.length === 0) return <p className="drawer-empty">{t(SV.noOrders, lang)}</p>;
  const order: Stage[] = ['paid', 'ready', 'shipped', 'transit', 'arrived'];
  return (
    <div className="orders">
      {orders.map((o) => {
        const s = sellerOf(o.sellerId);
        const at = order.indexOf(stageOf(o, now));
        const when: Partial<Record<Stage, L>> = { paid: dateLabel(o.placedAt), shipped: dateLabel(o.shipAt), arrived: arrivalLabel(o.arriveAt, now) };
        return (
          <article key={o.id} className="order">
            <header>
              <div>
                <b>{t(s.name, lang)}</b>
                <span>{t(SV.orderNo, lang)} {o.id}</span>
              </div>
              <strong>{money(o.total, lang)}</strong>
            </header>
            <ul className="order-items">
              {o.lines.map((l) => (
                <li key={l.productId}>{t(state.products[l.productId].name, lang)}{l.size !== 'FREE' ? `, ${l.size}` : ''}{l.qty > 1 ? ` ×${l.qty}` : ''}</li>
              ))}
            </ul>
            <ol className="track" aria-label={t(SV.st[order[at]], lang)}>
              {order.map((st, i) => (
                <li key={st} className={i < at ? 'past' : i === at ? 'now' : ''}>
                  <span className="pt" aria-hidden />
                  <span className="st">{t(SV.st[st], lang)}</span>
                  {when[st] && <span className="tm">{t(when[st]!, lang)}{i > at ? ` ${t(SV.expected, lang)}` : ''}</span>}
                </li>
              ))}
            </ol>
            <p className="note">{SV.contact[lang](t(s.name, lang))} {SV.placedBy[lang][o.by]}.</p>
          </article>
        );
      })}
    </div>
  );
}
