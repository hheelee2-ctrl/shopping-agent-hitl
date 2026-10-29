import { Fragment, useEffect, useRef } from 'react';
import { reducedMotion } from './motion';

/** Pretendard Variable 굵기 축. 가늘게 쉬고, 커서 근처만 굵어진다 */
const THIN = 300, REST = 460, BOLD = 820;
/** 끄덕임: 한 글자씩 내려갔다 올라오는 간격(ms)과 길이 */
const STEP = 34, NOD = 560;
const EASE = 'cubic-bezier(0.3, 0.7, 0.2, 1)';

/**
 * 히어로 제목. 글자마다 굵기가 커서와의 거리로 정해지고(가까울수록 굵게), 커서가 없으면 아주 느린 물결로 쉰다.
 * 제목 끝의 라임 점은 마침표 자리의 장식: 커서가 다가가면 끌려오고, 올리거나 누르면 둘째 줄이 끄덕인다(라벨은 두지 않는다).
 * 거리는 글자의 쉬는 자리로 잰다(굵기가 바뀌어도 기준이 흔들리지 않게). 글자 칸 폭은 고정이라 줄이 밀리지 않는다.
 * 히어로를 누르면 그 자리에서 굵기 물결이 퍼지고(터치에서도), 스크롤로 내려가면 두 줄이 서로 반대로 밀리며 가늘어진다.
 * 동작 줄이기 설정이면 굵기만 줄마다 다르게 두고 움직이지 않는다.
 */
