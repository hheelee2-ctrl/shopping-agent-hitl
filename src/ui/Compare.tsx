import { useEffect, useState } from 'react';
import type { L, Lang } from '../engine/types';
import type { ConsoleState } from '../state/console';
import type { Store } from '../store/store';
import { COLOR_L, MATERIAL_L } from '../store/labels';
import { photoUrl } from '../store/photos';
import { C, LEVEL, SV, SZ, money, t } from './copy';
import { arrivalLabel } from '../store/sellers';
import { ConfRing } from './ConfRing';
import { Mark } from './Mark';

const X = {
  title: { ko: '후보 비교', en: 'Compare' } satisfies L,
  sub: { ko: '차이가 나는 항목만 진하게 표시했어요.', en: 'Only the rows that differ are emphasized.' } satisfies L,
  pick: { ko: '이걸로 할게요', en: 'Pick this one' } satisfies L,
  price: { ko: '가격', en: 'Price' } satisfies L,
  color: { ko: '색상', en: 'Color' } satisfies L,
  material: { ko: '소재', en: 'Material' } satisfies L,
  conf: { ko: '확신', en: 'Confidence' } satisfies L,
};

interface Props { lang: Lang; store: Store; state: ConsoleState; onPick: (id: string) => void; onClose: () => void }

/** 에이전트가 고를 수 없을 때(동점) 후보를 나란히 놓고 사람이 고른다. 같은 값의 행은 흐리게, 다른 행만 진하게. */
export function Compare({ lang, store, state, onPick, onClose }: Props) {
  const q = state.question;
  const [chosen, setChosen] = useState<string | null>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !chosen) onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose, chosen]);
  if (!q) return null;
  const items = q.options.map((o) => store.getProduct(o.id)).filter((p): p is NonNullable<typeof p> => !!p);
  if (items.length < 2) return null;

  const rows: { key: string; label: L; cells: string[] }[] = [
    { key: 'price', label: X.price, cells: items.map((p) => money(p.price, lang)) },
    { key: 'color', label: X.color, cells: items.map((p) => p.colors.map((c) => t(COLOR_L[c], lang)).join(', ')) },
    { key: 'mat', label: X.material, cells: items.map((p) => p.materials.map((m) => t(MATERIAL_L[m], lang)).join(', ')) },
    { key: 'seller', label: SV.best, cells: items.map((p) => { const r = store.rankOffers(p.id)[0]; return r ? `${t(r.seller.name, lang)}, ${money(r.landed, lang)}` : '–'; }) },
    { key: 'arrive', label: SV.arrive, cells: items.map((p) => { const r = store.rankOffers(p.id)[0]; return r ? t(arrivalLabel(r.arriveAt, store.now()), lang) : '–'; }) },
    { key: 'size', label: SZ.pick, cells: items.map((p) => Object.entries(p.sizes).filter(([, n]) => n > 0).map(([z]) => z).join(' ')) },
    { key: 'stock', label: C.left, cells: items.map((p) => String(p.stock)) },
  ];
  const diff = (cells: string[]) => new Set(cells).size > 1;

  const pick = (id: string) => {
    if (chosen) return;
    setChosen(id);
    window.setTimeout(() => onPick(id), 520);
  };

  return (
    <div className={`cmp-wrap ${chosen ? 'chosen' : ''}`} role="dialog" aria-modal="true" aria-label={t(X.title, lang)}>
      <div className="cmp-scrim" onClick={() => !chosen && onClose()} />
      <div className="cmp">
        <header className="cmp-head">
          <div>
            <h2>{t(X.title, lang)}</h2>
            <p>{t(X.sub, lang)}</p>
          </div>
          <button className="btn sm" onClick={onClose} disabled={!!chosen}>{t(C.close, lang)}</button>
        </header>
        <div className="cmp-cols" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
          {items.map((p, i) => {
            const c = state.confidence[p.id];
            const src = photoUrl(p.id);
            return (
              <article key={p.id} className={`cmp-col ${chosen === p.id ? 'win' : chosen ? 'lose' : ''}`} style={{ '--i': i } as React.CSSProperties}>
                <div className={`cmp-ph sw sw-${p.colors[0]}`}>{src && <img className="ph" src={src} alt={t(p.name, lang)} />}</div>
                <div className="brand">{p.brand}</div>
                <h3>{t(p.name, lang)}</h3>
                <dl>
                  {rows.map((r) => (
                    <div key={r.key} className={diff(r.cells) ? 'on' : ''}><dt>{t(r.label, lang)}</dt><dd>{r.cells[i]}</dd></div>
                  ))}
                  <div className="on"><dt>{t(X.conf, lang)}</dt><dd>{c ? <span className="conf"><ConfRing level={c.level} />{t(LEVEL[c.level], lang)}</span> : '–'}</dd></div>
                </dl>
                {c?.reason && <p className="cmp-reason">{t(c.reason, lang)}</p>}
                <button className="btn primary ok" onClick={() => pick(p.id)} disabled={!!chosen}>{t(X.pick, lang)}</button>
                {chosen === p.id && <span className="cmp-nod"><Mark variant="dot" size={30} nod={1} phase="done" /></span>}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
