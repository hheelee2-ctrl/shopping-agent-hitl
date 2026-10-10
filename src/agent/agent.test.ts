import { DEFAULT_PROFILE } from '../store/catalog';
import { describe, expect, it } from 'vitest';
import type { AgentEvent, Dial } from '../engine/types';
import { createStore } from '../store/store';
import { RuleAgent } from './agent';

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

function setup(request: string, dial: Dial = 'auto', opts: { limit?: number; now?: number; before?: (s: ReturnType<typeof createStore>) => void } = {}) {
  const store = createStore(opts.now !== undefined ? { now: () => opts.now! } : {});
  opts.before?.(store);
  const events: AgentEvent[] = [];
  const agent = new RuleAgent(store, () => Promise.resolve());
  agent.start({ request, dial, limit: opts.limit ?? 300000, sizes: DEFAULT_PROFILE }, (e) => events.push(e));
  const until = async (pred: (e: AgentEvent) => boolean) => {
    for (let i = 0; i < 300; i++) {
      if (events.some(pred)) return;
      await tick();
    }
    throw new Error('timeout: ' + JSON.stringify(events.map((e) => e.type)));
  };
  return { store, agent, events, until };
}
const last = <T extends AgentEvent['type']>(events: AgentEvent[], type: T) =>
  [...events].reverse().find((e) => e.type === type) as Extract<AgentEvent, { type: T }> | undefined;

describe('S1 명확한 요청', () => {
  it('질문 없이 담고 결제 직전에서만 멈춘다. 장바구니는 실제 store에 담긴다', async () => {
    const { store, agent, events, until } = setup('검정 울 코트, 20만원 이하');
    await until((e) => e.type === 'payment_gate');
    expect(events.some((e) => e.type === 'needs_input')).toBe(false);
    expect(store.getState().cart).toMatchObject([{ productId: 'c1', addedBy: 'agent' }]);
    expect(last(events, 'payment_gate')).toMatchObject({ total: 178000, exceeded: false });
    agent.approve();
    await until((e) => e.type === 'result');
    expect(last(events, 'result')?.status).toBe('done');
    expect(store.getState().orders).toHaveLength(1);
    expect(store.getState().cart).toHaveLength(0);
  });
  it('확신도: 1순위 high, 울 혼방 medium, 예산 초과 low', async () => {
    const { events, until } = setup('검정 울 코트, 20만원 이하');
    await until((e) => e.type === 'payment_gate');
    const lv = (id: string) => events.find((e) => e.type === 'confidence' && e.itemId === id);
    expect(lv('c1')).toMatchObject({ level: 'high' });
    expect(lv('c3')).toMatchObject({ level: 'medium' });
    expect(lv('c5')).toMatchObject({ level: 'low' });
  });
  it('Dial=always: 계획 승인 전에는 tool_call이 없다 (Intent Preview)', async () => {
    const { agent, events, until } = setup('검정 울 코트, 20만원 이하', 'always');
    await until((e) => e.type === 'plan');
    await tick();
    expect(events.some((e) => e.type === 'tool_call')).toBe(false);
    agent.approve();
    await until((e) => e.type === 'tool_call' && e.status === 'done');
  });
});

