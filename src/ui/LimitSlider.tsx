import { useEffect, useRef, useState } from 'react';
import type { Lang } from '../engine/types';
import { money } from './copy';
import { Spring, clamp, makeLoop, reducedMotion } from './motion';

interface Props {
  value: number;
  onChange: (n: number) => void;
  lang: Lang;
  label: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

/**
 * 결제 한도 슬라이더. 직접 조작:
 * 누르는 동안 knob은 포인터를 그대로 따르고, 끝을 넘겨 끌면 트랙이 고무줄처럼 늘어난다.
 * 놓으면 늘어난 만큼이 스프링으로 돌아온다.
 */
/** 직접 입력할 때의 범위. 슬라이더 범위보다 넓다. */
export const LIMIT_INPUT_MIN = 10000;
export const LIMIT_INPUT_MAX = 10000000;

/** 숫자 칸: 누르면 비워지고 지금 금액이 흐리게 보인다. 입력 후 Enter나 다른 곳을 누르면 반영(1,000원 단위, 범위 안으로). 비워 두면 그대로. */
function LimitInput({ value, onChange, lang, label, disabled }: { value: number; onChange: (n: number) => void; lang: Lang; label: string; disabled?: boolean }) {
  const [text, setText] = useState<string | null>(null);
  const shown = value.toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US');
  const commit = () => {
    if (text) {
      const n = Number(text);
      if (n > 0) onChange(clamp(Math.round(n / 1000) * 1000, LIMIT_INPUT_MIN, LIMIT_INPUT_MAX));
    }
    setText(null);
  };
  return (
    <label className="lim-read mono">
      <span className="sr-only">{label}</span>
      {lang === 'en' && <span className="lim-unit">KRW</span>}
      <input
        className="lim-in" inputMode="numeric" disabled={disabled} aria-label={label}
        value={text ?? shown} placeholder={shown}
        onFocus={() => setText('')}
        onChange={(e) => setText(e.target.value.replace(/[^\d]/g, '').slice(0, 8))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') { setText(null); e.currentTarget.blur(); }
        }}
        size={Math.max(6, (text || shown).length)}
      />
      {lang === 'ko' && <span className="lim-unit">원</span>}
    </label>
  );
}

export function LimitSlider({ value, onChange, lang, label, disabled, min = 100000, max = 1000000, step = 50000 }: Props) {
  const track = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLButtonElement>(null);
  const eng = useRef<{ set(v: number, drag: boolean): void; over(px: number): void; release(): void } | null>(null);
  const val = useRef(value);
  val.current = value;

  useEffect(() => {
    const t = track.current, f = fill.current, k = knob.current;
    if (!t || !f || !k) return;
    const calm = reducedMotion();
    const pos = new Spring(0, 18);       // 0..1
    const stretch = new Spring(0, 15, 0.72); // px, 약한 오버슈트 허용
    let dragging = false;
    const paint = () => {
      const w = t.clientWidth;
      const x = pos.x * w + stretch.x;
      const sx = 1 + Math.abs(stretch.x) / Math.max(1, w);
      t.style.transform = `scaleX(${sx.toFixed(4)})`;
      t.style.transformOrigin = stretch.x >= 0 ? 'left center' : 'right center';
      f.style.width = `${Math.max(0, x).toFixed(1)}px`;
      // 끌려갈 때 knob도 가는 방향으로 길어진다(liquid)
      const kx = 1 + Math.min(0.5, Math.abs(stretch.x) / 70);
      k.style.transform = `translate(${(x - 12).toFixed(1)}px, -50%) scale(${kx.toFixed(3)}, ${(1 / Math.sqrt(kx)).toFixed(3)})`;
    };
    const loop = makeLoop((dt) => { pos.step(dt); stretch.step(dt); paint(); return dragging || !(pos.settled && stretch.settled); });
    eng.current = {
      set(v, drag) {
        dragging = drag;
        // 직접 입력한 값이 슬라이더 범위를 넘으면 끝에 둔다
        const r = clamp((v - min) / (max - min), 0, 1);
        if (drag || calm) pos.snap(r); else pos.to(r);
        paint(); loop.kick();
      },
      over(px) {
        // 끝을 넘긴 거리를 감쇠시켜 고무줄처럼
        const e = 46 * Math.tanh(px / 140);
        stretch.snap(e); paint(); loop.kick();
      },
      release() { dragging = false; stretch.to(0); if (calm) stretch.snap(0); loop.kick(); },
    };
    pos.snap(clamp((val.current - min) / (max - min), 0, 1));
    paint();
    const ro = new ResizeObserver(() => { paint(); });
    ro.observe(t);
    return () => { loop.stop(); ro.disconnect(); eng.current = null; };
  }, [min, max]);

  useEffect(() => { eng.current?.set(value, false); }, [value]);

  const fromPointer = (clientX: number) => {
    const t = track.current;
    if (!t) return;
    // 늘어난 상태가 아닌 원래 트랙 기준으로 계산한다
    const r = t.getBoundingClientRect();
    const sx = r.width / t.offsetWidth || 1;
    const raw = (clientX - r.left) / sx / t.offsetWidth;
    const w = t.offsetWidth;
    const over = raw > 1 ? (raw - 1) * w : raw < 0 ? raw * w : 0;
    const v = clamp(Math.round((min + clamp(raw, 0, 1) * (max - min)) / step) * step, min, max);
    onChange(v);
    eng.current?.set(clamp(raw, 0, 1) * (max - min) + min, true);
    eng.current?.over(over);
  };

  const onDown = (e: React.PointerEvent) => {
    if (disabled) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    fromPointer(e.clientX);
  };
  const onMove = (e: React.PointerEvent) => {
    if (disabled || !(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return;
    fromPointer(e.clientX);
  };
  const onUp = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    eng.current?.set(val.current, false);
    eng.current?.release();
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? step : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -step : 0;
    if (!d) return;
    e.preventDefault();
    onChange(clamp(clamp(value, min, max) + d, min, max));
  };

  return (
    <div className={`lim ${disabled ? 'off' : ''}`}>
      <LimitInput value={value} onChange={onChange} lang={lang} label={label} disabled={disabled} />
      <div className="lim-hit" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <div className="lim-track" ref={track}>
          <div className="lim-fill" ref={fill} />
        </div>
        <button
          ref={knob} className="lim-knob" role="slider" aria-label={label} aria-valuemin={min} aria-valuemax={max}
          aria-valuenow={value} aria-valuetext={money(value, lang)} disabled={disabled} onKeyDown={onKey}
        />
      </div>
      <div className="lim-scale mono"><span>{money(min, lang)}</span><span>{money(max, lang)}</span></div>
    </div>
  );
}
