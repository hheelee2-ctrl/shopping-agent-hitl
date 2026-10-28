import { DEFAULT_PROFILE } from '../store/catalog';
import { describe, expect, it, vi } from 'vitest';
import type { AgentEvent } from '../engine/types';
import { createStore } from '../store/store';
import { RuleAgent } from '../agent/agent';
import type { PayResult } from './contract';
import { tossGateway, type ChargeResult, type PaymentGateway } from './gateway';

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

/** 결제 결과를 정해 둔 가짜 결제 창구 */
const fixed = (...rs: ChargeResult[]): PaymentGateway & { calls: number } => {
  const g = { calls: 0, charge: async () => rs[Math.min(g.calls++, rs.length - 1)] };
  return g;
};

async function toGate(gateway: PaymentGateway) {
  const store = createStore();
  const events: AgentEvent[] = [];
  const agent = new RuleAgent(store, () => Promise.resolve(), undefined, gateway);
  agent.start({ request: '검정 울 코트, 20만원 이하', dial: 'auto', limit: 300000, sizes: DEFAULT_PROFILE }, (e) => events.push(e));
  const until = async (pred: (e: AgentEvent) => boolean) => {
    for (let i = 0; i < 300; i++) { if (events.some(pred)) return; await tick(); }
    throw new Error('timeout: ' + events.map((e) => e.type).join(','));
  };
  await until((e) => e.type === 'payment_gate');
  return { store, agent, events, until };
}
const result = (events: AgentEvent[]) => events.find((e) => e.type === 'result') as Extract<AgentEvent, { type: 'result' }> | undefined;

describe('[R1] 결제창에서 결제하지 않으면 주문도 없다', () => {
  it('결제창을 닫으면 묻고, 중단하면 주문하지 않고 장바구니는 그대로', async () => {
    const h = await toGate(fixed({ status: 'canceled' }));
    h.agent.approve();
    await h.until((e) => e.type === 'needs_input' && e.id === 'q-paycancel1');
    expect(h.store.getState().orders).toHaveLength(0);
    h.agent.answer('stop');
    await h.until((e) => e.type === 'result');
    expect(result(h.events)?.status).toBe('cancelled');
    expect(h.store.getState().orders).toHaveLength(0);
    expect(h.store.getState().cart).toHaveLength(1);
  });
  it('결제창을 닫은 뒤 사람이 고르면 인증 없이 테스트 결제로 계속하고, 그렇게 표시한다', async () => {
    const h = await toGate(fixed({ status: 'canceled' }));
    h.agent.approve();
    await h.until((e) => e.type === 'needs_input' && e.id === 'q-paycancel1');
    h.agent.answer('skip');
    await h.until((e) => e.type === 'result');
    expect(h.store.getState().orders).toMatchObject([{ paidVia: 'skip' }]);
    expect(h.events).toContainEqual(expect.objectContaining({ type: 'tool_call', id: 't-pay-auth', status: 'done', note: expect.objectContaining({ ko: expect.stringContaining('카드 인증 생략') }) }));
  });
  it('결제창을 다시 열 수 있다', async () => {
    const g = fixed({ status: 'canceled' }, { status: 'paid', via: 'toss', method: '카드', approvedAt: '' });
    const h = await toGate(g);
    h.agent.approve();
    await h.until((e) => e.type === 'needs_input' && e.id === 'q-paycancel1');
    h.agent.answer('retry');
    await h.until((e) => e.type === 'result');
    expect(g.calls).toBe(2);
    expect(h.store.getState().orders).toHaveLength(1);
  });
  it('[R4] 결제가 실패하면(금액 불일치 등) 테스트 결제로 넘기지 않고 주문하지 않는다', async () => {
    const h = await toGate(fixed({ status: 'failed', message: 'amount-mismatch' }));
    h.agent.approve();
    await h.until((e) => e.type === 'result');
    expect(h.events.some((e) => e.type === 'needs_input' && e.id.startsWith('q-paycancel'))).toBe(false);
    expect(h.store.getState().orders).toHaveLength(0);
    expect(h.events).toContainEqual(expect.objectContaining({ type: 'tool_call', id: 't-pay-auth', status: 'failed' }));
  });
  it('토스 결제가 끝나면 승인한 금액 그대로 주문한다', async () => {
    const h = await toGate(fixed({ status: 'paid', via: 'toss', method: '카드', approvedAt: '' }));
    h.agent.approve();
    await h.until((e) => e.type === 'result');
    expect(result(h.events)?.status).toBe('done');
    expect(h.store.getState().orders).toMatchObject([{ total: 178000, paidVia: 'toss' }]);
    expect(h.store.getState().cart).toHaveLength(0);
  });
});

