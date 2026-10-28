import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { accountOf } from './auth';
import { closeMandate, recordMandate } from './mandates';

const user = (meta: Record<string, unknown>, email?: string) => ({ id: 'u1', user_metadata: meta, app_metadata: { provider: 'google' }, email }) as unknown as User;

describe('로그인 계정 이름', () => {
  it('이름, 닉네임, 이메일 순으로 쓴다', () => {
    expect(accountOf(user({ full_name: '이현희' }))).toEqual({ id: 'u1', name: '이현희', provider: 'google' });
    expect(accountOf(user({ nickname: '현희' }))?.name).toBe('현희');
    expect(accountOf(user({}, 'a@b.c'))?.name).toBe('a@b.c');
    expect(accountOf(user({}))?.name).toBe('Nod 사용자');
    expect(accountOf(null)).toBeNull();
  });
});

/** from().insert().select().single() / from().update().eq() 만 흉내 낸다 */
function fakeSb(result: { data: unknown; error: unknown }) {
  const calls: { op: string; arg: unknown }[] = [];
  const chain = {
    insert: (arg: unknown) => { calls.push({ op: 'insert', arg }); return chain; },
    update: (arg: unknown) => { calls.push({ op: 'update', arg }); return chain; },
    select: () => chain,
    eq: async (k: string, v: unknown) => { calls.push({ op: 'eq', arg: [k, v] }); return result; },
    single: async () => result,
  };
  return { sb: { from: vi.fn(() => chain) } as unknown as SupabaseClient, calls };
}
const spec = { productId: 'c1', size: 'M', maxTotal: 150000, domesticOnly: true, days: 14, preapproved: true };

describe('[R10] 사전 승인은 누가 맡겼는지 남긴다', () => {
  it('조건을 그대로 기록하고 id를 돌려준다', async () => {
    const { sb, calls } = fakeSb({ data: { id: 'm1' }, error: null });
    expect(await recordMandate(sb, spec, '울 코트')).toBe('m1');
    expect(calls[0]).toEqual({ op: 'insert', arg: { product_id: 'c1', product_name: '울 코트', size: 'M', max_total: 150000, domestic_only: true, days: 14 } });
  });
  it('기록하지 못하면 throw해서 대기를 시작하지 않는다', async () => {
    const { sb } = fakeSb({ data: null, error: { message: 'rls' } });
    await expect(recordMandate(sb, spec, '울 코트')).rejects.toThrow('rls');
  });
  it('사면 used와 주문번호로 닫는다', async () => {
    const { sb, calls } = fakeSb({ data: null, error: null });
    await closeMandate(sb, 'm1', 'used', '20261028-0001');
    expect(calls[0]).toMatchObject({ op: 'update', arg: { status: 'used', order_id: '20261028-0001' } });
    expect(calls[1]).toEqual({ op: 'eq', arg: ['id', 'm1'] });
  });
});
