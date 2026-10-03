import { useEffect, useRef, useState } from 'react';
import type { Lang, Level } from '../engine/types';
import type { ConsoleState } from '../state/console';
import { CATEGORY_L, COLOR_L, MATERIAL_L } from '../store/labels';
import { describeCriteria } from '../store/parser';
import type { Scored } from '../store/search';
import type { Category, CartLine, Criteria, Product } from '../store/types';
import { photoCredit, photoUrl } from '../store/photos';
import { useFlip } from './useFlip';
import { useFlight } from './useFlight';
import { C, LEVEL, money, t } from './copy';

interface Props {
  lang: Lang;
  results: Scored[];
  criteria: Criteria | null;
  category: Category | null;
  onCategory: (c: Category | null) => void;
  cart: CartLine[];
  agent: ConsoleState;
  onAdd: (id: string) => void;
  readOnly?: boolean;
}

const CATS = Object.keys(CATEGORY_L) as Category[];

export function Shop({ lang, results, criteria, category, onCategory, cart, agent, onAdd, readOnly }: Props) {
  const chips = criteria ? describeCriteria(criteria) : [];
  const gridRef = useFlip<HTMLDivElement>(results.map((r) => r.product.id).join());
  useFlight(cart, !readOnly);
  const scanKey = criteria ? JSON.stringify(criteria) : category ?? '';
  return (
    <section aria-label="shop">
      <div className="cats" role="group" aria-label="category">
        <button aria-pressed={category === null} onClick={() => onCategory(null)}>{t(C.all, lang)}</button>
        {CATS.map((c) => (
          <button key={c} aria-pressed={category === c} onClick={() => onCategory(c)}>{t(CATEGORY_L[c], lang)}</button>
        ))}
      </div>

      {chips.length > 0 && (
        <div className="interp">
          <span className="label">{t(C.understoodAs, lang)}</span>
          {chips.map((c, i) => (
            <span key={i} className="chip">{t(c.label, lang)} · {t(c.value, lang)}</span>
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
            <Card key={product.id} p={product} lang={lang} cart={cart} agent={agent} onAdd={onAdd} readOnly={!!readOnly} />
          ))}
        </div>
        </div>
      )}
    </section>
  );
}

function Card({ p, lang, cart, agent, onAdd, readOnly }: { p: Product; lang: Lang; cart: CartLine[]; agent: ConsoleState; onAdd: (id: string) => void; readOnly: boolean }) {
  const line = cart.find((l) => l.productId === p.id);
  const left = p.stock - (line?.qty ?? 0);
  const conf = agent.confidence[p.id];
  const [broken, setBroken] = useState(false);
  const prevPrice = useRef(p.price);
  const repriced = prevPrice.current !== p.price;
  useEffect(() => { prevPrice.current = p.price; });
  const src = photoUrl(p.id);
  const credit = photoCredit(p.id);
  const level: Level | undefined = agent.candidates.includes(p.id) ? conf?.level : undefined;
  return (
    <article data-flip={p.id} data-pid={p.id} className={`prod ${level ? `lv-${level}` : ''} ${p.stock === 0 ? 'out' : ''}`}>
      <div className={`sw sw-${p.colors[0]}`}>
        {src && !broken && (
          <img className="ph" src={src} alt={t(p.name, lang)} loading="lazy" title={credit ? `Photo: ${credit} / Unsplash` : undefined} onError={() => setBroken(true)} />
        )}
        {(!src || broken) && <span className="glyph">{p.category.slice(0, 2).toUpperCase()}</span>}
        {level && <span className={`pill ${level}`}>{t(LEVEL[level], lang)}</span>}
        {line && <span className="incart">{line.addedBy === 'agent' ? t(C.byAgent, lang) : t(C.cart, lang)} ×{line.qty}</span>}
      </div>
      <div className="meta">
        <div className="brand">{p.brand}</div>
        <div className="name">{t(p.name, lang)}</div>
        <div className="tags">
          {p.colors.map((c) => t(COLOR_L[c], lang)).join(' · ')} · {p.materials.map((m) => t(MATERIAL_L[m], lang)).join(' · ')}
        </div>
        {level && conf?.reason && <p className="reason">{t(conf.reason, lang)}</p>}
        <div className="buy">
          <div>
            <div className={`price ${repriced ? 'repriced' : ''}`}>{money(p.price, lang)}</div>
            <div className="stock">{p.stock === 0 ? t(C.soldOut, lang) : `${t(C.left, lang)} ${left}`}</div>
          </div>
          <button className="btn sm" disabled={left <= 0 || readOnly} onClick={() => onAdd(p.id)}>{t(C.add, lang)}</button>
        </div>
      </div>
    </article>
  );
}
