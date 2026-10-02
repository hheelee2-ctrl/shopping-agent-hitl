import { useEffect, useRef } from 'react';
import type { CartLine } from '../store/types';
import { reducedMotion } from './motion';

/** 장바구니 수량이 늘면 해당 카드 사진에서 장바구니 버튼까지 작은 조각이 포물선으로 날아간다. */
export function useFlight(cart: CartLine[], enabled: boolean) {
  const prev = useRef<Map<string, number> | null>(null);
  useEffect(() => {
    const now = new Map(cart.map((l) => [l.productId, l.qty]));
    const before = prev.current;
    prev.current = now;
    if (!before || !enabled || reducedMotion()) return;
    const target = document.querySelector<HTMLElement>('[data-cart-btn]');
    if (!target) return;
    const tr = target.getBoundingClientRect();
    let n = 0;
    now.forEach((qty, id) => {
      if (qty <= (before.get(id) ?? 0)) return;
      const src = document.querySelector<HTMLElement>(`[data-pid="${id}"] .sw`);
      if (!src) return;
      const r = src.getBoundingClientRect();
      const sx = r.left + r.width / 2, sy = r.top + r.height / 2;
      const tx = tr.left + tr.width / 2, ty = tr.top + tr.height / 2;
      const el = document.createElement('div');
      el.className = 'flight';
      document.body.appendChild(el);
      const lift = Math.min(160, Math.abs(sy - ty) * 0.5 + 60);
      const a = el.animate([
        { transform: `translate(${sx - 22}px, ${sy - 22}px) scale(1.5)`, opacity: 1, offset: 0 },
        { transform: `translate(${(sx + tx) / 2 - 22}px, ${Math.min(sy, ty) - lift - 22}px) scale(1)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${tx - 22}px, ${ty - 22}px) scale(0.28)`, opacity: 0.2, offset: 1 },
      ], { duration: 720, delay: n++ * 140, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'both' });
      a.onfinish = () => {
        el.remove();
        target.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.14)', offset: 0.35 }, { transform: 'scale(0.97)', offset: 0.7 }, { transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1)' });
      };
    });
  }, [cart, enabled]);
}
