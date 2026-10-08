import type { AgentAdapter, AgentEvent, L, Level, PlanStep, RunOptions } from '../engine/types';
import { CATEGORY_L, COLOR_L } from '../store/labels';
import { deadlineL, describeCriteria, parseMulti } from '../store/parser';
import { isEligible, reasonOf, searchProducts, type Scored } from '../store/search';
import { arrivalLabel, deadlineOf, DUTY_OVER, SELLERS, sellerOf } from '../store/sellers';
import type { Ranked, Store } from '../store/store';
import { sizeKindOf, type Category, type Color, type Criteria, type SizeKind } from '../store/types';

type Delay = (ms: number) => Promise<void>;
/** 실제로 판매처에 묻고 기다리는 만큼의 호흡. 단계마다 길이가 조금씩 다르다. */
const PACE = 1.8;
const realDelay: Delay = (ms) => new Promise((r) => setTimeout(r, ms * PACE * (0.85 + Math.random() * 0.3)));

/** 확신도 임계값. 점수는 search.ts에서 계산된 조건 일치도. */
const HIGH = 0.9;
const MEDIUM = 0.6;
/** 1·2위 점수 차이가 이보다 작으면 사람이 고르게 한다. */
const TIE_GAP = 0.1;

const CAT_KEYS = Object.keys(CATEGORY_L) as Category[];
const name = (s: Scored) => s.product.name;
const won = (n: number): L => ({ ko: `${n.toLocaleString('ko-KR')}원`, en: `KRW ${n.toLocaleString('en-US')}` });
/** 마지막 글자 받침에 맞춘 은/는. 한글이 아니면 '은(는)'. */
const josa = (w: string) => {
  const c = w.charCodeAt(w.length - 1) - 0xac00;
  return c < 0 || c > 11171 ? '은(는)' : c % 28 ? '은' : '는';
};

const priced = (s: Scored): L => ({ ko: `${s.product.name.ko}, ${won(s.product.price).ko}부터`, en: `${s.product.name.en}, from ${won(s.product.price).en}` });

