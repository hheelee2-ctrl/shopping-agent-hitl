import { useEffect, useRef, useState } from 'react';
import type { Lang } from '../engine/types';
import { ConfRing } from './ConfRing';
import { LAND, TOUR } from './landCopy';
import { Wordmark } from './Wordmark';
import { reducedMotion } from './motion';
import { money, t, SV } from './copy';
import { officialId, SELLERS } from '../store/sellers';
import { Seg } from './Seg';

const STEPS = 4;

/** 요청 문장을 글자 단위로 타이핑한다. reduced-motion이면 한 번에 보여준다. */
function useTyped(text: string, on: boolean) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!on) { setN(0); return; }
    if (reducedMotion()) { setN(text.length); return; }
    setN(0);
    const id = window.setInterval(() => setN((k) => { if (k >= text.length) { window.clearInterval(id); return k; } return k + 1; }), 46);
    return () => window.clearInterval(id);
  }, [text, on]);
  return text.slice(0, n);
}

function Stage({ step, lang, onNext }: { step: number; lang: Lang; onNext: () => void }) {
  const [added, setAdded] = useState(false);
  const [limit, setLimit] = useState(300000);
  useEffect(() => { if (step < 2) setAdded(false); }, [step]);
  const req = t(TOUR.request, lang);
  const typed = useTyped(req, step === 0);
  const over = TOUR.price > limit;

  return (
    <div className="tour-stage" aria-live="polite">
      <div className="tour-bar">
        <Wordmark size={18} />
        <span className="tour-bar-t">{t(TOUR.stageTitle, lang)}</span>
        <span className={`tour-cart ${added ? 'on' : ''}`}>{t(TOUR.cart, lang)} {added ? 1 : 0}</span>
      </div>

      <div className="tour-body" key={step}>
        {step === 0 && (
          <div className="tp">
            <p className="label">{t(TOUR.reqLabel, lang)}</p>
            <div className="tour-input">{typed}<i className="caret" /></div>
            <div className="tour-chips">
              {TOUR.chips.map((c, i) => <span key={i} className="chip" style={{ '--i': i } as React.CSSProperties}><i>{t(c.l, lang)}</i>{t(c.v, lang)}</span>)}
            </div>
          </div>
        )}
        {step === 1 && (
          <div className="tp">
            <p className="label">{t(TOUR.planLabel, lang)}</p>
            <ol className="steps tour-plan">
              {TOUR.plan.map((s, i) => (
                <li key={i} style={{ '--i': i } as React.CSSProperties}><span className="tp-n">{i + 1}</span><span>{t(s, lang)}</span></li>
              ))}
            </ol>
            <p className="note">{t(TOUR.planNote, lang)}</p>
          </div>
        )}
        {step === 2 && (
          <div className="tp">
            <p className="label">{t(TOUR.addLabel, lang)}</p>
            <div className="tour-prod">
              <div className="tour-swatch" aria-hidden />
              <div>
                <b>{t(TOUR.product, lang)}</b>
                <p className="note">{money(TOUR.price, lang)}, {t(SELLERS[officialId('NOIR LAB')].name, lang)}, {t(SV.freeShip, lang)}</p>
              </div>
              <span className="conf"><ConfRing level="high" /><span className="pill high">{t(TOUR.conf, lang)}</span></span>
            </div>
            {!added ? (
              <div className="row">
                <button className="btn primary" onClick={() => setAdded(true)}>{t(TOUR.approve, lang)}</button>
                <button className="btn" onClick={onNext}>{t(TOUR.skip, lang)}</button>
              </div>
            ) : (
              <div className="tour-done">
                <span className="tour-ok" aria-hidden>✓</span>
                <span>{t(TOUR.added, lang)}</span>
                <button className="btn sm" onClick={onNext}>{t(TOUR.toPay, lang)}</button>
              </div>
            )}
          </div>
        )}
        {step === 3 && (
          <div className="tp">
            <p className="label">{t(TOUR.payLabel, lang)}</p>
            <div className="total"><span className="big">{money(TOUR.price, lang)}</span><span className="note">{t(TOUR.limitShort, lang)} {money(limit, lang)}</span></div>
            <div className="tour-meter" aria-hidden><i style={{ transform: `scaleX(${Math.min(1, TOUR.price / limit)})` }} className={over ? 'over' : ''} /></div>
            <Seg options={[{ value: 150000, label: money(150000, lang).replace('KRW ', '') }, { value: 300000, label: money(300000, lang).replace('KRW ', '') }]} value={limit} onChange={setLimit} label={t(TOUR.limitLabel, lang)} />
            {over && <p className="warnline">{t(TOUR.over, lang)}</p>}
            <p className="note">{t(TOUR.payNote, lang)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function Tour({ lang }: { lang: Lang }) {
  const [step, setStep] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const hold = useRef(0); // 직접 눌렀을 때 잠깐 스크롤 동기화를 멈춘다

  // 스크롤 위치 → 단계. 감시용 구간 4개를 IntersectionObserver로 본다 (scroll 이벤트 없음)
  useEffect(() => {
    const el = track.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((es) => {
      if (performance.now() < hold.current) return;
      for (const e of es) if (e.isIntersecting) setStep(Number((e.target as HTMLElement).dataset.i));
    }, { rootMargin: '-45% 0px -45% 0px' });
    el.querySelectorAll('.tour-sent').forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);

  const go = (i: number) => { hold.current = performance.now() + 900; setStep(Math.max(0, Math.min(STEPS - 1, i))); };

  return (
    <div className="tour" ref={track}>
      <div className="tour-sents" aria-hidden>
        {Array.from({ length: STEPS }, (_, i) => <div key={i} className="tour-sent" data-i={i} />)}
      </div>
      <div className="tour-sticky">
        <ol className="tour-steps">
          {LAND.steps.map((s, i) => (
            <li key={i}>
              <button className={`tour-step ${i === step ? 'on' : ''} ${i < step ? 'past' : ''}`} onClick={() => go(i)} aria-current={i === step ? 'step' : undefined}>
                <span className="num">{i + 1}</span>
                <span className="tour-step-t"><b>{t(s.t, lang)}</b><span>{t(s.d, lang)}</span></span>
              </button>
            </li>
          ))}
        </ol>
        <Stage step={step} lang={lang} onNext={() => go(step + 1)} />
      </div>
    </div>
  );
}
