import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Lang, Level } from '../engine/types';
import type { ConsoleState } from '../state/console';
import { CATEGORY_L } from '../store/labels';
import { describeCriteria } from '../store/parser';
import type { Scored } from '../store/search';
import { DUTY_OVER, arrivalLabel, sellerOf } from '../store/sellers';
import type { Category, CartLine, Criteria, Product } from '../store/types';
import { photoCredit, photoUrl } from '../store/photos';
import { SOCIAL } from '../store/catalog';
import { useFlip } from './useFlip';
import { useFlight } from './useFlight';
import type { Market } from '../store/market';
import type { Store } from '../store/store';
import { MarketTicker } from './MarketTicker';
import { PriceBars, SellerBadge, Terms } from './Sellers';
import { C, LEVEL, SV, SZ, money, t } from './copy';
import { SIZE_COMMON } from '../store/types';
const COMMON = new Set(Object.values(SIZE_COMMON).flat());
import { Mark } from './Mark';
import { Spinner } from './Spinner';

interface Props {
  lang: Lang;
  results: Scored[];
  criteria: Criteria | null;
  category: Category | null;
  onCategory: (c: Category | null) => void;
  cart: CartLine[];
  agent: ConsoleState;
  onAdd: (id: string, size: string, sellerId?: string) => void;
  /** 지금 담는 중인 상품 */
  adding?: string | null;
  onQty: (id: string, qty: number) => void;
  onOpen: (id: string) => void;
  readOnly?: boolean;
  market: Market;
  store: Store;
}

const CATS = Object.keys(CATEGORY_L) as Category[];

