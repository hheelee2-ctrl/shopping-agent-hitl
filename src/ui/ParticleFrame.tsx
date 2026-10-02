import { useEffect, useRef } from 'react';
import { clamp, reducedMotion } from './motion';

interface P { hx: number; hy: number; x: number; y: number; vx: number; vy: number; d: number; r: number; k: number; f: number }

/** Nod 마크의 프레임(둥근 사각형)을 입자로 조립한다. 포인터가 흩뜨리고, 승인(pulse)이 오면 한 번 퍼졌다 돌아온다. */
export function ParticleFrame({ pulse }: { pulse: number }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const kick = useRef(0);
  const last = useRef(pulse);
  useEffect(() => { if (pulse !== last.current) { last.current = pulse; kick.current = performance.now(); } }, [pulse]);

  useEffect(() => {
    const c = cv.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const still = reducedMotion();
    let W = 0, H = 0, dpr = 1, raf = 0, visible = true, t0 = performance.now(), prev = t0, flash = 0;
    let ps: P[] = [];
    const ptr = { x: -9999, y: -9999, on: false };
    let ink = 'gray', dim = 'gray', acc = 'green';
    const readColors = () => {
      const s = getComputedStyle(c);
      ink = s.getPropertyValue('--ink-2').trim() || ink;
      dim = s.getPropertyValue('--ink-3').trim() || dim;
      acc = s.getPropertyValue('--accent').trim() || acc;
    };

    const build = () => {
      const side = Math.min(W, H) * 0.96;
      const cx = W / 2, cy = H / 2, R = side * 0.2, half = side / 2;
      const n = Math.round(clamp(side * 1.15, 260, 520));
      // 둥근 사각형 둘레를 호길이 기준 균등 샘플
      const straight = side - 2 * R, arc = (Math.PI / 2) * R, per = 4 * straight + 4 * arc;
      const pt = (s: number) => {
        s = ((s % per) + per) % per;
        const seg = [straight, arc, straight, arc, straight, arc, straight, arc];
        let i = 0;
        while (s > seg[i]) { s -= seg[i]; i++; }
        const u = s / seg[i];
        switch (i) {
          case 0: return [cx - half + R + u * straight, cy - half];
          case 1: { const a = -Math.PI / 2 + u * Math.PI / 2; return [cx + half - R + R * Math.cos(a), cy - half + R + R * Math.sin(a)]; }
          case 2: return [cx + half, cy - half + R + u * straight];
          case 3: { const a = u * Math.PI / 2; return [cx + half - R + R * Math.cos(a), cy + half - R + R * Math.sin(a)]; }
          case 4: return [cx + half - R - u * straight, cy + half];
          case 5: { const a = Math.PI / 2 + u * Math.PI / 2; return [cx - half + R + R * Math.cos(a), cy + half - R + R * Math.sin(a)]; }
          case 6: return [cx - half, cy + half - R - u * straight];
          default: { const a = Math.PI + u * Math.PI / 2; return [cx - half + R + R * Math.cos(a), cy - half + R + R * Math.sin(a)]; }
        }
      };
      ps = Array.from({ length: n }, (_, i) => {
        const [hx, hy] = pt((i / n) * per);
        const ang = Math.random() * Math.PI * 2, rad = side * (0.7 + Math.random() * 0.6);
        return {
          hx, hy, x: cx + Math.cos(ang) * rad, y: cy + Math.sin(ang) * rad, vx: 0, vy: 0,
          d: 0.15 + (i / n) * 0.9 + Math.random() * 0.15,   // 조립 시작 지연(초): 둘레를 따라 감기듯 조립
          r: 1.3 + Math.random() * 1.4, k: 38 + Math.random() * 22, f: 0,
        };
      });
    };

    const size = () => {
      const r = c.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      readColors();
      build();
      t0 = performance.now();
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of ps) {
        ctx.globalAlpha = 0.5 + 0.5 * clamp(1 - Math.hypot(p.x - p.hx, p.y - p.hy) / 60, 0, 1);
        ctx.fillStyle = p.f > 0.04 ? acc : (p.r > 2 ? ink : dim);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + p.f * 0.9), 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const tick = (now: number) => {
      raf = 0;
      if (!visible) return;
      const dt = Math.min((now - prev) / 1000, 1 / 30); prev = now;
      const el = (now - t0) / 1000;
      if (kick.current && now - kick.current < 40 && flash === 0) {
        flash = 1;
        for (const p of ps) { const dx = p.x - W / 2, dy = p.y - H / 2, m = Math.hypot(dx, dy) || 1; p.vx += (dx / m) * 160; p.vy += (dy / m) * 160; p.f = 1; }
      }
      if (now - kick.current > 120) flash = 0;
      for (const p of ps) {
        if (el < p.d) continue;
        // 임계감쇠 스프링으로 home에 수렴
        const w = Math.sqrt(p.k), z = 2 * w * 0.82;
        let ax = (p.hx - p.x) * p.k - p.vx * z, ay = (p.hy - p.y) * p.k - p.vy * z;
        if (ptr.on) {
          const dx = p.x - ptr.x, dy = p.y - ptr.y, d2 = dx * dx + dy * dy, R = 110;
          if (d2 < R * R) { const d = Math.sqrt(d2) || 1, f = (1 - d / R) ** 2 * 5200; ax += (dx / d) * f; ay += (dy / d) * f; }
        }
        p.vx += ax * dt; p.vy += ay * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        p.f = Math.max(0, p.f - dt * 1.7);
      }
      draw();
      raf = requestAnimationFrame(tick);
    };
    const start = () => { if (!raf && visible) { prev = performance.now(); raf = requestAnimationFrame(tick); } };

    size();
    if (still) { for (const p of ps) { p.x = p.hx; p.y = p.hy; } draw(); }
    else start();

    const onMove = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top;
      ptr.on = ptr.x > -80 && ptr.y > -80 && ptr.x < r.width + 80 && ptr.y < r.height + 80;
    };
    const onLeave = () => { ptr.on = false; };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    const ro = new ResizeObserver(() => { size(); if (still) { for (const p of ps) { p.x = p.hx; p.y = p.hy; } draw(); } });
    ro.observe(c);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !still) start(); });
    io.observe(c);
    const mo = new MutationObserver(readColors);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      ro.disconnect(); io.disconnect(); mo.disconnect();
    };
  }, []);

  return <canvas ref={cv} className="pframe" aria-hidden="true" />;
}
