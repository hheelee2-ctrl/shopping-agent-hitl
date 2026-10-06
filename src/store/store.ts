import { allocate, buildCatalog } from './catalog';
import type { CartLine, Order, Product, StoreState } from './types';

export type AddResult = { ok: true; line: CartLine } | { ok: false; reason: 'sold-out' | 'unknown' | 'size' | 'other-size' };

/** 사람과 에이전트가 함께 쓰는 쇼핑몰 state. 둘 다 같은 메서드로 조작한다. */
export interface Store {
  getState(): StoreState;
  subscribe(fn: () => void): () => void;
  getProduct(id: string): Product | undefined;
  /** size를 생략하면 사이즈가 하나뿐인 상품만 담긴다. */
  addToCart(id: string, by: 'user' | 'agent', size?: string): AddResult;
  /** 지금 담을 수 있는 사이즈(재고 있고, 내가 이미 담은 수량을 뺀 것). */
  availableSizes(id: string): string[];
  setSizeStock(id: string, size: string, n: number): void;
  removeFromCart(id: string): void;
  cartTotal(): number;
  checkout(): Order | null;
  /** 쇼핑몰 쪽 변화(다른 구매자의 구매, 재입고). market이 부른다. 0이면 모든 사이즈가 품절. */
  setStock(id: string, stock: number): void;
  /** 판매처의 가격 변경. 이미 담긴 줄은 담은 시점 가격(priceAtAdd)을 유지한다. */
  setPrice(id: string, price: number): void;
  reset(): void;
}

const fresh = (): StoreState => ({ products: buildCatalog(), cart: [], orders: [] });

export function createStore(): Store {
  let state = fresh();
  const listeners = new Set<() => void>();
  const set = (next: StoreState) => {
    state = next;
    listeners.forEach((l) => l());
  };
  const cartTotal = () => state.cart.reduce((s, l) => s + l.priceAtAdd * l.qty, 0);

  return {
    getState: () => state,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    getProduct: (id) => state.products[id],
    availableSizes(id) {
      const p = state.products[id];
      if (!p) return [];
      const line = state.cart.find((l) => l.productId === id);
      return Object.entries(p.sizes).filter(([sz, n]) => n - (line && line.size === sz ? line.qty : 0) > 0).map(([sz]) => sz);
    },
    addToCart(id, by, size) {
      const p = state.products[id];
      if (!p) return { ok: false, reason: 'unknown' };
      const keys = Object.keys(p.sizes);
      const sz = size ?? (keys.length === 1 ? keys[0] : undefined);
      if (!sz || !(sz in p.sizes)) return { ok: false, reason: 'size' };
      const existing = state.cart.find((l) => l.productId === id);
      if (existing && existing.size !== sz) return { ok: false, reason: 'other-size' };
      if (p.sizes[sz] - (existing?.qty ?? 0) <= 0) return { ok: false, reason: 'sold-out' };
      const line: CartLine = existing
        ? { ...existing, qty: existing.qty + 1 }
        : { productId: id, qty: 1, addedBy: by, size: sz, priceAtAdd: p.price };
      set({ ...state, cart: existing ? state.cart.map((l) => (l.productId === id ? line : l)) : [...state.cart, line] });
      return { ok: true, line };
    },
    removeFromCart(id) {
      set({ ...state, cart: state.cart.filter((l) => l.productId !== id) });
    },
    cartTotal,
    checkout() {
      if (state.cart.length === 0) return null;
      const order: Order = { id: `o${state.orders.length + 1}`, lines: state.cart, total: cartTotal() };
      const products = { ...state.products };
      for (const l of state.cart) {
        const p = products[l.productId];
        const sizes = { ...p.sizes, [l.size]: Math.max(0, (p.sizes[l.size] ?? 0) - l.qty) };
        products[l.productId] = { ...p, sizes, stock: Object.values(sizes).reduce((a, b) => a + b, 0) };
      }
      set({ products, cart: [], orders: [...state.orders, order] });
      return order;
    },
    setStock(id, stock) {
      const p = state.products[id];
      if (!p) return;
      const sizes = allocate(p.category, stock);
      set({ ...state, products: { ...state.products, [id]: { ...p, sizes, stock } } });
    },
    setSizeStock(id, size, n) {
      const p = state.products[id];
      if (!p || !(size in p.sizes)) return;
      const sizes = { ...p.sizes, [size]: Math.max(0, n) };
      set({ ...state, products: { ...state.products, [id]: { ...p, sizes, stock: Object.values(sizes).reduce((a, b) => a + b, 0) } } });
    },
    setPrice(id, price) {
      const p = state.products[id];
      if (!p) return;
      set({ ...state, products: { ...state.products, [id]: { ...p, price } } });
    },
    reset() {
      set(fresh());
    },
  };
}
