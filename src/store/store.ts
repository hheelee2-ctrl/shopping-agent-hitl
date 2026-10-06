import { allocate, buildCatalog, summarize } from './catalog';
import { scheduleOf, sellerOf, shippingFee, type Seller } from './sellers';
import type { CartLine, Offer, Order, Product, StoreState } from './types';

export type AddResult =
  | { ok: true; line: CartLine }
  | { ok: false; reason: 'sold-out' | 'unknown' | 'size' | 'other-size' | 'other-seller' };

/** 이 오퍼를 지금 장바구니에 하나 더 담으면 드는 돈과 도착 시점 */
export interface Ranked {
  offer: Offer;
  seller: Seller;
  /** 판매가 + 이걸 담아서 늘어나는 배송비 */
  landed: number;
  /** 이걸 담아서 늘어나는 배송비 (같은 판매처 무료배송 기준을 넘기면 음수일 수도 있다) */
  shipping: number;
  arriveAt: number;
}

/** 판매처 하나에 대한 장바구니 묶음. 결제하면 이 묶음이 주문 하나가 된다. */
export interface Quote {
  sellerId: string;
  lines: CartLine[];
  subtotal: number;
  shipping: number;
  total: number;
  shipAt: number;
  arriveAt: number;
}

/** 사람과 에이전트가 함께 쓰는 쇼핑 state. 둘 다 같은 메서드로 조작한다. */
export interface Store {
  getState(): StoreState;
  subscribe(fn: () => void): () => void;
  now(): number;
  getProduct(id: string): Product | undefined;
  offersOf(productId: string): Offer[];
  getOffer(productId: string, sellerId: string): Offer | undefined;
  /** 이 사이즈를 지금 살 수 있는 오퍼를, 배송비를 포함한 총액이 낮은 순으로. 해외직구는 뒤로 보낸다. */
  rankOffers(productId: string, size?: string): Ranked[];
  /** size·sellerId를 생략하면: 사이즈가 하나뿐일 때만 담기고, 판매처는 총액이 가장 낮은 국내 판매처를 고른다. */
  addToCart(id: string, by: 'user' | 'agent', size?: string, sellerId?: string): AddResult;
  /** 지금 담을 수 있는 사이즈(재고 있고, 내가 이미 담은 수량을 뺀 것). sellerId가 없으면 전 판매처 합. */
  availableSizes(id: string, sellerId?: string): string[];
  /** 담긴 줄을 다른 판매처로 옮긴다. 그 판매처에 같은 사이즈 재고가 있어야 한다. */
  switchSeller(id: string, sellerId: string): boolean;
  removeFromCart(id: string): void;
  /** 상품가 + 판매처별 배송비 */
  cartTotal(): number;
  quote(): Quote[];
  checkout(by?: 'user' | 'agent'): Order[] | null;
  /** 쇼핑몰 쪽 변화. sellerId가 없으면 대표 판매처(공식몰)에만 두고 나머지 판매처는 0으로 맞춘다. */
  setStock(id: string, stock: number, sellerId?: string): void;
  setSizeStock(id: string, size: string, n: number, sellerId?: string): void;
  /** 판매처의 가격 변경. sellerId가 없으면 모든 판매처 가격을 같은 폭으로 옮겨 대표가가 price가 되게 한다. 담긴 줄은 담은 시점 가격을 유지한다. */
  setPrice(id: string, price: number, sellerId?: string): void;
  reset(): void;
}

/** 장바구니를 판매처별 묶음으로. 결제 화면과 장바구니가 같은 계산을 쓴다. */
export function quoteOf(cart: CartLine[], t: number): Quote[] {
  const by = new Map<string, CartLine[]>();
  for (const l of cart) by.set(l.sellerId, [...(by.get(l.sellerId) ?? []), l]);
  return [...by.entries()].map(([sellerId, lines]) => {
    const s = sellerOf(sellerId);
    const subtotal = lines.reduce((a, l) => a + l.priceAtAdd * l.qty, 0);
    const shipping = shippingFee(s, subtotal);
    return { sellerId, lines, subtotal, shipping, total: subtotal + shipping, ...scheduleOf(s, t) };
  });
}

const fresh = (): StoreState => ({ ...buildCatalog(), cart: [], orders: [] });
const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
const ymd = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

