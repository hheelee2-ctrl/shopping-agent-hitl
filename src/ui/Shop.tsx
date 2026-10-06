import { useEffect, useRef, useState } from 'react';
import type { Lang, Level } from '../engine/types';
import type { ConsoleState } from '../state/console';
import { CATEGORY_L } from '../store/labels';
import { describeCriteria } from '../store/parser';
import type { Scored } from '../store/search';
import { arrivalLabel, DUTY_OVER, returnLabel, scheduleOf, sellerOf } from '../store/sellers';
import type { Category, CartLine, Criteria, Product } from '../store/types';
import { photoCredit, photoUrl } from '../store/photos';
import { useFlip } from './useFlip';
import { useFlight } from './useFlight';
import type { Market } from '../store/market';
import type { Store } from '../store/store';
import { MarketTicker } from './MarketTicker';
import { C, LEVEL, SV, SZ, money, t } from './copy';

interface Props {
  lang: Lang;
  results: Scored[];
  criteria: Criteria | null;
  category: Category | null;
  onCategory: (c: Category | null) => void;
  cart: CartLine[];
  agent: ConsoleState;
  onAdd: (id: string, size: string, sellerId?: string) => void;
  onQty: (id: string, qty: number) => void;
  onOpen: (id: string) => void;
  readOnly?: boolean;
  market: Market;
  store: Store;
}

const CATS = Object.keys(CATEGORY_L) as Category[];

