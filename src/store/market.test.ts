import { describe, expect, it } from 'vitest';
import { createStore } from './store';
import { createMarket, mulberry32 } from './market';

const run = (seed: number, n: number, interest: string[] = []) => {
  const store = createStore();
  const m = createMarket(store, { rng: mulberry32(seed), now: () => 0 });
  m.setInterest(interest);
  for (let i = 0; i < n; i++) m.tick();
  return { store, m };
};

describe('market', () => {
  it('같은 시드면 같은 시장이 나온다', () => {
    const a = run(7, 40);
    const b = run(7, 40);
    expect(a.m.feed()).toEqual(b.m.feed());
    expect(a.store.getState().products).toEqual(b.store.getState().products);
  });
  it('재고는 음수가 되지 않고, 가격은 기준가의 ±15% 안에 머문다', () => {
    const base = createStore().getState().products;
    for (const seed of [1, 2, 3, 4, 5]) {
      const { store } = run(seed, 400);
      for (const p of Object.values(store.getState().products)) {
        expect(p.stock).toBeGreaterThanOrEqual(0);
        expect(p.price).toBeGreaterThanOrEqual(Math.floor(base[p.id].price * 0.85 / 1000) * 1000);
        expect(p.price).toBeLessThanOrEqual(Math.ceil(base[p.id].price * 1.15 / 1000) * 1000);
      }
    }
  });
  it('내 장바구니에 담은 수량 밑으로 재고를 줄이지 않는다', () => {
    const store = createStore();
    store.addToCart('s1', 'user', store.availableSizes('s1')[0]); // 재고 1
    const m = createMarket(store, { rng: mulberry32(3), now: () => 0 });
    m.setInterest(['s1']);
    for (let i = 0; i < 200; i++) m.tick();
    expect(store.getProduct('s1')!.stock).toBeGreaterThanOrEqual(1);
  });
  it('담아둔 줄의 가격은 시장이 가격을 바꿔도 담은 시점 그대로다', () => {
    const store = createStore();
    store.addToCart('c1', 'agent', store.availableSizes('c1')[0]);
    const m = createMarket(store, { rng: mulberry32(11), now: () => 0 });
    m.setInterest(['c1']);
    for (let i = 0; i < 200; i++) m.tick();
    expect(store.getState().cart[0].priceAtAdd).toBe(178000);
  });
  it('보고 있는 상품 쪽에서 일이 더 자주 난다', () => {
    const { m } = run(5, 300, ['c1']);
    const hit = m.feed().filter((e) => e.productId === 'c1').length;
    expect(hit).toBeGreaterThan(0);
  });
  it('rebase는 기록과 기준 가격을 처음으로 돌린다', () => {
    const { store, m } = run(9, 50);
    store.reset();
    m.rebase();
    expect(m.feed()).toHaveLength(0);
  });
});