export function KineticTitle({ lines }: { lines: string[] }) {
  const host = useRef<HTMLHeadingElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);
  const nodRef = useRef<() => void>(() => {});

  useEffect(() => {
    const h = host.current, d = dotRef.current;
    if (!h || !d) return;
    const chars = [...h.querySelectorAll<HTMLSpanElement>('.kt-c')];
    const last = [...h.querySelectorAll<HTMLSpanElement>('.kt-line:last-child .kt-c')];
    const still = reducedMotion();
    let centers: { x: number; y: number }[] = [];
    let home = { x: 0, y: 0 }, ox = 0, oy = 0;
    const cur = chars.map(() => REST);
    const lift = chars.map(() => 0);
    const lineEls = [...h.querySelectorAll<HTMLSpanElement>('.kt-line')];
    const hero = h.closest('section') ?? h;
    const waves: { x: number; y: number; t0: number }[] = [];
    let px = 0, py = 0, inside = false, raf = 0, seen = true, nodding = false, lastNod = performance.now(), live = true, unlock = 0;

    // 글자 칸 폭을 중간 굵기로 재서 고정하고, 쉬는 자리의 중심을 기록한다
    const measure = () => {
      chars.forEach((c) => { c.style.width = ''; c.style.fontVariationSettings = `'wght' ${REST}`; });
      chars.forEach((c) => { c.style.width = `${c.getBoundingClientRect().width}px`; });
      const r = h.getBoundingClientRect();
      centers = chars.map((c) => { const b = c.getBoundingClientRect(); return { x: b.left - r.left + b.width / 2, y: b.top - r.top + b.height / 2 }; });
      d.style.transform = '';
      const db = d.getBoundingClientRect();
      home = { x: db.left - r.left + db.width / 2, y: db.top - r.top + db.height / 2 };
      ox = 0; oy = 0;
    };

    const nod = () => {
      if (still || nodding) return;
      nodding = true;
      lastNod = performance.now();
      last.forEach((c, i) => c.animate(
        [{ transform: 'translateY(0)' }, { transform: 'translateY(0.09em)' }, { transform: 'translateY(0)' }],
        { duration: NOD, delay: i * STEP, easing: EASE },
      ));
      d.animate([{ translate: '0 0' }, { translate: '0 0.16em' }, { translate: '0 0' }], { duration: NOD, delay: last.length * STEP, easing: EASE });
      unlock = window.setTimeout(() => { nodding = false; }, NOD + last.length * STEP);
    };
    nodRef.current = nod;

    const tick = (now: number) => {
      const fs = parseFloat(getComputedStyle(h).fontSize) || 80;
      const R = fs * 1.6;
      const t = now / 1000;
      // 스크롤: 히어로가 올라간 만큼(0~1) 두 줄이 반대로 밀리고 가늘어진다
      const hr0 = hero.getBoundingClientRect();
      const sp = Math.min(1, Math.max(0, -hr0.top / Math.max(1, hr0.height * 0.7)));
      lineEls.forEach((l, li) => { l.style.transform = `translateX(${((li ? 1 : -1) * sp * fs * 1.2).toFixed(1)}px)`; });
      // 물결: 누른 자리에서 원이 퍼지며 지나가는 글자를 굵게 만든다
      for (let w = waves.length - 1; w >= 0; w--) if (now - waves[w].t0 > 1600) waves.splice(w, 1);
      chars.forEach((c, i) => {
        const p = centers[i];
        if (!p) return;
        let want: number, up = 0;
        if (inside) {
          const k = Math.exp(-(((p.x - px) ** 2 + (p.y - py) ** 2) / (R * R)));
          want = THIN + (BOLD - THIN) * k;
          up = k;
        } else {
          want = REST + 90 * Math.sin(t * 0.9 - p.x / (fs * 2.4));
        }
        for (const w of waves) {
          const r = ((now - w.t0) / 1000) * fs * 9, dist = Math.hypot(p.x - w.x, p.y - w.y);
          const k = Math.exp(-(((dist - r) / (fs * 0.9)) ** 2)) * (1 - (now - w.t0) / 1600);
          want += (BOLD - want) * k;
          up = Math.max(up, k);
        }
        want -= (want - THIN) * sp * 0.8;
        cur[i] += (want - cur[i]) * 0.14;
        lift[i] += (up - lift[i]) * 0.16;
        c.style.fontVariationSettings = `'wght' ${cur[i].toFixed(0)}`;
        c.style.transform = lift[i] > 0.01 ? `translateY(${(-lift[i] * fs * 0.07).toFixed(1)}px)` : '';
      });
      // 라임 점: 반경 안이면 커서 쪽으로 끌려온다(최대 0.18em)
      const dx = px - home.x, dy = py - home.y, max = fs * 0.18;
      const near = inside && Math.hypot(dx, dy) < fs * 1.4;
      const tx = near ? Math.max(-max, Math.min(max, dx * 0.3)) : 0, ty = near ? Math.max(-max, Math.min(max, dy * 0.3)) : 0;
      ox += (tx - ox) * 0.18; oy += (ty - oy) * 0.18;
      d.style.transform = `translate(${ox.toFixed(1)}px, ${oy.toFixed(1)}px)`;
      // 아무도 건드리지 않으면 가끔 스스로 끄덕여 눌러 볼 수 있다는 걸 알린다
      if (!inside && now - lastNod > 7000) nod();
      raf = seen ? requestAnimationFrame(tick) : 0;
    };

    const move = (e: PointerEvent) => {
      const r = h.getBoundingClientRect();
      px = e.clientX - r.left; py = e.clientY - r.top;
      inside = e.pointerType === 'mouse';
    };
    const leave = () => { inside = false; };
    const press = (e: PointerEvent) => {
      if ((e.target as Element).closest('a, button, .kt-dot')) return;
      const r = h.getBoundingClientRect();
      waves.push({ x: e.clientX - r.left, y: e.clientY - r.top, t0: performance.now() });
    };

    let ro: ResizeObserver | null = null, io: IntersectionObserver | null = null;
    void document.fonts.ready.then(() => {
      if (!live) return;
      measure();
      if (still) {
        h.querySelectorAll<HTMLSpanElement>('.kt-line').forEach((l, i) => l.querySelectorAll<HTMLSpanElement>('.kt-c').forEach((c) => { c.style.fontVariationSettings = `'wght' ${i === 0 ? 640 : 420}`; }));
        return;
      }
      ro = new ResizeObserver(() => measure());
      ro.observe(h);
      io = new IntersectionObserver(([e]) => { seen = e.isIntersecting; if (seen && !raf) raf = requestAnimationFrame(tick); });
      io.observe(h);
      // 처음 한 번: 글자가 아래에서 차례로 올라온다
      chars.forEach((c, i) => c.animate([{ opacity: 0, transform: 'translateY(0.35em)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 900, delay: 60 + i * 22, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards' }));
      raf = requestAnimationFrame(tick);
    });
    const zone = hero;
    zone.addEventListener('pointermove', move);
    zone.addEventListener('pointerleave', leave);
    if (!still) hero.addEventListener('pointerdown', press);
    return () => {
      hero.removeEventListener('pointerdown', press);
      live = false;
      window.clearTimeout(unlock);
      cancelAnimationFrame(raf);
      ro?.disconnect(); io?.disconnect();
      zone.removeEventListener('pointermove', move);
      zone.removeEventListener('pointerleave', leave);
    };
  }, [lines.join('\n')]);

  return (
    <h1 ref={host} className="hero-title kt">
      <span className="sr-only">{lines.join(' ')}</span>
      {lines.map((line, li) => (
        <span key={li} className="kt-line">
          <span aria-hidden>
            {line.split(' ').map((w, wi) => (
              <Fragment key={wi}>
                {wi > 0 && ' '}
                <span className="kt-w">{[...w].map((ch, ci) => <span key={ci} className="kt-c">{ch}</span>)}</span>
              </Fragment>
            ))}
          </span>
          {li === lines.length - 1 && (
            <span ref={dotRef} className="kt-dot" aria-hidden onPointerEnter={() => nodRef.current()} onClick={() => nodRef.current()} />
          )}
        </span>
      ))}
    </h1>
  );
}
