import { useEffect, useId, useRef } from 'react';
import { Spring, clamp, lerp, makeLoop, reducedMotion } from './motion';

/**
 * Nod 마크. 빛과 깊이가 있는 둥근 몸체(사람이 정한 범위) 안의 점 하나(에이전트).
 * 점은 컷 없이 한 도형으로 변한다: 점 → 회전하는 링(작업 중) → 닫히며 체크(완료) → 다시 점.
 * 끄덕임(nod)은 점이 내려앉았다 돌아오는 임펄스이고, 몸체가 같이 눌렸다 펴지며 바닥 그림자가 따라온다.
 * 가만히 있을 때는 몸체가 숨 쉬고 점이 가끔 깜빡인다. follow면 점이 포인터 쪽을 살짝 바라본다.
 */
export type MarkPhase = 'idle' | 'busy' | 'done';

interface Props {
  size?: number;
  /** 값이 바뀔 때마다 끄덕임 한 번 */
  nod?: number;
  phase?: MarkPhase;
  follow?: boolean;
  /** brand: 초록 재질 몸체 / light: 초록 면 위에 올리는 밝은 몸체 */
  tone?: 'brand' | 'light';
  /** dot: 몸체 없이 점만. 워드마크 n●d의 o 자리에 쓴다 */
  variant?: 'body' | 'dot';
  className?: string;
}

const CX = 12;
const CY_IDLE = 11;
const CY_BUSY = 11.5;
const BY = 22; // 몸체 바닥(눌림의 기준선)

interface Engine { phase(p: MarkPhase): void; nod(): void }

