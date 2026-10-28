import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { RuleAgent } from './agent/agent';
import { llmInterpreter } from './agent/interpret';
import { simulatedGateway, tossGateway } from './pay/gateway';
import type { Dial, L, Lang } from './engine/types';
import { initialState, reduce } from './state/console';
import type { Action, Choice } from './state/console';
import { appendFrame, baseline, viewAt } from './state/timeline';
import type { Frame } from './state/timeline';
import { parseRequest } from './store/parser';
import { searchProducts } from './store/search';
import { createMarket } from './store/market';
import { sellerOf } from './store/sellers';
import { createStore } from './store/store';
import type { Category } from './store/types';
import { AgentPanel } from './ui/AgentPanel';
import { Compare } from './ui/Compare';
import { CartDrawer, type DrawerTab } from './ui/CartDrawer';
import { C, SV, money, t } from './ui/copy';
import { Toasts, useToasts } from './ui/Toasts';
import { Wordmark } from './ui/Wordmark';
import { OfferSheet, Shop } from './ui/Shop';
import type { Config } from './ui/Setup';
import { ThemeButton } from './ui/ThemeButton';
import { saveSizes } from './ui/SizeProfile';
import { saveStyle } from './ui/StyleProfile';
import { useStore } from './ui/useStore';
import { ReviewCtx, ReviewToggle } from './ui/Review';
import { StudyBar } from './ui/Study';
import { bumped, studyId } from './study/study';
import { checkWatch, decide, describe as describeWatch, scriptedDay, simulateDay, type Verdict, type Watch } from './agent/watch';
import { WatchList, WatchSetup, type WatchState } from './ui/Watch';

interface AppProps {
  lang: Lang;
  onLang: (l: Lang) => void;
  theme: 'dark' | 'light';
  onTheme: () => void;
  initial: Config;
}

