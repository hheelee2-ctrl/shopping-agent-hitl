import type { AgentEvent, Dial, SizeProfile } from '../engine/types';
import { createStore } from '../store/store';
import { RuleAgent } from './agent';

export interface Cost { plan: number; cart: number; ask: number; pay: number; total: number }

/**
 * 같은 요청을 한 자율도로 끝까지 돌려, 사람이 몇 번 개입하는지 센다.
 * 별도 store에서 지연 없이 실행하고, 승인은 모두 수락·질문은 첫 번째 선택지로 답한다고 가정한다.
 * 개입 횟수는 에이전트가 실제로 내보낸 이벤트(승인 요청, 질문, 결제 게이트)를 센 값이다.
 */
export function interventionCost(opts: { request: string; dial: Dial; limit: number; sizes?: SizeProfile }): Promise<Cost> {
  return new Promise((resolve) => {
    const store = createStore();
    const agent = new RuleAgent(store, () => Promise.resolve());
    const c: Cost = { plan: 0, cart: 0, ask: 0, pay: 0, total: 0 };
    let done = false;
    const finish = () => { if (done) return; done = true; agent.stop(); c.total = c.plan + c.cart + c.ask + c.pay; resolve(c); };
    const later = (fn: () => void) => setTimeout(fn, 0);
    const guard = setTimeout(finish, 2000);
    agent.start(opts, (e: AgentEvent) => {
      if (done) return;
      if (e.type === 'plan' && e.requiresApproval) { c.plan++; later(() => agent.approve()); }
      else if (e.type === 'tool_call' && e.status === 'awaiting-approval') { c.cart++; later(() => agent.approve()); }
      else if (e.type === 'needs_input') { c.ask++; later(() => agent.answer(e.id.startsWith('q-stale') ? 'accept' : e.options[0].id)); }
      else if (e.type === 'payment_gate') { c.pay++; later(() => agent.approve()); }
      else if (e.type === 'result') { clearTimeout(guard); finish(); }
    });
  });
}
