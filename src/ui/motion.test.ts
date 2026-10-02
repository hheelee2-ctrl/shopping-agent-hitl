import { describe, expect, it } from 'vitest';
import { Spring, stepResponse, track } from './motion';

describe('motion', () => {
  it('stepResponse: 0에서 시작해 1로 수렴하고 임계감쇠는 오버슈트가 없다', () => {
    expect(stepResponse(0, 14)).toBe(0);
    expect(stepResponse(-1, 14)).toBe(0);
    let max = 0;
    for (let t = 0; t < 2; t += 0.01) max = Math.max(max, stepResponse(t, 14, 1));
    expect(max).toBeLessThanOrEqual(1);
    expect(stepResponse(2, 14)).toBeCloseTo(1, 4);
  });

  it('track: 시간의 순수 함수이고 키프레임 순서와 무관하게 같은 시각엔 같은 값', () => {
    const keys = [{ t: 0.5, to: 10 }, { t: 1.5, to: 4 }, { t: 2.5, to: 20 }];
    const a = [0, 0.7, 1.9, 3.2].map((t) => track(t, 0, keys, 12));
    const b = [3.2, 1.9, 0.7, 0].map((t) => track(t, 0, keys, 12)).reverse();
    expect(a).toEqual(b);
    expect(track(10, 0, keys, 12)).toBeCloseTo(20, 3);
    expect(track(0.2, 0, keys, 12)).toBe(0);
  });

  it('Spring: 목표로 수렴하고, 임계감쇠는 목표를 넘지 않는다', () => {
    const s = new Spring(0, 16, 1);
    s.to(1);
    let max = 0;
    for (let i = 0; i < 240; i++) { s.step(1 / 60); max = Math.max(max, s.x); }
    expect(max).toBeLessThanOrEqual(1.0001);
    expect(s.settled).toBe(true);
  });

  it('Spring: 속도를 주면 갔다가 제자리로 돌아온다(끄덕임)', () => {
    const s = new Spring(0, 16, 1);
    s.v = 196;
    let peak = 0;
    for (let i = 0; i < 240; i++) { s.step(1 / 60); peak = Math.max(peak, s.x); }
    expect(peak).toBeGreaterThan(4);
    expect(peak).toBeLessThan(5);
    expect(Math.abs(s.x)).toBeLessThan(0.01);
  });
});
