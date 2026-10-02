/**
 * 모션 엔진. 레퍼런스(awesome-opus5-5-videos)의 규칙을 따른다:
 * - 스프링은 임계감쇠 기본, 필요할 때만 아주 작은 오버슈트
 * - 목표가 여러 번 바뀌어도 "스프링의 합"으로 표현하면 상태가 시간의 순수 함수가 된다 (track)
 * - 사용자 조작은 직접 조작: 누르는 동안은 값이 포인터를 따르고, 놓으면 그 자리에서 스프링으로 복귀 (Spring)
 */

/** 0→1 계단응답. z>=1 임계감쇠, z<1 약한 오버슈트. t<=0이면 0. */
export function stepResponse(t: number, w: number, z = 1): number {
  if (t <= 0) return 0;
  if (z >= 1) return 1 - (1 + w * t) * Math.exp(-w * t);
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
}

export interface Keyframe { t: number; to: number }

/** 시간 t에서의 값. 키프레임마다 스프링 하나씩 더한 합이라 t만 알면 항상 같은 값이 나온다. */
export function track(t: number, init: number, keys: Keyframe[], w = 14, z = 1): number {
  let v = init;
  let prev = init;
  for (const k of keys) {
    v += (k.to - prev) * stepResponse(t - k.t, w, z);
    prev = k.to;
  }
  return v;
}

/** 상호작용용 스프링. 속도를 보존하므로 목표가 중간에 바뀌어도 끊기지 않는다. */
export class Spring {
  x: number;
  v = 0;
  target: number;
  constructor(x: number, public w = 14, public z = 1) {
    this.x = x;
    this.target = x;
  }
  to(target: number) { this.target = target; }
  snap(x: number) { this.x = x; this.target = x; this.v = 0; }
  /** 선형 스프링의 정확해로 한 걸음 전진한다. dt가 커도 안정적이다. */
  step(dt: number) {
    const w = this.w, z = this.z;
    const d = this.x - this.target;
    const e = Math.exp(-z * w * dt);
    if (z >= 1) {
      const c = this.v + w * d;
      this.x = this.target + (d + c * dt) * e;
      this.v = (this.v - w * c * dt) * e;
      return;
    }
    const wd = w * Math.sqrt(1 - z * z);
    const cs = Math.cos(wd * dt), sn = Math.sin(wd * dt);
    this.x = this.target + e * (d * cs + ((this.v + z * w * d) / wd) * sn);
    this.v = e * (this.v * cs - ((z * w * this.v + w * w * d) / wd) * sn);
  }
  get settled() { return Math.abs(this.x - this.target) < 1e-3 && Math.abs(this.v) < 1e-2; }
}

export const reducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** tick이 true를 돌려주는 동안만 rAF를 돈다. 정지하면 루프도 멈춘다. */
export function makeLoop(tick: (dt: number) => boolean) {
  let raf = 0;
  let last = 0;
  const frame = (now: number) => {
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60);
    last = now;
    if (tick(dt)) raf = requestAnimationFrame(frame);
    else { raf = 0; last = 0; }
  };
  return {
    kick() { if (!raf) raf = requestAnimationFrame(frame); },
    stop() { cancelAnimationFrame(raf); raf = 0; last = 0; },
  };
}

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
