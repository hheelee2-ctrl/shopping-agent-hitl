import { useEffect, useRef, useState } from 'react';
import type { Dial, Lang, SizeProfile } from '../engine/types';
import type { ConsoleState, LogEntry, Phase } from '../state/console';
import { photoUrl } from '../store/photos';
import { arrivalLabel, sellerOf } from '../store/sellers';
import type { Store } from '../store/store';
import { AuditLog } from './AuditLog';
import { CostMeter } from './CostMeter';
import { ConfRing } from './ConfRing';
import { Scrubber } from './Scrubber';
import { Seg } from './Seg';
import { Mark } from './Mark';
import { PriceBars, SellerBadge } from './Sellers';
import { SizeProfileEditor } from './SizeProfile';
import type { Frame } from '../state/timeline';
import { C, DIAL, LEVEL, PHASE, SUGGEST, SV, SZ, TH, money, t } from './copy';

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
  request: string;
  onRequest: (s: string) => void;
  onRun: () => void;
  onCompare: () => void;
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

/** 계획 단계가 지금 어디까지 왔는지: 끝남 / 진행 중 / 아직 */
function stepState(tool: string, log: LogEntry[], phase: Phase): 'done' | 'now' | '' {
  if (tool === 'pay') return phase === 'done' ? 'done' : phase === 'payment-gate' ? 'now' : '';
  const mine = log.filter((l) => l.tool === tool && !l.id.startsWith('t-seller'));
  if (tool === 'cart_add') {
    if (phase === 'payment-gate' || phase === 'done') return mine.some((l) => l.status === 'done') ? 'done' : '';
    if (mine.some((l) => l.status === 'running' || l.status === 'awaiting-approval')) return 'now';
    return mine.some((l) => l.status === 'done') ? 'done' : '';
  }
  if (mine.some((l) => l.status === 'running')) return 'now';
  return mine.some((l) => l.status === 'done') ? 'done' : '';
}

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
  const field = useRef<HTMLTextAreaElement>(null);
  const [openSet, setOpenSet] = useState(false);
  const [moreSg, setMoreSg] = useState(false);
  // 모바일에서는 바텀 시트. 접힌 상태에서도 입력창과 현재 상태는 항상 보인다.
  const [open, setOpen] = useState(false);
  const deciding = phase === 'awaiting-approval' || phase === 'needs-input' || phase === 'payment-gate';

  // 사람이 결정해야 하는 카드가 나타나면 시트를 펼치고, 패널 안에서 보이게 스크롤한다
  useEffect(() => {
    if (!deciding) return;
    setOpen(true);
    const id = window.setTimeout(() => panel.current?.querySelector('[data-action]')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 60);
    return () => window.clearTimeout(id);
  }, [deciding, phase, question?.id, payment?.total, pendingCart?.id]);
  useEffect(() => { if (phase === 'planning') setOpen(true); }, [phase]);

  const pick = (text: string) => {
    p.onRequest(text);
    window.requestAnimationFrame(() => { field.current?.focus(); field.current?.setSelectionRange(text.length, text.length); });
  };

  const askPlan = !!plan && phase === 'awaiting-approval' && plan.requiresApproval && !pendingCart;
  const sizeSum = [p.sizes.top, p.sizes.shoe, p.sizes.bottom].map((x) => x ?? '–').join(' / ');
  const whyOf = (e: LogEntry) => {
    const id = e.id.replace('t-cart', 't-seller');
    return log.find((l) => l.id === id)?.note;
  };

  return (
    <aside className={`agent ${p.readOnly ? 'replay' : ''} ${open ? 'open' : ''} ${deciding ? 'deciding' : ''}`} ref={panel} aria-label={t(C.agent, lang)}>
      <header className="agent-head">
        <button className="sheet-handle" aria-expanded={open} aria-label={open ? t(C.fold, lang) : t(C.open, lang)} onClick={() => setOpen((o) => !o)}>
          <span aria-hidden />
        </button>
        <div className="agent-title" onClick={() => setOpen(true)}>
          <h1>{t(TH.title, lang)}</h1>
          <span className={`phase ${dotClass(phase)}`}><Mark size={9} tone="on-brand" phase={dotClass(phase) === 'live' ? 'busy' : 'idle'} />{t(PHASE[phase], lang)}</span>
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

      <div className="agent-scroll">
      <fieldset className="plain thread" disabled={p.readOnly} aria-live="polite">
        {phase === 'idle' && (
          <div className="suggest">
            <p className="suggest-t">{t(TH.suggest, lang)}</p>
            <div className="suggest-row">
              {(moreSg ? SUGGEST.flatMap((g) => g.items) : SUGGEST.map((g) => g.items[0])).map((x, i) => (
                <button key={i} className="sg" onClick={() => pick(t(x.text, lang))}>{t(x.label ?? x.text, lang)}</button>
              ))}
              <button className="sg more" onClick={() => setMoreSg((m) => !m)}>{t(moreSg ? TH.less : TH.more, lang)}</button>
            </div>
          </div>
        )}

        {p.asked && phase !== 'idle' && <p className="bubble">{p.asked}</p>}

        {understood && (
          <div className="interp">
            {understood.chips.map((c, i) => <span key={i} className="chip"><i>{t(c.label, lang)}</i>{t(c.value, lang)}</span>)}
            {understood.unknown.map((u) => <span key={u} className="chip bad"><i>?</i>{u}</span>)}
          </div>
        )}

        {plan && askPlan && (
          <div className="card plan ask-me" data-action="">
            <h2>{t(C.planTitle, lang)}</h2>
            <ol className="steps">
              {plan.steps.map((s) => <li key={s.id}><span className="st-ic" aria-hidden /><span>{t(s.label, lang)}</span></li>)}
            </ol>
            <div className="row">
              <button className="btn primary nod" onClick={p.onApprove}>{t(C.approveStart, lang)}</button>
              <button className="btn" onClick={p.onReject}>{t(C.cancel, lang)}</button>
            </div>
          </div>
        )}

        {plan && !askPlan && !result && (() => {
          const states = plan.steps.map((s) => stepState(s.tool, log, phase));
          const cur = Math.max(0, states.findIndex((x) => x !== 'done'));
          const i = states.every((x) => x === 'done') ? plan.steps.length - 1 : cur;
          return (
            <div className="progress" aria-label={t(C.planTitle, lang)}>
              <ol className="pdots">{states.map((st, k) => <li key={k} className={st || (k < i ? 'done' : '')} />)}</ol>
              <span><b>{TH.step[lang](i + 1, plan.steps.length)}</b> {t(plan.steps[i].label, lang).replace(/\s*\(.*\)$/, '')}</span>
            </div>
          );
        })()}

        {candidates.length > 0 && !result && phase !== 'payment-gate' && (
          <ul className="cand" aria-label={t(C.candidates, lang)}>
            {candidates.map((id) => {
              const prod = store.getProduct(id);
              const c = confidence[id];
              if (!prod) return null;
              const src = photoUrl(id);
              return (
                <li key={id} className={c ? `lv-${c.level}` : ''} title={t(prod.name, lang)}>
                  <span className={`cand-ph sw sw-${prod.colors[0]}`}>{src && <img className="ph" src={src} alt="" />}</span>
                  {c && <span className={`conf ${c.level}`}><ConfRing level={c.level} />{c.level === 'high' ? t(LEVEL[c.level], lang) : ''}</span>}
                </li>
              );
            })}
          </ul>
        )}

        {pendingCart && <CartAsk lang={lang} store={store} entry={pendingCart} why={whyOf(pendingCart)} onApprove={p.onApprove} onReject={p.onReject} />}

        {question && phase === 'needs-input' && (
          <div className="card ask-me" data-action="">
            <h2 className="q">{t(question.question, lang)}</h2>
            <div className="opts">
              {question.id.startsWith('q-pick') && <button className="btn ghost cmp-open" onClick={p.onCompare}>{t(C.compare, lang)}</button>}
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

      </fieldset>
      {(log.length > 0 || p.frames.length > 1) && (
        <details className="history">
          <summary>{t(TH.history, lang)}<span>{log.length}</span></summary>
          {result && (
            <CostMeter
              lang={lang} request={p.asked ?? ''} limit={p.limit} sizes={p.sizes}
              dial={p.dial} disabled={p.running} onPick={p.onDial}
            />
          )}
          <AuditLog lang={lang} log={log} phase={phase} cartIds={p.cartIds} onUndo={p.onUndo} />
          <Scrubber lang={lang} frames={p.frames} cursor={p.cursor} onCursor={p.onCursor} />
        </details>
      )}
      </div>

      <form className="composer" onSubmit={(e) => { e.preventDefault(); if (p.request.trim() && !p.running) p.onRun(); }}>
        <div className="composer-box">
          <textarea
            ref={field} rows={1} value={p.request} disabled={p.running || p.readOnly}
            placeholder={t(C.requestPh, lang)} aria-label={t(C.request, lang)}
            onFocus={() => setOpen(true)}
            onChange={(e) => p.onRequest(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (p.request.trim() && !p.running) p.onRun();
              }
            }}
          />
          <button type="submit" className="btn nod send" disabled={!p.request.trim() || p.running || p.readOnly}>{t(C.send, lang)}</button>
        </div>
        {p.running && <p className="composer-hint">{t(C.busyHint, lang)}</p>}
      </form>
    </aside>
  );
}