type ShopResult = 'added' | 'skipped' | 'end';
interface Ctx { multi: boolean; budget?: number }

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
  private runId = 0;
  private lines = new Map<string, string>(); // tool_call id -> productId
  private sizeMemo: Partial<Record<SizeKind, string>> = {}; // 이번 요청에서 알려준 사이즈
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
    this.lines.clear();
    this.sizeMemo = {};
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

  /** 요청에 사이즈가 없으면 내 사이즈(프로필, 이번 요청에서 알려준 값)를 쓴다. */
  private wantedSize(c: Criteria): string | undefined {
    if (c.size) return c.size;
    // 묶음(아우터 등)은 사이즈 체계가 하나로 모일 때만 내 사이즈를 쓴다
    const kinds = new Set((c.category ? [c.category] : c.categories ?? []).map(sizeKindOf));
    if (kinds.size !== 1) return undefined;
    const [kind] = kinds;
    if (kind === 'free') return undefined;
    return this.sizeMemo[kind] ?? this.opts.sizes?.[kind];
  }

  private chipsOf(c: Criteria) {
    const chips = describeCriteria(c);
    const mine = !c.size && this.wantedSize(c);
    if (mine) chips.push({ label: { ko: '사이즈', en: 'Size' }, value: { ko: `${mine} (내 사이즈)`, en: `${mine} (your size)` } });
    return chips;
  }

  /** 항목별 조건을 사람이 확인할 칩으로 보여준다. 한 개면 기존 칩 그대로, 여러 개면 항목 단위로 묶는다. */
  private announce(items: Criteria[], budget?: number) {
    if (items.length === 1) return this.emit({ type: 'understood', chips: this.chipsOf(items[0]), unknown: items[0].unknown });
    const chips = items.map((c, i) => {
      const ds = this.chipsOf(c);
      return {
        label: { ko: `항목 ${i + 1}`, en: `Item ${i + 1}` },
        value: { ko: ds.map((x) => x.value.ko).join(' · ') || '?', en: ds.map((x) => x.value.en).join(' · ') || '?' },
      };
    });
    if (budget !== undefined) chips.push({ label: { ko: '합계 예산', en: 'Total budget' }, value: { ko: `${won(budget).ko} 이하`, en: `up to ${won(budget).en}` } });
    this.emit({ type: 'understood', chips, unknown: items.flatMap((c) => c.unknown) });
  }

  private async run(id: number): Promise<void> {
    const d = (ms: number) => this.delay(ms);
    const ok = () => this.alive(id);
    const { dial } = this.opts;

    const parsed = parseMulti(this.opts.request);
    const items = parsed.items;
    const ctx: Ctx = { multi: items.length > 1, budget: parsed.budget };
    await d(300);
    if (!ok()) return;
    this.announce(items, ctx.budget);

    for (let i = 0; i < items.length; i++) {
      let criteria = items[i];
      let changed = false;
      const sfx = i === 0 ? '' : `-i${i + 1}`;
      // 1) 조건으로 못 쓰는 표현이 있으면, 빼고 찾아도 되는지 확인한다
      if (criteria.unknown.length > 0) {
        const words = criteria.unknown.map((w) => `'${w}'`).join(', ');
        this.emit({
          type: 'needs_input', id: `q-unknown${sfx}`,
          question: { ko: `${words}${josa(criteria.unknown[criteria.unknown.length - 1])} 조건에서 빼고 찾을게요.`, en: `I'll search without ${words}.` },
          options: [
            { id: 'go', label: { ko: '그대로 진행', en: 'Go ahead' } },
            { id: 'rephrase', label: { ko: '다시 말하기', en: 'Rephrase' } },
          ],
        });
        const a = await this.wait();
        if (!ok()) return;
        if (a !== 'go') return this.finish('cancelled', { ko: '요청을 입력창에 돌려놨어요. 고쳐서 다시 보내 주세요.', en: 'Your request is back in the box. Edit it and send again.' });
        criteria = { ...criteria, unknown: [] };
      }
      // 2) 종류를 모르면 묻는다 (묶음 표현이면 그 안의 종류를 모두 후보로 본다)
      if (!criteria.category && !criteria.categories?.length) {
        this.emit({
          type: 'needs_input', id: `q-category${sfx}`,
          question: { ko: '어떤 종류를 찾을까요?', en: 'What kind of item are you looking for?' },
          options: CAT_KEYS.map((k) => ({ id: k, label: CATEGORY_L[k] })),
        });
        const a = await this.wait();
        if (!ok()) return;
        if (!CAT_KEYS.includes(a as Category)) return;
        criteria = { ...criteria, category: a as Category };
        changed = true;
      }
      items[i] = criteria;
      if (changed) this.announce(items, ctx.budget);
    }

    // 3) Intent Preview
    await d(400);
    if (!ok()) return;
    const requiresApproval = dial === 'always';
    const multiLabel = (ko: string, en: string): L => ({ ko, en });
    const steps: PlanStep[] = ctx.multi
      ? [
          { id: 'p1', tool: 'search', label: multiLabel(`항목별로 상품 검색 (${items.length}개)`, `Search each item (${items.length})`) },
          { id: 'p2', tool: 'compare', label: multiLabel('항목마다 후보 비교 및 추천', 'Compare candidates and recommend per item') },
          { id: 'p3', tool: 'cart_add', label: ctx.budget !== undefined
            ? multiLabel(`합계 ${won(ctx.budget).ko} 안에서 담기. 넘으면 멈추고 묻기`, `Add within ${won(ctx.budget).en} total — stop and ask if it would go over`)
            : multiLabel('추천 상품을 차례로 장바구니에 담기', 'Add the picks to cart one by one') },
          { id: 'p4', tool: 'pay', label: { ko: '결제 직전 승인 요청 (결제는 승인 전까지 실행하지 않음)', en: 'Request approval before payment (nothing is paid until you approve)' } },
        ]
      : [
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

    let added = 0;
    for (let i = 0; i < items.length; i++) {
      const r = await this.shop(id, items[i], i, ctx);
      if (r === 'end') return;
      if (r === 'added') added++;
    }
    if (added === 0) return this.finish('failed', { ko: '담은 항목이 없어서 여기서 마쳤어요.', en: 'Nothing was added, so the run ended here.' });

    // 6-e) 판매처가 3곳 이상이면 배송비와 반품 창구가 갈라진다. 결제 전에 확인받는다.
    const groups = this.store.quote();
    if (groups.length >= 3) {
      const merge = this.mergeOption();
      const ship = groups.reduce((a, q) => a + q.shipping, 0);
      this.emit({
        type: 'needs_input', id: 'q-split',
        question: {
          ko: `담은 상품이 판매처 ${groups.length}곳으로 나뉘어요. 주문이 ${groups.length}건, 택배도 ${groups.length}번 오고${ship > 0 ? ` 배송비가 ${won(ship).ko} 들어요` : ''}. 반품도 판매처마다 따로 해야 해요.`,
          en: `Your items come from ${groups.length} sellers: ${groups.length} orders and ${groups.length} deliveries${ship > 0 ? `, ${won(ship).en} in shipping` : ''}, and returns go to each seller.`,
        },
        options: [
          { id: 'keep', label: { ko: `${groups.length}곳 그대로 진행`, en: `Keep ${groups.length} sellers` } },
          ...(merge ? [{
            id: `merge:${merge.sellerId}`,
            label: merge.diff > 0
              ? { ko: `${sellerOf(merge.sellerId).name.ko} 한 곳으로 모으기 (${won(merge.diff).ko} 추가)`, en: `Combine at ${sellerOf(merge.sellerId).name.en} (+${won(merge.diff).en})` }
              : { ko: `${sellerOf(merge.sellerId).name.ko} 한 곳으로 모으기 (${won(-merge.diff).ko} 절약)`, en: `Combine at ${sellerOf(merge.sellerId).name.en} (save ${won(-merge.diff).en})` },
          }] : []),
          { id: 'stop', label: { ko: '여기서 중단', en: 'Stop here' } },
        ],
      });
      const a = await this.wait();
      if (!ok()) return;
      if (a === 'stop') return this.finish('cancelled', { ko: '결제 전에 중단했어요. 담긴 항목은 되돌릴 수 있어요.', en: 'Stopped before payment. Items in the cart can still be undone.' });
      if (a.startsWith('merge:')) {
        const sid = a.slice(6);
        for (const l of this.store.getState().cart) this.store.switchSeller(l.productId, sid);
        this.emit({ type: 'tool_call', id: 't-merge', tool: 'cart_add', label: { ko: `판매처 모으기: ${sellerOf(sid).name.ko}`, en: `Combine sellers at ${sellerOf(sid).name.en}` }, status: 'done', note: { ko: '주문 1건, 배송 1번으로 바뀌었어요', en: 'Now one order and one shipment' } });
      }
    }

    // 7) 결제 직전 승인 — Dial과 무관하게 사람이 승인한다
    await d(500);
    if (!ok()) return;
    for (let round = 1; ; round++) {
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
      // 승인한 금액과 지금 판매처 조건이 다르면 결제하지 않고 다시 확인받는다
      const issues = this.store.cartIssues();
      if (issues.length === 0) break;
      const before = this.store.cartTotal();
      const said = issues.map((x) => {
        const n = this.store.getProduct(x.productId)!.name;
        return x.kind === 'price'
          ? { ko: `${n.ko} ${won(x.from).ko}에서 ${won(x.to).ko}로`, en: `${n.en} ${won(x.from).en} to ${won(x.to).en}` }
          : x.left === 0
            ? { ko: `${n.ko} 품절`, en: `${n.en} sold out` }
            : { ko: `${n.ko} ${x.left}개만 남음`, en: `${n.en}: only ${x.left} left` };
      });
      this.emit({
        type: 'needs_input', id: `q-payfix${round}`,
        question: {
          ko: `결제 직전에 판매처 조건이 바뀌었어요. ${said.map((x) => x.ko).join(', ')}. 결제하지 않았어요.`,
          en: `Seller terms changed right before payment: ${said.map((x) => x.en).join('; ')}. Nothing was charged.`,
        },
        options: [
          { id: 'refresh', label: { ko: '바뀐 내용으로 다시 확인', en: 'Review with the new terms' } },
          { id: 'stop', label: { ko: '결제하지 않고 중단', en: 'Stop without paying' } },
        ],
      });
      const f = await this.wait();
      if (!ok()) return;
      if (f !== 'refresh') return this.finish('cancelled', { ko: '판매처 조건이 바뀌어 결제하지 않았어요. 장바구니는 그대로예요.', en: 'Terms changed, so nothing was paid. Your cart is unchanged.' });
      this.store.refreshCart();
      if (this.store.getState().cart.length === 0) return this.finish('cancelled', { ko: '담은 상품이 모두 품절돼 결제하지 않았어요.', en: 'Everything sold out, so nothing was paid.' });
      this.emit({
        type: 'tool_call', id: `t-refresh${round}`, tool: 'pay', status: 'done',
        label: { ko: '장바구니를 지금 조건으로 고침', en: 'Cart updated to current terms' },
        note: { ko: `합계 ${won(before).ko}에서 ${won(this.store.cartTotal()).ko}로`, en: `Total ${won(before).en} to ${won(this.store.cartTotal()).en}` },
      });
    }
    // 결제는 한 번에 끝내지 않고 단계마다 보여준다: 결제 승인 → 판매처별 주문 접수 → 주문 확인
    const amount = this.store.cartTotal();
    const emitPay = (pid: string, status: 'running' | 'done', label: L, note?: L) =>
      this.emit({ type: 'tool_call', id: pid, tool: 'pay', status, label, note });
    const authL: L = { ko: '결제 승인 요청', en: 'Requesting payment approval' };
    // 승인한 순간의 조건으로 바로 주문을 확정한다(기다리는 사이 시세가 바뀌어도 금액은 그대로)
    this.paid = true;
    const orders = this.store.checkout('agent') ?? [];
    emitPay('t-pay-auth', 'running', authL, won(amount));
    await d(1100);
    if (!ok()) return;
    emitPay('t-pay-auth', 'done', { ko: '결제 승인됨', en: 'Payment approved' }, won(amount));
    for (const [i, o] of orders.entries()) {
      const s = sellerOf(o.sellerId).name;
      emitPay(`t-pay-order${i}`, 'running', { ko: `${s.ko}에 주문 전달`, en: `Sending order to ${s.en}` });
      await d(750);
      if (!ok()) return;
      emitPay(`t-pay-order${i}`, 'done', { ko: `${s.ko} 주문 접수`, en: `${s.en} accepted the order` }, { ko: `주문번호 ${o.id}`, en: `Order no. ${o.id}` });
    }
    emitPay('t-pay-confirm', 'running', { ko: '주문 확인', en: 'Confirming orders' });
    await d(600);
    if (!ok()) return;
    emitPay('t-pay-confirm', 'done', { ko: '주문 확인 완료', en: 'Orders confirmed' }, { ko: `주문 ${orders.length}건`, en: `${orders.length} order${orders.length > 1 ? 's' : ''}` });
    const now = this.store.now();
    const lines = orders.map((o) => ({ s: sellerOf(o.sellerId).name, w: arrivalLabel(o.arriveAt, now) }));
    this.finish('done', {
      ko: `결제를 승인해 주문 ${orders.length}건이 접수됐어요. ${lines.map((x) => `${x.s.ko} ${x.w.ko}`).join(', ')} 예정이에요.`,
      en: `Payment approved. ${orders.length} order${orders.length > 1 ? 's' : ''} placed: ${lines.map((x) => `${x.s.en}, ${x.w.en.toLowerCase()}`).join('; ')}.`,
    });
  }

  /** 항목 하나를 검색 → 비교 → (예산 확인) → 담기까지 진행한다. 여러 항목이면 항목 번호를 id와 라벨에 붙인다. */
  private async shop(id: number, start: Criteria, idx: number, ctx: Ctx): Promise<ShopResult> {
    const d = (ms: number) => this.delay(ms);
    const ok = () => this.alive(id);
    const { dial } = this.opts;
    const base = idx === 0 ? '' : `-i${idx + 1}`;
    const kindL = start.category ? CATEGORY_L[start.category] : start.group;
    const tag = (l: L): L => (ctx.multi && kindL
      ? { ko: `${l.ko} (${kindL.ko})`, en: `${l.en} (${kindL.en})` }
      : l);
    // 여러 항목일 때 "못 찾음/품절"은 그 항목만 건너뛰고 계속한다. 한 항목이면 기존처럼 거기서 끝낸다.
    const give = (status: 'failed' | 'cancelled', summary: L): ShopResult => {
      if (ctx.multi && status === 'failed') return 'skipped';
      this.finish(status, summary);
      return 'end';
    };
    let criteria = start;
    // 사람이 담기를 거절하며 알려준 이유는 다음 검색의 제외 조건이 된다
    const excluded = { ids: new Set<string>(), brands: new Set<string>(), colors: new Set<Color>() };

    // 4~6을 한 바퀴로 하고, 거절 사유가 오면 조건을 고쳐 다시 돈다 (최대 2번)
    redo: for (let round0 = 0; ; round0++) {
    const sfx = round0 ? `${base}-r${round0}` : base;

    // 4) 검색 (쇼핑몰 현재 state를 읽는다)
    let eligible: Scored[] = [];
    let relaxed = false;
    let sizeOff = false;
    for (let round = 1; ; round++) {
      const sid = `t-search${round}${sfx}`;
      const slabel = tag({ ko: '상품 검색', en: 'Search products' });
      this.emit({ type: 'tool_call', id: sid, tool: 'search', label: slabel, status: 'running' });
      await d(900);
      if (!ok()) return 'end';
      const inStock = Object.values(this.store.getState().products).filter(
        (p) => p.stock > 0 && !excluded.ids.has(p.id) && !excluded.brands.has(p.brand) && !p.colors.some((c) => excluded.colors.has(c)),
      );
      const eff = sizeOff ? undefined : this.wantedSize(criteria);
      const all = searchProducts(inStock, { ...criteria, size: eff });
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
        if (!ok()) return 'end';
        this.emit({ type: 'confidence', itemId: s.product.id, level: this.levelOf(s, tie), reason: reasonOf(s) });
      }
      if (eligible.length > 0) break;

      // 사이즈 때문에 비었으면 사이즈 조건을 풀지 묻는다 (한 번만)
      if (!sizeOff && eff && searchProducts(inStock, { ...criteria, size: undefined }).some(isEligible)) {
        this.emit({
          type: 'needs_input', id: `q-sizefree${sfx}`,
          question: { ko: `사이즈 ${eff}이(가) 남은 상품이 없어요. 사이즈 조건을 빼고 볼까요?`, en: `Nothing is left in size ${eff}. Search without the size filter?` },
          options: [
            { id: 'nosize', label: { ko: '사이즈 조건 빼고 보기', en: 'Ignore size' } },
            { id: 'stop', label: { ko: '중단', en: 'Stop' } },
          ],
        });
        const a = await this.wait();
        if (!ok()) return 'end';
        if (a !== 'nosize') {
          this.finish('cancelled', { ko: '사이즈가 없어 중단했어요.', en: `Stopped — size ${eff} is unavailable.` });
          return 'end';
        }
        sizeOff = true;
        continue;
      }

      // 결과가 없으면 예산을 풀지 묻는다 (한 번만)
      if (!relaxed && criteria.maxPrice !== undefined) {
        const next = Math.round((criteria.maxPrice * 1.2) / 1000) * 1000;
        this.emit({
          type: 'needs_input', id: `q-relax${sfx}`,
          question: { ko: `조건에 맞는 상품이 없어요. 예산을 ${next.toLocaleString('ko-KR')}원까지 늘려볼까요?`, en: `Nothing matches. Raise the budget to KRW ${next.toLocaleString('en-US')}?` },
          options: [
            { id: 'relax', label: { ko: '예산 늘리기', en: 'Raise budget' } },
            { id: 'stop', label: { ko: '중단', en: 'Stop' } },
          ],
        });
        const a = await this.wait();
        if (!ok()) return 'end';
        if (a !== 'relax') {
          this.finish('cancelled', { ko: '조건에 맞는 상품이 없어 중단했어요.', en: 'Stopped — no matching products.' });
          return 'end';
        }
        criteria = { ...criteria, maxPrice: next };
        relaxed = true;
        continue;
      }
      return give('failed', { ko: '조건에 맞는 상품을 찾지 못했어요.', en: "Couldn't find a matching product." });
    }

    // 5) 비교 — 차이가 작거나 확신이 낮으면 사람에게 넘긴다
    const cid = `t-compare${sfx}`;
    const clab = tag({ ko: '후보 비교', en: 'Compare candidates' });
    this.emit({ type: 'tool_call', id: cid, tool: 'compare', label: clab, status: 'running' });
    await d(800);
    if (!ok()) return 'end';
    const top = eligible[0];
    const tied = eligible.length > 1 && top.score - eligible[1].score < TIE_GAP;
    const unsure = top.score < MEDIUM;
    const needsHuman = tied || unsure;
    this.emit({
      type: 'tool_call', id: cid, tool: 'compare', label: clab, status: 'done',
      note: needsHuman
        ? { ko: tied ? '상위 후보의 차이가 작아 확신할 수 없어요' : '조건 일치도가 낮아 확신할 수 없어요', en: tied ? 'Top candidates are too close to call' : 'Match is too weak to be sure' }
        : { ko: `조건 일치도가 가장 높은 ${name(top).ko} 추천`, en: `Recommending ${name(top).en} — best match` },
    });

    let pick = top;
    if (needsHuman) {
      const options = eligible.slice(0, 3);
      this.emit({
        type: 'needs_input', id: `q-pick${sfx}`,
        question: { ko: '후보 간 차이가 작아 제가 고를 수 없어요. 어느 쪽으로 할까요?', en: "The candidates are too close for me to choose. Which one?" },
        options: options.map((s) => ({ id: s.product.id, label: priced(s) })),
      });
      const a = await this.wait();
      if (!ok()) return 'end';
      const chosen = options.find((s) => s.product.id === a);
      if (!chosen) return 'end';
      pick = chosen;
    }

    // 6) 담기 — 담는 시점의 실제 재고·가격을 다시 확인한다
    const gated = dial !== 'auto';
    for (let attempt = 1; ; attempt++) {
      // 6-a) 합계 예산: 이걸 담으면 넘는지 담기 전에 확인한다
      if (ctx.budget !== undefined) {
        const have = this.store.cartTotal();
        const price = this.landed(pick.product.id);
        if (have + price > ctx.budget) {
          const fits = eligible
            .filter((s) => s.product.id !== pick.product.id && (this.store.getProduct(s.product.id)?.stock ?? 0) > 0)
            .filter((s) => have + this.landed(s.product.id) <= ctx.budget!)
            .sort((a, b) => this.landed(a.product.id) - this.landed(b.product.id))[0];
          const over = have + price - ctx.budget;
          this.emit({
            type: 'needs_input', id: `q-budget${attempt}${sfx}`,
            question: {
              ko: `${name(pick).ko}을(를) 담으면 합계가 ${won(have + price).ko}로 예산 ${won(ctx.budget).ko}보다 ${won(over).ko} 넘어요.`,
              en: `Adding ${name(pick).en} brings the total to ${won(have + price).en}, ${won(over).en} over your ${won(ctx.budget).en} budget.`,
            },
            options: [
              ...(fits ? [{ id: fits.product.id, label: { ko: `더 저렴한 ${name(fits).ko} (${won(this.landed(fits.product.id)).ko})`, en: `Cheaper: ${name(fits).en} (${won(this.landed(fits.product.id)).en})` } }] : []),
              { id: 'over', label: { ko: '예산을 넘겨 담기', en: 'Add anyway' } },
              { id: 'skip', label: { ko: '이 항목 빼기', en: 'Skip this item' } },
              { id: 'stop', label: { ko: '여기서 중단', en: 'Stop here' } },
            ],
          });
          const a = await this.wait();
          if (!ok()) return 'end';
          if (a === 'stop') {
            this.finish('cancelled', { ko: '요청에 따라 중단했어요.', en: 'Stopped as requested.' });
            return 'end';
          }
          if (a === 'skip') return 'skipped';
          const swap = eligible.find((s) => s.product.id === a);
          if (swap) pick = swap;
        }
      }

      // 6-b) 이미 담긴 상품이면 먼저 묻는다
      const inCart = this.store.getState().cart.find((l) => l.productId === pick.product.id);
      let forced: string | undefined;
      if (inCart) {
        this.emit({
          type: 'needs_input', id: `q-dup${attempt}${sfx}`,
          question: { ko: `${name(pick).ko}은(는) 이미 장바구니에 있어요 (${sellerOf(inCart.sellerId).name.ko}, ${inCart.size}, ${inCart.qty}개). 어떻게 할까요?`, en: `${name(pick).en} is already in your cart (${sellerOf(inCart.sellerId).name.en}, ${inCart.size}, ×${inCart.qty}). What now?` },
          options: [
            { id: 'keep', label: { ko: '그대로 두기', en: 'Keep as is' } },
            { id: 'more', label: { ko: '한 개 더 담기', en: 'Add one more' } },
            ...(round0 < 3 ? [{ id: 'other', label: { ko: '다른 상품 찾기', en: 'Find another' } }] : []),
            { id: 'stop', label: { ko: '여기서 중단', en: 'Stop here' } },
          ],
        });
        const a = await this.wait();
        if (!ok()) return 'end';
        if (a === 'keep') return 'added';
        if (a === 'other' && round0 < 3) { excluded.ids.add(pick.product.id); continue redo; }
        if (a !== 'more') { this.finish('cancelled', { ko: '요청에 따라 중단했어요.', en: 'Stopped as requested.' }); return 'end'; }
        forced = inCart.size;
      }

      // 6-c) 사이즈 확정: 요청·내 사이즈가 지금 남아 있으면 그대로, 아니면 묻는다
      const kind = sizeKindOf(pick.product.category);
      const avail = this.store.availableSizes(pick.product.id);
      let size: string | undefined = kind === 'free' ? avail[0] : undefined;
      if (kind !== 'free' && avail.length > 0) {
        const want = forced ?? criteria.size ?? this.sizeMemo[kind] ?? this.opts.sizes?.[kind];
        if (want && avail.includes(want)) size = want;
        else if (forced) size = undefined;
        else {
          this.emit({
            type: 'needs_input', id: `q-size${attempt}${sfx}`,
            question: want
              ? { ko: `${name(pick).ko}은(는) ${want} 사이즈가 없어요. 남은 사이즈로 담을까요?`, en: `${name(pick).en} has no size ${want} left. Pick another size?` }
              : { ko: `${name(pick).ko}은(는) 어떤 사이즈로 담을까요?`, en: `Which size for ${name(pick).en}?` },
            options: [
              ...avail.map((z) => ({ id: `size:${z}`, label: { ko: `${z}`, en: `${z}` } })),
              ...(round0 < 3 ? [{ id: 'other', label: { ko: '다른 상품 보기', en: 'Show others' } }] : []),
              { id: 'stop', label: { ko: '여기서 중단', en: 'Stop here' } },
            ],
          });
          const a = await this.wait();
          if (!ok()) return 'end';
          if (a === 'other' && round0 < 3) { excluded.ids.add(pick.product.id); continue redo; }
          if (!a.startsWith('size:')) { this.finish('cancelled', { ko: '요청에 따라 중단했어요.', en: 'Stopped as requested.' }); return 'end'; }
          size = a.slice(5);
          this.sizeMemo[kind] = size;
        }
      }
      const szTag = size && size !== 'FREE' ? size : '';
      const tid = `t-cart${attempt}${sfx}`;
      if (!size) {
        const blabel = tag({ ko: `담기: ${name(pick).ko}`, en: `Add: ${name(pick).en}` });
        this.emit({ type: 'tool_call', id: tid, tool: 'cart_add', label: blabel, status: 'failed', itemIds: [pick.product.id], note: { ko: '남은 사이즈가 없어요', en: 'No size left' } });
        const r = await this.altFlow(id, pick, eligible, `a${attempt}${sfx}`, ctx, { ko: '모든 사이즈가 품절이에요', en: 'sold out in every size' });
        if (r === 'end' || r === 'skipped') return r;
        pick = r; continue;
      }

      // 6-d) 판매처 고르기: 배송비를 더한 총액이 가장 낮은 국내 판매처. 도착 마감이 있으면 그 안에 오는 곳 중에서.
      // 이미 담긴 상품에 하나 더 담을 때는 같은 판매처에서만
      const ranked = this.store.rankOffers(pick.product.id, size).filter((r) => !inCart || r.offer.sellerId === inCart.sellerId);
      const domestic = ranked.filter((r) => !r.seller.overseas);
      const abroad = ranked.find((r) => r.seller.overseas);
      const deadline = criteria.deliverBy ? deadlineOf(criteria.deliverBy, this.store.now()) : undefined;
      const inTime = deadline === undefined ? domestic : domestic.filter((r) => r.arriveAt <= deadline);
      const vid = `t-seller${attempt}${sfx}`;
      const vlab = tag({ ko: `판매처 ${ranked.length}곳 비교`, en: `Compare ${ranked.length} sellers` });
      this.emit({ type: 'tool_call', id: vid, tool: 'compare', label: vlab, status: 'running', itemIds: [pick.product.id] });
      await d(600);
      if (!ok()) return 'end';
      let offer: Ranked | undefined = inTime[0];
      if (offer) {
        this.emit({ type: 'tool_call', id: vid, tool: 'compare', label: vlab, status: 'done', itemIds: [pick.product.id], note: this.whyOffer(offer, ranked, criteria) });
      } else if (domestic.length > 0 && deadline !== undefined) {
        // 마감 안에 오는 국내 판매처가 없다 — 늦게 오는 걸 담을지 묻는다
        const soonest = [...domestic].sort((a, b) => a.arriveAt - b.arriveAt)[0];
        const when = arrivalLabel(soonest.arriveAt, this.store.now());
        const dl = deadlineL(criteria.deliverBy!);
        this.emit({ type: 'tool_call', id: vid, tool: 'compare', label: vlab, status: 'done', itemIds: [pick.product.id], note: { ko: `${dl} 오는 판매처가 없어요`, en: `No seller delivers ${dl.en}` } });
        this.emit({
          type: 'needs_input', id: `q-late${attempt}${sfx}`,
          question: { ko: `${name(pick).ko}은(는) ${dl.ko} 받을 수 있는 판매처가 없어요. 가장 빠른 곳은 ${soonest.seller.name.ko}, ${when.ko}이에요.`, en: `No seller can deliver ${name(pick).en} ${dl.en}. The fastest is ${soonest.seller.name.en}: ${when.en.toLowerCase()}.` },
          options: [
            { id: 'late', label: { ko: `${when.ko}로 담기`, en: `Add, ${when.en.toLowerCase()}` } },
            ...(round0 < 3 ? [{ id: 'other', label: { ko: '제때 오는 다른 상품 찾기', en: 'Find one that arrives in time' } }] : []),
            { id: 'stop', label: { ko: '여기서 중단', en: 'Stop here' } },
          ],
        });
        const a = await this.wait();
        if (!ok()) return 'end';
        if (a === 'other' && round0 < 3) { excluded.ids.add(pick.product.id); continue redo; }
        if (a !== 'late') { this.finish('cancelled', { ko: '요청에 따라 중단했어요.', en: 'Stopped as requested.' }); return 'end'; }
        offer = soonest;
      } else if (abroad) {
        // 국내에는 이 사이즈가 없고 해외직구에만 있다 — 배송·반품 조건이 달라 사람이 정한다
        const when = arrivalLabel(abroad.arriveAt, this.store.now());
        const duty = abroad.offer.price >= DUTY_OVER;
        this.emit({ type: 'tool_call', id: vid, tool: 'compare', label: vlab, status: 'done', itemIds: [pick.product.id], note: { ko: '국내 판매처는 이 사이즈가 품절이에요', en: 'Sold out in this size at domestic sellers' } });
        this.emit({
          type: 'needs_input', id: `q-abroad${attempt}${sfx}`,
          question: {
            ko: `${name(pick).ko} ${szTag}은(는) ${abroad.seller.name.ko}에만 있어요. ${won(abroad.landed).ko}(배송비 포함), ${when.ko}, 단순 변심 반품이 안 돼요.${duty ? ' 관부가세가 따로 붙을 수 있어요.' : ''}`,
            en: `${name(pick).en} ${szTag} is only at ${abroad.seller.name.en}: ${won(abroad.landed).en} with shipping, ${when.en.toLowerCase()}, no change-of-mind returns.${duty ? ' Import duties may apply.' : ''}`,
          },
          options: [
            { id: 'abroad', label: { ko: '해외직구로 담기', en: 'Add from overseas' } },
            ...(round0 < 3 ? [{ id: 'other', label: { ko: '국내 판매 상품 찾기', en: 'Find a domestic one' } }] : []),
            { id: 'stop', label: { ko: '여기서 중단', en: 'Stop here' } },
          ],
        });
        const a = await this.wait();
        if (!ok()) return 'end';
        if (a === 'other' && round0 < 3) { excluded.ids.add(pick.product.id); continue redo; }
        if (a !== 'abroad') { this.finish('cancelled', { ko: '요청에 따라 중단했어요.', en: 'Stopped as requested.' }); return 'end'; }
        offer = abroad;
      }
      if (!offer) {
        this.emit({ type: 'tool_call', id: vid, tool: 'compare', label: vlab, status: 'failed', itemIds: [pick.product.id], note: { ko: '이 사이즈를 파는 판매처가 없어요', en: 'No seller has this size' } });
        delete this.sizeMemo[kind];
        continue;
      }
      const seller = offer.seller;

      const seen = offer.offer.price;
      // 승인받는 화면에 판매처와 가격을 함께 보여준다. 나중에 가격이 달라졌는지는 이 가격과 비교한다.
      const clabel = tag({
        ko: `담기: ${name(pick).ko}${szTag ? ` ${szTag}` : ''}, ${seller.name.ko}, ${won(seen).ko}`,
        en: `Add: ${name(pick).en}${szTag ? ` ${szTag}` : ''}, ${seller.name.en}, ${won(seen).en}`,
      });
      const offerInfo = { sellerId: seller.id, size, price: seen, shipping: offer.shipping, arriveAt: offer.arriveAt };
      this.emit({ type: 'tool_call', id: tid, tool: 'cart_add', label: clabel, status: gated ? 'awaiting-approval' : 'running', itemIds: [pick.product.id], offer: offerInfo });
      if (gated) {
        const a = await this.wait();
        if (!ok()) return 'end';
        if (a === 'reject') {
          const stopMsg: L = { ko: '담기를 승인하지 않아 중단했어요.', en: 'Add-to-cart not approved — stopped.' };
          // 거절한 담기는 승인 대기로 남지 않게 기록을 닫는다
          this.emit({ type: 'tool_call', id: tid, tool: 'cart_add', label: clabel, status: 'failed', itemIds: [pick.product.id], note: { ko: '담지 않기로 했어요', en: 'You chose not to add it' } });
          if (round0 >= 2) { this.finish('cancelled', stopMsg); return 'end'; }
          // 거절을 중단으로 끝내지 않고, 어디가 아쉬웠는지 물어 조건을 고쳐 다시 찾는다
          const p = pick.product;
          this.emit({
            type: 'needs_input', id: `q-why${round0 + 1}${sfx}`,
            question: { ko: `${name(pick).ko}은(는) 담지 않을게요. 어떤 점이 아쉬웠나요? 그 조건을 반영해 다시 찾아볼게요.`, en: `Okay, not adding ${name(pick).en}. What was off? I'll search again with that in mind.` },
            options: [
              { id: 'price', label: { ko: '너무 비싸요', en: 'Too expensive' } },
              { id: 'brand', label: { ko: `${p.brand} 말고 다른 브랜드`, en: `Not ${p.brand}` } },
              { id: 'color', label: { ko: `${p.colors.map((c) => COLOR_L[c].ko).join('·')} 말고 다른 색`, en: `Not ${p.colors.map((c) => COLOR_L[c].en).join('/')}` } },
              { id: 'cancel', label: { ko: '그만두기', en: 'Stop' } },
            ],
          });
          const why = await this.wait();
          if (!ok()) return 'end';
          if (!['price', 'brand', 'color'].includes(why)) { this.finish('cancelled', stopMsg); return 'end'; }
          excluded.ids.add(p.id);
          if (why === 'price') criteria = { ...criteria, maxPrice: Math.floor((seen * 0.85) / 1000) * 1000 };
          if (why === 'brand') excluded.brands.add(p.brand);
          if (why === 'color') p.colors.forEach((c) => excluded.colors.add(c));
          if (!ctx.multi) {
            const extra = [
              ...(excluded.brands.size ? [{ label: { ko: '제외 브랜드', en: 'Excluded brand' }, value: { ko: [...excluded.brands].join(' · '), en: [...excluded.brands].join(' · ') } }] : []),
              ...(excluded.colors.size ? [{ label: { ko: '제외 색상', en: 'Excluded color' }, value: { ko: [...excluded.colors].map((c) => COLOR_L[c].ko).join(' · '), en: [...excluded.colors].map((c) => COLOR_L[c].en).join(' · ') } }] : []),
            ];
            this.emit({ type: 'understood', chips: [...this.chipsOf(criteria), ...extra], unknown: [] });
          }
          continue redo;
        }
      }
      await d(600);
      if (!ok()) return 'end';
      // 승인받은 가격과 지금 가격이 다르면 담지 않고 다시 묻는다 (사람이 승인한 내용이 낡았다)
      const now = this.store.getOffer(pick.product.id, seller.id)?.price ?? seen;
      if (gated && now !== seen) {
        this.emit({
          type: 'tool_call', id: tid, tool: 'cart_add', label: clabel, status: 'failed', itemIds: [pick.product.id],
          note: { ko: `승인하신 ${won(seen).ko}에서 ${won(now).ko}로 바뀌어 담지 않았어요`, en: `Price changed from ${won(seen).en} to ${won(now).en} after your approval — not added` },
        });
        this.emit({
          type: 'needs_input', id: `q-stale${attempt}${sfx}`,
          question: {
            ko: `승인하신 뒤 가격이 바뀌었어요. ${won(seen).ko} → ${won(now).ko}. 새 가격으로 담을까요?`,
            en: `The price changed after you approved: ${won(seen).en} → ${won(now).en}. Add at the new price?`,
          },
          options: [
            { id: 'accept', label: { ko: `${won(now).ko}으로 담기`, en: `Add at ${won(now).en}` } },
            { id: 'skip', label: { ko: '담지 않기', en: "Don't add" } },
          ],
        });
        const a = await this.wait();
        if (!ok()) return 'end';
        if (a !== 'accept') {
          if (ctx.multi) return 'skipped';
          this.finish('cancelled', { ko: '가격이 바뀌어 담지 않았어요. 아무것도 담기지 않았어요.', en: 'Price changed, so nothing was added.' });
          return 'end';
        }
      }

      const res = this.store.addToCart(pick.product.id, 'agent', size, seller.id);
      if (res.ok) {
        this.lines.set(tid, pick.product.id);
        this.emit({ type: 'tool_call', id: tid, tool: 'cart_add', label: clabel, status: 'done', itemIds: [pick.product.id], undoable: true, offer: { ...offerInfo, price: now } });
        return 'added';
      }
      // 이 판매처에서만 막 팔렸으면 판매처부터 다시 고르고, 이 사이즈가 다 팔렸으면 사이즈부터 다시 묻는다
      const left = this.store.availableSizes(pick.product.id);
      const elsewhere = left.includes(size);
      this.emit({
        type: 'tool_call', id: tid, tool: 'cart_add', label: clabel, status: 'failed', itemIds: [pick.product.id],
        note: elsewhere
          ? { ko: `담는 시점에 ${seller.name.ko}에서 품절됐어요. 다른 판매처를 볼게요`, en: `Sold out at ${seller.name.en} at the moment of adding. Checking other sellers` }
          : left.length > 0
            ? { ko: `담는 시점에 ${szTag || '이 사이즈'}가 품절로 확인됐어요`, en: `Size ${szTag || ''} sold out at the moment of adding` }
            : { ko: '담는 시점에 품절로 확인됐어요', en: 'Found sold out at the moment of adding' },
      });
      if (elsewhere && !forced) continue;
      if (left.length > 0 && !forced) { delete this.sizeMemo[kind]; continue; }
      const r = await this.altFlow(id, pick, eligible, `${attempt}${sfx}`, ctx, { ko: '품절이에요', en: 'just sold out' });
      if (r === 'end' || r === 'skipped') return r;
      pick = r;
    }
    }
  }

  /** 국내 판매처 중 지금 담으면 드는 최저 총액(배송비 포함). 재고가 없으면 표시가. */
  private landed(pid: string): number {
    const r = this.store.rankOffers(pid).find((x) => !x.seller.overseas);
    return r?.landed ?? this.store.getProduct(pid)?.price ?? 0;
  }

  /** 판매처가 3곳 이상으로 나뉘면, 한 곳으로 모을 수 있는지 본다. 모을 수 있는 판매처와 늘어나는 금액을 돌려준다. */
  private mergeOption(): { sellerId: string; diff: number } | null {
    const cart = this.store.getState().cart;
    const before = this.store.cartTotal();
    let best: { sellerId: string; diff: number } | null = null;
    for (const s of Object.values(SELLERS)) {
      if (s.overseas) continue;
      const offers = cart.map((l) => this.store.getOffer(l.productId, s.id));
      if (offers.some((o, i) => !o || (o.sizes[cart[i].size] ?? 0) < cart[i].qty)) continue;
      const sub = offers.reduce((a, o, i) => a + o!.price * cart[i].qty, 0);
      const total = sub + (s.freeOver !== undefined && sub >= s.freeOver ? 0 : s.fee);
      const diff = total - before;
      if (!best || diff < best.diff) best = { sellerId: s.id, diff };
    }
    return best;
  }

  /** 왜 이 판매처인지 한 줄로. 표시가 최저와 총액 최저가 다르거나, 해외직구를 뺐으면 그 이유를 말한다. */
  private whyOffer(chosen: Ranked, ranked: Ranked[], c: Criteria): L {
    const now = this.store.now();
    const when = arrivalLabel(chosen.arriveAt, now);
    const ship: L = chosen.shipping <= 0 ? { ko: '무료배송', en: 'free shipping' } : { ko: `배송비 ${won(chosen.shipping).ko}`, en: `${won(chosen.shipping).en} shipping` };
    const domestic = ranked.filter((r) => !r.seller.overseas);
    const parts: L[] = [];
    const sticker = [...domestic].sort((a, b) => a.offer.price - b.offer.price)[0];
    if (sticker && sticker.offer.sellerId !== chosen.offer.sellerId && sticker.offer.price < chosen.offer.price && sticker.landed > chosen.landed) {
      parts.push({
        ko: `표시가는 ${sticker.seller.name.ko}가 ${won(sticker.offer.price).ko}로 가장 낮지만, 배송비를 더하면 ${chosen.seller.name.ko}가 ${won(sticker.landed - chosen.landed).ko} 덜 들어요`,
        en: `${sticker.seller.name.en} lists the lowest price (${won(sticker.offer.price).en}), but with shipping ${chosen.seller.name.en} costs ${won(sticker.landed - chosen.landed).en} less`,
      });
    } else if (c.deliverBy && domestic[0] && domestic[0].offer.sellerId !== chosen.offer.sellerId) {
      const dl = deadlineL(c.deliverBy);
      parts.push({ ko: `${dl.ko} 오는 곳 중 총액이 가장 낮아요`, en: `Lowest total among sellers delivering ${dl.en}` });
    } else if (domestic.length === 1) {
      parts.push({ ko: `이 사이즈는 국내에서 ${chosen.seller.name.ko}에만 있어요`, en: `Only ${chosen.seller.name.en} has this size domestically` });
    } else {
      parts.push({ ko: `${domestic.length}곳 중 배송비 포함 총액이 가장 낮아요`, en: `Lowest total with shipping of ${domestic.length}` });
    }
    parts.push({ ko: `${chosen.seller.name.ko}, ${won(chosen.landed).ko}, ${ship.ko}, ${when.ko}`, en: `${chosen.seller.name.en}, ${won(chosen.landed).en}, ${ship.en}, ${when.en.toLowerCase()}` });
    const ab = ranked.find((r) => r.seller.overseas);
    if (ab && ab.landed < chosen.landed) {
      parts.push({ ko: `해외직구는 ${won(chosen.landed - ab.landed).ko} 싸지만 도착이 늦고 반품이 안 돼 뺐어요`, en: `Overseas is ${won(chosen.landed - ab.landed).en} cheaper but slow and non-returnable, so it was left out` });
    }
    return { ko: parts.map((x) => x.ko).join('. '), en: parts.map((x) => x.en).join('. ') };
  }

  /** 담을 수 없을 때: 남은 대안 중에서 고르게 한다. 고른 상품을 돌려주고, 대안이 없거나 중단이면 end/skipped. */
  private async altFlow(id: number, pick: Scored, eligible: Scored[], key: string, ctx: Ctx, why: L): Promise<Scored | 'end' | 'skipped'> {
    const alts = eligible.filter((s) => s.product.id !== pick.product.id && this.store.availableSizes(s.product.id).length > 0).slice(0, 2);
    if (alts.length === 0) {
      if (ctx.multi) return 'skipped';
      this.finish('failed', { ko: '품절이고 대안도 없어요.', en: 'Sold out and no alternatives.' });
      return 'end';
    }
    this.emit({
      type: 'needs_input', id: `q-alt${key}`,
      question: { ko: `${name(pick).ko}은(는) ${why.ko}. 대안으로 진행할까요?`, en: `${name(pick).en} is ${why.en}. Proceed with an alternative?` },
      options: [...alts.map((s) => ({ id: s.product.id, label: priced(s) })), { id: 'stop', label: { ko: '여기서 중단', en: 'Stop here' } }],
    });
    const a = await this.wait();
    if (!this.alive(id)) return 'end';
    const alt = alts.find((s) => s.product.id === a);
    if (!alt) {
      this.finish('cancelled', { ko: '요청에 따라 중단했어요. 담은 항목은 없어요.', en: 'Stopped as requested. Nothing was added.' });
      return 'end';
    }
    return alt;
  }
}
