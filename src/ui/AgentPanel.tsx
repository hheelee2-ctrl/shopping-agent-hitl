import { useEffect, useRef, useState } from 'react';
import type { Dial, Lang, SizeProfile } from '../engine/types';
import type { ConsoleState, LogEntry, Phase } from '../state/console';
import { photoUrl } from '../store/photos';
import { arrivalLabel, returnLabel, sellerOf } from '../store/sellers';
import type { Store } from '../store/store';
import { AuditLog } from './AuditLog';
import { CostMeter } from './CostMeter';
import { ConfRing } from './ConfRing';
import { Scrubber } from './Scrubber';
import { Seg } from './Seg';
import { SizeProfileEditor } from './SizeProfile';
import type { Frame } from '../state/timeline';
import { C, DIAL, LEVEL, PHASE, PRESETS, SV, SZ, TH, money, t } from './copy';

interface Props {
  lang: Lang;
  store: Store;
  state: ConsoleState;
  cartIds: Set<string>;
  /** 마지막으로 맡긴 요청(스레드 맨 위에 보인다) */
  asked: string | null;
  dial: Dial;
  limit: number;
  sizes: SizeProfile;
  onSizes: (s: SizeProfile) => void;
  running: boolean;
  onPreset: (text: string) => void;
  onDial: (d: Dial) => void;
  onLimit: (n: number) => void;
  onReset: () => void;
  onApprove: () => void;
  onReject: () => void;
  onAnswer: (id: string) => void;
  onUndo: (id: string) => void;
  onOrders: () => void;
  readOnly: boolean;
  frames: Frame[];
  cursor: number | null;
  onCursor: (i: number | null) => void;
}

const LIMITS = [200000, 300000, 500000];

const dotClass = (p: Phase) =>
  p === 'planning' || p === 'executing' ? 'live'
  : p === 'awaiting-approval' || p === 'needs-input' || p === 'payment-gate' ? 'wait'
  : p === 'done' ? 'ok'
  : p === 'failed' || p === 'cancelled' ? 'bad' : '';

