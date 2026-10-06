import { useEffect, useRef, useState } from 'react';
import type { Lang } from '../engine/types';
import { photoUrl } from '../store/photos';
import { officialId, scheduleOf, SELLERS } from '../store/sellers';
import { SellerBadge, Terms } from './Sellers';
import { money, t } from './copy';
import { LAND, TOUR } from './landCopy';
import type { MarkPhase } from './Mark';
import { Wordmark } from './Wordmark';
import { Spring, clamp, makeLoop, reducedMotion, track } from './motion';

type Stage = 'idle' | 'busy' | 'done';

/** 자동 재생 한 바퀴(초). 마지막 프레임 = 첫 프레임이라 끊김 없이 반복된다. */
const LOOP = 7.4;
const T_PRESS = 1.95;
const T_BUSY = 2.25;
const T_DONE = 3.55;
const T_IDLE = 5.5;

interface Geo { bx: number; by: number; px: number; py: number; w: number; h: number }

/**
 * 히어로 데모. 가상 커서가 담기 버튼을 누르면 로고의 원 안에서 호가 돌다가 체크가 들어간다.
 * 커서와 판의 기울기는 시간 t만의 순수 함수(스프링의 합)이고, 사용자가 포인터를 올리면 그 포인터가 대신 조작한다.
 */