export function Shop({ lang, results, criteria, category, onCategory, cart, agent, adding, onAdd, onQty, onOpen, readOnly, market, store }: Props) {
  const chips = criteria ? describeCriteria(criteria) : [];
  // 에이전트가 일하는 동안: 후보를 앞으로 당기고, 나머지는 흐리게, 지금 보는 상품에 시선 표시
  const active = !['idle', 'done', 'failed', 'cancelled', 'undone'].includes(agent.phase);
  const looking = agent.phase === 'planning' || agent.phase === 'executing';
  const cands = agent.candidates;
  const ordered = active && cands.length
    ? [...results].sort((a, b) => rank(a.product.id) - rank(b.product.id))
    : results;
  function rank(id: string) { const i = cands.indexOf(id); return i === -1 ? 999 : i; }
  const [eye, setEye] = useState(0);
  useEffect(() => {
    if (!looking || cands.length === 0) return;
    const id = window.setInterval(() => setEye((e) => e + 1), 650);
    return () => window.clearInterval(id);
  }, [looking, cands.length]);
  const eyeId = looking && cands.length ? cands[eye % cands.length] : null;
  const gridRef = useFlip<HTMLDivElement>(ordered.map((r) => r.product.id).join());
  useFlight(cart, !readOnly);
  const scanKey = criteria ? JSON.stringify(criteria) : category ?? '';
  return (
    <section className={`shop ${active && cands.length ? 'focus' : ''}`} aria-label="shop">
      <div className="shop-bar">
        <div className="cats" role="group" aria-label="category">
          <button aria-pressed={category === null} onClick={() => onCategory(null)}>{t(C.all, lang)}</button>
          {CATS.map((c) => (
            <button key={c} aria-pressed={category === c} onClick={() => onCategory(c)}>{t(CATEGORY_L[c], lang)}</button>
          ))}
        </div>
        <MarketTicker market={market} store={store} lang={lang} />
      </div>

      {chips.length > 0 && (
        <div className="interp" aria-label={t(C.understoodAs, lang)}>
          {chips.map((c, i) => (
            <span key={i} className="chip"><i>{t(c.label, lang)}</i>{t(c.value, lang)}</span>
          ))}
        </div>
      )}

      {results.length === 0 ? (
        <p className="empty">{t(C.noResult, lang)}</p>
      ) : (
        <div className="grid-wrap">
          {scanKey && <div className="scan" key={scanKey} aria-hidden="true" />}
          <div className="grid" ref={gridRef}>
            {ordered.map(({ product }, i) => (
              <Card key={product.id} i={i} eye={eyeId === product.id} p={product} lang={lang} cart={cart} agent={agent} store={store} adding={adding === product.id} onAdd={onAdd} onQty={onQty} onOpen={onOpen} readOnly={!!readOnly} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

interface CardProps {
  i: number; eye: boolean;
  p: Product; lang: Lang; cart: CartLine[]; agent: ConsoleState; store: Store; adding: boolean;
  onAdd: (id: string, size: string, sellerId?: string) => void; onQty: (id: string, qty: number) => void;
  onOpen: (id: string) => void; readOnly: boolean;
}

/** 1,234 → 1.2천 / 1.2k */
const compact = (n: number, lang: Lang) => {
  if (lang === 'ko') return n >= 10000 ? `${(n / 10000).toFixed(1).replace(/\.0$/, '')}만` : n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}천` : String(n);
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n);
};

const Minus = () => <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden><path d="M2.5 6h7" /></svg>;
const Plus = () => <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden><path d="M2.5 6h7M6 2.5v7" /></svg>;

/** 담긴 상품의 수량 조절. 장바구니와 카드가 같은 컨트롤을 쓴다. */
export function Stepper({ qty, max, lang, onQty, disabled }: { qty: number; max: number; lang: Lang; onQty: (n: number) => void; disabled?: boolean }) {
  return (
    <div className="stepper" role="group" aria-label={lang === 'ko' ? `수량 ${qty}` : `Quantity ${qty}`}>
      <button type="button" aria-label={t(SV.less, lang)} disabled={disabled} onClick={() => onQty(qty - 1)}><Minus /></button>
      <output aria-live="polite">{qty}</output>
      <button type="button" aria-label={t(SV.plus, lang)} disabled={disabled || qty >= max} onClick={() => onQty(qty + 1)}><Plus /></button>
    </div>
  );
}


function Card({ i, eye, p, lang, cart, agent, store, adding, onAdd, onQty, onOpen, readOnly }: CardProps) {
  const line = cart.find((l) => l.productId === p.id);
  const keys = Object.keys(p.sizes);
  // 사이즈가 하나뿐이면 바로 담고, 여러 개면 시트에서 사이즈·판매처를 고른다
  const only = keys.length === 1 ? keys[0] : null;
  const ranked = store.rankOffers(p.id, line?.size ?? only ?? undefined);
  const lead = line ? ranked.find((r) => r.offer.sellerId === line.sellerId) : ranked[0];
  const linePrice = line ? store.getOffer(p.id, line.sellerId)?.price : undefined;
  const sellers = store.offersOf(p.id).length;
  const now = store.now();

  const conf = agent.confidence[p.id];
  const [broken, setBroken] = useState(false);
  const shown = linePrice ?? lead?.offer.price ?? p.price;
  const prevPrice = useRef(shown);
  const repriced = prevPrice.current !== shown;
  useEffect(() => { prevPrice.current = shown; });
  const src = photoUrl(p.id);
  const credit = photoCredit(p.id);
  const level: Level | undefined = agent.candidates.includes(p.id) ? conf?.level : undefined;
  const so = SOCIAL[p.id];
  // 5% 미만 차이는 할인으로 보이지 않게 둔다
  const pct = so ? Math.round((1 - shown / so.listPrice) * 100) : 0;
  const off = pct >= 5 ? pct : 0;
  const ship = lead ? `${lead.shipping <= 0 ? t(SV.freeShip, lang) : money(lead.shipping, lang)} · ${t(arrivalLabel(lead.arriveAt, now), lang)}` : '';

  return (
    <article data-flip={p.id} data-pid={p.id} style={{ '--i': Math.min(i, 11) } as CSSProperties}
      className={`prod ${level ? `lv-${level}` : ''} ${agent.candidates.includes(p.id) ? 'is-cand' : ''} ${eye ? 'eye' : ''} ${p.stock === 0 ? 'out' : ''}`}>
      <button className={`sw sw-${p.colors[0]}`} onClick={() => onOpen(p.id)} aria-label={SV.compareSellers[lang](sellers)}>
        {src && !broken && (
          <img className="ph" src={src} alt="" loading="lazy" title={credit ? `Photo: ${credit} / Unsplash` : undefined} onError={() => setBroken(true)} />
        )}
        {level && <span className={`pill ${level}`}>{t(LEVEL[level], lang)}</span>}
        {eye && <span className="eye-tag"><Mark size={10} phase="busy" tone="on-brand" />{t(SV.looking, lang)}</span>}
        {so?.best && <span className="best">BEST</span>}
        {line && <span className="incart" key={line.qty}>{line.addedBy === 'agent' ? t(C.byAgent, lang) : t(C.cart, lang)} {line.qty}</span>}
      </button>
      <div className="meta">
        <div className="brand">{p.brand}</div>
        <h3 className="name">{t(p.name, lang)}</h3>
        <div className="price-row">
          <span className={`price ${repriced ? 'repriced' : ''}`}>
            {p.stock > 0 && off > 0 && <b className="off">{off}%</b>}
            {p.stock === 0 ? t(C.soldOut, lang) : money(shown, lang)}
          </span>
          {sellers > 1 && p.stock > 0 && (
            <button className="cmp-chip" onClick={() => onOpen(p.id)}>{SV.nCompare[lang](sellers)}</button>
          )}
        </div>
        {line && linePrice !== undefined && linePrice !== line.priceAtAdd
          ? <p className="ship-line moved">{money(line.priceAtAdd, lang)} → {money(linePrice, lang)}</p>
          : ship && <p className="ship-line">{ship}</p>}
        {so && (
          <p className="social">
            <span className="star" aria-label={SV.ratingL[lang](so.rating)}>★ {so.rating.toFixed(1)}</span>
            <span>{SV.reviewsN[lang](so.reviews)}</span>
            <span aria-label={SV.likesL[lang](so.likes)}>♡ {compact(so.likes, lang)}</span>
          </p>
        )}
        {level && conf?.reason && <p className="reason">{t(conf.reason, lang)}</p>}
        <div className="buy">
          {line ? (
            <>
              <Stepper qty={line.qty} max={store.getOffer(p.id, line.sellerId)?.sizes[line.size] ?? line.qty} lang={lang} disabled={readOnly} onQty={(n) => onQty(p.id, n)} />
              <span className="added">{keys.length > 1 ? line.size : t(SV.inCart, lang)}</span>
            </>
          ) : (
            <button
              className="btn sm primary" disabled={readOnly || p.stock === 0 || adding} aria-busy={adding}
              onClick={() => (only && lead ? onAdd(p.id, only, lead.offer.sellerId) : onOpen(p.id))}
            >
              {adding ? <><Spinner />{t(C.adding, lang)}</> : p.stock === 0 ? t(C.soldOut, lang) : t(C.add, lang)}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

/** 상품 한 개의 판매처를 나란히 놓고 고르는 시트. 총액(배송비 포함)이 낮은 순, 해외직구는 맨 뒤. */
export function OfferSheet({ id, lang, store, cart, adding, onAdd, onClose }: {
  id: string; lang: Lang; store: Store; cart: CartLine[]; adding?: string | null;
  onAdd: (id: string, size: string, sellerId: string) => void; onClose: () => void;
}) {
  const p = store.getProduct(id);
  const line = cart.find((l) => l.productId === id);
  const keys = p ? Object.keys(p.sizes) : [];
  const [picked, setPicked] = useState<string | null>(line?.size ?? (keys.length === 1 ? keys[0] : null));
  const [pickSeller, setFocus] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    ref.current?.focus();
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  if (!p) return null;
  const now = store.now();
  const size = line?.size ?? picked;
  const avail = store.availableSizes(id);
  const offers = store.offersOf(id);
  const ranked = store.rankOffers(id, size ?? undefined);
  const bestId = ranked.find((r) => !r.seller.overseas)?.offer.sellerId;
  const gone = offers.filter((o) => !ranked.some((r) => r.offer.sellerId === o.sellerId));
  const focus = pickSeller && ranked.some((r) => r.offer.sellerId === pickSeller) ? pickSeller : line?.sellerId ?? bestId;
  const sel = ranked.find((r) => r.offer.sellerId === focus);
  const src = photoUrl(id);

  return (
    <div className="sheet-wrap" role="dialog" aria-modal="true" aria-label={t(p.name, lang)}>
      <div className="sheet-scrim" onClick={onClose} />
      <div className="sheet" ref={ref} tabIndex={-1}>
        <div className={`sheet-ph sw sw-${p.colors[0]}`}>{src && <img className="ph" src={src} alt="" />}</div>
        <div className="sheet-body">
          <header className="sheet-head">
            <div>
              <div className="brand">{p.brand}</div>
              <h2>{t(p.name, lang)}</h2>
            </div>
            <button className="btn sm" onClick={onClose}>{t(C.close, lang)}</button>
          </header>
          {keys.length > 1 && (
            <div className="szs" role="group" aria-label={t(SZ.pick, lang)}>
              {/* 재고 있는 사이즈와 주력 사이즈만. 주변 사이즈까지 다 늘어놓으면 품절 칸만 많아진다. */}
              {keys.filter((z) => avail.includes(z) || line?.size === z || COMMON.has(z)).map((z) => (
                <button key={z} className={`sz ${size === z ? 'on' : ''} ${!avail.includes(z) ? 'out' : ''}`} aria-pressed={size === z}
                  disabled={!avail.includes(z) || (!!line && line.size !== z)} onClick={() => setPicked(z)}>{z}</button>
              ))}
            </div>
          )}
          {size ? (
            <>
              <div className="pb-legend"><span><i className="lg-price" />{t(SV.price, lang)}</span><span><i className="lg-ship" />{t(SV.shipping, lang)}</span></div>
              <PriceBars rows={ranked} lang={lang} chosen={focus} onPick={setFocus} />
              {gone.length > 0 && <p className="note">{t(SV.noStock, lang)}: {gone.map((o) => t(sellerOf(o.sellerId).name, lang)).join(', ')}</p>}
              {sel && (
                <div className="pick-detail" key={sel.offer.sellerId}>
                  <div className="pd-head">
                    <SellerBadge s={sel.seller} lang={lang} size={28} />
                    <div><b>{t(sel.seller.name, lang)}</b><span>{t(SV.kind[sel.seller.kind], lang)}</span></div>
                    <strong>{money(sel.landed, lang)}</strong>
                  </div>
                  <Terms shipping={sel.shipping} arriveAt={sel.arriveAt} now={now} s={sel.seller} lang={lang} />
                  {sel.seller.overseas && sel.offer.price >= DUTY_OVER && <p className="warnline">{t(SV.duty, lang)}</p>}
                  {line && line.sellerId === sel.offer.sellerId
                    ? <p className="added">{SV.inCartAt[lang](t(sel.seller.name, lang))}</p>
                    : <button className="btn primary block" disabled={!!line || !!adding} aria-busy={adding === id} onClick={() => onAdd(id, size, sel.offer.sellerId)}>
                        {adding === id ? <><Spinner />{SV.holding[lang](t(sel.seller.name, lang))}</> : SV.addFrom[lang](t(sel.seller.name, lang), money(sel.landed, lang))}
                      </button>}
                </div>
              )}
            </>
          ) : <p className="hint">{t(SV.pickSizeFirst, lang)}</p>}
          <p className="note">{t(SV.sheetNote, lang)}</p>
        </div>
      </div>
    </div>
  );
}
