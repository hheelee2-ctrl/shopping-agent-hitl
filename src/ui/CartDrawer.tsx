import { useEffect, useState } from 'react';
import type { L, Lang } from '../engine/types';
import { photoUrl } from '../store/photos';
import { arrivalLabel, dateLabel, returnLabel, sellerOf } from '../store/sellers';
import { quoteOf, type CartIssue, type Quote } from '../store/store';
import type { Order, StoreState } from '../store/types';
import { C, SV, money, t } from './copy';
import { Icon } from './Icon';
import { Stepper } from './Shop';

export type DrawerTab = 'cart' | 'orders';
type Step = 'cart' | 'review' | 'done';

interface Props {
  lang: Lang;
  open: boolean;
  tab: DrawerTab;
  onTab: (t: DrawerTab) => void;
  state: StoreState;
  now: number;
  issues: CartIssue[];
  onClose: () => void;
  onRemove: (id: string) => void;
  onQty: (id: string, qty: number) => void;
  onRefresh: () => void;
  onCheckout: () => Order[] | null;
  onOrders: () => void;
  readOnly?: boolean;
}

/**
 * 장바구니 → 결제 전 확인 → 주문 완료. 단계마다 지금 무엇을 하는지, 얼마가 어디로 나가는지 한 화면에서 보인다.
 * 담은 뒤 판매처 조건(가격·재고)이 바뀌면 결제를 막고 먼저 반영하게 한다.
 */