describe('Escalation은 계산된 조건에서 나온다', () => {
  it('후보 점수가 비슷하면(가을 자켓) 사람에게 고르게 한다', async () => {
    const { store, agent, events, until } = setup('가을에 입기 좋은 자켓');
    await until((e) => e.type === 'needs_input');
    const q = last(events, 'needs_input')!;
    expect(q.id).toBe('q-pick');
    expect(q.options).toHaveLength(3);
    expect(store.getState().cart).toHaveLength(0);
    agent.answer(q.options[0].id);
    await until((e) => e.type === 'payment_gate');
    expect(store.getState().cart[0].productId).toBe(q.options[0].id);
  });
  it('종류를 모르면 종류부터 묻는다', async () => {
    const { events, until } = setup('검정 20만원 이하');
    await until((e) => e.type === 'needs_input');
    expect(last(events, 'needs_input')?.id).toBe('q-category');
  });
  it('해석하지 못한 표현이 있으면 빼고 찾을지 확인한다', async () => {
    const { events, until } = setup('코트 키치한 느낌');
    await until((e) => e.type === 'needs_input');
    const q = last(events, 'needs_input')!;
    expect(q.id).toBe('q-unknown');
    expect(q.question.ko).toBe("'키치한'은 조건에서 빼고 찾을게요.");
    expect(q.options.map((o) => o.id)).toEqual(['go', 'rephrase']);
  });
  it('다시 말하기를 고르면 아무것도 담지 않고 끝낸다', async () => {
    const { store, agent, events, until } = setup('코트 키치한 느낌');
    await until((e) => e.type === 'needs_input');
    agent.answer('rephrase');
    await until((e) => e.type === 'result');
    expect(last(events, 'result')?.status).toBe('cancelled');
    expect(store.getState().cart).toHaveLength(0);
  });
  it('아우터는 종류를 묻지 않고 코트·자켓 중에서 찾는다', async () => {
    const { store, events, until } = setup('가을 가죽 아우터');
    await until((e) => e.type === 'payment_gate' || e.type === 'needs_input' || e.type === 'result');
    expect(events.some((e) => e.type === 'needs_input' && (e.id === 'q-unknown' || e.id === 'q-category'))).toBe(false);
    const found = events.find((e) => e.type === 'tool_call' && e.tool === 'search' && e.status === 'done');
    const ids = found?.type === 'tool_call' ? found.itemIds ?? [] : [];
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every((id) => ['coat', 'jacket'].includes(store.getProduct(id)!.category))).toBe(true);
  });
  it('조건에 맞는 상품이 없으면 예산 완화를 묻고, 그래도 없으면 실패', async () => {
    const { agent, events, until } = setup('검정 울 코트 10만원 이하');
    await until((e) => e.type === 'needs_input');
    expect(last(events, 'needs_input')?.id).toBe('q-relax');
    agent.answer('relax');
    await until((e) => e.type === 'result');
    expect(last(events, 'result')?.status).toBe('failed');
  });
});

describe('S3 재고 변동·한도 (시장이 store를 실제로 바꾼다)', () => {
  /** 승인을 기다리는 사이 다른 구매자가 마지막 재고를 가져간다 */
  const sellOut = async (h: ReturnType<typeof setup>) => {
    await h.until((e) => e.type === 'needs_input');
    h.agent.answer('s1'); // 동점 후보 중 마지막 1개 남은 s1
    await h.until((e) => e.type === 'tool_call' && e.status === 'awaiting-approval');
    h.store.setStock('s1', 0);
    h.agent.approve();
  };
  it('담기 직전 다른 구매자가 재고를 가져가면 실패 후 대안을 제시한다', async () => {
    const h = setup('화이트 스니커즈 한 켤레', 'cart-only');
    await sellOut(h);
    await h.until((e) => e.type === 'tool_call' && e.status === 'failed');
    expect(h.store.getProduct('s1')!.stock).toBe(0);
    await h.until((e) => e.type === 'needs_input' && e.id === 'q-alt1');
    expect(h.store.getState().cart).toHaveLength(0);
  });
  it('대안이 한도를 넘으면 exceeded', async () => {
    const h = setup('화이트 스니커즈 한 켤레', 'cart-only');
    await sellOut(h);
    await h.until((e) => e.type === 'needs_input' && e.id === 'q-alt1');
    h.agent.answer('s3');
    await h.until((e) => e.type === 'tool_call' && e.status === 'awaiting-approval' && e.itemIds?.[0] === 's3');
    h.agent.approve();
    await h.until((e) => e.type === 'payment_gate');
    expect(last(h.events, 'payment_gate')).toMatchObject({ total: 342000, limit: 300000, exceeded: true });
  });
});

