import type { AgentAdapter, AgentEvent, L, Level, PlanStep, RunOptions } from '../engine/types';
import { CATEGORY_L } from '../store/labels';
import { describeCriteria, parseRequest } from '../store/parser';
import { isEligible, reasonOf, searchProducts, type Scored } from '../store/search';
import type { Store } from '../store/store';
import type { Category, Criteria } from '../store/types';

type Delay = (ms: number) => Promise<void>;
const realDelay: Delay = (ms) => new Promise((r) => setTimeout(r, ms));

/** 확신도 임계값. 점수는 search.ts에서 계산된 조건 일치도. */
const HIGH = 0.9;
const MEDIUM = 0.6;
/** 1·2위 점수 차이가 이보다 작으면 사람이 고르게 한다. */
const TIE_GAP = 0.1;

const CAT_KEYS = Object.keys(CATEGORY_L) as Category[];
const name = (s: Scored) => s.product.name;

/**
 * 쇼핑몰 store 위에서 실제로 일하는 규칙 기반 에이전트.
 * 검색·점수화·재고 확인은 모두 store의 현재 state를 읽고, 장바구니도 store에 직접 담는다.
 * 확신도와 Escalation은 계산된 점수·재고·한도에서 나온다 (미리 쓴 대본이 아님).
 */
export class RuleAgent implements AgentAdapter {
  private onEvent: (e: AgentEvent) => void = () => {};
  private opts!: RunOptions;
  private waiter: ((v: string) => void) | null = null;
  private stopped = false;
  private paid = false;
  private gatePending = false;
  private undoEmptied = false;
  private stockoutDone = false;
  private runId = 0;
  private lines = new Map<string, string>(); // tool_call id -> productId
  private unsub: (() => void) | null = null;

  constructor(private store: Store, private delay: Delay = realDelay) {}

  start(opts: RunOptions, onEvent: (e: AgentEvent) => void) {
    this.stop();
    this.opts = opts;
    this.onEvent = onEvent;
    this.stopped = false;
    this.paid = false;
    this.gatePending = false;
    this.undoEmptied = false;
    this.stockoutDone = false;
    this.lines.clear();
    this.unsub = this.store.subscribe(() => this.onStoreChange());
    const id = ++this.runId;
    void this.run(id);
  }

  approve() { this.release('approve'); }
  reject() { this.release('reject'); }
  answer(optionId: string) { this.release(optionId); }

  stop() {
    this.stopped = true;
    this.runId++;
    this.unsub?.();
    this.unsub = null;
    this.release('stop');
  }

  undo(targetId: string) {
    const productId = this.lines.get(targetId);
    if (!productId) return;
    if (this.paid) {
      this.emit({
        type: 'undo', targetId, status: 'blocked',
        reason: { ko: '이미 결제가 승인되어 되돌릴 수 없어요. 주문 취소는 판매처에서 해야 해요.', en: 'Payment already approved — cannot undo here. Cancel the order with the seller.' },
      });
      return;
    }
    this.lines.delete(targetId);
    this.store.removeFromCart(productId);
    this.emit({ type: 'undo', targetId, status: 'done' });
  }

  // ── internals ──
  private emit(e: AgentEvent) { this.onEvent(e); }
  private release(v: string) { const w = this.waiter; this.waiter = null; w?.(v); }
  private wait() { return new Promise<string>((resolve) => { this.waiter = resolve; }); }
  private alive(id: number) { return !this.stopped && id === this.runId; }

  /** 결제 직전에 장바구니가 바뀌면(사람이 직접 빼는 경우 포함) 게이트를 갱신한다. */
  private onStoreChange() {
    if (!this.gatePending) return;
    if (this.store.getState().cart.length === 0) {
      this.undoEmptied = true;
      this.release('reject');
    } else {
      this.emitGate();
    }
  }

