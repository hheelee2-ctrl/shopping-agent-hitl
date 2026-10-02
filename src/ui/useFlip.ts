import { useLayoutEffect, useRef } from 'react';
import { reducedMotion } from './motion';

/** 자식(data-flip)의 위치 변화를 FLIP으로 이어 붙인다. 새로 생긴 자식은 아래에서 떠오른다. */
export function useFlip<T extends HTMLElement>(dep: unknown) {
  const ref = useRef<T>(null);
  const prev = useRef(new Map<string, DOMRect>());
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const next = new Map<string, DOMRect>();
    const kids = Array.from(root.querySelectorAll<HTMLElement>('[data-flip]'));
    kids.forEach((el) => next.set(el.dataset.flip!, el.getBoundingClientRect()));
    if (!reducedMotion() && prev.current.size) {
      let i = 0;
      for (const el of kids) {
        const id = el.dataset.flip!, a = prev.current.get(id), b = next.get(id)!;
        const delay = Math.min(i++ * 22, 260);
        if (a) {
          const dx = a.left - b.left, dy = a.top - b.top;
          if (Math.abs(dx) + Math.abs(dy) > 1) {
            el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 620, delay, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1.04)', fill: 'backwards' });
          }
        } else {
          el.animate([{ opacity: 0, transform: 'translateY(18px) scale(0.97)' }, { opacity: 1, transform: 'none' }], { duration: 520, delay, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards' });
        }
      }
    }
    prev.current = next;
  }, [dep]);
  return ref;
}