describe('Action Audit / 되돌리기', () => {
  it('결제 전 되돌리면 store에서 빠지고, 비면 게이트가 종료된다', async () => {
    const { store, agent, events, until } = setup('검정 울 코트, 20만원 이하');
    await until((e) => e.type === 'payment_gate');
    agent.undo('t-cart1');
    await until((e) => e.type === 'result');
    expect(store.getState().cart).toHaveLength(0);
    expect(last(events, 'undo')).toMatchObject({ status: 'done' });
    expect(last(events, 'result')?.summary.ko).toContain('모두 되돌려서');
  });
  it('사람이 장바구니에서 직접 빼도 게이트가 갱신된다', async () => {
    const { store, agent, events, until } = setup('검정 울 코트, 20만원 이하');
    await until((e) => e.type === 'payment_gate');
    store.addToCart('sh1', 'user', store.availableSizes('sh1').find((z) => ['S', 'M', 'L', 'XL'].includes(z))!);
    await tick();
    // 셔츠는 표시가 최저(선반 68,000원 + 배송비)보다 배송비 포함 총액이 낮은 대로몰(69,900원 무료배송)에 담긴다
    expect(last(events, 'payment_gate')?.total).toBe(178000 + 69900);
    agent.reject();
    await until((e) => e.type === 'result');
  });
  it('결제 승인 후에는 되돌리기가 blocked', async () => {
    const { agent, events, until } = setup('검정 울 코트, 20만원 이하');
    await until((e) => e.type === 'payment_gate');
    agent.approve();
    await until((e) => e.type === 'result');
    agent.undo('t-cart1');
    expect(last(events, 'undo')?.status).toBe('blocked');
  });
  it('stop 후에는 이벤트가 더 나오지 않는다', async () => {
    const { agent, events } = setup('가을에 입기 좋은 자켓');
    agent.stop();
    const n = events.length;
    await tick(); await tick();
    expect(events.length).toBe(n);
  });
});

describe('낡은 승인 방지 (Stale Approval)', () => {
  it('승인받는 화면에 가격이 보인다', async () => {
    const { events, until } = setup('검정 울 코트, 20만원 이하', 'cart-only');
    await until((e) => e.type === 'tool_call' && e.status === 'awaiting-approval');
    const t = events.find((e) => e.type === 'tool_call' && e.status === 'awaiting-approval');
    expect(t && t.type === 'tool_call' && t.label.ko).toContain('178,000원');
  });
  it('승인 직후 가격이 오르면 담지 않고 다시 묻는다. 새 가격으로 담으면 그 가격이 장바구니에 기록된다', async () => {
    const { store, agent, events, until } = setup('검정 울 코트, 20만원 이하', 'cart-only');
    await until((e) => e.type === 'tool_call' && e.status === 'awaiting-approval');
    store.setPrice('c1', 199000); // 승인을 기다리는 사이 판매처가 가격을 올림
    agent.approve();
    await until((e) => e.type === 'needs_input');
    expect(last(events, 'needs_input')?.id).toBe('q-stale1');
    expect(last(events, 'needs_input')?.question.ko).toContain('178,000원 → 199,000원');
    expect(store.getState().cart).toHaveLength(0);
    agent.answer('accept');
    await until((e) => e.type === 'payment_gate');
    expect(store.getState().cart[0].priceAtAdd).toBe(199000);
    expect(last(events, 'payment_gate')?.total).toBe(199000);
  });
  it('새 가격을 거절하면 아무것도 담기지 않고 끝난다', async () => {
    const { store, agent, events, until } = setup('검정 울 코트, 20만원 이하', 'cart-only');
    await until((e) => e.type === 'tool_call' && e.status === 'awaiting-approval');
    store.setPrice('c1', 199000); // 승인을 기다리는 사이 판매처가 가격을 올림
    agent.approve();
    await until((e) => e.type === 'needs_input');
    agent.answer('skip');
    await until((e) => e.type === 'result');
    expect(last(events, 'result')?.status).toBe('cancelled');
    expect(store.getState().cart).toHaveLength(0);
  });
  it('승인 단계가 없는 Dial=auto에서는 낡을 승인이 없으므로 묻지 않고, 담는 순간의 가격을 기록한다', async () => {
    const { store, events, until } = setup('검정 울 코트, 20만원 이하', 'auto', { before: (s) => s.setPrice('c1', 199000) });
    await until((e) => e.type === 'payment_gate');
    expect(events.some((e) => e.type === 'needs_input')).toBe(false);
    expect(store.getState().cart[0].priceAtAdd).toBe(199000);
  });
});

