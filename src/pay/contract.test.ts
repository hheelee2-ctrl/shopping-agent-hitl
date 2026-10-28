import { describe, expect, it } from 'vitest';
import { isTestKey, makeOrderId, ORDER_ID, orderNameOf, signApproval, TOKEN_TTL_MS, validAmount, verifyApproval } from './contract';

const S = 'nod-pay:test_sk_x';

describe('[R4] 테스트 결제: 승인한 금액과 다르면 토스에 승인을 요청하지 않는다', () => {
  it('승인한 주문번호·금액 그대로면 통과', async () => {
    const tok = await signApproval(S, 'nod-abc123', 178000, 0);
    expect(await verifyApproval(S, tok, 'nod-abc123', 178000, 1000)).toEqual({ ok: true });
  });
  it('금액이 1원이라도 다르면 막는다', async () => {
    const tok = await signApproval(S, 'nod-abc123', 178000, 0);
    expect(await verifyApproval(S, tok, 'nod-abc123', 196000, 1000)).toEqual({ ok: false, reason: 'amount-mismatch' });
    expect(await verifyApproval(S, tok, 'nod-abc123', 177999, 1000)).toEqual({ ok: false, reason: 'amount-mismatch' });
  });
  it('다른 주문번호로 바꿔 끼우면 막는다', async () => {
    const tok = await signApproval(S, 'nod-abc123', 178000, 0);
    expect(await verifyApproval(S, tok, 'nod-zzz999', 178000, 1000)).toEqual({ ok: false, reason: 'order-mismatch' });
  });
  it('서명을 고치거나 다른 키로 만든 토큰은 막는다', async () => {
    const tok = await signApproval(S, 'nod-abc123', 178000, 0);
    const forged = await signApproval('nod-pay:other', 'nod-abc123', 1000, 0);
    expect((await verifyApproval(S, forged, 'nod-abc123', 1000, 1000)).ok).toBe(false);
    const [body] = tok.split('.');
    expect(await verifyApproval(S, `${body}.AAAA`, 'nod-abc123', 178000, 1000)).toEqual({ ok: false, reason: 'bad-token' });
    expect(await verifyApproval(S, 'garbage', 'nod-abc123', 178000, 1000)).toEqual({ ok: false, reason: 'bad-token' });
  });
  it('승인하고 30분이 지나면 다시 승인받는다', async () => {
    const tok = await signApproval(S, 'nod-abc123', 178000, 0);
    expect(await verifyApproval(S, tok, 'nod-abc123', 178000, TOKEN_TTL_MS + 1)).toEqual({ ok: false, reason: 'expired' });
  });
});

describe('[R1] 테스트 결제: 실제 돈이 나가는 키로는 결제하지 않는다', () => {
  it('test_로 시작하는 키만 받는다', () => {
    expect(isTestKey('test_ck_abc')).toBe(true);
    expect(isTestKey('live_ck_abc')).toBe(false);
    expect(isTestKey(undefined)).toBe(false);
    expect(isTestKey('')).toBe(false);
  });
});

describe('토스 주문 형식', () => {
  it('주문번호는 토스 규칙(영문·숫자·-_=, 6~64자)에 맞는다', () => {
    expect(makeOrderId()).toMatch(ORDER_ID);
    expect(makeOrderId(() => 'a-b-c-d-e-f-g')).toBe('nod-abcdefg');
  });
  it('주문명은 첫 상품 외 n건, 100자 이하', () => {
    expect(orderNameOf(['울 코트'])).toBe('울 코트');
    expect(orderNameOf(['울 코트', '로퍼', '니트'])).toBe('울 코트 외 2건');
    expect(orderNameOf(['가'.repeat(200)])).toHaveLength(100);
    expect(orderNameOf([])).toBe('Nod 주문');
  });
  it('금액은 100원 이상 1,000만 원 이하의 정수만', () => {
    expect(validAmount(178000)).toBe(true);
    expect(validAmount(99)).toBe(false);
    expect(validAmount(1.5)).toBe(false);
    expect(validAmount('178000')).toBe(false);
    expect(validAmount(10_000_001)).toBe(false);
  });
});
