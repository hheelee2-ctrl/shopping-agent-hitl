import { useEffect, useState, useSyncExternalStore } from 'react';
import type { Lang } from '../engine/types';
import { describeMarket, type Market } from '../store/market';
import type { Store } from '../store/store';
import { C, money, t } from './copy';

/** 쇼핑몰이 지금도 움직이고 있다는 걸 보여주는 한 줄. 새 이벤트가 오면 위로 밀려 들어온다. */
export function MarketTicker({ market, store, lang }: { market: Market; store: Store; lang: Lang }) {
  const feed = useSyncExternalStore(market.subscribe, market.feed);
  const [open, setOpen] = useState(false);
  const [fresh, setFresh] = useState<number | null>(null);
  const top = feed[0];
  useEffect(() => {
    if (!top) { setFresh(null); return; }
    setFresh(top.id);
    const id = window.setTimeout(() => setFresh(null), 6000);
    return () => window.clearTimeout(id);
  }, [top?.id]);

  const line = (e: (typeof feed)[number]) => {
    const p = store.getProduct(e.productId);
    return p ? t(describeMarket(e, p.name, (n) => ({ ko: money(n, 'ko'), en: money(n, 'en') })), lang) : '';
  };

  return (
    <div className={`ticker ${open ? 'open' : ''}`}>
      <button className="ticker-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="live-dot" aria-hidden />
        <span className="ticker-l">{t(C.market, lang)}</span>
        <span className="ticker-now" key={top?.id ?? 'none'}>{top ? line(top) : ''}</span>
        <span className="ticker-n" aria-hidden>{feed.length > 0 ? `${open ? '−' : '+'}${feed.length}` : ''}</span>
      </button>
      {open && feed.length > 0 && (
        <ul className="ticker-list">
          {feed.map((e) => <li key={e.id} className={`${e.kind} ${e.id === fresh ? 'fresh' : ''}`}>{line(e)}</li>)}
        </ul>
      )}
    </div>
  );
}
