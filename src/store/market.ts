import type { L } from '../engine/types';
import type { Store } from './store';

export type MarketEvent =
  | { id: number; at: number; kind: 'purchase'; productId: string; size: string; sizeLeft: number; left: number }
  | { id: number; at: number; kind: 'reprice'; productId: string; from: number; to: number }
  | { id: number; at: number; kind: 'restock'; productId: string; size: string; left: number };

/** 시드 고정 난수. 같은 시드면 같은 시장이 나온다 (테스트용). */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Draft<T> = T extends unknown ? Omit<T, 'id' | 'at'> : never;

export interface Market {
  /** 이벤트 하나를 만든다. 타이머 없이 직접 부를 수 있다 (테스트·시뮬레이션). */
  tick(): MarketEvent | null;
  /** 지금 누군가(사람·에이전트)가 보고 있는 상품. 다른 구매자도 이런 상품에 몰린다. */
  setInterest(ids: string[]): void;
  start(): void;
  stop(): void;
  /** 에이전트가 일하는 중이면 시장도 더 자주 움직인다. */
  setBusy(b: boolean): void;
  feed(): MarketEvent[];
  subscribe(fn: () => void): () => void;
  /** 쇼핑몰이 처음 상태로 돌아갈 때 기준 가격과 기록을 다시 잡는다. */
  rebase(): void;
}

const roundK = (n: number) => Math.max(1000, Math.round(n / 1000) * 1000);

/**
 * 같은 쇼핑몰 store 위에서 다른 구매자와 판매처가 움직이는 시장.
 * 재고가 적은 상품일수록, 그리고 지금 누가 보고 있는 상품일수록 더 자주 팔리고 가격이 바뀐다.
 * 에이전트는 이 변화를 따로 알지 못한다. 담는 시점에 store를 다시 읽을 뿐이다.
 */
export function createMarket(store: Store, opts: { rng?: () => number; now?: () => number } = {}): Market {
  const rng = opts.rng ?? Math.random;
  const now = opts.now ?? (() => Date.now());
  const listeners = new Set<() => void>();
  let log: MarketEvent[] = [];
  let seq = 0;
  let interest: string[] = [];
  let busy = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let base: Record<string, number> = {};
  const repriced = new Map<string, number>();
  const rebase = () => {
    base = Object.fromEntries(Object.values(store.getState().products).map((p) => [p.id, p.price]));
    repriced.clear();
    log = [];
    listeners.forEach((l) => l());
  };
  rebase();

  const push = (e: Draft<MarketEvent>) => {
    const ev = { ...e, id: ++seq, at: now() } as MarketEvent;
    log = [ev, ...log].slice(0, 12);
    listeners.forEach((l) => l());
    return ev;
  };

  const pickWeighted = (ids: string[], weight: (id: string) => number) => {
    const ws = ids.map(weight);
    const sum = ws.reduce((a, b) => a + b, 0);
    if (sum <= 0) return null;
    let r = rng() * sum;
    for (let i = 0; i < ids.length; i++) { r -= ws[i]; if (r <= 0) return ids[i]; }
    return ids[ids.length - 1];
  };

  const tick = (): MarketEvent | null => {
    const s = store.getState();
    const all = Object.values(s.products);
    const watched = interest.filter((id) => s.products[id]);
    // 보고 있는 상품이 있으면 절반쯤은 거기서 일이 난다
    const pool = watched.length > 0 && rng() < 0.5 ? watched : all.map((p) => p.id);

    const roll = rng();
    // 재입고: 품절 상품이 있으면 가끔 들어온다
    const out = all.filter((p) => p.stock === 0).map((p) => p.id);
    if (out.length > 0 && roll < 0.1) {
      const id = out[Math.floor(rng() * out.length)];
      const keys = Object.keys(s.products[id].sizes);
      const size = keys[Math.floor(rng() * keys.length)];
      const add = 1 + Math.floor(rng() * 3);
      store.setSizeStock(id, size, add);
      return push({ kind: 'restock', productId: id, size, left: store.getProduct(id)!.stock });
    }
    // 가격 변경: 많이 보는 상품·재고 적은 상품에서, 기준가의 ±15% 안에서만
    if (roll < 0.32) {
      const id = pickWeighted(pool, (i) => ((repriced.get(i) ?? 0) < 2 ? 1 : 0));
      if (!id) return null;
      const p = s.products[id];
      const dir = rng() < 0.6 ? 1 : -1; // 오르는 일이 조금 더 잦다
      const step = 0.05 + rng() * 0.07;
      const to = roundK(Math.min(base[id] * 1.15, Math.max(base[id] * 0.85, p.price * (1 + dir * step))));
      if (to === p.price) return null;
      store.setPrice(id, to);
      repriced.set(id, (repriced.get(id) ?? 0) + 1);
      return push({ kind: 'reprice', productId: id, from: p.price, to });
    }
    // 다른 구매자의 구매: 재고가 적을수록 잘 팔린다. 내 장바구니에 담은 수량 밑으로는 줄이지 않는다.
    const id = pickWeighted(pool, (i) => {
      const p = s.products[i];
      return store.availableSizes(i).length > 0 ? 1 / Math.max(1, p.stock) : 0;
    });
    if (!id) return null;
    const open = store.availableSizes(id);
    const size = open[Math.floor(rng() * open.length)];
    const sizeLeft = s.products[id].sizes[size] - 1;
    store.setSizeStock(id, size, sizeLeft);
    return push({ kind: 'purchase', productId: id, size, sizeLeft, left: store.getProduct(id)!.stock });
  };

  const delay = () => (busy ? 3500 + rng() * 3500 : 9000 + rng() * 9000);
  const loop = () => { timer = setTimeout(() => { tick(); loop(); }, delay()); };

  return {
    tick,
    setInterest(ids) { interest = ids; },
    start() { if (!timer) loop(); },
    stop() { if (timer) { clearTimeout(timer); timer = null; } },
    setBusy(b) { busy = b; },
    feed: () => log,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    rebase,
  };
}

/** 피드 한 줄을 사람이 읽는 문장으로 */
export function describeMarket(e: MarketEvent, name: L, fmt: (n: number) => L): L {
  const sz = (size: string): L => (size === 'FREE' ? { ko: '', en: '' } : { ko: ` ${size} 사이즈`, en: ` size ${size}` });
  if (e.kind === 'purchase') {
    if (e.left === 0) return { ko: `${name.ko} 마지막 재고가 방금 팔렸어요`, en: `${name.en}: the last unit just sold` };
    if (e.sizeLeft === 0) return { ko: `${name.ko}${sz(e.size).ko} 품절`, en: `${name.en}${sz(e.size).en} sold out` };
    return { ko: `${name.ko} 재고 ${e.left}개 남음`, en: `${name.en}: ${e.left} left` };
  }
  if (e.kind === 'restock') return { ko: `${name.ko}${sz(e.size).ko} 재입고`, en: `${name.en}${sz(e.size).en} back in stock` };
  const up = e.to > e.from;
  return {
    ko: `${name.ko} ${fmt(e.from).ko} → ${fmt(e.to).ko} ${up ? '인상' : '인하'}`,
    en: `${name.en} ${fmt(e.from).en} → ${fmt(e.to).en} ${up ? 'up' : 'down'}`,
  };
}