describe('다중 상품 + 합계 예산', () => {
  const REQ = '검정 울 코트 20만원 이하랑 검정 가죽 로퍼, 합쳐서 35만원';
  const answerUntilBudget = async (h: ReturnType<typeof setup>) => {
    await h.until((e) => e.type === 'needs_input' && e.id === 'q-pick-i2');
    h.agent.answer('l1'); // 289,000원 — 코트(178,000원)와 합치면 예산 초과
    await h.until((e) => e.type === 'needs_input' && e.id.startsWith('q-budget'));
  };
  it('요청을 항목으로 나누고, 합계 예산을 항목과 별개로 해석한다', async () => {
    const { events, until } = setup(REQ);
    await until((e) => e.type === 'understood');
    const u = last(events, 'understood')!;
    expect(u.chips.map((c) => c.label.ko)).toEqual(['항목 1', '항목 2', '합계 예산']);
  });
  it('담기 전에 예산 초과를 감지해 멈추고, 더 저렴한 대안을 제안한다', async () => {
    const h = setup(REQ);
    await answerUntilBudget(h);
    const q = last(h.events, 'needs_input')!;
    expect(h.store.getState().cart.map((l) => l.productId)).toEqual(['c1']); // 두 번째는 아직 담기지 않았다
    expect(q.options.map((o) => o.id)).toEqual(['l3', 'over', 'skip', 'stop']);
    h.agent.answer('l3');
    await h.until((e) => e.type === 'payment_gate');
    expect(last(h.events, 'payment_gate')).toMatchObject({ total: 178000 + 159000 });
  });
  it('"예산을 넘겨 담기"는 사람이 그렇게 정했을 때만 담긴다', async () => {
    const h = setup(REQ);
    await answerUntilBudget(h);
    h.agent.answer('over');
    await h.until((e) => e.type === 'payment_gate');
    expect(last(h.events, 'payment_gate')?.total).toBe(178000 + 289000);
  });
  it('"이 항목 빼기"는 그 항목만 빼고 계속한다', async () => {
    const h = setup(REQ);
    await answerUntilBudget(h);
    h.agent.answer('skip');
    await h.until((e) => e.type === 'payment_gate');
    expect(h.store.getState().cart.map((l) => l.productId)).toEqual(['c1']);
  });
  it('항목이 하나로 안 나뉘는 요청은 기존 단일 흐름 그대로다', async () => {
    const { events, until } = setup('검정 울 코트, 20만원 이하');
    await until((e) => e.type === 'understood');
    expect(last(events, 'understood')!.chips.some((c) => c.label.ko.startsWith('항목'))).toBe(false);
  });
});