describe('[R4] 결제창이 열려 있는 동안', () => {
  it('담은 항목을 되돌리지 않는다(결제 중인 금액이 바뀌므로)', async () => {
    let pay: (r: ChargeResult) => void = () => {};
    const h = await toGate({ charge: () => new Promise((r) => { pay = r; }) });
    h.agent.approve();
    await h.until((e) => e.type === 'tool_call' && e.id === 't-pay-auth');
    const added = h.events.find((e) => e.type === 'tool_call' && e.tool === 'cart_add' && e.undoable) as Extract<AgentEvent, { type: 'tool_call' }>;
    h.agent.undo(added.id);
    expect(h.events).toContainEqual(expect.objectContaining({ type: 'undo', status: 'blocked' }));
    expect(h.store.getState().cart).toHaveLength(1);
    pay({ status: 'paid', via: 'sim' });
    await h.until((e) => e.type === 'result');
    expect(h.store.getState().orders).toHaveLength(1);
  });
  it('팝업이 막히면 다시 열지 묻고, 다시 열어 결제할 수 있다', async () => {
    const g = fixed({ status: 'blocked' }, { status: 'paid', via: 'sim' });
    const h = await toGate(g);
    h.agent.approve();
    await h.until((e) => e.type === 'needs_input' && e.id === 'q-popup1');
    expect(h.store.getState().orders).toHaveLength(0);
    h.agent.answer('retry');
    await h.until((e) => e.type === 'result');
    expect(g.calls).toBe(2);
    expect(h.store.getState().orders).toHaveLength(1);
  });
});

