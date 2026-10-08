import { useEffect, useLayoutEffect, useRef } from 'react';
import { Spring, makeLoop, reducedMotion } from './motion';

interface Option<T> { value: T; label: string }
interface Props<T extends string | number> {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  disabled?: boolean;
}

/**
 * 선택 표시가 옵션 사이를 미끄러지는 세그먼트.
 * 인디케이터의 양쪽 가장자리가 서로 다른 스프링을 타서, 가는 방향의 앞쪽 가장자리가 먼저 늘어나고 뒤쪽이 따라온다(liquid).
 */
export function Seg<T extends string | number>({ options, value, onChange, label, disabled }: Props<T>) {
  const host = useRef<HTMLDivElement>(null);
  const ind = useRef<HTMLSpanElement>(null);
  const btns = useRef<(HTMLButtonElement | null)[]>([]);
  const st = useRef<{ l: Spring; r: Spring; loop: ReturnType<typeof makeLoop>; init: boolean } | null>(null);
  const found = options.findIndex((o) => o.value === value);
  const i = Math.max(0, found);

  useLayoutEffect(() => {
    const el = ind.current;
    if (!el) return;
    const l = new Spring(0, 13);
    const r = new Spring(0, 13);
    const paint = () => { el.style.transform = `translateX(${l.x.toFixed(2)}px)`; el.style.width = `${Math.max(0, r.x - l.x).toFixed(2)}px`; };
    const loop = makeLoop((dt) => { l.step(dt); r.step(dt); paint(); return !(l.settled && r.settled); });
    st.current = { l, r, loop, init: false };
    return () => { loop.stop(); st.current = null; };
  }, []);

  useEffect(() => {
    const s = st.current, b = btns.current[i], h = host.current;
    if (!s || !b || !h) return;
    const place = () => {
      const left = b.offsetLeft, right = b.offsetLeft + b.offsetWidth;
      const prevMid = (s.l.target + s.r.target) / 2;
      const goingRight = (left + right) / 2 >= prevMid;
      // 앞쪽 가장자리는 빠르게, 뒤쪽은 느리게
      s.l.w = goingRight ? 10 : 20;
      s.r.w = goingRight ? 20 : 10;
      s.l.to(left); s.r.to(right);
      if (!s.init || reducedMotion()) { s.l.snap(left); s.r.snap(right); s.init = true; }
      s.loop.kick();
    };
    place();
    const ro = new ResizeObserver(() => { const left = b.offsetLeft, right = left + b.offsetWidth; s.l.snap(left); s.r.snap(right); s.loop.kick(); });
    ro.observe(h);
    return () => ro.disconnect();
  }, [i, options.length]);

  return (
    <div className="seg2" role="group" aria-label={label} ref={host}>
      <span className="seg2-ind" ref={ind} aria-hidden style={found === -1 ? { opacity: 0 } : undefined} />
      {options.map((o, n) => (
        <button key={String(o.value)} ref={(el) => { btns.current[n] = el; }} aria-pressed={o.value === value} disabled={disabled} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