export default function App({ lang, onLang, theme, onTheme, initial }: AppProps) {
  const store = useMemo(() => createStore(), []);
  const langRef = useRef(lang);
  langRef.current = lang;
  // 요청 해석은 서버의 Claude를 먼저 쓰고, 키가 없거나 실패하면 규칙 파서로 한다.
  // 결제는 토스 테스트 결제창으로 받고, 키가 없거나 사용성 테스트 모드면 시뮬레이션으로 한다.
  const agent = useMemo(() => new RuleAgent(store, undefined, llmInterpreter(),
    studyId(location.hash) ? simulatedGateway : tossGateway({ lang: () => langRef.current })), [store]);
  const market = useMemo(() => createMarket(store), [store]);
  const shop = useStore(store);
  const [state, dispatch] = useReducer(reduce, initialState);

  // 감사 타임라인: 모든 액션(에이전트·사람)을 그 시점의 store 스냅샷과 함께 기록
  const snap = useCallback(() => {
    const s = store.getState();
    return { cart: s.cart, products: s.products, orders: s.orders.length };
  }, [store]);
  const [frames, setFrames] = useState<Frame[]>(() => [baseline(performance.now(), snap())]);
  const [cursor, setCursor] = useState<number | null>(null);
  const emit = useCallback((action: Action, actor: Frame['actor'] = 'agent') => {
    dispatch(action);
    const sn = snap();
    setFrames((f) => appendFrame(f, { at: performance.now(), action, actor, ...sn }));
    if (action.type === 'reset') setCursor(null);
  }, [snap]);
  const note = useCallback((label: L) => {
    const sn = snap();
    setFrames((f) => appendFrame(f, { at: performance.now(), action: null, actor: 'user', label, ...sn }));
  }, [snap]);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('cart');
  const [sheet, setSheet] = useState<string | null>(null);
  const [asked, setAsked] = useState<string | null>(null);

  const [request, setRequest] = useState('');
  const [dial, setDial] = useState(initial.dial);
  const [limit, setLimit] = useState(initial.limit);
  const [sizes, setSizes] = useState(initial.sizes);
  useEffect(() => { saveSizes(sizes); }, [sizes]);
  const [style, setStyle] = useState(initial.style);
  useEffect(() => { saveStyle(style); }, [style]);
  const [cmpClosed, setCmpClosed] = useState(false);
  // 설계 보기(리뷰 모드)와 사용성 테스트 모드는 주소로 켤 수 있다: #/app?review=1, #/app?study=P01
  const [review, setReview] = useState(() => /[?&]review=1/.test(location.hash));
  const [pid] = useState(() => studyId(location.hash));
  // 사용성 테스트에서는 '과제 시작' 전에 요청을 받지 않는다 (다른 자율도로 돌고 기록도 남지 않으므로)
  const [studyLive, setStudyLive] = useState(false);
  const toasts = useToasts();
  const pushToast = toasts.push;
  const openCart = useCallback(() => { setDrawerTab('cart'); setCartOpen(true); }, []);

  const { phase } = state;
  const running = !['idle', 'done', 'failed', 'cancelled', 'undone'].includes(phase);

  // 되감기 중이면 그 시점을 이벤트 로그 fold로 복원해 보여준다 (읽기 전용)
  const replaying = cursor !== null && cursor < frames.length - 1;
  const view = useMemo(() => (replaying ? viewAt(frames, cursor) : null), [replaying, frames, cursor]);
  const vState = view?.console ?? state;
  const vCart = view?.cart ?? shop.cart;
  const vProducts = view?.products ?? shop.products;
  const cartCount = vCart.reduce((s, l) => s + l.qty, 0);
  const cartIds = useMemo(() => new Set(vCart.map((l) => l.productId)), [vCart]);

  // 같은 쇼핑몰에서 다른 구매자·판매처가 움직인다. 보고 있는 상품(후보·장바구니)에 더 몰린다.
  useEffect(() => { window.scrollTo(0, 0); }, []);
  // 사용성 테스트 중에는 우연한 시장 변화가 과제마다 달라지지 않도록 시장을 멈춘다 (가격 변경은 정해진 지점에서 한 번만)
  useEffect(() => { if (pid) return; market.start(); return () => market.stop(); }, [market, pid]);
  useEffect(() => { market.setBusy(running); }, [market, running]);
  useEffect(() => {
    market.setInterest([...new Set([...state.candidates, ...shop.cart.map((l) => l.productId)])]);
  }, [market, state.candidates, shop.cart]);

  // 사람의 검색도 에이전트와 같은 해석·점수화를 쓴다
  const criteria = useMemo(() => (query.trim() ? parseRequest(query) : null), [query]);
  const results = useMemo(() => {
    const all = Object.values(vProducts);
    if (criteria) return searchProducts(all, criteria).filter((s) => s.score > 0);
    const list = category ? all.filter((p) => p.category === category) : all;
    return list.map((product) => ({ product, score: 1, matched: [], partial: [], missed: [] }));
  }, [vProducts, criteria, category]);


  const run = useCallback(() => {
    setCmpClosed(false);
    emit({ type: 'start' }, 'user');
    setAsked(request);
    setRequest('');
    agent.start({ request, dial, limit, sizes, style }, (event) => {
      emit({ type: 'event', event });
      // 에이전트가 실제로 담은 순간을 사람이 놓치지 않게 알린다
      if (event.type === 'tool_call' && event.tool === 'cart_add' && event.status === 'done' && event.undoable && event.itemIds?.[0]) {
        const pid = event.itemIds[0];
        const p = store.getProduct(pid);
        const o = event.offer;
        pushToast({
          tone: 'ok', pid, title: t(SV.agentAdded, lang),
          sub: p ? `${t(p.name, lang)}${o && o.size !== 'FREE' ? ` ${o.size}` : ''}${o ? `, ${t(sellerOf(o.sellerId).name, lang)}, ${money(o.price, lang)}` : ''}` : undefined,
          action: { label: t(SV.viewCart, lang), run: openCart },
        });
      }
    });
  }, [agent, request, dial, limit, sizes, style, emit, store, pushToast, lang, openCart]);

  const reset = useCallback(() => {
    agent.stop();
    store.reset();
    market.rebase();
    emit({ type: 'reset' }, 'user');
    setAsked(null);
  }, [agent, store, market, emit]);

  // 가격 대기: 사람이 자리에 없을 때를 다루므로 시연용 시계로 하루씩 넘긴다
  const [watches, setWatches] = useState<WatchState[]>([]);
  const watchRef = useRef<WatchState[]>([]);
  const putWatches = useCallback((next: WatchState[]) => { watchRef.current = next; setWatches(next); }, []);
  const [watchFor, setWatchFor] = useState<{ id: string; size: string } | null>(null);
  const evaluate = useCallback((cur: WatchState, day: number): WatchState => {
    const v = checkWatch(cur.w, store, day);
    const p = store.getProduct(cur.w.productId);
    const pname = p ? t(p.name, lang) : '';
    const best = (x: Verdict) => (x.kind === 'wait' ? x.best : x.kind === 'expired' ? null : x.total);
    let next: WatchState = { ...cur, day, trail: [...cur.trail, best(v)] };
    const line = (tone: WatchState['log'][number]['tone'], text: L) => { next = { ...next, log: [...next.log, { day, text, tone }] }; };
    switch (decide(cur.w, v)) {
      case 'wait': line('wait', describeWatch(v, cur.w, day)); break;
      case 'hold': {
        line('hold', describeWatch(v, cur.w, day));
        const prev = cur.log[cur.log.length - 1];
        if (prev?.tone !== 'hold') pushToast({ tone: 'warn', pid: cur.w.productId, title: lang === 'ko' ? '가격은 내려왔지만 사지 않았어요' : 'Price dropped, but not bought', sub: t(describeWatch(v, cur.w, day), lang) });
        break;
      }
      case 'expire': line('end', describeWatch(v, cur.w, day)); next = { ...next, status: 'expired', auto: false }; break;
      case 'ask': {
        if (v.kind !== 'match') break;
        line('ok', describeWatch(v, cur.w, day));
        next = { ...next, status: 'asked', auto: false, pending: v };
        pushToast({ tone: 'ok', pid: cur.w.productId, title: lang === 'ko' ? '조건이 맞았어요. 결제할까요?' : 'Everything fits. Pay now?', sub: `${pname}, ${money(v.total, lang)}` });
        note({ ko: `가격 대기 조건 충족, 결제 승인 요청: ${p?.name.ko ?? ''}`, en: `Price watch matched, asking to pay: ${p?.name.en ?? ''}` });
        break;
      }
      case 'buy': {
        if (v.kind !== 'match') break;
        const order = store.buyNow(cur.w.productId, cur.w.size, v.sellerId, 'agent', cur.w.id);
        if (!order) { line('hold', { ko: `${day}일째: 결제 직전에 재고가 빠져 사지 않았어요.`, en: `Day ${day}: stock ran out right before paying; nothing bought.` }); break; }
        line('ok', describeWatch(v, cur.w, day));
        line('ok', { ko: `미리 승인한 조건으로 결제했어요. 주문 ${order.id}`, en: `Paid under your preset terms. Order ${order.id}` });
        next = { ...next, status: 'bought', auto: false, orderId: order.id };
        pushToast({ tone: 'ok', pid: cur.w.productId, title: lang === 'ko' ? '자리에 없는 동안 샀어요' : 'Bought while you were away', sub: `${pname}, ${t(sellerOf(v.sellerId).name, lang)}, ${money(v.total, lang)}`, action: { label: t(SV.ordersTab, lang), run: () => { setDrawerTab('orders'); setCartOpen(true); } } });
        note({ ko: `가격 대기 사전 승인으로 결제: ${p?.name.ko ?? ''} ${order.total.toLocaleString('ko-KR')}원`, en: `Paid by price-watch pre-approval: ${p?.name.en ?? ''}` });
        break;
      }
    }
    return next;
  }, [store, lang, pushToast, note]);
  const patchWatch = useCallback((id: string, fn: (s: WatchState) => WatchState) => {
    putWatches(watchRef.current.map((s) => (s.w.id === id ? fn(s) : s)));
  }, [putWatches]);
  // 사용성 테스트의 가격 대기 과제는 참가자마다 같은 흐름을 보도록 고정된 가격 변화를 쓴다
  const scripted = useRef(false);
  const advanceWatch = useCallback((id: string) => patchWatch(id, (cur) => {
    if (cur.status !== 'watching') return cur;
    if (scripted.current) scriptedDay(store, cur.w, cur.day + 1);
    else simulateDay(store, cur.w, cur.seed, cur.day + 1);
    return evaluate(cur, cur.day + 1);
  }), [patchWatch, evaluate, store]);
  const startWatch = (spec: Omit<Watch, 'id'>) => {
    const w: Watch = { ...spec, id: `w${Date.now().toString(36)}` };
    const p = store.getProduct(w.productId);
    note({ ko: `가격 대기 시작: ${p?.name.ko ?? ''}, 배송비 포함 ${w.maxTotal.toLocaleString('ko-KR')}원 이하${w.preapproved ? ', 사전 승인' : ''}`, en: `Price watch started: ${p?.name.en ?? ''}` });
    const first = evaluate({ w, day: 0, seed: Math.floor(Math.random() * 1e6), status: 'watching', auto: false, trail: [], log: [] }, 0);
    putWatches([first, ...watchRef.current]);
    setWatchFor(null);
    setSheet(null);
  };
  const payWatch = (id: string) => patchWatch(id, (cur) => {
    // 묻는 사이 조건이 바뀌었으면 그 승인은 낡았다 (R4)
    const v = checkWatch(cur.w, store, cur.day);
    const order = v.kind === 'match' ? store.buyNow(cur.w.productId, cur.w.size, v.sellerId, 'user', cur.w.id) : null;
    if (!order) return { ...cur, status: 'watching', pending: undefined, log: [...cur.log, { day: cur.day, tone: 'hold', text: { ko: '묻는 사이 조건이 바뀌어 사지 않았어요. 계속 기다려요.', en: 'Terms changed while asking, so nothing was bought. Still waiting.' } }] };
    note({ ko: `가격 대기 결제 승인: 주문 ${order.id}`, en: `Approved price-watch payment: order ${order.id}` });
    return { ...cur, status: 'bought', pending: undefined, orderId: order.id, log: [...cur.log, { day: cur.day, tone: 'ok', text: { ko: `승인하신 대로 결제했어요. 주문 ${order.id}`, en: `Paid as you approved. Order ${order.id}` } }] };
  });
  const endWatch = (id: string) => patchWatch(id, (cur) => ({ ...cur, status: 'cancelled', auto: false, pending: undefined, log: [...cur.log, { day: cur.day, tone: 'end', text: { ko: '그만 기다리기로 했어요. 아무것도 사지 않았어요.', en: 'Stopped waiting. Nothing bought.' } }] }));
  useEffect(() => {
    if (!watches.some((s) => s.auto && s.status === 'watching')) return;
    const timer = window.setInterval(() => {
      watchRef.current.filter((s) => s.auto && s.status === 'watching').forEach((s) => advanceWatch(s.w.id));
    }, 420);
    return () => window.clearInterval(timer);
  }, [watches, advanceWatch]);

  const beginTask = useCallback((d: Dial | null, task: string) => {
    reset();
    if (d) setDial(d);
    scripted.current = task === 'T4';
    putWatches([]);
    setWatchFor(null);
    setCartOpen(false);
    setSheet(null);
  }, [reset, putWatches]);
  const inject = useCallback(() => {
    const line = store.getState().cart[0];
    const o = line && store.getOffer(line.productId, line.sellerId);
    if (!line || !o) return false;
    store.setPrice(line.productId, bumped(o.price), line.sellerId);
    return true;
  }, [store]);

  const closeDrawer = useCallback(() => setCartOpen(false), []);
  const closeSheet = useCallback(() => setSheet(null), []);
  const ack = (fn: () => void, choice?: Choice) => () => { emit({ type: 'user_ack', choice }, 'user'); fn(); };
  // 담기는 판매처 재고를 확인하고 잡아두는 동안 잠깐 기다린다
  const [adding, setAdding] = useState<string | null>(null);
  const userAdd = (id: string, size: string, sellerId?: string) => {
    if (adding) return;
    setAdding(id);
    window.setTimeout(() => { setAdding(null); commitAdd(id, size, sellerId); }, 650 + Math.random() * 350);
  };
  const commitAdd = (id: string, size: string, sellerId?: string) => {
    const p = store.getProduct(id);
    const tag = size === 'FREE' ? '' : ` ${size}`;
    const r = store.addToCart(id, 'user', size, sellerId);
    if (!p) return;
    if (!r.ok) {
      pushToast({ tone: 'err', pid: id, title: t(SV.addFail[r.reason], lang), sub: t(p.name, lang) });
      return;
    }
    const s = sellerOf(r.line.sellerId).name;
    note({ ko: `직접 담기: ${p.name.ko}${tag}, ${s.ko}`, en: `Added by you: ${p.name.en}${tag}, ${s.en}` });
    pushToast({
      tone: 'ok', pid: id, title: t(SV.added, lang),
      sub: `${t(p.name, lang)}${tag}, ${t(s, lang)}, ${money(r.line.priceAtAdd, lang)}${r.line.qty > 1 ? `, ${r.line.qty}${lang === 'ko' ? '개' : ' pcs'}` : ''}`,
      action: { label: t(C.undo, lang), run: () => { store.setQty(id, r.line.qty - 1); note({ ko: `담기 되돌림: ${p.name.ko}`, en: `Undid add: ${p.name.en}` }); } },
    });
  };
  const userQty = (id: string, qty: number) => {
    const p = store.getProduct(id);
    const got = store.setQty(id, qty);
    if (got < qty) pushToast({ tone: 'warn', pid: id, title: t(SV.qtyMax, lang), sub: p ? t(p.name, lang) : undefined });
    if (got === 0 && p) note({ ko: `직접 빼기: ${p.name.ko}`, en: `Removed by you: ${p.name.en}` });
  };
  const userRemove = (id: string) => {
    const p = store.getProduct(id);
    const line = store.getState().cart.find((l) => l.productId === id);
    store.removeFromCart(id);
    if (!p || !line) return;
    note({ ko: `직접 빼기: ${p.name.ko}`, en: `Removed by you: ${p.name.en}` });
    pushToast({
      tone: 'ok', pid: id, title: t(SV.removed, lang), sub: t(p.name, lang),
      action: { label: t(C.undo, lang), run: () => { if (store.addToCart(id, line.addedBy, line.size, line.sellerId).ok) store.setQty(id, line.qty); } },
    });
  };
  const userCheckout = () => {
    const made = store.checkout('user');
    if (made) note({ ko: `직접 결제: 주문 ${made.length}건`, en: `You paid: ${made.length} order${made.length > 1 ? 's' : ''}` });
    return made;
  };

  // 담아 둔 상품의 판매처 가격이 바뀌면 알린다 (결제 전에 사람이 알아야 하는 변화)
  useEffect(() => market.subscribe(() => {
    const e = market.feed()[0];
    if (!e || e.kind !== 'reprice') return;
    const line = store.getState().cart.find((l) => l.productId === e.productId && l.sellerId === e.sellerId);
    const p = store.getProduct(e.productId);
    if (!line || !p) return;
    pushToast({
      tone: 'warn', pid: p.id, title: t(SV.priceMoved, lang),
      sub: SV.changedPrice[lang](t(p.name, lang), money(line.priceAtAdd, lang), money(e.to, lang)),
      action: { label: t(SV.viewCart, lang), run: openCart },
    });
  }), [market, store, pushToast, lang, openCart]);

  return (
    <ReviewCtx.Provider value={review}>
      <header className={`top ${replaying ? 'replay' : ''}`}>
        <a className="logo" href="#/" aria-label={t(C.brand, lang)}><Wordmark size={26} phase={phase === 'planning' || phase === 'executing' ? 'busy' : phase === 'done' ? 'done' : 'idle'} /></a>
        <input
          className="search" type="search" value={query} placeholder={t(C.searchPh, lang)}
          aria-label={t(C.searchPh, lang)} onChange={(e) => setQuery(e.target.value)}
        />
        <div className="top-r">
          <button className="top-btn" onClick={() => { setDrawerTab('orders'); setCartOpen(true); }}>{t(SV.ordersTab, lang)}{shop.orders.length > 0 && <span className="cnt">{shop.orders.length}</span>}</button>
          <button className="top-btn" data-cart-btn onClick={() => { setDrawerTab('cart'); setCartOpen(true); }}>{t(C.cart, lang)}{cartCount > 0 && <span className="cnt">{cartCount}</span>}</button>
          <ReviewToggle on={review} onToggle={() => setReview((v) => !v)} lang={lang} />
          <ThemeButton theme={theme} onToggle={onTheme} lang={lang} />
          <div className="lang" role="group" aria-label="language">
            <button aria-pressed={lang === 'ko'} onClick={() => onLang('ko')}>KO</button>
            <button aria-pressed={lang === 'en'} onClick={() => onLang('en')}>EN</button>
          </div>
        </div>
      </header>

      {pid && <StudyBar pid={pid} lang={lang} frames={frames} phase={state.phase} onBegin={beginTask} watches={watches} onInject={inject} onLive={setStudyLive} />}

      <main className="layout">
        <Shop
          lang={lang} results={results} criteria={criteria} category={category} onCategory={setCategory}
          cart={vCart} agent={vState} adding={adding} onAdd={userAdd} onQty={userQty} onOpen={setSheet} readOnly={replaying} market={market} store={store}
        />
        <AgentPanel
          lang={lang} store={store} state={vState} cartIds={cartIds}
          readOnly={replaying} frames={frames} cursor={cursor} onCursor={setCursor}
          asked={asked} dial={dial} limit={limit} sizes={sizes} onSizes={setSizes} style={style} onStyle={setStyle} running={running}
          request={request} onRequest={setRequest} onRun={run} onCompare={() => setCmpClosed(false)} onOpen={setSheet}
          onDial={setDial} onLimit={setLimit}
          onReset={reset} onOrders={() => { setDrawerTab('orders'); setCartOpen(true); }}
          onApprove={ack(() => agent.approve(), 'approve')} onReview={ack(() => agent.approve(), 'review')} onReject={ack(() => agent.reject(), 'reject')} onAnswer={(id) => ack(() => agent.answer(id), { option: id })()}
          onUndo={(id) => agent.undo(id)}
          watching={watches.filter((w) => w.status === 'watching' || w.status === 'asked').length}
          locked={pid && !studyLive ? { ko: "위쪽 띠에서 '과제 시작'을 먼저 눌러 주세요", en: 'Press "Start task" in the bar above first' } : undefined}
          top={<WatchList lang={lang} store={store} watches={watches} onDay={advanceWatch} onRun={(id) => patchWatch(id, (s) => ({ ...s, auto: true }))} onStop={endWatch} onPay={payWatch} onSkip={endWatch} onOrders={() => { setDrawerTab('orders'); setCartOpen(true); }} />}
        />
      </main>

      {!replaying && !cmpClosed && state.phase === 'needs-input' && state.question?.id.startsWith('q-pick') && (
        <Compare
          lang={lang} store={store} state={state}
          onPick={(id) => ack(() => agent.answer(id), { option: id })()} onClose={() => setCmpClosed(true)}
        />
      )}

      <CartDrawer
        lang={lang} open={cartOpen} tab={drawerTab} onTab={setDrawerTab} now={store.now()}
        state={replaying ? { ...shop, products: vProducts, cart: vCart } : shop} readOnly={replaying} onClose={closeDrawer}
        onRemove={userRemove} onQty={userQty} onCheckout={userCheckout} onRefresh={() => store.refreshCart()}
        issues={replaying ? [] : store.cartIssues()} onOrders={() => setDrawerTab('orders')}
      />

      <Toasts items={toasts.items} drop={toasts.drop} closeLabel={t(C.close, lang)} />

      {sheet && (
        <OfferSheet
          id={sheet} lang={lang} store={store} cart={shop.cart} adding={adding}
          onAdd={(id, size, sid) => userAdd(id, size, sid)} onClose={closeSheet} onWatch={(id, size) => { setSheet(null); setWatchFor({ id, size }); }}
        />
      )}

      {watchFor && <WatchSetup lang={lang} store={store} productId={watchFor.id} size={watchFor.size} onStart={startWatch} onClose={() => setWatchFor(null)} />}
    </ReviewCtx.Provider>
  );
}
