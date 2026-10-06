import { describe, expect, it } from 'vitest';
import { parseMulti, parseRequest } from './parser';
import { isEligible, searchProducts } from './search';
import { createStore } from './store';

describe('parseRequest', () => {
  it('요청에서 사이즈를 뽑고 unknown으로 남기지 않는다', () => {
    expect(parseRequest('검정 울 코트 L 사이즈')).toMatchObject({ size: 'L', unknown: [] });
    expect(parseRequest('화이트 스니커즈 270')).toMatchObject({ size: '270', unknown: [] });
  });
  it('색상·소재·종류·가격 상한을 해석한다', () => {
    const c = parseRequest('검정 울 코트, 20만원 이하');
    expect(c).toMatchObject({ category: 'coat', colors: ['black'], materials: ['wool'], maxPrice: 200000, unknown: [] });
  });
  it('계절·종류, 군더더기 표현은 unknown으로 남기지 않는다', () => {
    const c = parseRequest('가을에 입기 좋은 자켓');
    expect(c).toMatchObject({ category: 'jacket', seasons: ['autumn'], unknown: [] });
  });
  it('블루종은 색상이 아니라 자켓으로 해석한다', () => {
    const c = parseRequest('블루종');
    expect(c.category).toBe('jacket');
    expect(c.colors).toEqual([]);
  });
  it('모르는 표현은 unknown에 남긴다', () => {
    expect(parseRequest('코트 힙한 느낌').unknown).toContain('힙한');
  });
  it('종류가 없으면 category가 비어 있다', () => {
    expect(parseRequest('검정색 20만원 이하').category).toBeUndefined();
  });
});

describe('searchProducts', () => {
  const products = () => Object.values(createStore().getState().products);

  it('조건이 모두 맞는 상품이 1순위, 울 혼방은 부분 일치', () => {
    const r = searchProducts(products(), parseRequest('검정 울 코트, 20만원 이하'));
    expect(r[0].product.id).toBe('c1');
    const c3 = r.find((s) => s.product.id === 'c3')!;
    expect(c3.partial).toContain('material');
    expect(c3.score).toBeLessThan(r[0].score);
  });
  it('예산을 넘으면 budget miss로 표시되어 eligible이 아니다', () => {
    const r = searchProducts(products(), parseRequest('검정 울 코트, 20만원 이하'));
    const c5 = r.find((s) => s.product.id === 'c5')!;
    expect(c5.missed).toContain('budget');
    expect(isEligible(c5)).toBe(false);
  });
  it('다른 종류는 결과에 없다', () => {
    const r = searchProducts(products(), parseRequest('검정 코트'));
    expect(r.every((s) => s.product.category === 'coat')).toBe(true);
  });
});

describe('store', () => {
  it('재고 이상으로는 담을 수 없다', () => {
    const s = createStore();
    const z = s.availableSizes('s1')[0];
    expect(s.addToCart('s1', 'user', z).ok).toBe(true);
    expect(s.addToCart('s1', 'user', z)).toEqual({ ok: false, reason: 'sold-out' });
  });
  it('checkout은 재고를 차감하고 장바구니를 비운다', () => {
    const s = createStore();
    s.addToCart('c1', 'user', s.availableSizes('c1')[0]);
    const before = s.getProduct('c1')!.stock;
    const order = s.checkout();
    expect(order?.[0].total).toBe(178000);
    expect(s.getProduct('c1')!.stock).toBe(before - 1);
    expect(s.getState().cart).toHaveLength(0);
  });
  it('변경 시 구독자에게 알린다', () => {
    const s = createStore();
    let n = 0;
    s.subscribe(() => n++);
    s.addToCart('c1', 'agent', s.availableSizes('c1')[0]);
    s.setStock('c1', 0);
    expect(n).toBe(2);
  });
});

describe('setPrice', () => {
  it('상품 가격은 바뀌지만 이미 담긴 줄은 담은 시점 가격을 유지한다', () => {
    const s = createStore();
    s.addToCart('c1', 'agent', s.availableSizes('c1')[0]);
    s.setPrice('c1', 199000);
    expect(s.getProduct('c1')!.price).toBe(199000);
    expect(s.cartTotal()).toBe(178000);
  });
});

