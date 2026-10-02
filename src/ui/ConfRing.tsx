import { useEffect, useState } from 'react';
import type { Level } from '../engine/types';

const FILL: Record<Level, number> = { high: 1, medium: 0.62, low: 0.3 };
const R = 8, CIRC = 2 * Math.PI * R;

/** 확신 수준(3단계)을 링으로 보여준다. 수치가 아니라 단계라서 점수처럼 읽히지 않게 눈금 없이 채운다. */
export function ConfRing({ level }: { level: Level }) {
  const [on, setOn] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setOn(true)); return () => cancelAnimationFrame(id); }, []);
  return (
    <svg className={`ring ${level}`} width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <circle className="ring-bg" cx="11" cy="11" r={R} />
      <circle className="ring-fg" cx="11" cy="11" r={R} strokeDasharray={CIRC} strokeDashoffset={on ? CIRC * (1 - FILL[level]) : CIRC} transform="rotate(-90 11 11)" />
    </svg>
  );
}
