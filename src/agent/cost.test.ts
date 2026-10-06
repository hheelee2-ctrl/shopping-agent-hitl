import { DEFAULT_PROFILE } from '../store/catalog';
import { describe, expect, it } from 'vitest';
import { interventionCost } from './cost';

const run = (request: string, dial: 'always' | 'cart-only' | 'auto', extra = {}) => interventionCost({ request, dial, limit: 500000, sizes: DEFAULT_PROFILE, ...extra });

describe('개입 비용', () => {
  it('명확한 요청: 자율도가 낮을수록 사람이 개입하는 횟수가 늘고, 결제 승인은 항상 1번', async () => {
    const [a, c, u] = await Promise.all([run('검정 울 코트, 20만원 이하', 'always'), run('검정 울 코트, 20만원 이하', 'cart-only'), run('검정 울 코트, 20만원 이하', 'auto')]);
    expect([a.total, c.total, u.total]).toEqual([3, 2, 1]);
    expect([a.pay, c.pay, u.pay]).toEqual([1, 1, 1]);
    expect(a).toMatchObject({ plan: 1, cart: 1, ask: 0 });
  });
  it('질문(Escalation)은 자율도를 올려도 사라지지 않는다', async () => {
    const u = await run('가을에 입기 좋은 자켓', 'auto');
    expect(u.ask).toBe(1);
    expect(u.total).toBe(2);
  });
});