export function AgentPanel(p: Props) {
  const { lang, state, store } = p;
  const { phase, understood, plan, question, payment, result, log, candidates, confidence } = state;
  const pendingCart = log.find((l) => l.tool === 'cart_add' && l.status === 'awaiting-approval');
  const panel = useRef<HTMLElement>(null);
  const [openSet, setOpenSet] = useState(false);

  // 사람이 결정해야 하는 카드가 나타나면 패널 안에서 보이게 스크롤한다
  useEffect(() => {
    if (phase !== 'awaiting-approval' && phase !== 'needs-input' && phase !== 'payment-gate') return;
    panel.current?.querySelector('[data-action]')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [phase, question?.id, payment?.total, pendingCart?.id]);

  const sizeSum = [p.sizes.top, p.sizes.shoe, p.sizes.bottom].map((x) => x ?? '–').join(' / ');
  const whyOf = (e: LogEntry) => {
    const id = e.id.replace('t-cart', 't-seller');
    return log.find((l) => l.id === id)?.note;
  };

  return (
    <aside className={`agent ${p.readOnly ? 'replay' : ''}`} ref={panel} aria-label={t(C.agent, lang)}>
      <header className="agent-head">
        <div className="agent-title">
          <h1>{t(TH.title, lang)}</h1>
          <span className="phase"><span className={`dot ${dotClass(phase)}`} />{t(PHASE[phase], lang)}</span>
        </div>
        <button className="settings-sum" aria-expanded={openSet} onClick={() => setOpenSet((o) => !o)} disabled={p.running}>
          <span>{t(DIAL[p.dial], lang)}</span>
          <span>{TH.limitOf[lang](money(p.limit, lang))}</span>
          <span>{sizeSum}</span>
        </button>
        {openSet && !p.running && (
          <div className="settings">
            <div>
              <p className="label">{t(C.dial, lang)}</p>
              <Seg options={(Object.keys(DIAL) as Dial[]).map((d) => ({ value: d, label: t(DIAL[d], lang) }))} value={p.dial} onChange={p.onDial} label={t(C.dial, lang)} />
            </div>
            <div>
              <p className="label">{t(C.limit, lang)}</p>
              <Seg options={LIMITS.map((n) => ({ value: n, label: money(n, lang).replace('KRW ', '') }))} value={p.limit} onChange={p.onLimit} label={t(C.limit, lang)} />
              <p className="note">{t(C.dialNote, lang)}</p>
            </div>
            <div>
              <p className="label">{t(SZ.title, lang)}</p>
              <SizeProfileEditor lang={lang} value={p.sizes} onChange={p.onSizes} />
            </div>
            <div className="row">
              <button className="btn sm" onClick={() => setOpenSet(false)}>{t(TH.done, lang)}</button>
              <button className="btn sm ghost" onClick={p.onReset} title={t(C.resetNote, lang)}>{t(C.reset, lang)}</button>
            </div>
          </div>
        )}
      </header>

      <fieldset className="plain thread" disabled={p.readOnly} aria-live="polite">
        {phase === 'idle' && (
          <div className="suggest">
            <p className="label">{t(TH.suggest, lang)}</p>
            <ul>
              {PRESETS.map((x, i) => (
                <li key={i}><button onClick={() => p.onPreset(t(x.text, lang))}>{t(x.label ?? x.text, lang)}</button></li>
              ))}
            </ul>
          </div>
        )}

        {p.asked && phase !== 'idle' && <p className="bubble">{p.asked}</p>}

        {understood && (
          <div className="interp">
            {understood.chips.map((c, i) => <span key={i} className="chip"><i>{t(c.label, lang)}</i>{t(c.value, lang)}</span>)}
            {understood.unknown.map((u) => <span key={u} className="chip bad"><i>?</i>{u}</span>)}
          </div>
        )}

        {plan && (
          <div className={`card plan ${phase === 'awaiting-approval' && plan.requiresApproval && !pendingCart ? 'ask-me' : ''}`} data-action={phase === 'awaiting-approval' && plan.requiresApproval && !pendingCart ? '' : undefined}>
            <h2>{t(C.planTitle, lang)}</h2>
            <ol className="steps">{plan.steps.map((s) => <li key={s.id}>{t(s.label, lang)}</li>)}</ol>
            {phase === 'awaiting-approval' && plan.requiresApproval && !pendingCart && (
              <div className="row">
                <button className="btn primary nod" onClick={p.onApprove}>{t(C.approveStart, lang)}</button>
                <button className="btn" onClick={p.onReject}>{t(C.cancel, lang)}</button>
              </div>
            )}
          </div>
        )}

        {candidates.length > 0 && (
          <div className="card">
            <h2>{t(C.candidates, lang)}</h2>
            <ul className="cand">
              {candidates.map((id) => {
                const prod = store.getProduct(id);
                const c = confidence[id];
                if (!prod) return null;
                const src = photoUrl(id);
                return (
                  <li key={id}>
                    <span className={`thumb sw sw-${prod.colors[0]}`}>{src && <img className="ph" src={src} alt="" />}</span>
                    <span className="n">{t(prod.name, lang)}<em>{money(prod.price, lang)}</em></span>
                    {c && <span className={`conf ${c.level}`}><ConfRing level={c.level} />{t(LEVEL[c.level], lang)}</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {pendingCart && <CartAsk lang={lang} store={store} entry={pendingCart} why={whyOf(pendingCart)} onApprove={p.onApprove} onReject={p.onReject} />}

        {question && phase === 'needs-input' && (
          <div className="card ask-me" data-action="">
            <h2 className="q">{t(question.question, lang)}</h2>
            <div className="opts">
              {question.options.map((o, i) => (
                <button key={o.id} className={`btn ${i === 0 ? 'primary' : ''}`} onClick={() => p.onAnswer(o.id)}>{t(o.label, lang)}</button>
              ))}
            </div>
          </div>
        )}

        {payment && phase === 'payment-gate' && <PayAsk lang={lang} store={store} payment={payment} onApprove={p.onApprove} onReject={p.onReject} />}

        {result && (
          <div className={`card result ${result.status}`}>
            <p>{t(result.summary, lang)}</p>
            {result.status === 'done' && <button className="btn sm" onClick={p.onOrders}>{t(TH.seeOrders, lang)}</button>}
          </div>
        )}

        {result && (
          <CostMeter
            lang={lang} request={p.asked ?? ''} limit={p.limit} sizes={p.sizes}
            dial={p.dial} disabled={p.running} onPick={p.onDial}
          />
        )}

        <AuditLog lang={lang} log={log} phase={phase} cartIds={p.cartIds} onUndo={p.onUndo} />
      </fieldset>

      <Scrubber lang={lang} frames={p.frames} cursor={p.cursor} onCursor={p.onCursor} />
    </aside>
  );
}

/** 담기 승인 카드. 무엇을, 어느 판매처에서, 얼마에, 언제 받는지, 담으면 장바구니가 어떻게 되는지 한 번에 본다. */
function CartAsk({ lang, store, entry, why, onApprove, onReject }: {
  lang: Lang; store: Store; entry: LogEntry; why?: { ko: string; en: string };
  onApprove: () => void; onReject: () => void;
}) {
  const pid = entry.itemIds?.[0];
  const prod = pid ? store.getProduct(pid) : undefined;
  const o = entry.offer;
  if (!prod || !o) return null;
  const s = sellerOf(o.sellerId);
  const src = photoUrl(prod.id);
  const now = store.getOffer(prod.id, o.sellerId)?.price ?? o.price;
  const after = store.cartTotal() + o.price + Math.max(0, o.shipping);
  return (
    <div className="card ask-me cart-ask" data-action="">
      <h2 className="q">{t(TH.cartAsk, lang)}</h2>
      <div className="pick">
        <span className={`thumb lg sw sw-${prod.colors[0]}`}>{src && <img className="ph" src={src} alt="" />}</span>
        <div>
          <div className="brand">{prod.brand}</div>
          <p className="pick-n">{t(prod.name, lang)}</p>
          {o.size !== 'FREE' && <span className="size">{o.size}</span>}
        </div>
        <b className="pick-p">{money(o.price, lang)}</b>
      </div>
      <dl className="facts">
        <div><dt>{t(SV.sellers, lang)}</dt><dd>{t(s.name, lang)}</dd></div>
        <div><dt>{t(SV.shipping, lang)}</dt><dd>{o.shipping <= 0 ? t(SV.freeShip, lang) : money(o.shipping, lang)}</dd></div>
        <div><dt>{t(SV.arrive, lang)}</dt><dd>{t(arrivalLabel(o.arriveAt, store.now()), lang)}</dd></div>
        <div><dt>{t(SV.returns, lang)}</dt><dd>{t(returnLabel(s), lang)}</dd></div>
        <div className="after"><dt>{t(TH.after, lang)}</dt><dd>{money(after, lang)}</dd></div>
      </dl>
      {now !== o.price && <p className="warnline" role="alert">{TH.staleAdd[lang](money(o.price, lang), money(now, lang))}</p>}
      {why && <p className="why"><b>{t(TH.sellerWhy, lang)}</b>{t(why, lang)}</p>}
      <div className="row">
        <button className="btn nod" onClick={onApprove}>{t(C.approveCart, lang)}</button>
        <button className="btn" onClick={onReject}>{t(C.skipCart, lang)}</button>
      </div>
    </div>
  );
}

/** 결제 직전 승인. 얼마가(상품·배송비), 어디로(판매처별 주문), 한도 대비 어느 정도인지, 승인하면 무슨 일이 생기는지 본다. */
function PayAsk({ lang, store, payment, onApprove, onReject }: {
  lang: Lang; store: Store; payment: NonNullable<ConsoleState['payment']>;
  onApprove: () => void; onReject: () => void;
}) {
  const groups = store.quote();
  const now = store.now();
  const ship = groups.reduce((a, g) => a + g.shipping, 0);
  const issues = store.cartIssues();
  const ratio = Math.min(1, payment.total / payment.limit);
  const gap = payment.limit - payment.total;
  return (
    <div className={`card ask-me pay ${payment.exceeded ? 'over' : ''}`} data-action="">
      <h2 className="q">{t(TH.payAsk, lang)}</h2>
      <ul className="split">
        {groups.map((g) => {
          const s = sellerOf(g.sellerId);
          return (
            <li key={g.sellerId}>
              <div className="split-h"><b>{t(s.name, lang)}</b><span>{money(g.total, lang)}</span></div>
              <div className="split-items">
                {g.lines.map((l) => <span key={l.productId}>{t(store.getProduct(l.productId)!.name, lang)}{l.size !== 'FREE' ? `, ${l.size}` : ''}{l.qty > 1 ? ` ×${l.qty}` : ''}</span>)}
              </div>
              <div className="split-m">
                <span>{g.shipping <= 0 ? t(SV.freeShip, lang) : SV.shipFee[lang](money(g.shipping, lang))}</span>
                <span>{t(arrivalLabel(g.arriveAt, now), lang)}</span>
                <span>{t(returnLabel(s), lang)}</span>
              </div>
            </li>
          );
        })}
      </ul>
      <dl className="sums">
        <div><dt>{t(SV.itemsTotal, lang)}</dt><dd>{money(payment.total - ship, lang)}</dd></div>
        <div><dt>{t(SV.shipTotalL, lang)}</dt><dd>{ship > 0 ? money(ship, lang) : t(SV.freeShip, lang)}</dd></div>
        <div className="grand"><dt>{t(SV.grand, lang)}{groups.length > 1 ? `, ${SV.orderCount[lang](groups.length)}` : ''}</dt><dd>{money(payment.total, lang)}</dd></div>
      </dl>
      <div className={`meter ${payment.exceeded ? 'over' : ''}`} role="img" aria-label={payment.exceeded ? SV.overBy[lang](money(-gap, lang)) : SV.underBy[lang](money(gap, lang))}>
        <div className="meter-bar"><i style={{ transform: `scaleX(${ratio})` }} /></div>
        <div className="meter-l">
          <span>{payment.exceeded ? SV.overBy[lang](money(-gap, lang)) : SV.underBy[lang](money(gap, lang))}</span>
          <span>{TH.limitOf[lang](money(payment.limit, lang))}</span>
        </div>
      </div>
      {payment.exceeded && <p className="warnline">{t(C.exceeded, lang)}</p>}
      {issues.length > 0 && <p className="warnline" role="alert">{t(SV.liveChanged, lang)}</p>}
      <dl className="kv">
        <div><dt>{t(SV.address, lang)}</dt><dd>{t(SV.addressV, lang)}</dd></div>
      </dl>
      <p className="note">{t(TH.payNote, lang)}</p>
      <div className="row">
        <button className={`btn ${payment.exceeded ? 'primary' : 'nod'}`} onClick={onApprove}>
          {payment.exceeded ? SV.approveOver[lang](money(payment.total, lang)) : SV.approvePayN[lang](money(payment.total, lang))}
        </button>
        <button className="btn danger" onClick={onReject}>{t(C.declinePay, lang)}</button>
      </div>
    </div>
  );
}
