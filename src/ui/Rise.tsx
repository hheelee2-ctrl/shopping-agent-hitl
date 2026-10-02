import type { CSSProperties } from 'react';
import { useReveal } from './useReveal';

interface Props { text: string; delay?: number; className?: string }

/** 글자가 마스크 라인 아래에서 솟아오른다. 화면에 들어올 때 한 번, 글자마다 스프링 같은 ease로 엇박자. */
export function Rise({ text, delay = 0, className = '' }: Props) {
  const ref = useReveal<HTMLSpanElement>();
  let n = 0;
  return (
    <span ref={ref} className={`rise ${className}`} aria-label={text} style={{ '--d': `${delay}ms` } as CSSProperties}>
      {text.split(' ').map((w, wi, arr) => (
        <span key={wi} aria-hidden>
          <span className="rw">
            {[...w].map((ch, ci) => (
              <span key={ci} className="rc" style={{ '--i': n++ } as CSSProperties}>{ch}</span>
            ))}
          </span>
          {wi < arr.length - 1 ? ' ' : ''}
        </span>
      ))}
    </span>
  );
}