export function Mark({ size = 20, nod = 0, phase = 'idle', follow = false, tone = 'brand', variant = 'body', className = '' }: Props) {
  const uid = useId().replace(/:/g, '');
  const svg = useRef<SVGSVGElement>(null);
  const dot = useRef<SVGCircleElement>(null);
  const tick = useRef<SVGPathElement>(null);
  const squash = useRef<SVGGElement>(null);
  const shade = useRef<SVGEllipseElement>(null);
  const flash = useRef<SVGRectElement>(null);
  const eng = useRef<Engine | null>(null);

  useEffect(() => {
    const svgEl = svg.current, c = dot.current, k = tick.current, g = squash.current, sh = shade.current, fl = flash.current;
    if (!svgEl || !c || !k || !g || !sh || !fl) return;
    const calm = reducedMotion();
    const m = new Spring(0, 15);      // 점 → 링
    const close = new Spring(0, 14);  // 링이 닫힘
    const ck = new Spring(0, 16);     // 체크가 그려짐
    const acc = new Spring(0, 10);    // 몸체에 빛이 번짐
    const ny = new Spring(0, 16);     // 끄덕임 오프셋
    const ox = new Spring(0, 12);
    const oy = new Spring(0, 12);
    const bl = new Spring(1, 30, 0.9); // 눈 깜빡임
    const all = [m, close, ck, acc, ny, ox, oy, bl];
    let spin = 0;
    let busy = false;
    let cur: MarkPhase = 'idle';
    let nodTimer = 0;
    let blinkTimer = 0;

    const render = () => {
      const mm = clamp(m.x, 0, 1);
      c.setAttribute('cx', (CX + ox.x * (1 - mm)).toFixed(3));
      c.setAttribute('cy', (lerp(CY_IDLE, CY_BUSY, mm) + ny.x * 0.55 + oy.x * (1 - mm)).toFixed(3));
      c.setAttribute('r', lerp(3.5, 5.6, mm).toFixed(3));
      c.style.fillOpacity = String(clamp(1 - mm * 1.5, 0, 1));
      c.style.strokeOpacity = String(mm * (1 - 0.7 * clamp(ck.x, 0, 1)));
      const arc = lerp(0.72, 1, clamp(close.x, 0, 1));
      c.setAttribute('stroke-dasharray', `${arc.toFixed(3)} ${(1.0001 - arc).toFixed(4)}`);
      c.style.transform = `rotate(${spin.toFixed(1)}deg) scale(1, ${clamp(bl.x, 0.1, 1.05).toFixed(3)})`;
      const ckv = clamp(ck.x, 0, 1);
      k.style.strokeDashoffset = String((1 - ckv).toFixed(3));
      k.style.opacity = ckv > 0.02 ? '1' : '0';
      // 눌림: 점이 내려앉는 양에 비례해 몸체가 납작해지고 그림자가 넓어진다
      const dy = clamp(ny.x, -3, 8);
      const sy = clamp(1 - 0.017 * dy, 0.88, 1.04), sx = 1 + 0.009 * dy;
      g.setAttribute('transform', `translate(${CX} ${BY}) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(${-CX} ${-BY})`);
      sh.setAttribute('rx', (8 * (1 + 0.025 * dy)).toFixed(3));
      sh.style.opacity = String(clamp(0.5 - 0.02 * dy, 0.25, 0.6));
      fl.style.opacity = String((0.34 * clamp(acc.x, 0, 1)).toFixed(3));
    };

    const loop = makeLoop((dt) => {
      if (busy) spin = (spin + 380 * dt) % 360;
      for (const s of all) s.step(dt);
      render();
      return busy || all.some((s) => !s.settled);
    });

    const aim = (s: Spring, v: number) => { s.to(v); if (calm) s.snap(v); };

    const scheduleBlink = () => {
      window.clearTimeout(blinkTimer);
      if (calm) return;
      blinkTimer = window.setTimeout(() => {
        if (cur === 'idle' && !document.hidden) {
          bl.to(0.1); loop.kick();
          window.setTimeout(() => { bl.to(1); loop.kick(); }, 110);
        }
        scheduleBlink();
      }, 2800 + Math.random() * 3800);
    };

    eng.current = {
      phase(p) {
        cur = p;
        busy = p === 'busy' && !calm;
        aim(m, p === 'idle' ? 0 : 1);
        aim(close, p === 'done' ? 1 : 0);
        aim(ck, p === 'done' ? 1 : 0);
        aim(bl, 1);
        if (p !== 'idle') { window.clearTimeout(nodTimer); aim(acc, p === 'done' ? 1 : 0); }
        else aim(acc, 0);
        if (p !== 'idle') { aim(ox, 0); aim(oy, 0); }
        if (p === 'idle') spin = 0;
        render();
        loop.kick();
      },
      nod() {
        if (!calm) ny.v += 225;
        acc.to(1);
        if (calm) acc.snap(1);
        window.clearTimeout(nodTimer);
        nodTimer = window.setTimeout(() => { if (cur === 'idle') { aim(acc, 0); render(); loop.kick(); } }, 520);
        render();
        loop.kick();
      },
    };

    const canFollow = follow && !calm && typeof matchMedia !== 'undefined' && matchMedia('(pointer: fine)').matches;
    const onMove = (e: PointerEvent) => {
      if (cur !== 'idle') return;
      const r = svgEl.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1;
      const f = Math.tanh(d / 260) * 2.6;
      ox.to((dx / d) * f);
      oy.to((dy / d) * f);
      loop.kick();
    };
    if (canFollow) window.addEventListener('pointermove', onMove, { passive: true });
    scheduleBlink();

    render();
    return () => {
      loop.stop();
      window.clearTimeout(nodTimer);
      window.clearTimeout(blinkTimer);
      window.removeEventListener('pointermove', onMove);
      eng.current = null;
    };
  }, [follow]);

  useEffect(() => { eng.current?.phase(phase); }, [phase, follow]);
  useEffect(() => { if (nod > 0) eng.current?.nod(); }, [nod, follow]);

  const gid = `mk-g-${uid}`, hid = `mk-h-${uid}`, rid = `mk-r-${uid}`;
  return (
    <svg
      ref={svg} className={`mark tone-${tone} v-${variant} ${className}`}
      width={variant === 'dot' ? size * (12 / 15) : size} height={size}
      viewBox={variant === 'dot' ? '6 4.5 12 15' : '0 0 24 24'} aria-hidden
    >
      <defs>
        <linearGradient id={gid} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" className="mk-s1" />
          <stop offset="0.5" className="mk-s2" />
          <stop offset="1" className="mk-s3" />
        </linearGradient>
        <linearGradient id={hid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="white" stopOpacity="0.55" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={rid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="white" stopOpacity="0.7" />
          <stop offset="0.55" stopColor="white" stopOpacity="0" />
          <stop offset="1" stopColor="black" stopOpacity="0.18" />
        </linearGradient>
      </defs>
      <ellipse ref={shade} className="mark-shade" cx="12" cy="23.4" rx="8" ry="1.3" />
      <g className="mark-bob">
        <g ref={squash}>
          <rect className="mark-body" x="1.5" y="1" width="21" height="21" rx="7.2" fill={`url(#${gid})`} />
          <rect className="mark-gloss" x="3.2" y="2" width="17.6" height="9.5" rx="5.6" fill={`url(#${hid})`} />
          <rect ref={flash} className="mark-flash" x="1.5" y="1" width="21" height="21" rx="7.2" />
          <rect x="1.9" y="1.4" width="20.2" height="20.2" rx="6.8" fill="none" stroke={`url(#${rid})`} strokeWidth="0.8" />
          <circle ref={dot} className="mark-dot" cx={CX} cy={CY_IDLE} r="3.5" pathLength={1} />
          <path ref={tick} className="mark-tick" d="M8.2 11.9 L11 14.6 L16 8.7" pathLength={1} />
        </g>
      </g>
    </svg>
  );
}
