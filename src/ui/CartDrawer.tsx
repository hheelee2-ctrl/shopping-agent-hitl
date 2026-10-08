import { useEffect, useRef, useState } from 'react';
import type { L, Lang } from '../engine/types';
import { photoUrl } from '../store/photos';
import { arrivalLabel, dateLabel, returnLabel, sellerOf } from '../store/sellers';
import { quoteOf, type CartIssue, type Quote } from '../store/store';
import type { Order, StoreState } from '../store/types';
import { C, SV, money, t } from './copy';
import { Icon } from './Icon';
import { Stepper } from './Shop';
import { Spinner } from './Spinner';
import { STAGES, trackOf } from '../store/tracking';

export type DrawerTab = 'cart' | 'orders';
type Step = 'cart' | 'review' | 'paying' | 'done';

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
  const [checking, setChecking] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && step !== 'paying') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose, step]);
  // 닫았다 열면 장바구니부터. 결제 확인 중에 장바구니가 비면 장바구니로 돌아간다.
  useEffect(() => { if (!open) { setStep('cart'); setPlaced([]); setDetail(null); setChecking(false); } }, [open]);
  useEffect(() => { if (tab === 'cart') setDetail(null); }, [tab]);
  useEffect(() => { if (step === 'review' && state.cart.length === 0) setStep('cart'); }, [step, state.cart.length]);

  const groups = quoteOf(state.cart, now);
  const total = groups.reduce((a, g) => a + g.total, 0);
  const ship = groups.reduce((a, g) => a + g.shipping, 0);
  const count = state.cart.reduce((a, l) => a + l.qty, 0);
  const name = (pid: string) => t(state.products[pid].name, lang);

  // 주문 확인으로 넘어가기 전에 판매처 재고·가격을 다시 확인한다
  const toReview = () => {
    setChecking(true);
    later(() => { setChecking(false); setStep('review'); }, 700 + Math.random() * 400);
  };
  // 누른 순간의 조건으로 주문을 확정하고, 승인·판매처별 접수·확인을 차례로 보여준다
  const pay = () => {
    const made = onCheckout();
    if (made) { setPlaced(made); setStep('paying'); }
  };
  const openOrder = (id: string) => { onOrders(); setDetail(id); };

  return (
    <aside className={`drawer ${open ? 'open' : ''}`} aria-hidden={!open} aria-label={t(C.cart, lang)}>
      <div className="drawer-head">
        {tab === 'orders' && detail ? (
          <div className="crumb">
            <button className="back" onClick={() => setDetail(null)} aria-label={t(SV.toOrders, lang)}>
              <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden><path d="M7.5 2.5L4 6l3.5 3.5" /></svg>
            </button>
            <h2>{t(SV.orderDetail, lang)}</h2>
          </div>
        ) : step === 'cart' || tab === 'orders' ? (
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
        <button className="btn sm" onClick={onClose} disabled={step === 'paying' && tab === 'cart'}>{t(C.close, lang)}</button>
      </div>

      {tab === 'orders' ? (
        detail && state.orders.some((o) => o.id === detail)
          ? <OrderDetail key={detail} lang={lang} order={state.orders.find((o) => o.id === detail)!} state={state} />
          : <Orders lang={lang} orders={state.orders} state={state} onOpen={setDetail} />
      ) : step === 'paying' ? (
        <Paying lang={lang} orders={placed} onDone={() => setStep('done')} />
      ) : step === 'done' ? (
        <Done lang={lang} orders={placed} now={now} state={state} onOrders={onOrders} onOpen={openOrder} onClose={onClose} />
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
                <button className="btn primary block" disabled={readOnly || checking} aria-busy={checking} onClick={toReview}>
                  {checking ? <><Spinner />{t(SV.checking, lang)}</> : t(SV.toReview, lang)}
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
      </footer>
    </section>
  );
}

/** 지금 시각. 배송 단계가 시간에 따라 바뀌도록 주기적으로 다시 읽는다. */
function useNow(every = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), every); return () => window.clearInterval(id); }, [every]);
  return now;
}