describe('거절 사유 되먹임', () => {
  const rejectAtCart = async () => {
    const h = setup('검정 울 코트, 20만원 이하', 'cart-only');
    await h.until((e) => e.type === 'tool_call' && e.status === 'awaiting-approval');
    h.agent.reject();
    await h.until((e) => e.type === 'needs_input');
    return h;
  };
  it('담기를 거절하면 중단하지 않고 이유를 묻는다', async () => {
    const h = await rejectAtCart();
    const q = last(h.events, 'needs_input')!;
    expect(q.id).toBe('q-why1');
    expect(q.options.map((o) => o.id)).toEqual(['price', 'brand', 'color', 'cancel']);
    expect(h.events.some((e) => e.type === 'result')).toBe(false);
    // 거절한 담기가 승인 대기로 남아 있으면 화면에 낡은 승인 카드가 계속 뜬다
    expect(last(h.events.filter((e) => e.type === 'tool_call' && e.id === 't-cart1') as AgentEvent[], 'tool_call')).toMatchObject({ status: 'failed' });
  });
  it('"다른 브랜드"를 고르면 그 브랜드를 빼고 다시 찾아 다른 상품의 담기 승인을 요청한다', async () => {
    const h = await rejectAtCart();
    h.agent.answer('brand');
    await h.until((e) => e.type === 'tool_call' && e.id === 't-cart1-r1' && e.status === 'awaiting-approval');
    const t = h.events.find((e) => e.type === 'tool_call' && e.id === 't-cart1-r1');
    expect(t && t.type === 'tool_call' && t.itemIds?.[0]).not.toBe('c1');
    const chips = last(h.events, 'understood')!.chips.map((c) => c.label.ko);
    expect(chips).toContain('제외 브랜드');
    expect(h.store.getState().cart).toHaveLength(0);
  });
  it('"그만두기"는 기존처럼 중단한다', async () => {
    const h = await rejectAtCart();
    h.agent.answer('cancel');
    await h.until((e) => e.type === 'result');
    expect(last(h.events, 'result')?.status).toBe('cancelled');
  });
  it('거절은 두 번까지만 되먹임하고 그다음은 중단한다', async () => {
    const h = setup('자켓', 'cart-only');
    let rejects = 0, asked = 0, lastQ = '', lastC = '';
    for (let i = 0; i < 400 && !h.events.some((e) => e.type === 'result'); i++) {
      const e = h.events[h.events.length - 1];
      if (!e) { await tick(); continue; }
      if (e.type === 'needs_input' && e.id !== lastQ) {
        lastQ = e.id;
        if (e.id.startsWith('q-why')) { asked++; h.agent.answer('brand'); } else h.agent.answer(e.options[0].id);
      } else if (e.type === 'tool_call' && e.status === 'awaiting-approval' && e.id !== lastC) {
        lastC = e.id; rejects++; h.agent.reject();
      }
      await tick();
    }
    expect(last(h.events, 'result')?.status).toBe('cancelled');
    expect(rejects).toBe(3);
    expect(asked).toBe(2);
  });
});

