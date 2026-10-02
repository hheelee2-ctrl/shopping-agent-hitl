import { describe, expect, it } from 'vitest';
import { initialState, reduce, type ConsoleState } from './console';
import type { AgentEvent } from '../engine/types';

const run = (events: AgentEvent[], from: ConsoleState = reduce(initialState, { type: 'start' })) =>
  events.reduce((s, event) => reduce(s, { type: 'event', event }), from);

const L = (t: string) => ({ ko: t, en: t });
const plan = (requiresApproval: boolean): AgentEvent => ({ type: 'plan', steps: [], requiresApproval });

describe('phase 전이', () => {
  it('start → planning', () => {
    expect(reduce(initialState, { type: 'start' }).phase).toBe('planning');
  });
  it('plan(승인 필요) → awaiting-approval, 아니면 executing', () => {
    expect(run([plan(true)]).phase).toBe('awaiting-approval');
    expect(run([plan(false)]).phase).toBe('executing');
  });
  it('user_ack 후 executing', () => {
    expect(reduce(run([plan(true)]), { type: 'user_ack' }).phase).toBe('executing');
  });
  it('담기 승인 대기 tool_call → awaiting-approval', () => {
    const s = run([plan(false), { type: 'tool_call', id: 't3', tool: 'cart_add', label: L('x'), status: 'awaiting-approval' }]);
    expect(s.phase).toBe('awaiting-approval');
  });
  it('needs_input / payment_gate / result', () => {
    const q: AgentEvent = { type: 'needs_input', id: 'q', question: L('?'), options: [] };
    const g: AgentEvent = { type: 'payment_gate', itemIds: ['c1'], total: 1, limit: 2, exceeded: false };
    expect(run([plan(false), q]).phase).toBe('needs-input');
    expect(run([plan(false), g]).phase).toBe('payment-gate');
    expect(run([plan(false), g, { type: 'result', status: 'done', summary: L('ok') }])).toMatchObject({ phase: 'done', payment: null });
    expect(run([plan(false), { type: 'result', status: 'cancelled', summary: L('x') }]).phase).toBe('cancelled');
  });
});

describe('log / undo', () => {
  const cart: AgentEvent = { type: 'tool_call', id: 't3', tool: 'cart_add', label: L('c'), status: 'done', itemIds: ['c1'], undoable: true };
  it('같은 id의 tool_call은 같은 로그 항목을 갱신한다', () => {
    const s = run([
      { type: 'tool_call', id: 't3', tool: 'cart_add', label: L('c'), status: 'running' },
      cart,
    ]);
    expect(s.log).toHaveLength(1);
    expect(s.log[0].status).toBe('done');
  });
  it('종료 후 모든 담기를 되돌리면 undone', () => {
    const s = run([cart, { type: 'result', status: 'cancelled', summary: L('x') }, { type: 'undo', targetId: 't3', status: 'done' }]);
    expect(s.phase).toBe('undone');
    expect(s.log[0].undone).toBe(true);
  });
  it('blocked는 사유만 기록하고 phase를 바꾸지 않는다', () => {
    const s = run([cart, { type: 'result', status: 'done', summary: L('ok') }, { type: 'undo', targetId: 't3', status: 'blocked', reason: L('no') }]);
    expect(s.phase).toBe('done');
    expect(s.log[0].undoBlocked).toEqual(L('no'));
  });
});
