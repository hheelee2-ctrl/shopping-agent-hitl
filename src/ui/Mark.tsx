import { useEffect, useRef } from 'react';
import { Spring, clamp, lerp, makeLoop, reducedMotion } from './motion';

/**
 * Nod 마크. 둥근 사각형(사람이 정한 범위) 안의 점 하나(에이전트).
 * 점은 컷 없이 한 도형으로 변한다: 점 → 회전하는 링(작업 중) → 닫히며 체크(완료) → 다시 점.
 * 끄덕임(nod)은 점이 아래로 한 번 내려앉았다 돌아오는 임펄스(임계감쇠, 오버슈트 없음).
 * follow면 점이 포인터 쪽을 살짝 바라본다.
 */
export type MarkPhase = 'idle' | 'busy' | 'done';

interface Props {
  size?: number;
  /** 값이 바뀔 때마다 끄덕임 한 번 */
  nod?: number;
  phase?: MarkPhase;
  follow?: boolean;
  className?: string;
}

const CX = 12;
const CY_IDLE = 10;
const CY_BUSY = 12;
const mix = (a: number) => `color-mix(in srgb, var(--accent) ${(a * 100).toFixed(1)}%, var(--ink))`;

interface Engine { phase(p: MarkPhase): void; nod(): void }

export function Mark({ size = 20, nod = 0, phase = 'idle', follow = false, className = '' }: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const dot = useRef<SVGCircleElement>(null);
  const tick = useRef<SVGPathElement>(null);
  const eng = useRef<Engine | null>(null);

  useEffect(() => {
    const svgEl = svg.current, c = dot.current, k = tick.current;
    if (!svgEl || !c || !k) return;
    const calm = reducedMotion();
    const m = new Spring(0, 15);      // 점 → 링
    const close = new Spring(0, 14);  // 링이 닫힘
    const ck = new Spring(0, 16);     // 체크가 그려짐
    const acc = new Spring(0, 10);    // accent 혼합
    const ny = new Spring(0, 16);     // 끄덕임 오프셋
    const ox = new Spring(0, 12);
    const oy = new Spring(0, 12);
    const all = [m, close, ck, acc, ny, ox, oy];
    let spin = 0;
    let busy = false;
    let cur: MarkPhase = 'idle';
    let nodTimer = 0;

    const render = () => {
      const mm = clamp(m.x, 0, 1);
      c.setAttribute('cx', (CX + ox.x * (1 - mm)).toFixed(3));
      c.setAttribute('cy', (lerp(CY_IDLE, CY_BUSY, mm) + ny.x + oy.x * (1 - mm)).toFixed(3));
      c.setAttribute('r', lerp(3.2, 5.4, mm).toFixed(3));
      const col = mix(clamp(acc.x, 0, 1));
      c.style.fill = col;
      c.style.stroke = col;
      c.style.fillOpacity = String(clamp(1 - mm * 1.5, 0, 1));
      c.style.strokeOpacity = String(mm * (1 - 0.7 * clamp(ck.x, 0, 1)));
      const arc = lerp(0.72, 1, clamp(close.x, 0, 1));
      c.setAttribute('stroke-dasharray', `${arc.toFixed(3)} ${(1.0001 - arc).toFixed(4)}`);
      c.style.transform = `rotate(${spin.toFixed(1)}deg)`;
      const ckv = clamp(ck.x, 0, 1);
      k.style.strokeDashoffset = String((1 - ckv).toFixed(3));
      k.style.stroke = col;
      k.style.opacity = ckv > 0.02 ? '1' : '0';
    };

    const loop = makeLoop((dt) => {
      if (busy) spin = (spin + 380 * dt) % 360;
      for (const s of all) s.step(dt);
      render();
      return busy || all.some((s) => !s.settled);
    });

    const aim = (s: Spring, v: number) => { s.to(v); if (calm) s.snap(v); };

    eng.current = {
      phase(p) {
        cur = p;
        busy = p === 'busy' && !calm;
        aim(m, p === 'idle' ? 0 : 1);
        aim(close, p === 'done' ? 1 : 0);
        aim(ck, p === 'done' ? 1 : 0);
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
      const f = Math.tanh(d / 260) * 2.3;
      ox.to((dx / d) * f);
      oy.to((dy / d) * f);
      loop.kick();
    };
    if (canFollow) window.addEventListener('pointermove', onMove, { passive: true });

    render();
    return () => {
      loop.stop();
      window.clearTimeout(nodTimer);
      window.removeEventListener('pointermove', onMove);
      eng.current = null;
    };
  }, [follow]);

  useEffect(() => { eng.current?.phase(phase); }, [phase, follow]);
  useEffect(() => { if (nod > 0) eng.current?.nod(); }, [nod, follow]);

  return (
    <svg ref={svg} className={`mark ${className}`} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <rect className="mark-frame" x="1.5" y="1.5" width="21" height="21" rx="6.5" />
      <circle ref={dot} className="mark-dot" cx={CX} cy={CY_IDLE} r="3.2" pathLength={1} />
      <path ref={tick} className="mark-tick" d="M8.3 12.4 L11 15 L15.9 9.2" pathLength={1} />
    </svg>
  );
}
