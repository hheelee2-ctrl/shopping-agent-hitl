import { useEffect, useRef } from 'react';
import { reducedMotion } from './motion';

/**
 * Nod의 점. 브랜드의 유일한 기호이자, 에이전트의 상태 표시다.
 * - idle: 가만히 있다
 * - busy: 일하는 동안 천천히 끄덕인다 (생각 중)
 * - done: 한 번 크게 끄덕이고 둘레로 퍼지는 링이 남는다
 * - nod 값이 바뀔 때마다 한 번 끄덕인다 (사람이 승인한 순간)
 * 모양은 언제나 점 하나다. 크기·위치가 바뀌지 않아서 워드마크 n●d의 간격이 흔들리지 않는다.
 */
export type MarkPhase = 'idle' | 'busy' | 'done';

interface Props {
  /** px. 없으면 글자 크기(em)를 따른다 */
  size?: number;
  nod?: number;
  phase?: MarkPhase;
  /** on-brand: 초록 면 위에서 흰 점 */
  tone?: 'brand' | 'on-brand' | 'ink';
  className?: string;
}

const NOD: Keyframe[] = [
  { transform: 'translateY(0) scale(1, 1)' },
  { transform: 'translateY(26%) scale(1.1, 0.86)', offset: 0.32 },
  { transform: 'translateY(-6%) scale(0.97, 1.04)', offset: 0.68 },
  { transform: 'translateY(0) scale(1, 1)' },
];

export function nodOnce(el: HTMLElement | null, strong = false) {
  if (!el || reducedMotion()) return;
  el.animate(NOD, { duration: strong ? 640 : 520, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
}

export function Mark({ size, nod = 0, phase = 'idle', tone = 'brand', className = '' }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => { if (nod > 0) nodOnce(ref.current); }, [nod]);
  useEffect(() => { if (phase === 'done') nodOnce(ref.current, true); }, [phase]);
  return (
    <span
      ref={ref}
      className={`nd ph-${phase} t-${tone} ${className}`}
      style={size ? { width: size, height: size } : undefined}
      aria-hidden
    />
  );
}