  private emitGate() {
    const cart = this.store.getState().cart;
    const total = this.store.cartTotal();
    this.emit({ type: 'payment_gate', itemIds: cart.map((l) => l.productId), total, limit: this.opts.limit, exceeded: total > this.opts.limit });
  }

  private finish(status: 'done' | 'failed' | 'cancelled', summary: L) {
    this.unsub?.();
    this.unsub = null;
    this.emit({ type: 'result', status, summary });
  }

  private levelOf(s: Scored, tie: Set<string>): Level {
    if (!isEligible(s)) return 'low';
    const base: Level = s.score >= HIGH ? 'high' : s.score >= MEDIUM ? 'medium' : 'low';
    return base === 'high' && tie.has(s.product.id) ? 'medium' : base;
  }

  private async run(id: number): Promise<void> {
    const d = (ms: number) => this.delay(ms);
    const ok = () => this.alive(id);
    const { dial } = this.opts;

    let criteria: Criteria = parseRequest(this.opts.request);
    await d(300);
    if (!ok()) return;
    this.emit({ type: 'understood', chips: describeCriteria(criteria), unknown: criteria.unknown });

    // 1) 해석하지 못한 표현이 있으면 멈춘다
    if (criteria.unknown.length > 0) {
      this.emit({
        type: 'needs_input', id: 'q-unknown',
        question: { ko: `"${criteria.unknown.join(', ')}"은(는) 해석하지 못했어요. 이 표현을 빼고 진행할까요?`, en: `I couldn't interpret "${criteria.unknown.join(', ')}". Continue without it?` },
        options: [
          { id: 'go', label: { ko: '빼고 진행', en: 'Continue without it' } },
          { id: 'stop', label: { ko: '중단', en: 'Stop' } },
        ],
      });
      const a = await this.wait();
      if (!ok()) return;
      if (a !== 'go') return this.finish('cancelled', { ko: '요청을 해석하지 못해 중단했어요.', en: "Stopped — couldn't interpret the request." });
      criteria = { ...criteria, unknown: [] };
    }

    // 2) 종류를 모르면 묻는다
    if (!criteria.category) {
      this.emit({
        type: 'needs_input', id: 'q-category',
        question: { ko: '어떤 종류를 찾을까요?', en: 'What kind of item are you looking for?' },
        options: CAT_KEYS.map((k) => ({ id: k, label: CATEGORY_L[k] })),
      });
      const a = await this.wait();
      if (!ok()) return;
      if (!CAT_KEYS.includes(a as Category)) return;
      criteria = { ...criteria, category: a as Category };
      this.emit({ type: 'understood', chips: describeCriteria(criteria), unknown: [] });
    }

    // 3) Intent Preview
    await d(400);
    if (!ok()) return;
    const requiresApproval = dial === 'always';
    const steps: PlanStep[] = [
      { id: 'p1', tool: 'search', label: { ko: '조건에 맞는 상품 검색', en: 'Search products matching your criteria' } },
      { id: 'p2', tool: 'compare', label: { ko: '후보 비교 및 추천', en: 'Compare candidates and recommend' } },
      { id: 'p3', tool: 'cart_add', label: { ko: '추천 상품을 장바구니에 담기', en: 'Add the pick to cart' } },
      { id: 'p4', tool: 'pay', label: { ko: '결제 직전 승인 요청 (결제는 승인 전까지 실행하지 않음)', en: 'Request approval before payment (nothing is paid until you approve)' } },
    ];
    this.emit({ type: 'plan', steps, requiresApproval });
    if (requiresApproval) {
      const a = await this.wait();
      if (!ok()) return;
      if (a === 'reject') return this.finish('cancelled', { ko: '계획을 승인하지 않아 아무것도 실행하지 않았어요.', en: 'Plan not approved — nothing was executed.' });
    }

    // 4) 검색 (쇼핑몰 현재 state를 읽는다)
    let eligible: Scored[] = [];
    let relaxed = false;
    for (let round = 1; ; round++) {
      const sid = `t-search${round}`;
      const slabel: L = { ko: '상품 검색', en: 'Search products' };
      this.emit({ type: 'tool_call', id: sid, tool: 'search', label: slabel, status: 'running' });
      await d(900);
      if (!ok()) return;
      const inStock = Object.values(this.store.getState().products).filter((p) => p.stock > 0);
      const all = searchProducts(inStock, criteria);
      eligible = all.filter(isEligible);
      const near = eligible.filter((s) => eligible[0].score - s.score < TIE_GAP);
      const tie = new Set(near.length > 1 ? near.map((s) => s.product.id) : []);
      const shown = [...eligible.slice(0, 4), ...all.filter((s) => !isEligible(s)).slice(0, Math.max(0, 4 - eligible.length))];
      this.emit({
        type: 'tool_call', id: sid, tool: 'search', label: slabel, status: 'done', itemIds: shown.map((s) => s.product.id),
        note: { ko: `${all.length}개 중 조건에 맞는 ${eligible.length}개`, en: `${eligible.length} of ${all.length} match` },
      });
      for (const s of shown) {
        await d(180);
        if (!ok()) return;
        this.emit({ type: 'confidence', itemId: s.product.id, level: this.levelOf(s, tie), reason: reasonOf(s) });
      }
      if (eligible.length > 0) break;

      // 결과가 없으면 예산을 풀지 묻는다 (한 번만)
      if (!relaxed && criteria.maxPrice !== undefined) {
        const next = Math.round((criteria.maxPrice * 1.2) / 1000) * 1000;
        this.emit({
          type: 'needs_input', id: 'q-relax',
          question: { ko: `조건에 맞는 상품이 없어요. 예산을 ${next.toLocaleString('ko-KR')}원까지 늘려볼까요?`, en: `Nothing matches. Raise the budget to KRW ${next.toLocaleString('en-US')}?` },
          options: [
            { id: 'relax', label: { ko: '예산 늘리기', en: 'Raise budget' } },
            { id: 'stop', label: { ko: '중단', en: 'Stop' } },
          ],
        });
        const a = await this.wait();
        if (!ok()) return;
        if (a !== 'relax') return this.finish('cancelled', { ko: '조건에 맞는 상품이 없어 중단했어요.', en: 'Stopped — no matching products.' });
        criteria = { ...criteria, maxPrice: next };
        relaxed = true;
        this.emit({ type: 'understood', chips: describeCriteria(criteria), unknown: [] });
        continue;
      }
      return this.finish('failed', { ko: '조건에 맞는 상품을 찾지 못했어요.', en: "Couldn't find a matching product." });
    }

    // 5) 비교 — 차이가 작거나 확신이 낮으면 사람에게 넘긴다
    this.emit({ type: 'tool_call', id: 't-compare', tool: 'compare', label: { ko: '후보 비교', en: 'Compare candidates' }, status: 'running' });
    await d(800);
    if (!ok()) return;
    const top = eligible[0];
    const tied = eligible.length > 1 && top.score - eligible[1].score < TIE_GAP;
    const unsure = top.score < MEDIUM;
    const needsHuman = tied || unsure;
    this.emit({
      type: 'tool_call', id: 't-compare', tool: 'compare', label: { ko: '후보 비교', en: 'Compare candidates' }, status: 'done',
      note: needsHuman
        ? { ko: tied ? '상위 후보의 차이가 작아 확신할 수 없어요' : '조건 일치도가 낮아 확신할 수 없어요', en: tied ? 'Top candidates are too close to call' : 'Match is too weak to be sure' }
        : { ko: `조건 일치도가 가장 높은 ${name(top).ko} 추천`, en: `Recommending ${name(top).en} — best match` },
    });

    let pick = top;
    if (needsHuman) {
      const options = eligible.slice(0, 3);
      this.emit({
        type: 'needs_input', id: 'q-pick',
        question: { ko: '후보 간 차이가 작아 제가 고를 수 없어요. 어느 쪽으로 할까요?', en: "The candidates are too close for me to choose. Which one?" },
        options: options.map((s) => ({ id: s.product.id, label: name(s) })),
      });
      const a = await this.wait();
      if (!ok()) return;
      const chosen = options.find((s) => s.product.id === a);
      if (!chosen) return;
      pick = chosen;
    }

    // 6) 담기 — 담는 시점의 실제 재고를 다시 확인한다
    const gated = dial !== 'auto';
    for (let attempt = 1; ; attempt++) {
      const tid = `t-cart${attempt}`;
      const clabel: L = { ko: `장바구니에 담기 · ${name(pick).ko}`, en: `Add to cart · ${name(pick).en}` };
      this.emit({ type: 'tool_call', id: tid, tool: 'cart_add', label: clabel, status: gated ? 'awaiting-approval' : 'running', itemIds: [pick.product.id] });
      if (gated) {
        const a = await this.wait();
        if (!ok()) return;
        if (a === 'reject') return this.finish('cancelled', { ko: '담기를 승인하지 않아 중단했어요.', en: 'Add-to-cart not approved — stopped.' });
      }
      await d(600);
      if (!ok()) return;
      if (this.opts.simulateStockout && !this.stockoutDone) {
        this.stockoutDone = true;
        this.store.setStock(pick.product.id, 0); // 다른 구매자가 마지막 재고를 가져갔다
      }
      const res = this.store.addToCart(pick.product.id, 'agent');
      if (res.ok) {
        this.lines.set(tid, pick.product.id);
        this.emit({ type: 'tool_call', id: tid, tool: 'cart_add', label: clabel, status: 'done', itemIds: [pick.product.id], undoable: true });
        break;
      }
      this.emit({
        type: 'tool_call', id: tid, tool: 'cart_add', label: clabel, status: 'failed', itemIds: [pick.product.id],
        note: { ko: '담는 시점에 품절로 확인됐어요', en: 'Found sold out at the moment of adding' },
      });
      const alts = eligible.filter((s) => s.product.id !== pick.product.id && (this.store.getProduct(s.product.id)?.stock ?? 0) > 0).slice(0, 2);
      if (alts.length === 0) return this.finish('failed', { ko: '품절이고 대안도 없어요.', en: 'Sold out and no alternatives.' });
      this.emit({
        type: 'needs_input', id: `q-alt${attempt}`,
        question: { ko: `${name(pick).ko}이(가) 품절이에요. 대안으로 진행할까요?`, en: `${name(pick).en} just sold out. Proceed with an alternative?` },
        options: [...alts.map((s) => ({ id: s.product.id, label: name(s) })), { id: 'stop', label: { ko: '여기서 중단', en: 'Stop here' } }],
      });
      const a = await this.wait();
      if (!ok()) return;
      const alt = alts.find((s) => s.product.id === a);
      if (!alt) return this.finish('cancelled', { ko: '요청에 따라 중단했어요. 담은 항목은 없어요.', en: 'Stopped as requested. Nothing was added.' });
      pick = alt;
    }

    // 7) 결제 직전 승인 — Dial과 무관하게 사람이 승인한다
    await d(500);
    if (!ok()) return;
    this.gatePending = true;
    this.emitGate();
    const a = await this.wait();
    this.gatePending = false;
    if (!ok()) return;
    if (a === 'reject') {
      return this.finish('cancelled', this.undoEmptied
        ? { ko: '담은 항목을 모두 되돌려서 중단했어요.', en: 'Everything was undone, so the run stopped.' }
        : { ko: '결제 전에 중단했어요. 담긴 항목은 되돌릴 수 있어요.', en: 'Stopped before payment. Items in the cart can still be undone.' });
    }
    this.paid = true;
    this.store.checkout();
    await d(600);
    if (!ok()) return;
    this.finish('done', { ko: '결제 승인이 완료됐어요 (시뮬레이션 — 실제 결제는 실행되지 않아요).', en: 'Payment approved (simulation — no real payment is made).' });
  }
}