export function createStore(opts: { now?: () => number } = {}): Store {
  const now = opts.now ?? (() => Date.now());
  let state = fresh();
  let seq = 0;
  const listeners = new Set<() => void>();
  const set = (next: StoreState) => {
    state = next;
    listeners.forEach((l) => l());
  };

  const offersOf = (pid: string) => Object.values(state.offers).filter((o) => o.productId === pid);
  const lineOf = (pid: string) => state.cart.find((l) => l.productId === pid);
  const held = (o: Offer, size: string) => {
    const l = lineOf(o.productId);
    return l && l.sellerId === o.sellerId && l.size === size ? l.qty : 0;
  };
  const subtotalAt = (sellerId: string) =>
    state.cart.filter((l) => l.sellerId === sellerId).reduce((s, l) => s + l.priceAtAdd * l.qty, 0);

  /** 오퍼를 바꾸고, 그 상품의 요약을 다시 계산한다 */
  const putOffers = (pid: string, next: Offer[]) => {
    const offers = { ...state.offers };
    for (const o of next) offers[o.id] = { ...o, stock: sum(o.sizes) };
    const p = state.products[pid];
    set({ ...state, offers, products: { ...state.products, [pid]: summarize(p, Object.values(offers)) } });
  };

  const quote = () => quoteOf(state.cart, now());

  const rankOffers = (pid: string, size?: string): Ranked[] => {
    const t = now();
    return offersOf(pid)
      .filter((o) => (size ? (o.sizes[size] ?? 0) - held(o, size) > 0 : o.stock > 0))
      .map((o) => {
        const seller = sellerOf(o.sellerId);
        const sub = subtotalAt(o.sellerId);
        const shipping = shippingFee(seller, sub + o.price) - (sub > 0 ? shippingFee(seller, sub) : 0);
        return { offer: o, seller, landed: o.price + shipping, shipping, arriveAt: scheduleOf(seller, t).arriveAt };
      })
      .sort((a, b) => Number(!!a.seller.overseas) - Number(!!b.seller.overseas) || a.landed - b.landed || a.arriveAt - b.arriveAt);
  };

  return {
    getState: () => state,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    now,
    getProduct: (id) => state.products[id],
    offersOf,
    getOffer: (pid, sid) => state.offers[`${pid}@${sid}`],
    rankOffers,
    availableSizes(id, sellerId) {
      const p = state.products[id];
      if (!p) return [];
      const list = offersOf(id).filter((o) => !sellerId || o.sellerId === sellerId);
      return Object.keys(p.sizes).filter((z) => list.some((o) => (o.sizes[z] ?? 0) - held(o, z) > 0));
    },
    addToCart(id, by, size, sellerId) {
      const p = state.products[id];
      if (!p) return { ok: false, reason: 'unknown' };
      const keys = Object.keys(p.sizes);
      const sz = size ?? (keys.length === 1 ? keys[0] : undefined);
      if (!sz || !(sz in p.sizes)) return { ok: false, reason: 'size' };
      const existing = lineOf(id);
      if (existing && existing.size !== sz) return { ok: false, reason: 'other-size' };
      if (existing && sellerId && existing.sellerId !== sellerId) return { ok: false, reason: 'other-seller' };
      const sid = existing?.sellerId ?? sellerId ?? rankOffers(id, sz)[0]?.offer.sellerId;
      const offer = sid ? state.offers[`${id}@${sid}`] : undefined;
      if (!offer || (offer.sizes[sz] ?? 0) - (existing?.qty ?? 0) <= 0) return { ok: false, reason: 'sold-out' };
      const line: CartLine = existing
        ? { ...existing, qty: existing.qty + 1 }
        : { productId: id, sellerId: offer.sellerId, qty: 1, addedBy: by, size: sz, priceAtAdd: offer.price };
      set({ ...state, cart: existing ? state.cart.map((l) => (l.productId === id ? line : l)) : [...state.cart, line] });
      return { ok: true, line };
    },
    switchSeller(id, sellerId) {
      const l = lineOf(id);
      const o = state.offers[`${id}@${sellerId}`];
      if (!l || !o || (o.sizes[l.size] ?? 0) < l.qty) return false;
      set({ ...state, cart: state.cart.map((x) => (x.productId === id ? { ...x, sellerId, priceAtAdd: o.price } : x)) });
      return true;
    },
    removeFromCart(id) {
      set({ ...state, cart: state.cart.filter((l) => l.productId !== id) });
    },
    cartTotal: () => quote().reduce((a, q) => a + q.total, 0),
    quote,
    checkout(by = 'user') {
      if (state.cart.length === 0) return null;
      const t = now();
      const made: Order[] = quote().map((q) => ({
        id: `${ymd(t)}-${String(++seq).padStart(4, '0')}`,
        sellerId: q.sellerId, lines: q.lines, subtotal: q.subtotal, shipping: q.shipping, total: q.total,
        placedAt: t, shipAt: q.shipAt, arriveAt: q.arriveAt, by,
      }));
      const offers = { ...state.offers };
      for (const l of state.cart) {
        const o = offers[`${l.productId}@${l.sellerId}`];
        const sizes = { ...o.sizes, [l.size]: Math.max(0, (o.sizes[l.size] ?? 0) - l.qty) };
        offers[o.id] = { ...o, sizes, stock: sum(sizes) };
      }
      const all = Object.values(offers);
      const products = Object.fromEntries(Object.values(state.products).map((p) => [p.id, summarize(p, all)]));
      set({ products, offers, cart: [], orders: [...made, ...state.orders] });
      return made;
    },
    setStock(id, stock, sellerId) {
      const p = state.products[id];
      if (!p) return;
      const list = offersOf(id);
      const target = sellerId ?? list[0]?.sellerId;
      putOffers(id, list.map((o) => {
        if (o.sellerId === target) return { ...o, sizes: allocate(p.category, stock) };
        if (sellerId) return o;
        return { ...o, sizes: allocate(p.category, 0) };
      }));
    },
    setSizeStock(id, size, n, sellerId) {
      const p = state.products[id];
      if (!p || !(size in p.sizes)) return;
      const list = offersOf(id);
      const target = sellerId ?? list[0]?.sellerId;
      putOffers(id, list.map((o) => {
        if (o.sellerId === target) return { ...o, sizes: { ...o.sizes, [size]: Math.max(0, n) } };
        if (sellerId) return o;
        return { ...o, sizes: { ...o.sizes, [size]: 0 } };
      }));
    },
    setPrice(id, price, sellerId) {
      const p = state.products[id];
      if (!p) return;
      const list = offersOf(id);
      if (sellerId) return putOffers(id, list.filter((o) => o.sellerId === sellerId).map((o) => ({ ...o, price })));
      const delta = price - p.price;
      putOffers(id, list.map((o) => ({ ...o, price: Math.max(1000, o.price + delta) })));
    },
    reset() {
      seq = 0;
      set(fresh());
    },
  };
}
