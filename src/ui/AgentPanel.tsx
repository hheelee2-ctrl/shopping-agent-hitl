import { useEffect, useRef } from 'react';
import type { Dial, Lang } from '../engine/types';
import type { ConsoleState, Phase } from '../state/console';
import type { Store } from '../store/store';
import { AuditLog } from './AuditLog';
import { C, DIAL, LEVEL, PHASE, PRESETS, money, t } from './copy';

interface Props {
  lang: Lang;
  store: Store;
  state: ConsoleState;
  cartIds: Set<string>;
  request: string;
  dial: Dial;
  limit: number;
  stockout: boolean;
  running: boolean;
  onRequest: (s: string) => void;
  onPreset: (text: string, stockout: boolean) => void;
  onDial: (d: Dial) => void;
  onLimit: (n: number) => void;
  onStockout: (b: boolean) => void;
  onRun: () => void;
  onReset: () => void;
  onApprove: () => void;
  onReject: () => void;
  onAnswer: (id: string) => void;
  onUndo: (id: string) => void;
}

const LIMITS = [200000, 300000, 500000];

const dotClass = (p: Phase) =>
  p === 'planning' || p === 'executing' ? 'live'
  : p === 'awaiting-approval' || p === 'needs-input' || p === 'payment-gate' ? 'wait'
  : p === 'done' ? 'ok'
  : p === 'failed' || p === 'cancelled' ? 'bad' : '';

export function AgentPanel(p: Props) {
  const { lang, state } = p;
  const { phase, understood, plan, question, payment, result, log, candidates, confidence } = state;
  const pendingCart = log.find((l) => l.tool === 'cart_add' && l.status === 'awaiting-approval');
  const panel = useRef<HTMLElement>(null);

  // 사람이 결정해야 하는 카드가 나타나면 패널 안에서 보이게 스크롤한다
  useEffect(() => {
    if (phase !== 'awaiting-approval' && phase !== 'needs-input' && phase !== 'payment-gate') return;
    panel.current?.querySelector('[data-action]')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [phase, question?.id, payment?.total, pendingCart?.id]);

  return (
    <aside className="agent" ref={panel} aria-label={t(C.agent, lang)}>
      <header className="agent-head">
        <div className="eyebrow">AX · Human-in-the-Loop</div>
        <h1>{t(C.agent, lang)}</h1>
        <p className="sub">{t(C.agentSub, lang)}</p>
      </header>

      <div className="section">
        <label className="label" htmlFor="req">{t(C.request, lang)}</label>
        <textarea
          id="req" className="req" rows={2} value={p.request} disabled={p.running}
          placeholder={t(C.requestPh, lang)} onChange={(e) => p.onRequest(e.target.value)}
        />
        <div className="presets" aria-label={t(C.presets, lang)}>
          {PRESETS.map((x, i) => (
            <button key={i} className="chip btnchip" disabled={p.running} onClick={() => p.onPreset(t(x.text, lang), !!x.stockout)}>
              {t(x.text, lang)}
            </button>
          ))}
        </div>
      </div>

      <div className="section two">
        <div>
          <p className="label">{t(C.dial, lang)}</p>
          <div className="seg" role="group" aria-label={t(C.dial, lang)}>
            {(Object.keys(DIAL) as Dial[]).map((d) => (
              <button key={d} aria-pressed={d === p.dial} disabled={p.running} onClick={() => p.onDial(d)}>{t(DIAL[d], lang)}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="label">{t(C.limit, lang)}</p>
          <div className="seg" role="group" aria-label={t(C.limit, lang)}>
            {LIMITS.map((n) => (
              <button key={n} aria-pressed={n === p.limit} disabled={p.running} onClick={() => p.onLimit(n)}>
                {money(n, lang).replace('KRW ', '')}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="note">{t(C.dialNote, lang)}</p>

      <label className="check">
        <input type="checkbox" checked={p.stockout} disabled={p.running} onChange={(e) => p.onStockout(e.target.checked)} />
        <span>{t(C.stockout, lang)}</span>
      </label>

      <div className="row section">
        <button className="btn primary" onClick={p.onRun} disabled={p.running || p.request.trim() === ''}>
          {phase === 'idle' ? t(C.run, lang) : t(C.rerun, lang)}
        </button>
        <button className="btn" onClick={p.onReset} title={t(C.resetNote, lang)}>{t(C.reset, lang)}</button>
      </div>

      <div className="feed" aria-live="polite">
        <div className="phase">
          <span className={`dot ${dotClass(phase)}`} />
          {t(PHASE[phase], lang)}
        </div>

        {phase === 'idle' && <p className="note">{t(C.idle, lang)}</p>}

        {understood && (
          <div className="card">
            <p className="label">{t(C.understoodAs, lang)}</p>
            <div className="interp">
              {understood.chips.map((c, i) => <span key={i} className="chip">{t(c.label, lang)} · {t(c.value, lang)}</span>)}
              {understood.unknown.map((u) => <span key={u} className="chip bad">? {u}</span>)}
            </div>
          </div>
        )}

        {plan && (
          <div className="card" data-action={phase === 'awaiting-approval' && plan.requiresApproval && !pendingCart ? '' : undefined}>
            <h2>{t(C.planTitle, lang)}</h2>
            <ol className="steps">{plan.steps.map((s) => <li key={s.id}>{t(s.label, lang)}</li>)}</ol>
            {phase === 'awaiting-approval' && plan.requiresApproval && !pendingCart && (
              <div className="row">
                <button className="btn primary" onClick={p.onApprove}>{t(C.approveStart, lang)}</button>
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
                const prod = p.store.getProduct(id);
                const c = confidence[id];
                if (!prod) return null;
                return (
                  <li key={id}>
                    <span className="n">{t(prod.name, lang)}</span>
                    {c && <span className={`pill ${c.level}`}>{t(LEVEL[c.level], lang)}</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {pendingCart && (
          <div className="card gate" data-action="">
            <p className="label">{t(pendingCart.label, lang)}</p>
            <div className="row">
              <button className="btn primary" onClick={p.onApprove}>{t(C.approveCart, lang)}</button>
              <button className="btn" onClick={p.onReject}>{t(C.skipCart, lang)}</button>
            </div>
          </div>
        )}

        {question && phase === 'needs-input' && (
          <div className="card ask" data-action="">
            <p className="label">{t(C.askTitle, lang)}</p>
            <h2>{t(question.question, lang)}</h2>
            <div className="row">
              {question.options.map((o) => (
                <button key={o.id} className="btn" onClick={() => p.onAnswer(o.id)}>{t(o.label, lang)}</button>
              ))}
            </div>
          </div>
        )}

        {payment && phase === 'payment-gate' && (
          <div className="card gate" data-action="">
            <p className="label">{t(C.payTitle, lang)}</p>
            <div className="total">
              <span className="big">{money(payment.total, lang)}</span>
              <span className="note">{t(C.limitShort, lang)} {money(payment.limit, lang)}</span>
            </div>
            {payment.exceeded && <p className="warnline">{t(C.exceeded, lang)}</p>}
            <div className="row">
              <button className="btn primary" onClick={p.onApprove}>{t(C.approvePay, lang)}</button>
              <button className="btn danger" onClick={p.onReject}>{t(C.declinePay, lang)}</button>
            </div>
          </div>
        )}

        {result && <div className="card"><p className="result">{t(result.summary, lang)}</p></div>}

        <AuditLog lang={lang} log={log} phase={phase} cartIds={p.cartIds} onUndo={p.onUndo} />
      </div>
    </aside>
  );
}