export function CartDrawer({ lang, open, tab, onTab, state, now, issues, onClose, onRemove, onQty, onRefresh, onCheckout, onOrders, readOnly }: Props) {
  const [step, setStep] = useState<Step>('cart');
  const [placed, setPlaced] = useState<Order[]>([]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  // 닫았다 열면 장바구니부터. 결제 확인 중에 장바구니가 비면 장바구니로 돌아간다.
  useEffect(() => { if (!open) { setStep('cart'); setPlaced([]); } }, [open]);
  useEffect(() => { if (step === 'review' && state.cart.length === 0) setStep('cart'); }, [step, state.cart.length]);

  const groups = quoteOf(state.cart, now);
  const total = groups.reduce((a, g) => a + g.total, 0);
  const ship = groups.reduce((a, g) => a + g.shipping, 0);
  const count = state.cart.reduce((a, l) => a + l.qty, 0);
  const name = (pid: string) => t(state.products[pid].name, lang);

  const pay = () => {
    const made = onCheckout();
    if (made) { setPlaced(made); setStep('done'); }
  };

  return (
    <aside className={`drawer ${open ? 'open' : ''}`} aria-hidden={!open} aria-label={t(C.cart, lang)}>
      <div className="drawer-head">
        {step === 'cart' || tab === 'orders' ? (
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'cart'} onClick={() => { onTab('cart'); setStep('cart'); }}>
              {t(SV.cartTab, lang)}{count > 0 && <span className="cnt">{count}</span>}
            </button>
            <button role="tab" aria-selected={tab === 'orders'} onClick={() => onTab('orders')}>
              {t(SV.ordersTab, lang)}{state.orders.length > 0 && <span className="cnt">{state.orders.length}</span>}
            </button>
          </div>
        ) : step === 'review' ? (
          <div className="crumb">
            <button className="back" onClick={() => setStep('cart')} aria-label={t(SV.back, lang)}>
              <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden><path d="M7.5 2.5L4 6l3.5 3.5" /></svg>
            </button>
            <h2>{t(SV.reviewTitle, lang)}</h2>
          </div>
        ) : <span />}
        <button className="btn sm" onClick={onClose}>{t(C.close, lang)}</button>
      </div>

      {tab === 'orders' ? (
        <Orders lang={lang} orders={state.orders} state={state} now={now} />
      ) : step === 'done' ? (
        <Done lang={lang} orders={placed} now={now} state={state} onOrders={onOrders} onClose={onClose} />
      ) : (
        <>
          {issues.length > 0 && (
            <div className="changed" role="alert">
              <b>{t(SV.changedTitle, lang)}</b>
              <ul>
                {issues.map((x) => (
                  <li key={x.productId}>
                    {x.kind === 'price'
                      ? SV.changedPrice[lang](name(x.productId), money(x.from, lang), money(x.to, lang))
                      : SV.changedStock[lang](name(x.productId), x.left)}
                  </li>
                ))}
              </ul>
              <button className="btn sm" disabled={readOnly} onClick={onRefresh}>{t(SV.changedFix, lang)}</button>
            </div>
          )}

          {groups.length === 0 ? (
            <p className="drawer-empty">{t(C.empty, lang)}</p>
          ) : step === 'cart' ? (
            <div className="groups">
              {groups.map((g) => <Group key={g.sellerId} g={g} lang={lang} now={now} state={state} readOnly={readOnly} onQty={onQty} onRemove={onRemove} />)}
              {groups.length > 1 && <p className="note">{SV.splitNote[lang](groups.length)}</p>}
            </div>
          ) : (
            <div className="groups review">
              <dl className="kv">
                <div><dt>{t(SV.address, lang)}</dt><dd>{t(SV.addressV, lang)}</dd></div>
                <div><dt>{t(SV.payMethod, lang)}</dt><dd>{t(SV.payMethodV, lang)}</dd></div>
              </dl>
              {groups.map((g) => {
                const s = sellerOf(g.sellerId);
                return (
                  <section key={g.sellerId} className="group compact">
                    <header><b>{t(s.name, lang)}</b><span>{t(arrivalLabel(g.arriveAt, now), lang)}</span></header>
                    <ul className="r-items">
                      {g.lines.map((l) => (
                        <li key={l.productId}>
                          <span>{name(l.productId)}{l.size !== 'FREE' ? `, ${l.size}` : ''}{l.qty > 1 ? ` ×${l.qty}` : ''}</span>
                          <b>{money(l.priceAtAdd * l.qty, lang)}</b>
                        </li>
                      ))}
                      <li className="r-ship"><span>{t(SV.shipTotalL, lang)}</span><b>{g.shipping > 0 ? money(g.shipping, lang) : t(SV.freeShip, lang)}</b></li>
                    </ul>
                    <footer><span className="ret">{t(returnLabel(s), lang)}</span></footer>
                  </section>
                );
              })}
            </div>
          )}

          {groups.length > 0 && (
            <div className="checkout">
              <dl className="sums">
                <div><dt>{t(SV.itemsTotal, lang)}</dt><dd>{money(total - ship, lang)}</dd></div>
                <div><dt>{t(SV.shipTotalL, lang)}</dt><dd>{ship > 0 ? money(ship, lang) : t(SV.freeShip, lang)}</dd></div>
                <div className="grand"><dt>{t(SV.grand, lang)}</dt><dd>{money(total, lang)}</dd></div>
              </dl>
              {step === 'cart' ? (
                <button className="btn primary block" disabled={readOnly} onClick={() => setStep('review')}>
                  {t(SV.toReview, lang)}
                </button>
              ) : (
                <>
                  <p className="note">{SV.willPlace[lang](groups.length)}</p>
                  <button className="btn nod block" disabled={readOnly || issues.length > 0} onClick={pay}>
                    {issues.length > 0 ? t(SV.payBlocked, lang) : SV.payN[lang](money(total, lang))}
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}
    </aside>
  );
}

function Group({ g, lang, now, state, readOnly, onQty, onRemove }: {
  g: Quote; lang: Lang; now: number; state: StoreState; readOnly?: boolean;
  onQty: (id: string, qty: number) => void; onRemove: (id: string) => void;
}) {
  const s = sellerOf(g.sellerId);
  const left = s.freeOver !== undefined && g.shipping > 0 ? s.freeOver - g.subtotal : 0;
  return (
    <section className="group">
      <header>
        <b>{t(s.name, lang)}</b>
        <span>{t(arrivalLabel(g.arriveAt, now), lang)}</span>
      </header>
      <ul className="lines">
        {g.lines.map((l) => {
          const p = state.products[l.productId];
          const o = state.offers[`${l.productId}@${l.sellerId}`];
          const src = photoUrl(l.productId);
          return (
            <li key={l.productId}>
              <span className={`thumb sw sw-${p.colors[0]}`}>{src && <img className="ph" src={src} alt="" />}</span>
              <div className="line-m">
                <div className="name">{t(p.name, lang)}</div>
                <div className="sub">
                  {l.size !== 'FREE' && <span>{l.size}</span>}
                  {l.addedBy === 'agent' && <em>{t(C.byAgent, lang)}</em>}
                </div>
                <div className="line-ctl">
                  <Stepper qty={l.qty} max={o?.sizes[l.size] ?? l.qty} lang={lang} disabled={readOnly} onQty={(n) => onQty(l.productId, n)} />
                  <button className="link-btn" disabled={readOnly} onClick={() => onRemove(l.productId)}>{t(C.remove, lang)}</button>
                </div>
              </div>
              <b className="line-p">{money(l.priceAtAdd * l.qty, lang)}</b>
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
}

function Done({ lang, orders, now, state, onOrders, onClose }: {
  lang: Lang; orders: Order[]; now: number; state: StoreState; onOrders: () => void; onClose: () => void;
}) {
  const total = orders.reduce((a, o) => a + o.total, 0);
  return (
    <div className="done">
      <span className="done-ok"><Icon name="check" size={28} /></span>
      <h2>{t(SV.doneTitle, lang)}</h2>
      <p>{SV.doneSub[lang](orders.length)}</p>
      <ul className="done-list">
        {orders.map((o) => (
          <li key={o.id}>
            <div><b>{t(sellerOf(o.sellerId).name, lang)}</b><span>{t(SV.orderNo, lang)} {o.id}</span></div>
            <div><b>{money(o.total, lang)}</b><span>{t(arrivalLabel(o.arriveAt, now), lang)}</span></div>
            <p>{o.lines.map((l) => t(state.products[l.productId].name, lang)).join(', ')}</p>
          </li>
        ))}
      </ul>
      <div className="done-sum"><span>{t(SV.grand, lang)}</span><b>{money(total, lang)}</b></div>
      <div className="row">
        <button className="btn primary" onClick={onOrders}>{t(SV.ordersTab, lang)}</button>
        <button className="btn" onClick={onClose}>{t(SV.keepShopping, lang)}</button>
      </div>
    </div>
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
