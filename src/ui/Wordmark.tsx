import { Mark, type MarkPhase } from './Mark';

interface Props {
  /** 글자 크기(px). 점은 소문자 o 자리에 같은 크기로 들어간다 */
  size?: number;
  nod?: number;
  phase?: MarkPhase;
  tone?: 'brand' | 'on-brand';
  className?: string;
}

/** n●d. o 자리의 점이 에이전트다. 승인하면 끄덕이고, 일하는 동안 천천히 끄덕인다. */
export function Wordmark({ size = 22, nod = 0, phase = 'idle', tone = 'brand', className = '' }: Props) {
  return (
    <span className={`wm wm-${tone} ${className}`} style={{ fontSize: size }} aria-label="Nod" role="img">
      <span aria-hidden>n</span>
      <Mark nod={nod} phase={phase} tone={tone} />
      <span aria-hidden>d</span>
    </span>
  );
}
