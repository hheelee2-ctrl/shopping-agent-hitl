import { DEFAULT_PROFILE } from '../store/catalog';
import { describe, expect, it } from 'vitest';
import { RuleAgent } from '../agent/agent';
import { createStore } from '../store/store';
import type { AgentEvent } from '../engine/types';
import { initialState, reduce } from './console';
import type { Action } from './console';
import { appendFrame, baseline, viewAt } from './timeline';
import type { Frame } from './timeline';

function record() {
  const store = createStore();
  const agent = new RuleAgent(store, () => Promise.resolve());
  const snap = () => ({ cart: store.getState().cart, products: store.getState().products, orders: store.getState().orders.length });
  let frames: Frame[] = [baseline(0, snap())];
  let live = initialState;
  let n = 0;
  const push = (action: Action, actor: Frame['actor'] = 'agent') => {
    live = reduce(live, action);
    frames = appendFrame(frames, { at: ++n * 100, action, actor, ...snap() });
  };
  return { store, agent, push, frames: () => frames, live: () => live };
}

async function drive() {
  const r = record();
  const evs: AgentEvent[] = [];
  r.push({ type: 'start' }, 'user');
  await new Promise<void>((resolve) => {
    r.agent.start({ request: '검정 울 코트 20만원 이하', dial: 'auto', limit: 500000, sizes: DEFAULT_PROFILE }, (e) => {
      evs.push(e);
      r.push({ type: 'event', event: e });
      if (e.type === 'payment_gate') setTimeout(() => { r.push({ type: 'user_ack' }, 'user'); r.agent.approve(); }, 0);
      if (e.type === 'result') resolve();
    });
  });
  return r;
}

describe('[R7] timeline replay', () => {
  it('마지막 프레임의 복원 결과는 라이브 상태와 같다', async () => {
    const r = await drive();
    const f = r.frames();
    expect(viewAt(f, f.length - 1).console).toEqual(r.live());
  });

  it('confidence 이벤트는 새 프레임을 만들지 않는다', async () => {
    const r = await drive();
    const f = r.frames();
    const conf = f.flatMap((x) => x.actions).filter((a) => a.type === 'event' && a.event.type === 'confidence').length;
    expect(conf).toBeGreaterThan(0);
    expect(f.every((x) => !(x.actions.length === 1 && x.actions[0].type === 'event' && x.actions[0].event.type === 'confidence'))).toBe(true);
  });

  it('임의 시점 복원은 호출 순서와 무관하다 (결정적)', async () => {
    const r = await drive();
    const f = r.frames();
    const a = viewAt(f, 3);
    viewAt(f, f.length - 1);
    viewAt(f, 1);
    expect(viewAt(f, 3)).toEqual(a);
  });

  it('과거 시점의 장바구니는 그 시점의 스냅샷이다', async () => {
    const r = await drive();
    const f = r.frames();
    expect(viewAt(f, 0).cart).toEqual([]);
    expect(f.some((x) => x.cart.length > 0)).toBe(true);
  });

  it('reset은 타임라인을 새 기준선으로 바꾼다', async () => {
    const r = await drive();
    const next = appendFrame(r.frames(), { at: 9999, action: { type: 'reset' }, actor: 'user', cart: [], products: r.store.getState().products, orders: 0 });
    expect(next).toHaveLength(1);
  });
});
