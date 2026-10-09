import { useEffect, useRef, type CSSProperties } from 'react';
import { reducedMotion } from './motion';

/**
 * 스크롤에 맞춰 단어가 흐린 색에서 진한 색으로 차례로 밝아지는 문장.
 * 문장 위쪽이 화면 아래 85% 지점에 닿을 때 시작해 35% 지점에서 다 밝아진다.
 * 동작 줄이기 설정이면 처음부터 다 밝다.
 */
export function ScrollWords({ text }: { text: string }) {
  const host = useRef<HTMLParagraphElement>(null);
  const words = text.split(' ');

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    if (reducedMotion()) { el.style.setProperty('--p', '1'); return; }
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (vh * 0.5 + r.height * 0.6)));
      el.style.setProperty('--p', p.toFixed(3));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
  }, []);

  return (
    <p className="words" ref={host} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} aria-hidden style={{ '--k': (i + 0.5) / words.length } as CSSProperties}>{w}{i < words.length - 1 ? ' ' : ''}</span>
      ))}
    </p>
  );
}
