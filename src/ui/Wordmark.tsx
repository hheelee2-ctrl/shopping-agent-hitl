import { Mark, type MarkPhase } from './Mark';

interface Props {
  /** 글자 크기(px). 점은 소문자 높이에 맞춘다 */
  size?: number;
  nod?: number;
  phase?: MarkPhase;
  follow?: boolean;
  className?: string;
}

/** n●d. o 자리의 점이 에이전트다. 승인할 때마다 끄덕이고, 일하는 동안 링으로 돈다. */
export function Wordmark({ size = 22, nod = 0, phase = 'idle', follow = false, className = '' }: Props) {
  return (
    <span className={`wm ${className}`} style={{ fontSize: size }} aria-label="Nod" role="img">
      <span aria-hidden>n</span>
      <Mark variant="dot" size={size * 0.98} nod={nod} phase={phase} follow={follow} />
      <span aria-hidden>d</span>
    </span>
  );
}