type PayRow = { id: string; run: L; done: L; note?: string };

/** 결제 진행. 승인 요청 → 판매처별 주문 전달·접수 → 주문 확인을 한 줄씩 끝낸다. */
function Paying({ lang, orders, onDone }: { lang: Lang; orders: Order[]; onDone: () => void }) {
  const total = orders.reduce((a, o) => a + o.total, 0);
  const rows: PayRow[] = [
    { id: 'auth', run: SV.payAuth, done: SV.payAuthed, note: money(total, lang) },
    ...orders.map((o) => {
      const n = t(sellerOf(o.sellerId).name, lang);
      return { id: o.id, run: { ko: SV.sendTo.ko(n), en: SV.sendTo.en(n) }, done: { ko: SV.acceptedBy.ko(n), en: SV.acceptedBy.en(n) }, note: `${t(SV.orderNo, lang)} ${o.id}` };
    }),
    { id: 'confirm', run: SV.confirming, done: SV.confirmed },
  ];
  const [at, setAt] = useState(0);
  const finish = useRef(onDone);
  finish.current = onDone;
  useEffect(() => {
    const ms = at === 0 ? 1300 : at === rows.length - 1 ? 700 : 900;
    const id = window.setTimeout(() => (at < rows.length ? setAt(at + 1) : finish.current()), at < rows.length ? ms + Math.random() * 300 : 500);
    return () => window.clearTimeout(id);
  }, [at, rows.length]);
  return (
    <div className="paying" aria-live="polite">
      <span className="paying-mark"><Spinner size={28} /></span>
      <h2>{t(SV.payingTitle, lang)}</h2>
      <p>{t(SV.payingNote, lang)}</p>
      <ol className="pay-steps">
        {rows.map((r, i) => (
          <li key={r.id} className={i < at ? 'done' : i === at ? 'now' : ''}>
            <span className="ps-ic">{i < at ? <Icon name="check" size={12} /> : i === at ? <Spinner size={12} /> : null}</span>
            <span className="ps-l">{t(i < at ? r.done : r.run, lang)}</span>
            {i < at && r.note && <span className="ps-n">{r.note}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Done({ lang, orders, now, state, onOrders, onOpen, onClose }: {
  lang: Lang; orders: Order[]; now: number; state: StoreState; onOrders: () => void; onOpen: (id: string) => void; onClose: () => void;
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
            <button className="done-row" onClick={() => onOpen(o.id)}>
              <div><b>{t(sellerOf(o.sellerId).name, lang)}</b><span>{t(SV.orderNo, lang)} {o.id}</span></div>
              <div><b>{money(o.total, lang)}</b><span>{SV.expArrive[lang](t(arrivalLabel(o.arriveAt, now), lang))}</span></div>
              <p>{o.lines.map((l) => t(state.products[l.productId].name, lang)).join(', ')}</p>
            </button>
          </li>
        ))}
      </ul>
      <dl className="done-sum">
        <div><dt>{t(SV.payMethod, lang)}</dt><dd>{t(SV.payMethodV, lang)}</dd></div>
        <div><dt>{t(SV.address, lang)}</dt><dd>{t(SV.addressV, lang)}</dd></div>
        <div className="grand"><dt>{t(SV.grand, lang)}</dt><dd>{money(total, lang)}</dd></div>
      </dl>
      <div className="row">
        <button className="btn primary" onClick={() => (orders.length === 1 ? onOpen(orders[0].id) : onOrders())}>{t(SV.viewDetail, lang)}</button>
        <button className="btn" onClick={onClose}>{t(SV.keepShopping, lang)}</button>
      </div>
    </div>
  );
}

const itemsLine = (o: Order, state: StoreState, lang: Lang) => {
  const first = state.products[o.lines[0].productId];
  return `${first ? t(first.name, lang) : ''}${o.lines.length > 1 ? SV.moreItems[lang](o.lines.length - 1) : ''}`;
};

/** 주문 목록. 판매처·주문일·대표 상품·지금 배송 단계만 보이고, 누르면 상세로 간다. */
function Orders({ lang, orders, state, onOpen }: { lang: Lang; orders: Order[]; state: StoreState; onOpen: (id: string) => void }) {
  const now = useNow();
  if (orders.length === 0) return <p className="drawer-empty">{t(SV.noOrders, lang)}</p>;
  return (
    <div className="orders">
      {orders.map((o) => {
        const tr = trackOf(o, now);
        const src = photoUrl(o.lines[0].productId);
        const p = state.products[o.lines[0].productId];
        return (
          <button key={o.id} className="order-row" onClick={() => onOpen(o.id)}>
            <span className={`thumb sw sw-${p?.colors[0]}`}>{src && <img className="ph" src={src} alt="" />}</span>
            <span className="or-m">
              <span className="or-top"><b className={`st-chip st-${tr.stage}`}>{t(SV.st[tr.stage], lang)}</b><span>{t(dateLabel(o.placedAt), lang)}</span></span>
              <span className="or-name">{itemsLine(o, state, lang)}</span>
              <span className="or-sub">{t(sellerOf(o.sellerId).name, lang)} · {tr.stage === 'arrived' ? t(arrivalLabel(o.arriveAt, now), lang) : SV.expArrive[lang](t(arrivalLabel(o.arriveAt, now), lang))}</span>
            </span>
            <strong>{money(o.total, lang)}</strong>
          </button>
        );
      })}
    </div>
  );
}

/** 주문 하나의 전부: 지금 배송 단계, 배송 조회(운송장·이력), 주문 상품, 결제 정보, 배송지, 판매처. */
function OrderDetail({ lang, order: o, state }: { lang: Lang; order: Order; state: StoreState }) {
  const now = useNow();
  const s = sellerOf(o.sellerId);
  // 배송 이력은 배송사에서 받아오는 데 잠깐 걸린다. 새로고침하면 다시 받아온다.
  const [loadedAt, setLoadedAt] = useState<number | null>(null);
  const [nonce, setNonce] = useState(0);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    setLoadedAt(null);
    const id = window.setTimeout(() => setLoadedAt(Date.now()), 800 + Math.random() * 500);
    return () => window.clearTimeout(id);
  }, [nonce]);
  const tr = trackOf(o, loadedAt ?? now);
  const at = STAGES.indexOf(tr.stage);
  const arriving = t(arrivalLabel(o.arriveAt, now), lang);
  const copy = () => {
    if (!tr.invoice) return;
    navigator.clipboard?.writeText(tr.invoice.replace(/-/g, '')).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="od">
      <section className="od-hero">
        <p className="od-no">{t(SV.orderNo, lang)} {o.id}</p>
        <h3>{t(SV.st[tr.stage], lang)}</h3>
        <p className="od-eta">{tr.stage === 'arrived' ? arriving : SV.expArrive[lang](arriving)}</p>
        <ol className="track" aria-label={t(SV.st[tr.stage], lang)}>
          {STAGES.map((st, i) => (
            <li key={st} className={i < at ? 'past' : i === at ? 'now' : ''}>
              <span className="pt" aria-hidden />
              <span className="st">{t(SV.st[st], lang)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="od-sec">
        <header>
          <h4>{t(SV.tracking, lang)}</h4>
          <button className="link-btn" onClick={() => setNonce((n) => n + 1)} disabled={loadedAt === null}>
            {loadedAt === null ? <><Spinner size={10} /> {t(SV.loadingTrack, lang)}</> : t(SV.refresh, lang)}
          </button>
        </header>
        <dl className="kv">
          <div><dt>{t(SV.carrier, lang)}</dt><dd>{t(tr.carrier, lang)}</dd></div>
          <div>
            <dt>{t(SV.invoice, lang)}</dt>
            <dd>{tr.invoice
              ? <>{tr.invoice} <button className="link-btn" onClick={copy}>{t(copied ? SV.copied : SV.copy, lang)}</button></>
              : <span className="muted">{t(SV.noInvoice, lang)}</span>}</dd>
          </div>
        </dl>
        {loadedAt === null ? (
          <ul className="tl skel" aria-busy="true">{[0, 1, 2].map((i) => <li key={i}><i /><span /></li>)}</ul>
        ) : (
          <>
            <ol className="tl">
              {[...tr.events].reverse().map((e, i, all) => {
                const next = !e.done && (i === all.length - 1 || all[i + 1].done);
                if (!e.done && !next) return null;
                return (
                  <li key={e.at + t(e.label, 'en')} className={e.done ? (i === all.findIndex((x) => x.done) ? 'now' : 'past') : 'next'}>
                    <i />
                    <div>
                      <b>{t(e.label, lang)}</b>
                      <span>{t(e.place, lang)}</span>
                    </div>
                    <time>{e.done ? t(dateLabel(e.at), lang) : SV.expArrive[lang](t(dateLabel(e.at), lang))}</time>
                  </li>
                );
              })}
            </ol>
            <p className="note">{SV.asOf[lang](t(dateLabel(loadedAt), lang))}</p>
          </>
        )}
      </section>

      <section className="od-sec">
        <header><h4>{t(SV.orderItems, lang)}</h4><span className="muted">{t(s.name, lang)}</span></header>
        <ul className="res-items">
          {o.lines.map((l) => {
            const p = state.products[l.productId];
            const src = photoUrl(l.productId);
            return (
              <li key={l.productId}>
                <span className={`mini-ph sw sw-${p.colors[0]}`}>{src && <img className="ph" src={src} alt="" />}</span>
                <span className="mini-m"><b>{t(p.name, lang)}</b><span>{l.size !== 'FREE' ? `${l.size} · ` : ''}{l.qty}{lang === 'ko' ? '개' : ' pc'}</span></span>
                <b className="mini-p">{money(l.priceAtAdd * l.qty, lang)}</b>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="od-sec">
        <header><h4>{t(SV.payInfo, lang)}</h4></header>
        <dl className="kv">
          <div><dt>{t(SV.itemsTotal, lang)}</dt><dd>{money(o.subtotal, lang)}</dd></div>
          <div><dt>{t(SV.shipTotalL, lang)}</dt><dd>{o.shipping > 0 ? money(o.shipping, lang) : t(SV.freeShip, lang)}</dd></div>
          <div className="grand"><dt>{t(SV.grand, lang)}</dt><dd>{money(o.total, lang)}</dd></div>
          <div><dt>{t(SV.payMethod, lang)}</dt><dd>{t(SV.payMethodV, lang)}</dd></div>
          <div><dt>{t(SV.paidAt, lang)}</dt><dd>{t(dateLabel(o.placedAt), lang)}</dd></div>
          <div><dt>{t(SV.orderedVia, lang)}</dt><dd>{SV.placedBy[lang][o.by]}</dd></div>
        </dl>
      </section>

      <section className="od-sec">
        <header><h4>{t(SV.shipInfo, lang)}</h4></header>
        <dl className="kv">
          <div><dt>{t(SV.address, lang)}</dt><dd>{t(SV.addressV, lang)}</dd></div>
          <div><dt>{t(SV.shipReq, lang)}</dt><dd>{t(SV.shipReqV, lang)}</dd></div>
        </dl>
      </section>

      <section className="od-sec">
        <header><h4>{t(SV.sellerInfo, lang)}</h4><span className="muted">{t(s.name, lang)}</span></header>
        <p className="note">{t(returnLabel(s), lang)}. {SV.contact[lang](t(s.name, lang))}</p>
      </section>
    </div>
  );
}
