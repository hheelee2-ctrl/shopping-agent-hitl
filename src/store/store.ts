import { buildCatalog } from './catalog';
import type { CartLine, Order, Product, StoreState } from './types';

export type AddResult = { ok: true; line: CartLine } | { ok: false; reason: 'sold-out' | 'unknown' };

/** 사람과 에이전트가 함께 쓰는 쇼핑몰 state. 둘 다 같은 메서드로 조작한다. */
export interface Store {
  getState(): StoreState;
  subscribe(fn: () => void): () => void;
  getProduct(id: string): Product | undefined;
  addToCart(id: string, by: 'user' | 'agent'): AddResult;
  removeFromCart(id: string): void;
  cartTotal(): number;
  checkout(): Order | null;
  /** 시연용: 다른 구매자가 재고를 가져가는 등 쇼핑몰 쪽 변화를 만든다. */
  setStock(id: string, stock: number): void;
  /** 시연용: 승인한 뒤 판매처가 가격을 바꾸는 경우. 이미 담긴 줄은 담은 시점 가격(priceAtAdd)을 유지한다. */
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
    addToCart(id, by) {
      const p = state.products[id];
      if (!p) return { ok: false, reason: 'unknown' };
      const existing = state.cart.find((l) => l.productId === id);
      if (p.stock - (existing?.qty ?? 0) <= 0) return { ok: false, reason: 'sold-out' };
      const line: CartLine = existing
        ? { ...existing, qty: existing.qty + 1 }
        : { productId: id, qty: 1, addedBy: by, priceAtAdd: p.price };
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
        products[l.productId] = { ...p, stock: Math.max(0, p.stock - l.qty) };
      }
      set({ products, cart: [], orders: [...state.orders, order] });
      return order;
    },
    setStock(id, stock) {
      const p = state.products[id];
      if (!p) return;
      set({ ...state, products: { ...state.products, [id]: { ...p, stock } } });
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
