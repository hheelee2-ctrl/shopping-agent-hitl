import { describe, expect, it } from 'vitest';
import { trackOf } from './tracking';
import type { Order } from './types';

const H = 3600000;
const order: Order = {
  id: '20261008-0001', sellerId: 'daero', lines: [], subtotal: 0, shipping: 0, total: 0,
  placedAt: 0, shipAt: 4 * H, arriveAt: 30 * H, by: 'user',
};

describe('trackOf', () => {
  it('출고 전에는 운송장 번호가 없고 결제 완료·상품 준비 단계다', () => {
    expect(trackOf(order, 0)).toMatchObject({ invoice: null, stage: 'paid' });
    expect(trackOf(order, H).stage).toBe('ready');
  });
  it('출고되면 운송장 번호가 생기고, 같은 주문이면 늘 같다', () => {
    const a = trackOf(order, 5 * H);
    expect(a.stage).toBe('shipped');
    expect(a.invoice).toMatch(/^\d{4}-\d{4}-\d{4}$/);
    expect(trackOf(order, 20 * H).invoice).toBe(a.invoice);
  });
  it('시간이 지난 이력만 끝난 것으로 보고, 도착 시각이 지나면 배송 완료다', () => {
    const t = trackOf(order, 12 * H);
    expect(t.stage).toBe('transit');
    expect(t.events.filter((e) => e.done)).toHaveLength(4);
    expect(trackOf(order, 30 * H).stage).toBe('arrived');
    const at = t.events.map((e) => e.at);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });
});
