import { describe, expect, it } from 'vitest';
import { createStore } from '../store/store';
import { checkWatch, decide, defaultTarget, scriptedDay, simulateDay, totalOf, type Watch } from './watch';

// c1 미드나잇 울 싱글 코트: 공식몰·셀렉트숍·종합몰이 판다
function setup(over: Partial<Watch> = {}) {
  const store = createStore();
  const offers = store.offersOf('c1');
  // 판매처 구성을 고정해 두고 시작한다: 모두 M 재고 3개, 가격은 목표 위
  for (const o of offers) {
    store.setSizeStock('c1', 'M', 3, o.sellerId);
    store.setPrice('c1', 200000, o.sellerId);
  }
  const w: Watch = { id: 'w1', productId: 'c1', size: 'M', maxTotal: 150000, domesticOnly: true, days: 14, preapproved: true, ...over };
  return { store, w };
}

describe('[R10] 가격 대기: 미리 정한 조건이 모두 맞을 때만 산다', () => {
  it('목표가 위면 기다리고, 조건 안의 최저 총액을 알려준다', () => {
    const { store, w } = setup();
    const v = checkWatch(w, store, 1);
    expect(v.kind).toBe('wait');
    expect(v.kind === 'wait' && v.best).toBe(200000); // 무료배송 판매처 기준
  });

  it('국내 판매처가 사이즈 재고와 함께 배송비 포함 목표 아래로 오면 산다', () => {
    const { store, w } = setup();
    store.setPrice('c1', 148000, 'daero'); // 종합몰은 무료배송
    const v = checkWatch(w, store, 3);
    expect(v).toEqual({ kind: 'match', sellerId: 'daero', price: 148000, total: 148000 });
    expect(decide(w, v)).toBe('buy');
  });

  it('표시가는 목표 아래지만 배송비를 더하면 넘으면 사지 않고 이유를 남긴다', () => {
    const { store, w } = setup();
    store.setPrice('c1', 149000, 'shelf'); // 셀렉트숍은 15만원 미만이면 배송비 2,500원
    const v = checkWatch(w, store, 2);
    expect(v).toMatchObject({ kind: 'hold', sellerId: 'shelf', price: 149000, total: 151500, misses: ['shipping'] });
    expect(decide(w, v)).toBe('hold');
  });

  it('가격이 내려온 판매처에 내 사이즈가 없으면 사지 않는다', () => {
    const { store, w } = setup();
    store.setPrice('c1', 140000, 'daero');
    store.setSizeStock('c1', 'M', 0, 'daero');
    const v = checkWatch(w, store, 2);
    expect(v).toMatchObject({ kind: 'hold', sellerId: 'daero', misses: ['size'] });
  });

  it('국내만 고르면 해외직구가 가장 싸도 사지 않고, 국내 제한을 풀면 산다', () => {
    const store = createStore();
    for (const o of store.offersOf('c4')) { store.setSizeStock('c4', 'M', 3, o.sellerId); store.setPrice('c4', 450000, o.sellerId); }
    store.setPrice('c4', 300000, 'abroad'); // 배송비 9,000원 → 309,000원
    const w: Watch = { id: 'w2', productId: 'c4', size: 'M', maxTotal: 320000, domesticOnly: true, days: 14, preapproved: true };
    expect(checkWatch(w, store, 2)).toMatchObject({ kind: 'hold', sellerId: 'abroad', misses: ['overseas'] });
    expect(checkWatch({ ...w, domesticOnly: false }, store, 2)).toMatchObject({ kind: 'match', sellerId: 'abroad', total: 309000 });
  });

  it('[R1] 사전 승인이 없으면 조건이 맞아도 사지 않고 묻는다', () => {
    const { store, w } = setup({ preapproved: false });
    store.setPrice('c1', 148000, 'daero');
    expect(decide(w, checkWatch(w, store, 3))).toBe('ask');
  });

  it('기한이 지나면 조건이 맞아도 끝난다', () => {
    const { store, w } = setup({ days: 7 });
    store.setPrice('c1', 100000, 'daero');
    expect(checkWatch(w, store, 8)).toEqual({ kind: 'expired' });
    expect(decide(w, { kind: 'expired' })).toBe('expire');
  });

  it('[R1] 사전 승인 구매는 장바구니를 건드리지 않고 한 건만 주문되며, 어떤 대기에서 나왔는지 남는다', () => {
    const { store, w } = setup();
    store.addToCart('k1', 'user', 'M');
    store.setPrice('c1', 148000, 'daero');
    const order = store.buyNow('c1', 'M', 'daero', 'agent', w.id)!;
    expect(order).toMatchObject({ sellerId: 'daero', total: 148000, by: 'agent', mandate: 'w1' });
    expect(store.getState().cart.map((l) => l.productId)).toEqual(['k1']);
    expect(store.getOffer('c1', 'daero')!.sizes.M).toBe(2);
    store.setSizeStock('c1', 'M', 0, 'daero');
    expect(store.buyNow('c1', 'M', 'daero', 'agent', w.id)).toBeNull();
  });
});

describe('가격 대기 보조', () => {
  it('기본 목표는 국내 최저 총액의 85%, 천 원 단위', () => {
    const { store } = setup();
    expect(defaultTarget(store, 'c1', 'M')).toBe(170000);
    expect(totalOf('shelf', 149000)).toBe(151500);
  });
  it('시연용 하루는 같은 seed·day면 같은 결과다', () => {
    const a = setup(); const b = setup();
    simulateDay(a.store, a.w, 7, 1); simulateDay(b.store, b.w, 7, 1);
    expect(a.store.offersOf('c1')).toEqual(b.store.offersOf('c1'));
  });
  it('[R10] 테스트용 고정 흐름은 목표와 상관없이 2일째 사지 않고, 4일째 조건이 맞는다', () => {
    for (const [pid, size, max] of [['c1', 'M', 151000], ['c1', 'L', 99000], ['k1', 'M', 60000]] as const) {
      const store = createStore();
      const w: Watch = { id: 'ws', productId: pid, size, maxTotal: max, domesticOnly: true, days: 14, preapproved: true };
      const kinds = [1, 2, 3, 4].map((d) => { scriptedDay(store, w, d); return checkWatch(w, store, d).kind; });
      expect(kinds).toEqual(['wait', 'hold', 'hold', 'match']);
    }
  });
});
