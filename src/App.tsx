import { useCallback, useMemo, useReducer, useState } from 'react';
import { RuleAgent } from './agent/agent';
import type { Dial, Lang } from './engine/types';
import { initialState, reduce } from './state/console';
import { parseRequest } from './store/parser';
import { searchProducts } from './store/search';
import { createStore } from './store/store';
import { DEFAULT_LIMIT } from './store/catalog';
import type { Category } from './store/types';
import { AgentPanel } from './ui/AgentPanel';
import { CartDrawer } from './ui/CartDrawer';
import { C, PRESETS, t } from './ui/copy';
import { Shop } from './ui/Shop';
import { useStore } from './ui/useStore';

export default function App() {
  const store = useMemo(() => createStore(), []);
  const agent = useMemo(() => new RuleAgent(store), [store]);
  const shop = useStore(store);
  const [state, dispatch] = useReducer(reduce, initialState);

  const [lang, setLang] = useState<Lang>('ko');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  const [request, setRequest] = useState(t(PRESETS[0].text, 'ko'));
  const [dial, setDial] = useState<Dial>('cart-only');
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [stockout, setStockout] = useState(false);

  const { phase } = state;
  const running = !['idle', 'done', 'failed', 'cancelled', 'undone'].includes(phase);

  // 사람의 검색도 에이전트와 같은 해석·점수화를 쓴다
  const criteria = useMemo(() => (query.trim() ? parseRequest(query) : null), [query]);
  const results = useMemo(() => {
    const all = Object.values(shop.products);
    if (criteria) return searchProducts(all, criteria).filter((s) => s.score > 0);
    const list = category ? all.filter((p) => p.category === category) : all;
    return list.map((product) => ({ product, score: 1, matched: [], partial: [], missed: [] }));
  }, [shop.products, criteria, category]);

  const cartCount = shop.cart.reduce((s, l) => s + l.qty, 0);
  const cartIds = useMemo(() => new Set(shop.cart.map((l) => l.productId)), [shop.cart]);

  const run = useCallback(() => {
    dispatch({ type: 'start' });
    agent.start({ request, dial, limit, simulateStockout: stockout }, (event) => dispatch({ type: 'event', event }));
  }, [agent, request, dial, limit, stockout]);

  const reset = useCallback(() => {
    agent.stop();
    store.reset();
    dispatch({ type: 'reset' });
  }, [agent, store]);

  const ack = (fn: () => void) => () => { dispatch({ type: 'user_ack' }); fn(); };

  return (
    <>
      <header className="top">
        <div className="logo">{t(C.brand, lang)}</div>
        <input
          className="search" type="search" value={query} placeholder={t(C.searchPh, lang)}
          aria-label={t(C.searchPh, lang)} onChange={(e) => setQuery(e.target.value)}
        />
        <div className="top-r">
          <button className="btn sm" onClick={() => setCartOpen(true)}>{t(C.cart, lang)} {cartCount > 0 ? `(${cartCount})` : ''}</button>
          <div className="lang" role="group" aria-label="language">
            <button aria-pressed={lang === 'ko'} onClick={() => setLang('ko')}>KO</button>
            <button aria-pressed={lang === 'en'} onClick={() => setLang('en')}>EN</button>
          </div>
        </div>
      </header>

      <main className="layout">
        <Shop
          lang={lang} results={results} criteria={criteria} category={category} onCategory={setCategory}
          cart={shop.cart} agent={state} onAdd={(id) => store.addToCart(id, 'user')}
        />
        <AgentPanel
          lang={lang} store={store} state={state} cartIds={cartIds}
          request={request} dial={dial} limit={limit} stockout={stockout} running={running}
          onRequest={setRequest}
          onPreset={(text, so) => { setRequest(text); setStockout(so); }}
          onDial={setDial} onLimit={setLimit} onStockout={setStockout}
          onRun={run} onReset={reset}
          onApprove={ack(() => agent.approve())} onReject={ack(() => agent.reject())} onAnswer={(id) => ack(() => agent.answer(id))()}
          onUndo={(id) => agent.undo(id)}
        />
      </main>

      <CartDrawer
        lang={lang} open={cartOpen} state={shop} onClose={() => setCartOpen(false)}
        onRemove={(id) => store.removeFromCart(id)} onCheckout={() => store.checkout()}
      />
    </>
  );
}