/** 담기 승인 카드. 무엇을, 어디서, 얼마에, 언제 받는지만. 판매처 비교는 접어 둔다. */
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
  const others = store.rankOffers(prod.id, o.size).filter((r) => !r.seller.overseas || r.offer.sellerId === o.sellerId);
  return (
    <div className="card ask-me cart-ask" data-action="">
      <h2 className="q">{t(TH.cartAsk, lang)}</h2>
      <div className="pick">
        <span className={`thumb lg sw sw-${prod.colors[0]}`}>{src && <img className="ph" src={src} alt="" />}</span>
        <div>
          <p className="pick-n">{t(prod.name, lang)}{o.size !== 'FREE' && <span className="size">{o.size}</span>}</p>
          <p className="pick-s"><SellerBadge s={s} lang={lang} size={16} />{t(s.name, lang)}</p>
          <p className="pick-t">{o.shipping <= 0 ? t(SV.freeShip, lang) : money(o.shipping, lang)} · {t(arrivalLabel(o.arriveAt, store.now()), lang)}</p>
        </div>
        <b className="pick-p">{money(o.price, lang)}</b>
      </div>
      {now !== o.price && <p className="warnline" role="alert">{TH.staleAdd[lang](money(o.price, lang), money(now, lang))}</p>}
      <div className="row">
        <button className="btn nod" onClick={onApprove}>{t(C.approveCart, lang)}</button>
        <button className="btn" onClick={onReject}>{t(C.skipCart, lang)}</button>
      </div>
      {others.length > 1 && (
        <details className="why-box">
          <summary>{t(TH.whyHere, lang)}</summary>
          <PriceBars rows={others} lang={lang} chosen={o.sellerId} />
          {why && <p>{t(why, lang).split('. ')[0]}</p>}
        </details>
      )}
    </div>
  );
}

