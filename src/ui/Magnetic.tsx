import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Spring, makeLoop, reducedMotion } from './motion';

/** 포인터가 가까워지면 그쪽으로 살짝 끌려온다. 놓이면 스프링으로 제자리. */
export function Magnetic({ children, radius = 120, pull = 0.3 }: { children: ReactNode; radius?: number; pull?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion() || !matchMedia('(pointer: fine)').matches) return;
    const x = new Spring(0, 14, 0.8);
    const y = new Spring(0, 14, 0.8);
    const loop = makeLoop((dt) => {
      x.step(dt); y.step(dt);
      el.style.transform = `translate(${x.x.toFixed(2)}px, ${y.x.toFixed(2)}px)`;
      return !(x.settled && y.settled);
    });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy);
      const near = d < radius + Math.max(r.width, r.height) / 2;
      x.to(near ? dx * pull : 0);
      y.to(near ? dy * pull : 0);
      loop.kick();
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => { window.removeEventListener('pointermove', move); loop.stop(); };
  }, [radius, pull]);
  return <span ref={ref} className="mag">{children}</span>;
}
