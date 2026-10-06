import { useEffect, useLayoutEffect, useRef } from 'react';
import type { Lang } from '../engine/types';
import type { ConsoleState } from '../state/console';
import { C, PHASE, money, t } from './copy';
import { Mark } from './Mark';
import type { MarkPhase } from './Mark';
import { Spring, makeLoop, reducedMotion } from './motion';

interface Props {
  lang: Lang;
  state: ConsoleState;
  request: string;
  running: boolean;
  nod: number;
  onRequest: (s: string) => void;
  onRun: () => void;
  onApprove: () => void;
  onReject: () => void;
  onAnswer: (id: string) => void;
  onCompare?: () => void;
}

/**
 * 하단 한 덩어리. 입력 바 → 승인 카드 → 결과로 모양(크기·반경)이 이어서 변하고, 안의 내용만 블러와 함께 바뀐다.
 * 크기는 내용 크기를 측정해 스프링으로 따라간다.
 */
export function Dock({ lang, state, request, running, nod, onRequest, onRun, onApprove, onReject, onAnswer, onCompare }: Props) {
  const { phase, plan, question, payment, result, log } = state;
  const pendingCart = log.find((l) => l.tool === 'cart_add' && l.status === 'awaiting-approval');
  const mode =
    phase === 'payment-gate' && payment ? 'pay'
    : phase === 'needs-input' && question ? 'ask'
    : pendingCart ? 'cart'
    : phase === 'awaiting-approval' && plan?.requiresApproval ? 'plan'
    : running ? 'busy'
    : phase === 'done' && result ? 'done'
    : 'input';
  const decision = mode === 'pay' || mode === 'ask' || mode === 'cart' || mode === 'plan';

  const box = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const sp = useRef<{ w: Spring; h: Spring; r: Spring; loop: ReturnType<typeof makeLoop>; init: boolean } | null>(null);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const w = new Spring(0, 15, 0.86), h = new Spring(0, 15, 0.86), r = new Spring(28, 16, 1);
    const paint = () => { el.style.width = `${w.x.toFixed(1)}px`; el.style.height = `${h.x.toFixed(1)}px`; el.style.borderRadius = `${Math.max(0, r.x).toFixed(1)}px`; };
    const loop = makeLoop((dt) => { w.step(dt); h.step(dt); r.step(dt); paint(); return !(w.settled && h.settled && r.settled); });
    sp.current = { w, h, r, loop, init: false };
    return () => { loop.stop(); sp.current = null; };
  }, []);

  useEffect(() => {
    const s = sp.current, el = inner.current;
    if (!s || !el) return;
    const fit = () => {
      const bw = el.offsetWidth, bh = el.offsetHeight;
      if (!s.init || reducedMotion()) { s.w.snap(bw); s.h.snap(bh); s.r.snap(decision ? 22 : 28); s.init = true; box.current!.style.width = `${bw}px`; box.current!.style.height = `${bh}px`; box.current!.style.borderRadius = `${decision ? 22 : 28}px`; return; }
      s.w.to(bw); s.h.to(bh); s.r.to(decision ? 22 : 28); s.loop.kick();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mode, decision, lang]);

  const mp: MarkPhase = mode === 'busy' ? 'busy' : mode === 'done' ? 'done' : 'idle';

  return (
    <div className={`dock ${decision ? 'decide' : ''}`} role="region" aria-label={t(C.agent, lang)}>
      <div className="dock-box" ref={box}>
        <div className="dock-in" ref={inner}>
          <div className={`dock-c m-${mode}`} key={mode}>
            <Mark variant="dot" size={26} phase={mp} nod={nod} />
            {mode === 'input' && (
              <>
                <input
                  className="dock-field" value={request} placeholder={t(C.requestPh, lang)} aria-label={t(C.request, lang)}
                  onChange={(e) => onRequest(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing && request.trim()) onRun(); }}
                />
                <button className="btn sm primary" disabled={!request.trim()} onClick={onRun}>{t(C.run, lang)}</button>
              </>
            )}
            {mode === 'busy' && <span className="dock-line">{t(PHASE[phase], lang)}</span>}
            {mode === 'done' && result && <span className="dock-line">{t(result.summary, lang)}</span>}
            {mode === 'plan' && (
              <>
                <span className="dock-line">{t(C.planTitle, lang)}</span>
                <button className="btn sm primary ok" onClick={onApprove}>{t(C.approveStart, lang)}</button>
                <button className="btn sm" onClick={onReject}>{t(C.cancel, lang)}</button>
              </>
            )}
            {mode === 'cart' && pendingCart && (
              <>
                <span className="dock-line">{t(pendingCart.label, lang)}</span>
                <button className="btn sm primary ok" onClick={onApprove}>{t(C.approveCart, lang)}</button>
                <button className="btn sm" onClick={onReject}>{t(C.skipCart, lang)}</button>
              </>
            )}
            {mode === 'ask' && question && (
              <>
                <span className="dock-line">{t(question.question, lang)}</span>
                {question.id.startsWith('q-pick') && onCompare && <button className="btn sm primary" onClick={onCompare}>{t(C.compare, lang)}</button>}
                {question.options.map((o) => <button key={o.id} className="btn sm" onClick={() => onAnswer(o.id)}>{t(o.label, lang)}</button>)}
              </>
            )}
            {mode === 'pay' && payment && (
              <>
                <span className="dock-line"><b>{money(payment.total, lang)}</b> <i>{t(C.limitShort, lang)} {money(payment.limit, lang)}</i></span>
                <button className="btn sm primary ok" onClick={onApprove}>{t(C.approvePay, lang)}</button>
                <button className="btn sm danger" onClick={onReject}>{t(C.declinePay, lang)}</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