export function HeroDemo({ lang, onDone }: { lang: Lang; onDone?: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const plate = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const cur = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [press, setPress] = useState(false);
  const manual = useRef(false);
  const timers = useRef<number[]>([]);
  const stageRef = useRef<Stage>('idle');
  const pressRef = useRef(false);

  const go = (s: Stage) => { if (stageRef.current !== s) { stageRef.current = s; setStage(s); if (s === 'done') onDone?.(); } };
  const setP = (p: boolean) => { if (pressRef.current !== p) { pressRef.current = p; setPress(p); } };
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };
  const clearTimers = () => { timers.current.forEach(window.clearTimeout); timers.current = []; };

  /** 사용자가 직접 누른 경우의 같은 시퀀스 */
  const runManual = () => {
    if (stageRef.current !== 'idle') return;
    setP(true);
    later(() => setP(false), 140);
    later(() => go('busy'), 260);
    later(() => go('done'), 1500);
    later(() => go('idle'), 3600);
  };

  useEffect(() => {
    const h = host.current, pl = plate.current, bd = body.current, bt = btn.current, cu = cur.current;
    if (!h || !pl || !bd || !bt || !cu) return;
    const calm = reducedMotion();
    const tx = new Spring(0, 9);
    const ty = new Spring(0, 9);
    let geo: Geo = { bx: 0, by: 0, px: 0, py: 0, w: 1, h: 1 };
    const measure = () => {
      geo = {
        bx: bt.offsetLeft + bt.offsetWidth * 0.55,
        by: bt.offsetTop + bt.offsetHeight * 0.55,
        px: bd.offsetWidth * 0.9,
        py: bd.offsetHeight * 1.04,
        w: bd.offsetWidth, h: bd.offsetHeight,
      };
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(bd);

    let t0 = 0;
    let visible = true;
    let mx = 0, my = 0; // 실제 포인터(-0.5..0.5)

    const frame = (dt: number) => {
      if (!manual.current && visible && !calm) {
        if (!t0) t0 = performance.now();
        const t = ((performance.now() - t0) / 1000) % LOOP;
        const kx = [{ t: 0.9, to: geo.bx }, { t: 5.7, to: geo.px }];
        const ky = [{ t: 0.82, to: geo.by }, { t: 5.62, to: geo.py }];
        const cx = track(t, geo.px, kx, 6.5);
        const cy = track(t, geo.py, ky, 6.5);
        const down = t >= T_PRESS && t < T_BUSY - 0.12;
        cu.style.opacity = '1';
        cu.style.transform = `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px) scale(${down ? 0.84 : 1})`;
        setP(down);
        const next: Stage = t >= T_IDLE ? 'idle' : t >= T_DONE ? 'done' : t >= T_BUSY ? 'busy' : 'idle';
        go(next);
        tx.to(clamp(cx / geo.w - 0.5, -0.5, 0.5));
        ty.to(clamp(cy / geo.h - 0.5, -0.5, 0.5));
      } else {
        cu.style.opacity = '0';
        tx.to(mx); ty.to(my);
      }
      tx.step(dt); ty.step(dt);
      pl.style.transform = `perspective(900px) rotateX(${(-ty.x * 9).toFixed(2)}deg) rotateY(${(tx.x * 12).toFixed(2)}deg)`;
      return !calm && visible;
    };
    const loop = makeLoop(frame);
    if (!calm) loop.kick();

    const io = new IntersectionObserver(([e]) => { visible = !!e?.isIntersecting; if (visible) { t0 = 0; loop.kick(); } }, { threshold: 0.2 });
    io.observe(h);

    const enter = () => { manual.current = true; clearTimers(); setP(false); go('idle'); };
    const move = (e: PointerEvent) => {
      const r = h.getBoundingClientRect();
      mx = clamp((e.clientX - r.left) / r.width - 0.5, -0.5, 0.5);
      my = clamp((e.clientY - r.top) / r.height - 0.5, -0.5, 0.5);
      loop.kick();
    };
    const leave = () => {
      mx = 0; my = 0;
      clearTimers();
      later(() => { manual.current = false; t0 = 0; loop.kick(); }, 1400);
    };
    h.addEventListener('pointerenter', enter);
    h.addEventListener('pointermove', move);
    h.addEventListener('pointerleave', leave);
    return () => {
      loop.stop(); ro.disconnect(); io.disconnect(); clearTimers();
      h.removeEventListener('pointerenter', enter);
      h.removeEventListener('pointermove', move);
      h.removeEventListener('pointerleave', leave);
    };
  }, []);

  const phase: MarkPhase = stage === 'busy' ? 'busy' : stage === 'done' ? 'done' : 'idle';
  const label = stage === 'idle' ? t(LAND.demoBtn, lang) : stage === 'busy' ? t(LAND.demoBusy, lang) : t(LAND.demoDone, lang);
  const line = stage === 'done' ? t(LAND.demoDoneLine, lang) : t(LAND.demoLine, lang);
  const seller = SELLERS[officialId('NOIR LAB')];
  const arrive = scheduleOf(seller, Date.now()).arriveAt;

  return (
    <div className="demo" ref={host}>
      <div className="plate" ref={plate}>
        <div className="plate-shell">
          <div className="plate-body" ref={body}>
            <div className="hd-top">
              <Wordmark size={22} phase={phase} />
              <span>{t(LAND.demoTag, lang)}</span>
            </div>
            <div className="hd-prod">
              <span className="hd-ph sw sw-black">{photoUrl('c1') && <img className="ph" src={photoUrl('c1')!} alt="" />}</span>
              <div>
                <div className="brand">NOIR LAB</div>
                <p className="hd-name">{t(TOUR.product, lang)}</p>
                <span className="hd-size">M</span>
              </div>
            </div>
            <div className="hd-seller">
              <SellerBadge s={seller} lang={lang} size={22} />
              <b>{t(seller.name, lang)}</b>
              <strong>{money(TOUR.price, lang)}</strong>
            </div>
            <Terms shipping={0} arriveAt={arrive} now={Date.now()} s={seller} lang={lang} />
            <div className="plate-card">
              <p className="plate-line"><span key={`${stage === 'done'}-${lang}`} className="swap">{line}</span></p>
              <button
                ref={btn} className={`btn nod plate-btn ${stage === 'done' ? 'ok' : ''} ${press ? 'press' : ''}`}
                onClick={runManual} aria-live="polite"
              >
                <span key={`${stage}-${lang}`} className="swap">{label}</span>
              </button>
            </div>
            <div className="cursor" ref={cur} aria-hidden data-down={press}>
              <span className="cursor-ripple" />
              <svg viewBox="0 0 24 24" width="22" height="22"><path d="M5 3l14 7.2-6 1.8-2.2 6z" /></svg>
            </div>
          </div>
          <p className="plate-hint">{t(LAND.demoHint, lang)}</p>
        </div>
      </div>
    </div>
  );
}