export function Shop({ lang, results, criteria, category, onCategory, cart, agent, onAdd, onQty, onOpen, readOnly, market, store }: Props) {
  const chips = criteria ? describeCriteria(criteria) : [];
  const gridRef = useFlip<HTMLDivElement>(results.map((r) => r.product.id).join());
  useFlight(cart, !readOnly);
  const scanKey = criteria ? JSON.stringify(criteria) : category ?? '';
  return (
    <section className="shop" aria-label="shop">
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
            {results.map(({ product }) => (
              <Card key={product.id} p={product} lang={lang} cart={cart} agent={agent} store={store} onAdd={onAdd} onQty={onQty} onOpen={onOpen} readOnly={!!readOnly} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

interface CardProps {
  p: Product; lang: Lang; cart: CartLine[]; agent: ConsoleState; store: Store;
  onAdd: (id: string, size: string, sellerId?: string) => void; onQty: (id: string, qty: number) => void;
  onOpen: (id: string) => void; readOnly: boolean;
}

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

const shipText = (fee: number, lang: Lang) => (fee <= 0 ? t(SV.freeShip, lang) : SV.shipFee[lang](money(fee, lang)));

function Card({ p, lang, cart, agent, store, onAdd, onQty, onOpen, readOnly }: CardProps) {
  const [nudge, setNudge] = useState(0);
  const line = cart.find((l) => l.productId === p.id);
  const keys = Object.keys(p.sizes);
  const [picked, setPicked] = useState<string | null>(null);
  // 이미 담은 사이즈가 있으면 그 사이즈로 고정, 사이즈가 하나뿐이면 미리 선택
  const sel = line?.size ?? (keys.length === 1 ? keys[0] : picked);
  // 고른 사이즈가 다른 구매로 사라지면 선택을 풀어 다시 고르게 한다
  useEffect(() => { if (picked && (p.sizes[picked] ?? 0) <= 0) setPicked(null); }, [p.sizes, picked]);

  const ranked = store.rankOffers(p.id, sel ?? undefined);
  const lead = line ? ranked.find((r) => r.offer.sellerId === line.sellerId) : ranked[0];
  const linePrice = line ? store.getOffer(p.id, line.sellerId)?.price : undefined;
  const sellers = store.offersOf(p.id).length;
  const avail = store.availableSizes(p.id);
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

  return (
    <article data-flip={p.id} data-pid={p.id} className={`prod ${level ? `lv-${level}` : ''} ${p.stock === 0 ? 'out' : ''}`}>
      <button className={`sw sw-${p.colors[0]}`} onClick={() => onOpen(p.id)} aria-label={SV.compareSellers[lang](sellers)}>
        {src && !broken && (
          <img className="ph" src={src} alt="" loading="lazy" title={credit ? `Photo: ${credit} / Unsplash` : undefined} onError={() => setBroken(true)} />
        )}
        {level && <span className={`pill ${level}`}>{t(LEVEL[level], lang)}</span>}
        {line && <span className="incart">{line.addedBy === 'agent' ? t(C.byAgent, lang) : t(C.cart, lang)} {line.qty}</span>}
      </button>
      <div className="meta">
        <div className="brand">{p.brand}</div>
        <h3 className="name">{t(p.name, lang)}</h3>
        <div className={`price ${repriced ? 'repriced' : ''}`}>{p.stock === 0 ? t(C.soldOut, lang) : money(shown, lang)}</div>
        {line && (
          <div className="ship">
            <span className="ship-s">{t(sellerOf(line.sellerId).name, lang)}</span>
            {linePrice !== undefined && linePrice !== line.priceAtAdd
              ? <span className="moved">{SV.changedPrice[lang](lang === 'ko' ? '담은 뒤 가격' : 'Price since added', money(line.priceAtAdd, lang), money(linePrice, lang))}</span>
              : <span>{line.size !== 'FREE' ? `${line.size}, ` : ''}{money(line.priceAtAdd * line.qty, lang)}</span>}
          </div>
        )}
        {!line && lead && (
          <div className="ship">
            <span className="ship-s">{t(lead.seller.name, lang)}</span>
            <span>{shipText(lead.shipping, lang)}, {t(arrivalLabel(lead.arriveAt, now), lang)}</span>
          </div>
        )}
        {level && conf?.reason && <p className="reason">{t(conf.reason, lang)}</p>}
        {keys.length > 1 && (
          <div className={`szs ${nudge ? 'nudge' : ''}`} key={nudge} role="group" aria-label={t(SZ.pick, lang)}>
            {keys.map((z) => {
              const n = avail.includes(z);
              const locked = !!line && line.size !== z;
              return (
                <button key={z} type="button" className={`sz ${sel === z ? 'on' : ''} ${!n ? 'out' : ''}`} aria-pressed={sel === z}
                  disabled={readOnly || !n || locked} onClick={() => setPicked(z)}>{z}</button>
              );
            })}
          </div>
        )}
        {nudge > 0 && !sel && <p className="hint" role="alert">{t(SV.pickSizeFirst, lang)}</p>}
        <div className="buy">
          {line ? (
            <>
              <Stepper qty={line.qty} max={store.getOffer(p.id, line.sellerId)?.sizes[line.size] ?? line.qty} lang={lang} disabled={readOnly} onQty={(n) => onQty(p.id, n)} />
              <span className="added">{t(SV.inCart, lang)}</span>
            </>
          ) : (
            <button
              className="btn sm primary" disabled={readOnly || p.stock === 0 || (!!sel && !lead)}
              onClick={() => (sel ? onAdd(p.id, sel, lead?.offer.sellerId) : setNudge((n) => n + 1))}
            >
              {p.stock === 0 ? t(C.soldOut, lang) : t(C.add, lang)}
            </button>
          )}
          {sellers > 1 && <button className="more" onClick={() => onOpen(p.id)}>{SV.compareSellers[lang](sellers)}</button>}
        </div>
      </div>
    </article>
  );
}

/** 상품 한 개의 판매처를 나란히 놓고 고르는 시트. 총액(배송비 포함)이 낮은 순, 해외직구는 맨 뒤. */
export function OfferSheet({ id, lang, store, cart, onAdd, onClose }: {
  id: string; lang: Lang; store: Store; cart: CartLine[];
  onAdd: (id: string, size: string, sellerId: string) => void; onClose: () => void;
}) {
  const p = store.getProduct(id);
  const line = cart.find((l) => l.productId === id);
  const keys = p ? Object.keys(p.sizes) : [];
  const [picked, setPicked] = useState<string | null>(line?.size ?? (keys.length === 1 ? keys[0] : null));
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
  const byId = new Map(ranked.map((r) => [r.offer.sellerId, r]));
  const domestic = offers.filter((o) => !sellerOf(o.sellerId).overseas);
  const sticker = Math.min(...domestic.map((o) => o.price));
  const bestId = ranked.find((r) => !r.seller.overseas)?.offer.sellerId;
  const rank = (sid: string) => {
    const i = ranked.findIndex((r) => r.offer.sellerId === sid);
    return i === -1 ? 99 + (sellerOf(sid).overseas ? 1 : 0) : i;
  };
  const rows = [...offers].sort((a, b) => rank(a.sellerId) - rank(b.sellerId));
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
              {keys.map((z) => (
                <button key={z} className={`sz ${size === z ? 'on' : ''} ${!avail.includes(z) ? 'out' : ''}`} aria-pressed={size === z}
                  disabled={!avail.includes(z) || (!!line && line.size !== z)} onClick={() => setPicked(z)}>{z}</button>
              ))}
            </div>
          )}
          <ul className="offers">
            {rows.map((o) => {
              const s = sellerOf(o.sellerId);
              const r = byId.get(o.sellerId);
              const here = line?.sellerId === o.sellerId;
              const fee = r ? r.shipping : (s.freeOver !== undefined && o.price >= s.freeOver ? 0 : s.fee);
              const arrive = r?.arriveAt ?? scheduleOf(s, now).arriveAt;
              return (
                <li key={o.id} className={`offer ${r ? '' : 'none'} ${o.sellerId === bestId ? 'best' : ''} ${s.overseas ? 'abroad' : ''}`}>
                  <div className="offer-who">
                    <b>{t(s.name, lang)}</b>
                    <span>{t(SV.kind[s.kind], lang)}</span>
                    {o.sellerId === bestId && <span className="tag ok">{t(SV.best, lang)}</span>}
                    {o.price === sticker && o.sellerId !== bestId && !s.overseas && <span className="tag">{t(SV.lowestTag, lang)}</span>}
                  </div>
                  <div className="offer-price">
                    <b>{money(o.price, lang)}</b>
                    <span>{shipText(fee, lang)}</span>
                  </div>
                  <div className="offer-when">
                    <b>{t(arrivalLabel(arrive, now), lang)}</b>
                    <span>{t(returnLabel(s), lang)}{s.overseas && o.price >= DUTY_OVER ? `. ${t(SV.duty, lang)}` : ''}</span>
                  </div>
                  <div className="offer-go">
                    {!size ? <span className="muted">{t(SV.pickSizeFirst, lang)}</span>
                      : !r ? <span className="muted">{t(SV.noStock, lang)}</span>
                      : (
                        <button className={`btn sm ${o.sellerId === bestId ? 'primary' : ''}`} disabled={!!line && !here} onClick={() => onAdd(id, size, o.sellerId)}>
                          {here ? SV.inCartAt[lang](t(s.name, lang)) : t(SV.addHere, lang)}
                        </button>
                      )}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="note">{t(SV.sheetNote, lang)}</p>
        </div>
      </div>
    </div>
  );
}
