import { useCallback, useMemo, useReducer, useState } from 'react';
import { RuleAgent } from './agent/agent';
import type { L, Lang } from './engine/types';
import { initialState, reduce } from './state/console';
import type { Action } from './state/console';
import { appendFrame, baseline, viewAt } from './state/timeline';
import type { Frame } from './state/timeline';
import { parseRequest } from './store/parser';
import { searchProducts } from './store/search';
import { createStore } from './store/store';
import type { Category } from './store/types';
import { AgentPanel } from './ui/AgentPanel';
import { Compare } from './ui/Compare';
import { Dock } from './ui/Dock';
import { CartDrawer } from './ui/CartDrawer';
import { C, PRESETS, t } from './ui/copy';
import { Mark } from './ui/Mark';
import { Shop } from './ui/Shop';
import type { Config } from './ui/Setup';
import { ThemeButton } from './ui/ThemeButton';
import { useStore } from './ui/useStore';

interface AppProps {
  lang: Lang;
  onLang: (l: Lang) => void;
  theme: 'dark' | 'light';
  onTheme: () => void;
  initial: Config;
}

export default function App({ lang, onLang, theme, onTheme, initial }: AppProps) {
  const store = useMemo(() => createStore(), []);
  const agent = useMemo(() => new RuleAgent(store), [store]);
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

  const [request, setRequest] = useState(t(PRESETS[0].text, 'ko'));
  const [dial, setDial] = useState(initial.dial);
  const [limit, setLimit] = useState(initial.limit);
  const [nod, setNod] = useState(0);
  const [cmpClosed, setCmpClosed] = useState(false);
  const [stockout, setStockout] = useState(false);
  const [priceChange, setPriceChange] = useState(false);

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
    agent.start({ request, dial, limit, simulateStockout: stockout, simulatePriceChange: priceChange }, (event) => emit({ type: 'event', event }));
  }, [agent, request, dial, limit, stockout, priceChange, emit]);

  const reset = useCallback(() => {
    agent.stop();
    store.reset();
    emit({ type: 'reset' }, 'user');
  }, [agent, store, emit]);

  const ack = (fn: () => void) => () => { emit({ type: 'user_ack' }, 'user'); setNod((n) => n + 1); fn(); };
  const userAdd = (id: string) => {
    const p = store.getProduct(id);
    if (store.addToCart(id, 'user').ok && p) note({ ko: `직접 담기 · ${p.name.ko}`, en: `Added by you · ${p.name.en}` });
  };
  const userRemove = (id: string) => {
    const p = store.getProduct(id);
    store.removeFromCart(id);
    if (p) note({ ko: `직접 빼기 · ${p.name.ko}`, en: `Removed by you · ${p.name.en}` });
  };
  const userCheckout = () => {
    if (store.checkout()) note({ ko: '직접 결제 완료(모의)', en: 'You checked out (mock)' });
  };

  return (
    <>
      <header className={`top ${replaying ? 'replay' : ''}`}>
        <a className="logo" href="#/" aria-label={t(C.brand, lang)}><Mark size={22} nod={nod} /><span>{t(C.brand, lang)}</span></a>
        <input
          className="search" type="search" value={query} placeholder={t(C.searchPh, lang)}
          aria-label={t(C.searchPh, lang)} onChange={(e) => setQuery(e.target.value)}
        />
        <div className="top-r">
          <button className="btn sm" data-cart-btn onClick={() => setCartOpen(true)}>{t(C.cart, lang)} {cartCount > 0 ? `(${cartCount})` : ''}</button>
          <ThemeButton theme={theme} onToggle={onTheme} lang={lang} />
          <div className="lang" role="group" aria-label="language">
            <button aria-pressed={lang === 'ko'} onClick={() => onLang('ko')}>KO</button>
            <button aria-pressed={lang === 'en'} onClick={() => onLang('en')}>EN</button>
          </div>
        </div>
      </header>

      <main className="layout">
        <Shop
          lang={lang} results={results} criteria={criteria} category={category} onCategory={setCategory}
          cart={vCart} agent={vState} onAdd={userAdd} readOnly={replaying}
        />
        <AgentPanel
          lang={lang} store={store} state={vState} cartIds={cartIds}
          readOnly={replaying} frames={frames} cursor={cursor} onCursor={setCursor}
          request={request} dial={dial} limit={limit} stockout={stockout} priceChange={priceChange} running={running}
          onRequest={setRequest}
          onPreset={(text, so, pc) => { setRequest(text); setStockout(so); setPriceChange(pc); }}
          onDial={setDial} onLimit={setLimit} onStockout={setStockout} onPriceChange={setPriceChange}
          onRun={run} onReset={reset}
          onApprove={ack(() => agent.approve())} onReject={ack(() => agent.reject())} onAnswer={(id) => ack(() => agent.answer(id))()}
          onUndo={(id) => agent.undo(id)}
        />
      </main>

      {!replaying && (
        <Dock
          lang={lang} state={vState} request={request} running={running} nod={nod}
          onRequest={setRequest} onRun={run} onCompare={() => setCmpClosed(false)}
          onApprove={ack(() => agent.approve())} onReject={ack(() => agent.reject())} onAnswer={(id) => ack(() => agent.answer(id))()}
        />
      )}

      {!replaying && !cmpClosed && state.phase === 'needs-input' && state.question?.id.startsWith('q-pick') && (
        <Compare
          lang={lang} store={store} state={state}
          onPick={(id) => ack(() => agent.answer(id))()} onClose={() => setCmpClosed(true)}
        />
      )}

      <CartDrawer
        lang={lang} open={cartOpen} state={replaying ? { ...shop, products: vProducts, cart: vCart } : shop} readOnly={replaying} onClose={() => setCartOpen(false)}
        onRemove={userRemove} onCheckout={userCheckout}
      />
    </>
  );
}