describe('parseMulti', () => {
  it('한국어: 항목 둘 + 합계 예산', () => {
    const r = parseMulti('검정 울 코트 20만원 이하랑 검정 가죽 로퍼, 합쳐서 35만원');
    expect(r.items.map((c) => c.category)).toEqual(['coat', 'loafers']);
    expect(r.items[0].maxPrice).toBe(200000);
    expect(r.budget).toBe(350000);
  });
  it('English: and + total', () => {
    const r = parseMulti('black wool coat under 200000 and black leather loafers, total 350000');
    expect(r.items.map((c) => c.category)).toEqual(['coat', 'loafers']);
    expect(r.budget).toBe(350000);
  });
  it('쉼표가 있어도 조각마다 종류가 없으면 단일 요청이다', () => {
    const r = parseMulti('검정 울 코트, 20만원 이하');
    expect(r.items).toHaveLength(1);
    expect(r.items[0].maxPrice).toBe(200000);
  });
});

describe('size', () => {
  it('사이즈를 고르지 않으면 여러 사이즈 상품은 담을 수 없다', () => {
    const s = createStore();
    expect(s.addToCart('c1', 'user')).toEqual({ ok: false, reason: 'size' });
  });
  it('담은 상품의 다른 사이즈는 같은 줄로 담을 수 없다', () => {
    const s = createStore();
    const [a, b] = s.availableSizes('c1');
    expect(s.addToCart('c1', 'user', a).ok).toBe(true);
    expect(s.addToCart('c1', 'user', b)).toEqual({ ok: false, reason: 'other-size' });
  });
  it('사이즈 재고는 합이 상품 재고이고, 결제하면 그 사이즈만 줄어든다', () => {
    const s = createStore();
    const p = s.getProduct('c1')!;
    expect(Object.values(p.sizes).reduce((x, y) => x + y, 0)).toBe(p.stock);
    s.addToCart('c1', 'user', 'M');
    const before = s.getProduct('c1')!.sizes.M;
    s.checkout();
    expect(s.getProduct('c1')!.sizes.M).toBe(before - 1);
  });
});

describe('판매처·배송비', () => {
  const TUE = new Date(2026, 9, 6, 10, 0).getTime();
  it('합계에는 판매처별 배송비가 들어가고, 무료배송 기준은 판매처마다 따로 본다', () => {
    const s = createStore({ now: () => TUE });
    s.addToCart('sh1', 'user', 'M', 'shelf'); // 68,000 + 배송비 2,500 (15만원 이상 무료)
    expect(s.cartTotal()).toBe(70500);
    s.addToCart('pt1', 'user', '32', 'shelf');
    expect(s.quote()).toHaveLength(1);
    expect(s.cartTotal()).toBe(68000 + s.getOffer('pt1', 'shelf')!.price); // 합이 15만원을 넘어 무료
  });
  it('판매처 순위는 배송비 포함 총액, 해외직구는 맨 뒤', () => {
    const s = createStore({ now: () => TUE });
    const r = s.rankOffers('sh1', 'M');
    expect(r[0].seller.id).toBe('daero');
    const b = s.rankOffers('b1');
    expect(b[b.length - 1].seller.overseas).toBe(true);
  });
  it('결제하면 판매처마다 주문이 생기고 그 판매처 재고만 줄어든다', () => {
    const s = createStore({ now: () => TUE });
    s.addToCart('c1', 'user', 'M');
    s.addToCart('sh1', 'user', 'M');
    const before = s.getOffer('c1', 'off-noirlab')!.sizes.M;
    const orders = s.checkout()!;
    expect(orders.map((o) => o.sellerId).sort()).toEqual(['daero', 'off-noirlab']);
    expect(s.getOffer('c1', 'off-noirlab')!.sizes.M).toBe(before - 1);
    expect(orders.find((o) => o.sellerId === 'daero')!.arriveAt).toBeLessThan(orders.find((o) => o.sellerId === 'off-noirlab')!.arriveAt);
  });
});

describe('도착 마감 해석', () => {
  it('요일·내일·이번 주를 뽑고 unknown으로 남기지 않는다', () => {
    expect(parseRequest('검정 울 코트 금요일까지')).toMatchObject({ deliverBy: { weekday: 5 }, unknown: [] });
    expect(parseRequest('화이트 스니커즈 내일까지 받아야 해')).toMatchObject({ deliverBy: { days: 1 }, unknown: [] });
    expect(parseMulti('코트랑 로퍼 이번 주 안에').items.every((c) => c.deliverBy?.weekday === 6)).toBe(true);
  });
});
