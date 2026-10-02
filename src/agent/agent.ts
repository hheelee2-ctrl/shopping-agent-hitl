import type { AgentAdapter, AgentEvent, L, Level, PlanStep, RunOptions } from '../engine/types';
import { CATEGORY_L, COLOR_L } from '../store/labels';
import { describeCriteria, parseMulti } from '../store/parser';
import { isEligible, reasonOf, searchProducts, type Scored } from '../store/search';
import type { Store } from '../store/store';
import type { Category, Color, Criteria } from '../store/types';

type Delay = (ms: number) => Promise<void>;
const realDelay: Delay = (ms) => new Promise((r) => setTimeout(r, ms));

/** 확신도 임계값. 점수는 search.ts에서 계산된 조건 일치도. */
const HIGH = 0.9;
const MEDIUM = 0.6;
/** 1·2위 점수 차이가 이보다 작으면 사람이 고르게 한다. */
const TIE_GAP = 0.1;

const CAT_KEYS = Object.keys(CATEGORY_L) as Category[];
const name = (s: Scored) => s.product.name;
const won = (n: number): L => ({ ko: `${n.toLocaleString('ko-KR')}원`, en: `KRW ${n.toLocaleString('en-US')}` });

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
  private stockoutDone = false;
  private priceChangeDone = false;
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
    this.priceChangeDone = false;
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

  /** 항목별 조건을 사람이 확인할 칩으로 보여준다. 한 개면 기존 칩 그대로, 여러 개면 항목 단위로 묶는다. */
  private announce(items: Criteria[], budget?: number) {
    if (items.length === 1) return this.emit({ type: 'understood', chips: describeCriteria(items[0]), unknown: items[0].unknown });
    const chips = items.map((c, i) => {
      const ds = describeCriteria(c);
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
      // 1) 해석하지 못한 표현이 있으면 멈춘다
      if (criteria.unknown.length > 0) {
        this.emit({
          type: 'needs_input', id: `q-unknown${sfx}`,
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

  /** 항목 하나를 검색 → 비교 → (예산 확인) → 담기까지 진행한다. 여러 항목이면 항목 번호를 id와 라벨에 붙인다. */
  private async shop(id: number, start: Criteria, idx: number, ctx: Ctx): Promise<ShopResult> {
    const d = (ms: number) => this.delay(ms);
    const ok = () => this.alive(id);
    const { dial } = this.opts;
    const base = idx === 0 ? '' : `-i${idx + 1}`;
    const tag = (l: L): L => (ctx.multi && start.category
      ? { ko: `${l.ko} · ${CATEGORY_L[start.category].ko}`, en: `${l.en} · ${CATEGORY_L[start.category].en}` }
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
    for (let round = 1; ; round++) {
      const sid = `t-search${round}${sfx}`;
      const slabel = tag({ ko: '상품 검색', en: 'Search products' });
      this.emit({ type: 'tool_call', id: sid, tool: 'search', label: slabel, status: 'running' });
      await d(900);
      if (!ok()) return 'end';
      const inStock = Object.values(this.store.getState().products).filter(
        (p) => p.stock > 0 && !excluded.ids.has(p.id) && !excluded.brands.has(p.brand) && !p.colors.some((c) => excluded.colors.has(c)),
      );
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
        if (!ok()) return 'end';
        this.emit({ type: 'confidence', itemId: s.product.id, level: this.levelOf(s, tie), reason: reasonOf(s) });
      }
      if (eligible.length > 0) break;

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
        options: options.map((s) => ({ id: s.product.id, label: name(s) })),
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
        const price = this.store.getProduct(pick.product.id)?.price ?? pick.product.price;
        if (have + price > ctx.budget) {
          const fits = eligible
            .filter((s) => s.product.id !== pick.product.id && (this.store.getProduct(s.product.id)?.stock ?? 0) > 0)
            .filter((s) => have + (this.store.getProduct(s.product.id)?.price ?? s.product.price) <= ctx.budget!)
            .sort((a, b) => a.product.price - b.product.price)[0];
          const over = have + price - ctx.budget;
          this.emit({
            type: 'needs_input', id: `q-budget${attempt}${sfx}`,
            question: {
              ko: `${name(pick).ko}을(를) 담으면 합계가 ${won(have + price).ko}로 예산 ${won(ctx.budget).ko}보다 ${won(over).ko} 넘어요.`,
              en: `Adding ${name(pick).en} brings the total to ${won(have + price).en}, ${won(over).en} over your ${won(ctx.budget).en} budget.`,
            },
            options: [
              ...(fits ? [{ id: fits.product.id, label: { ko: `더 저렴한 ${name(fits).ko} (${won(fits.product.price).ko})`, en: `Cheaper: ${name(fits).en} (${won(fits.product.price).en})` } }] : []),
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

      const tid = `t-cart${attempt}${sfx}`;
      const seen = this.store.getProduct(pick.product.id)?.price ?? pick.product.price;
      // 승인받는 화면에 가격을 함께 보여준다. 나중에 가격이 달라졌는지는 이 가격과 비교한다.
      const clabel = tag({ ko: `장바구니에 담기 · ${name(pick).ko} · ${won(seen).ko}`, en: `Add to cart · ${name(pick).en} · ${won(seen).en}` });
      this.emit({ type: 'tool_call', id: tid, tool: 'cart_add', label: clabel, status: gated ? 'awaiting-approval' : 'running', itemIds: [pick.product.id] });
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
            this.emit({ type: 'understood', chips: [...describeCriteria(criteria), ...extra], unknown: [] });
          }
          continue redo;
        }
      }
      await d(600);
      if (!ok()) return 'end';
      if (this.opts.simulateStockout && !this.stockoutDone) {
        this.stockoutDone = true;
        this.store.setStock(pick.product.id, 0); // 다른 구매자가 마지막 재고를 가져갔다
      }
      if (this.opts.simulatePriceChange && gated && !this.priceChangeDone) {
        this.priceChangeDone = true;
        const p = this.store.getProduct(pick.product.id);
        if (p) this.store.setPrice(p.id, Math.round((p.price * 1.12) / 1000) * 1000); // 승인한 직후 판매처가 가격을 올렸다
      }

      // 승인받은 가격과 지금 가격이 다르면 담지 않고 다시 묻는다 (사람이 승인한 내용이 낡았다)
      const now = this.store.getProduct(pick.product.id)?.price ?? seen;
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

      const res = this.store.addToCart(pick.product.id, 'agent');
      if (res.ok) {
        this.lines.set(tid, pick.product.id);
        this.emit({ type: 'tool_call', id: tid, tool: 'cart_add', label: clabel, status: 'done', itemIds: [pick.product.id], undoable: true });
        return 'added';
      }
      this.emit({
        type: 'tool_call', id: tid, tool: 'cart_add', label: clabel, status: 'failed', itemIds: [pick.product.id],
        note: { ko: '담는 시점에 품절로 확인됐어요', en: 'Found sold out at the moment of adding' },
      });
      const alts = eligible.filter((s) => s.product.id !== pick.product.id && (this.store.getProduct(s.product.id)?.stock ?? 0) > 0).slice(0, 2);
      if (alts.length === 0) return give('failed', { ko: '품절이고 대안도 없어요.', en: 'Sold out and no alternatives.' });
      this.emit({
        type: 'needs_input', id: `q-alt${attempt}${sfx}`,
        question: { ko: `${name(pick).ko}이(가) 품절이에요. 대안으로 진행할까요?`, en: `${name(pick).en} just sold out. Proceed with an alternative?` },
        options: [...alts.map((s) => ({ id: s.product.id, label: name(s) })), { id: 'stop', label: { ko: '여기서 중단', en: 'Stop here' } }],
      });
      const a = await this.wait();
      if (!ok()) return 'end';
      const alt = alts.find((s) => s.product.id === a);
      if (!alt) {
        this.finish('cancelled', { ko: '요청에 따라 중단했어요. 담은 항목은 없어요.', en: 'Stopped as requested. Nothing was added.' });
        return 'end';
      }
      pick = alt;
    }
    }
  }
}