/** 팝업·채널을 흉내 낸다 */
function fakes() {
  const w = { closed: false, location: { href: '' }, close: vi.fn(() => { w.closed = true; }) };
  let ch: { onmessage: ((e: MessageEvent<PayResult>) => void) | null; close: () => void } | null = null;
  return {
    w,
    send: (m: PayResult) => ch?.onmessage?.({ data: m } as MessageEvent<PayResult>),
    openWindow: () => w as unknown as Window,
    channel: () => (ch = { onmessage: null, close: () => {} }) as unknown as BroadcastChannel,
  };
}
const res = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('토스 결제 창구: 데스크톱은 Nod 화면 위에서', () => {
  const server = (confirm: (body: Record<string, unknown>) => Response) => vi.fn(async (u: unknown, init?: RequestInit) => {
    if (String(u).endsWith('/confirm')) return confirm(JSON.parse(init!.body as string));
    return init?.method === 'POST' ? res({ orderId: 'nod-abc123', orderName: '울 코트', clientKey: 'test_ck_x', token: 'tok' }) : res({ ready: true });
  });
  it('팝업 없이 결제창을 띄우고, 토스가 돌려준 금액으로 서버 승인을 받는다', async () => {
    const open = vi.fn();
    const fetchImpl = server((b) => res({ status: 'paid', method: '카드', approvedAt: 't', echo: b }));
    const requestPayment = vi.fn(async () => ({ paymentKey: 'pk', orderId: 'nod-abc123', amount: { currency: 'KRW', value: 178000 } }));
    const g = tossGateway({ lang: () => 'ko', mode: () => 'inline', toss: async () => ({ requestPayment }), fetchImpl: fetchImpl as unknown as typeof fetch, openWindow: open });
    expect(await g.charge({ amount: 178000, names: [] })).toMatchObject({ status: 'paid', via: 'toss', method: '카드' });
    expect(open).not.toHaveBeenCalled();
    expect(requestPayment).toHaveBeenCalledWith(expect.objectContaining({ amount: { currency: 'KRW', value: 178000 }, orderId: 'nod-abc123' }));
    expect(requestPayment.mock.calls[0]).not.toHaveProperty('0.successUrl');
    const sent = JSON.parse((fetchImpl.mock.calls.at(-1)![1] as RequestInit).body as string);
    expect(sent).toEqual({ paymentKey: 'pk', orderId: 'nod-abc123', amount: 178000, token: 'tok' });
  });
  it('[R4] 서버가 금액이 다르다고 하면 결제 실패로 본다', async () => {
    const fetchImpl = server(() => res({ error: 'amount-mismatch' }, 409));
    const g = tossGateway({ lang: () => 'ko', mode: () => 'inline', toss: async () => ({ requestPayment: async () => ({ paymentKey: 'pk', orderId: 'nod-abc123', amount: 1000 }) }), fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(await g.charge({ amount: 178000, names: [] })).toEqual({ status: 'failed', message: 'amount-mismatch' });
  });
  it('결제창을 닫으면 canceled', async () => {
    const g = tossGateway({ lang: () => 'ko', mode: () => 'inline', toss: async () => ({ requestPayment: async () => { throw Object.assign(new Error('x'), { code: 'USER_CANCEL' }); } }), fetchImpl: server(() => res({})) as unknown as typeof fetch });
    expect(await g.charge({ amount: 178000, names: [] })).toEqual({ status: 'canceled' });
  });
});

describe('토스 결제 창구: 모바일은 팝업에서', () => {
  it('서버에 테스트 키가 없으면 팝업을 열지 않고 시뮬레이션으로 결제한다', async () => {
    const f = fakes();
    const open = vi.fn(f.openWindow);
    const g = tossGateway({ lang: () => 'ko', mode: () => 'popup', fetchImpl: async () => res({}, 503), openWindow: open, channel: f.channel });
    await tick();
    expect(await g.charge({ amount: 178000, names: [] })).toEqual({ status: 'paid', via: 'sim' });
    expect(open).not.toHaveBeenCalled();
  });
  it('승인한 금액으로 결제창을 열고, 결제 창이 보낸 결과를 돌려준다', async () => {
    const f = fakes();
    const fetchImpl = vi.fn(async (_u: unknown, init?: RequestInit) =>
      init?.method === 'POST' ? res({ orderId: 'nod-abc123', orderName: '울 코트', clientKey: 'test_ck_x', token: 'tok' }) : res({ ready: true }));
    const g = tossGateway({ lang: () => 'ko', mode: () => 'popup', fetchImpl: fetchImpl as unknown as typeof fetch, openWindow: f.openWindow, channel: f.channel });
    const p = g.charge({ amount: 178000, names: [{ ko: '울 코트', en: 'Wool coat' }] });
    for (let i = 0; i < 5; i++) await tick();
    expect(JSON.parse(fetchImpl.mock.calls[1][1]!.body as string)).toEqual({ amount: 178000, names: ['울 코트'] });
    expect(f.w.location.href).toContain('/pay.html#o=nod-abc123&a=178000');
    f.send({ orderId: 'other-order', status: 'paid', method: '카드', approvedAt: '' });
    f.send({ orderId: 'nod-abc123', status: 'paid', method: '카드', approvedAt: 't' });
    expect(await p).toEqual({ status: 'paid', via: 'toss', method: '카드', approvedAt: 't', receiptUrl: undefined });
  });
  it('키는 있는데 팝업이 막히면 blocked', async () => {
    const g = tossGateway({ lang: () => 'ko', mode: () => 'popup', fetchImpl: async () => res({ ready: true }), openWindow: () => null, channel: fakes().channel });
    expect(await g.charge({ amount: 178000, names: [] })).toEqual({ status: 'blocked' });
  });
});