describe('사이즈', () => {
  const noSizes = (request: string, dial: Dial = 'auto', before?: (s: ReturnType<typeof createStore>) => void) => {
    const store = createStore();
    before?.(store);
    const events: AgentEvent[] = [];
    const agent = new RuleAgent(store, () => Promise.resolve());
    agent.start({ request, dial, limit: 500000 }, (e) => events.push(e));
    const until = async (pred: (e: AgentEvent) => boolean) => {
      for (let i = 0; i < 300; i++) { if (events.some(pred)) return; await tick(); }
      throw new Error('timeout: ' + JSON.stringify(events.map((e) => e.type)));
    };
    return { store, agent, events, until };
  };

  it('내 사이즈가 있으면 묻지 않고 그 사이즈로 담는다', async () => {
    const h = setup('검정 울 코트, 20만원 이하');
    await h.until((e) => e.type === 'payment_gate');
    expect(h.events.some((e) => e.type === 'needs_input')).toBe(false);
    expect(h.store.getState().cart[0]).toMatchObject({ productId: 'c1', size: 'M' });
  });

  it('내 사이즈가 비어 있으면 담기 전에 사이즈를 묻고, 고른 사이즈로 담는다', async () => {
    const h = noSizes('검정 울 코트, 20만원 이하');
    await h.until((e) => e.type === 'needs_input');
    const q = last(h.events, 'needs_input')!;
    expect(q.id.startsWith('q-size')).toBe(true);
    expect(q.options.some((o) => o.id.startsWith('size:'))).toBe(true);
    expect(h.store.getState().cart).toHaveLength(0);
    h.agent.answer('size:L');
    await h.until((e) => e.type === 'payment_gate');
    expect(h.store.getState().cart[0]).toMatchObject({ productId: 'c1', size: 'L' });
  });

  it('한 번 알려준 사이즈는 같은 요청의 다음 항목(같은 사이즈 체계)에서 다시 묻지 않는다', async () => {
    const h = noSizes('검정 울 코트와 자켓');
    let lastQ = '';
    for (let i = 0; i < 400 && !h.events.some((e) => e.type === 'payment_gate'); i++) {
      const e = h.events[h.events.length - 1];
      if (e?.type === 'needs_input' && e.id !== lastQ) {
        lastQ = e.id;
        h.agent.answer(e.id.startsWith('q-size') ? 'size:M' : e.options[0].id);
      }
      await tick();
    }
    expect(h.events.filter((e) => e.type === 'needs_input' && e.id.startsWith('q-size'))).toHaveLength(1);
  });

  it('요청에 적은 사이즈로 검색하고, 그 사이즈가 있는 상품만 후보가 된다', async () => {
    const h = setup('화이트 스니커즈 260', 'auto', { before: (s) => s.setSizeStock('s1', '260', 0) });
    await h.until((e) => e.type === 'payment_gate' || e.type === 'needs_input' || e.type === 'result');
    const cart = h.store.getState().cart;
    expect(cart.every((l) => l.size === '260')).toBe(true);
  });

  it('승인 대기 중에 그 사이즈만 팔려도 다른 사이즈를 다시 묻는다', async () => {
    const h = setup('검정 울 코트, 20만원 이하', 'cart-only');
    await h.until((e) => e.type === 'tool_call' && e.status === 'awaiting-approval');
    h.store.setSizeStock('c1', 'M', 0);
    h.agent.approve();
    await h.until((e) => e.type === 'needs_input');
    expect(last(h.events, 'needs_input')!.id.startsWith('q-size')).toBe(true);
    expect(h.store.getState().cart).toHaveLength(0);
  });

  it('이미 담긴 상품이면 중복 담기를 묻는다', async () => {
    const h = setup('검정 울 코트, 20만원 이하', 'auto', { before: (s) => { s.addToCart('c1', 'user', 'M'); } });
    await h.until((e) => e.type === 'needs_input');
    expect(last(h.events, 'needs_input')!.id.startsWith('q-dup')).toBe(true);
    h.agent.answer('keep');
    await h.until((e) => e.type === 'payment_gate');
    expect(h.store.getState().cart).toMatchObject([{ productId: 'c1', qty: 1 }]);
  });

  it('"한 개 더 담기"는 같은 사이즈로 수량을 늘린다', async () => {
    const h = setup('검정 울 코트, 20만원 이하', 'auto', { before: (s) => { s.setSizeStock('c1', 'M', 2); s.addToCart('c1', 'user', 'M'); } });
    await h.until((e) => e.type === 'needs_input');
    h.agent.answer('more');
    await h.until((e) => e.type === 'payment_gate');
    expect(h.store.getState().cart).toMatchObject([{ productId: 'c1', size: 'M', qty: 2 }]);
  });

  it('내 사이즈가 남은 상품이 하나도 없으면 사이즈 조건을 풀지 묻는다', async () => {
    const h = setup('검정 울 코트, 20만원 이하', 'auto', {
      before: (s) => { for (const p of Object.values(s.getState().products)) if (p.category === 'coat') s.setSizeStock(p.id, 'M', 0); },
    });
    await h.until((e) => e.type === 'needs_input');
    expect(last(h.events, 'needs_input')!.id.startsWith('q-sizefree')).toBe(true);
    h.agent.answer('nosize');
    await h.until((e) => e.type === 'needs_input' && e.id.startsWith('q-size') && !e.id.startsWith('q-sizefree'));
  });
});

