import { Mark, type MarkPhase } from './Mark';

interface Props {
  /** 글자 크기(px). 원은 소문자 o 자리에 같은 크기로 들어간다 */
  size?: number;
  phase?: MarkPhase;
  tone?: 'brand' | 'on-brand';
  className?: string;
}

/** n●d. o 자리의 원이 에이전트다. 일하는 동안 안에서 호가 돌고, 끝나면 안에 체크가 들어간다. */
export function Wordmark({ size = 22, phase = 'idle', tone = 'brand', className = '' }: Props) {
  return (
    <span className={`wm wm-${tone} ${className}`} style={{ fontSize: size }} aria-label="Nod" role="img">
      <span aria-hidden>n</span>
      <Mark phase={phase} tone={tone} />
      <span aria-hidden>d</span>
    </span>
  );
}
