import { useEffect, useState } from 'react';
import type { Lang } from '../engine/types';
import type { Frame } from '../state/timeline';
import { C, t } from './copy';

interface Props {
  lang: Lang;
  frames: Frame[];
  /** null = LIVE */
  cursor: number | null;
  onCursor: (i: number | null) => void;
}

const STEP_MS = 520;

/** Action Audit 스크러버: 이벤트 로그를 되감아 그 시점의 쇼핑몰·에이전트 상태를 읽기 전용으로 보여준다. */
export function Scrubber({ lang, frames, cursor, onCursor }: Props) {
  const last = frames.length - 1;
  const at = cursor ?? last;
  const replaying = cursor !== null && cursor < last;
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      onCursor((() => {
        const next = (cursor ?? 0) + 1;
        if (next >= last) { setPlaying(false); return null; }
        return next;
      })());
    }, STEP_MS);
    return () => clearInterval(id);
  }, [playing, cursor, last, onCursor]);

  if (frames.length < 2) return null;
  const f = frames[at];
  const sec = ((f.at - frames[0].at) / 1000).toFixed(1);

  const play = () => {
    if (playing) { setPlaying(false); return; }
    onCursor(0);
    setPlaying(true);
  };

  return (
    <div className={`scrub ${replaying ? 'on' : ''}`} role="group" aria-label={t(C.scrubTitle, lang)}>
      <div className="scrub-head">
        <span className={`scrub-state ${replaying ? 'replay' : 'live'}`}>
          <i className="dot" aria-hidden /> {replaying ? t(C.replay, lang) : t(C.live, lang)}
        </span>
        <span className="mono scrub-time">+{sec}s · {at + 1}/{frames.length}</span>
      </div>
      <p className="scrub-label" aria-live="polite">{t(f.label, lang)}</p>
      <div className="scrub-track">
        <div className="scrub-ticks" aria-hidden>
          {frames.map((fr, i) => <span key={i} className={`tick by-${fr.actor} ${i <= at ? 'past' : ''}`} />)}
        </div>
        <input
          type="range" min={0} max={last} step={1} value={at}
          aria-label={t(C.scrubTitle, lang)} aria-valuetext={t(f.label, lang)}
          onChange={(e) => { setPlaying(false); const v = Number(e.target.value); onCursor(v >= last ? null : v); }}
        />
      </div>
      <div className="row scrub-actions">
        <button className="btn sm" onClick={play}>{playing ? t(C.pause, lang) : t(C.play, lang)}</button>
        <button className="btn sm" disabled={!replaying} onClick={() => { setPlaying(false); onCursor(null); }}>{t(C.backToLive, lang)}</button>
      </div>
      {replaying && <p className="note">{t(C.replayNote, lang)}</p>}
    </div>
  );
}
