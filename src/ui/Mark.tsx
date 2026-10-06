/**
 * Nod의 점. 브랜드 기호이자 에이전트 상태 표시.
 * 어떤 상태에서도 같은 크기의 원이다. 안쪽만 바뀐다: 비어 있음(idle) → 안에서 도는 호(busy) → 안에 체크(done).
 * 그래서 워드마크 n●d의 간격이 상태와 관계없이 그대로다.
 */
export type MarkPhase = 'idle' | 'busy' | 'done';

interface Props {
  /** px. 없으면 글자 크기(em)를 따른다 */
  size?: number;
  phase?: MarkPhase;
  /** on-brand: 초록 면 위의 흰 원 */
  tone?: 'brand' | 'on-brand';
  className?: string;
}

export function Mark({ size, phase = 'idle', tone = 'brand', className = '' }: Props) {
  return (
    <svg
      className={`nd ph-${phase} t-${tone} ${className}`} viewBox="0 0 24 24"
      style={size ? { width: size, height: size } : undefined} aria-hidden
    >
      <circle className="nd-c" cx="12" cy="12" r="12" />
      <circle className="nd-arc" cx="12" cy="12" r="6" pathLength={100} />
      <path className="nd-ck" d="M7.2 12.4l3.2 3.2 6.4-6.8" pathLength={100} />
    </svg>
  );
}
