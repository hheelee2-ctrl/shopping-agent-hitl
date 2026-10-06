import { useEffect, useRef } from 'react';
import type { Dial, Lang, SizeProfile } from '../engine/types';
import type { ConsoleState, Phase } from '../state/console';
import type { Store } from '../store/store';
import { AuditLog } from './AuditLog';
import { CostMeter } from './CostMeter';
import { ConfRing } from './ConfRing';
import { Scrubber } from './Scrubber';
import { Seg } from './Seg';
import type { Frame } from '../state/timeline';
import { SizeProfileEditor } from './SizeProfile';
import { C, DIAL, SZ, LEVEL, PHASE, PRESETS, money, t } from './copy';

interface Props {
  lang: Lang;
  store: Store;
  state: ConsoleState;
  cartIds: Set<string>;
  request: string;
  dial: Dial;
  limit: number;
  sizes: SizeProfile;
  onSizes: (s: SizeProfile) => void;
  running: boolean;
  onRequest: (s: string) => void;
  onPreset: (text: string) => void;
  onDial: (d: Dial) => void;
  onLimit: (n: number) => void;
  onRun: () => void;
  onReset: () => void;
  onApprove: () => void;
  onReject: () => void;
  onAnswer: (id: string) => void;
  onUndo: (id: string) => void;
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
    <aside className={`agent ${p.readOnly ? 'replay' : ''}`} ref={panel} aria-label={t(C.agent, lang)}>
      <header className="agent-head">
        <div className="eyebrow">Nod</div>
        <h1>{t(C.agent, lang)}</h1>
        <p className="sub">{t(C.agentSub, lang)}</p>
      </header>

      <fieldset className="plain" disabled={p.readOnly}>

      <div className="section">
        <label className="label" htmlFor="req">{t(C.request, lang)}</label>
        <textarea
          id="req" className="req" rows={2} value={p.request} disabled={p.running}
          placeholder={t(C.requestPh, lang)} onChange={(e) => p.onRequest(e.target.value)}
        />
        <div className="presets" aria-label={t(C.presets, lang)}>
          {PRESETS.map((x, i) => (
            <button key={i} className="chip btnchip" disabled={p.running} onClick={() => p.onPreset(t(x.text, lang))}>
              {t(x.label ?? x.text, lang)}
            </button>
          ))}
        </div>
      </div>

      <div className="section two">
        <div>
          <p className="label">{t(C.dial, lang)}</p>
          <Seg options={(Object.keys(DIAL) as Dial[]).map((d) => ({ value: d, label: t(DIAL[d], lang) }))} value={p.dial} onChange={p.onDial} label={t(C.dial, lang)} disabled={p.running} />
        </div>
        <div>
          <p className="label">{t(C.limit, lang)}</p>
          <Seg options={LIMITS.map((n) => ({ value: n, label: money(n, lang).replace('KRW ', '') }))} value={p.limit} onChange={p.onLimit} label={t(C.limit, lang)} disabled={p.running} />
        </div>
      </div>
      <p className="note">{t(C.dialNote, lang)}</p>

      <div className="section">
        <p className="label">{t(SZ.title, lang)}</p>
        <SizeProfileEditor lang={lang} value={p.sizes} onChange={p.onSizes} disabled={p.running} />
      </div>

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
                    {c && <span className="conf"><ConfRing level={c.level} /><span className={`pill ${c.level}`}>{t(LEVEL[c.level], lang)}</span></span>}
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

        {result && (
          <CostMeter
            lang={lang} request={p.request} limit={p.limit} sizes={p.sizes}
            dial={p.dial} disabled={p.running} onPick={p.onDial}
          />
        )}

        <AuditLog lang={lang} log={log} phase={phase} cartIds={p.cartIds} onUndo={p.onUndo} />
      </div>
      </fieldset>

      <Scrubber lang={lang} frames={p.frames} cursor={p.cursor} onCursor={p.onCursor} />
    </aside>
  );
}