describe('판매처·배송', () => {
  // 2026-10-06(화) 10:00 — 공식몰은 목요일, 선반·대로몰은 내일(수) 도착
  const TUE = new Date(2026, 9, 6, 10, 0).getTime();

  it('담기 전에 판매처를 비교하고, 고른 판매처와 이유를 남긴다', async () => {
    const h = setup('검정 울 코트, 20만원 이하', 'auto', { now: TUE });
    await h.until((e) => e.type === 'payment_gate');
    const cmp = h.events.find((e) => e.type === 'tool_call' && e.id.startsWith('t-seller') && e.status === 'done');
    expect(cmp && cmp.type === 'tool_call' && cmp.note?.ko).toMatch(/총액이 가장 낮아요/);
    expect(h.store.getState().cart[0]).toMatchObject({ productId: 'c1', sellerId: 'off-noirlab' });
  });

  it('표시가 최저가 배송비 때문에 총액 최저가 아니면, 총액 기준으로 고르고 그 이유를 말한다', async () => {
    const h = setup('화이트 옥스포드 셔츠', 'auto', { now: TUE });
    for (let i = 0; i < 300 && !h.events.some((e) => e.type === 'payment_gate'); i++) {
      const e = h.events[h.events.length - 1];
      if (e?.type === 'needs_input') h.agent.answer(e.options.find((o) => o.id === 'sh1')?.id ?? e.options[0].id);
      await tick();
    }
    expect(h.store.getState().cart[0]).toMatchObject({ productId: 'sh1', sellerId: 'daero', priceAtAdd: 69900 });
    const cmp = [...h.events].reverse().find((e) => e.type === 'tool_call' && e.id.startsWith('t-seller'));
    expect(cmp && cmp.type === 'tool_call' && cmp.note?.ko).toMatch(/표시가는 선반 셀렉트/);
  });

  it('도착 마감이 있으면 그 안에 오는 판매처를 고른다', async () => {
    const h = setup('검정 울 코트 내일까지', 'auto', { now: TUE });
    for (let i = 0; i < 300 && !h.events.some((e) => e.type === 'payment_gate'); i++) {
      const e = h.events[h.events.length - 1];
      if (e?.type === 'needs_input') h.agent.answer(e.options.find((o) => o.id === 'c1')?.id ?? e.options[0].id);
      await tick();
    }
    const line = h.store.getState().cart[0];
    expect(line.productId).toBe('c1');
    expect(['shelf', 'daero']).toContain(line.sellerId);
  });

  it('마감 안에 오는 판매처가 없으면 늦게 오는 걸 담을지 묻는다', async () => {
    const h = setup('검정 울 코트 오늘까지 받아야 해', 'auto', { now: TUE });
    await h.until((e) => e.type === 'needs_input' && (e.id.startsWith('q-late') || e.id.startsWith('q-pick')));
    let q = last(h.events, 'needs_input')!;
    if (q.id.startsWith('q-pick')) { h.agent.answer('c1'); await h.until((e) => e.type === 'needs_input' && e.id.startsWith('q-late')); q = last(h.events, 'needs_input')!; }
    expect(q.id.startsWith('q-late')).toBe(true);
    expect(h.store.getState().cart).toHaveLength(0);
    h.agent.answer('late');
    await h.until((e) => e.type === 'payment_gate');
    expect(h.store.getState().cart).toHaveLength(1);
  });

  it('국내 판매처에 없고 해외직구에만 있으면 조건을 보여주고 묻는다', async () => {
    const h = setup('블랙 레더 토트', 'auto', {
      now: TUE,
      before: (s) => { s.setStock('b1', 0, 'off-atelier9'); s.setStock('b1', 0, 'daero'); },
    });
    await h.until((e) => e.type === 'needs_input');
    const q = last(h.events, 'needs_input')!;
    expect(q.id.startsWith('q-abroad')).toBe(true);
    expect(q.question.ko).toMatch(/반품이 안 돼요/);
    expect(q.question.ko).toMatch(/관부가세/);
    h.agent.answer('abroad');
    await h.until((e) => e.type === 'payment_gate');
    expect(h.store.getState().cart[0].sellerId).toBe('abroad');
  });

  it('판매처가 3곳 이상으로 나뉘면 결제 전에 묻고, 한 곳으로 모을 수 있다', async () => {
    const h = setup('검정 울 코트랑 셔츠랑 블랙 레더 토트', 'auto', { now: TUE });
    let lastQ = '';
    for (let i = 0; i < 400 && !h.events.some((e) => e.type === 'payment_gate'); i++) {
      const e = h.events[h.events.length - 1];
      if (e?.type === 'needs_input' && e.id !== lastQ) {
        lastQ = e.id;
        if (e.id === 'q-split') {
          const merge = e.options.find((o) => o.id.startsWith('merge:'));
          expect(merge).toBeTruthy();
          h.agent.answer(merge!.id);
        } else h.agent.answer(e.options[0].id);
      }
      await tick();
    }
    expect(h.events.some((e) => e.type === 'needs_input' && e.id === 'q-split')).toBe(true);
    expect(new Set(h.store.getState().cart.map((l) => l.sellerId)).size).toBe(1);
  });

  it('결제를 승인하면 판매처마다 주문이 하나씩 생긴다', async () => {
    const h = setup('검정 울 코트랑 셔츠', 'auto', { now: TUE });
    let lastQ = '';
    for (let i = 0; i < 400 && !h.events.some((e) => e.type === 'payment_gate'); i++) {
      const e = h.events[h.events.length - 1];
      if (e?.type === 'needs_input' && e.id !== lastQ) { lastQ = e.id; h.agent.answer(e.options[0].id); }
      await tick();
    }
    const sellers = new Set(h.store.getState().cart.map((l) => l.sellerId));
    h.agent.approve();
    await h.until((e) => e.type === 'result');
    const orders = h.store.getState().orders;
    expect(orders).toHaveLength(sellers.size);
    expect(orders.every((o) => o.by === 'agent' && o.arriveAt > TUE)).toBe(true);
    expect(last(h.events, 'result')!.summary.ko).toMatch(/주문 \d건/);
  });
});