/** 결제 직전 승인. 큰 금액 하나, 판매처별 한 줄, 한도 막대, 배송지 한 줄. */
function PayAsk({ lang, store, payment, onApprove, onReject }: {
  lang: Lang; store: Store; payment: NonNullable<ConsoleState['payment']>;
  onApprove: () => void; onReject: () => void;
}) {
  const groups = store.quote();
  const issues = store.cartIssues();
  const ratio = Math.min(1, payment.total / payment.limit);
  const gap = payment.limit - payment.total;
  return (
    <div className={`card ask-me pay ${payment.exceeded ? 'over' : ''}`} data-action="">
      <h2 className="q">{t(TH.payAsk, lang)}</h2>
      <p className="pay-total"><span>{t(TH.total, lang)}{groups.length > 1 ? ` · ${SV.orderCount[lang](groups.length)}` : ''}</span><b>{money(payment.total, lang)}</b></p>
      <ul className="split">
        {groups.map((g) => {
          const s = sellerOf(g.sellerId);
          const n = g.lines.reduce((a, l) => a + l.qty, 0);
          return (
            <li key={g.sellerId} className="split-h">
              <SellerBadge s={s} lang={lang} size={20} /><b>{t(s.name, lang)}</b>
              <span className="muted">{TH.itemsN[lang](n)}{g.shipping > 0 ? ` + ${money(g.shipping, lang)}` : ''}</span>
              <span>{money(g.total, lang)}</span>
            </li>
          );
        })}
      </ul>
      <div className={`meter ${payment.exceeded ? 'over' : ''}`} role="img" aria-label={payment.exceeded ? SV.overBy[lang](money(-gap, lang)) : SV.underBy[lang](money(gap, lang))}>
        <div className="meter-bar"><i style={{ transform: `scaleX(${ratio})` }} /></div>
        <div className="meter-l">
          <span>{payment.exceeded ? SV.overBy[lang](money(-gap, lang)) : SV.underBy[lang](money(gap, lang))}</span>
          <span>{TH.limitOf[lang](money(payment.limit, lang))}</span>
        </div>
      </div>
      {payment.exceeded && <p className="warnline">{t(C.exceeded, lang)}</p>}
      {issues.length > 0 && <p className="warnline" role="alert">{t(SV.liveChanged, lang)}</p>}
      <p className="pay-addr">{t(SV.address, lang)} · {t(SV.addressV, lang)}</p>
      <div className="row">
        <button className={`btn ${payment.exceeded ? 'primary' : 'nod'}`} onClick={onApprove}>
          {payment.exceeded ? SV.approveOver[lang](money(payment.total, lang)) : SV.approvePayN[lang](money(payment.total, lang))}
        </button>
        <button className="btn danger" onClick={onReject}>{t(C.declinePay, lang)}</button>
      </div>
    </div>
  );
}