describe('결제 직전 재확인', () => {
  it('결제 게이트에서 판매처 가격이 바뀌면 결제하지 않고 다시 묻고, 새 금액으로 다시 승인받는다', async () => {
    const h = setup('검정 울 코트, 20만원 이하');
    await h.until((e) => e.type === 'payment_gate');
    h.store.setPrice('c1', 199000);
    h.agent.approve();
    await h.until((e) => e.type === 'needs_input' && e.id.startsWith('q-payfix'));
    expect(h.store.getState().orders).toHaveLength(0);
    h.agent.answer('refresh');
    await tick(); await tick();
    expect(last(h.events, 'payment_gate')!.total).toBe(199000);
    h.agent.approve();
    await h.until((e) => e.type === 'result');
    expect(last(h.events, 'result')!.status).toBe('done');
    expect(h.store.getState().orders[0].total).toBe(199000);
  });
  it('중단을 고르면 아무것도 결제되지 않는다', async () => {
    const h = setup('검정 울 코트, 20만원 이하');
    await h.until((e) => e.type === 'payment_gate');
    h.store.setPrice('c1', 199000);
    h.agent.approve();
    await h.until((e) => e.type === 'needs_input' && e.id.startsWith('q-payfix'));
    h.agent.answer('stop');
    await h.until((e) => e.type === 'result');
    expect(last(h.events, 'result')!.status).toBe('cancelled');
    expect(h.store.getState().orders).toHaveLength(0);
  });
});
