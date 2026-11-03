import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowCounterClockwise, Check, Pause, Play } from '@phosphor-icons/react';
import type { Lang } from '../engine/types';
import { buildCatalog } from '../store/catalog';
import { photoUrl } from '../store/photos';
import { money, t } from './copy';
import { LAND, TOUR } from './landCopy';
import { reducedMotion } from './motion';

/** 카드 한 장이 머무는 시간 */
const DWELL = 5200;
const H = LAND.hl;

/**
 * 이런 게 편해져요: 큰 카드 다섯 장이 가로로 넘어간다. 위에는 편해지는 것(크게)과 어떻게 하는지(작게), 아래에는 그 장면의 화면 조각(글과 그림이 겹치지 않게 칸을 나눈다).
 * 화면에 보이는 동안만 저절로 넘어가고, 점이나 카드를 직접 넘기면 거기서 이어간다. 동작 줄이기 설정이면 저절로 넘기지 않는다.
 */
export function Highlights({ lang }: { lang: Lang }) {
  const track = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(() => !reducedMotion());
  const [seen, setSeen] = useState(false);
  const n = H.cards.length;

  // 어느 카드가 가운데 있는지는 스크롤 위치로 정한다(손으로 넘겨도 점이 따라온다)
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) setAt(Number((e.target as HTMLElement).dataset.i)); });
    }, { root: el, threshold: 0.6 });
    el.querySelectorAll('.hl-card').forEach((c) => io.observe(c));
    const vis = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.4 });
    vis.observe(el);
    return () => { io.disconnect(); vis.disconnect(); };
  }, []);

  const go = (i: number) => {
    const el = track.current;
    const card = el?.querySelectorAll<HTMLElement>('.hl-card')[i];
    if (!el || !card) return;
    el.scrollTo({ left: card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2, behavior: reducedMotion() ? 'auto' : 'smooth' });
  };

  useEffect(() => {
    if (!playing || !seen) return;
    const id = window.setTimeout(() => go((at + 1) % n), DWELL);
    return () => window.clearTimeout(id);
  }, [playing, seen, at, n]);

  return (
    <div className="hl">
      <div className="hl-track" ref={track}>
        {H.cards.map((c, i) => (
          <article key={i} className={`hl-card${i === at ? ' on' : ''}`} data-i={i} aria-roledescription="slide" aria-label={`${i + 1} / ${n}`}>
            <div className="hl-txt">
              <p className="hl-t">{t(c.t, lang)}</p>
              <p className="hl-d">{t(c.d, lang)}</p>
            </div>
            <div className="hl-v">{VIS[i](lang)}</div>
          </article>
        ))}
      </div>
      <div className="hl-ctl">
        <div className="hl-dots" role="group" aria-label={t(H.title, lang)}>
          {H.cards.map((_, i) => (
            <button key={i} type="button" className={i === at ? 'on' : undefined} aria-label={H.go[lang](i + 1)} aria-current={i === at} onClick={() => { setPlaying(false); go(i); }}>
              <i style={i === at && playing && seen ? { animationDuration: `${DWELL}ms` } : undefined} className={i === at && playing && seen ? 'run' : undefined} />
            </button>
          ))}
        </div>
        <button type="button" className="hl-play" aria-label={t(playing ? H.pause : H.play, lang)} onClick={() => setPlaying((p) => !p)}>
          {playing ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
        </button>
      </div>
    </div>
  );
}

/* ── 카드마다 보여주는 화면 조각. 상품·가격은 실제 진열대 데이터 ── */

function useShop() {
  return useMemo(() => buildCatalog().products, []);
}

function Photo({ id, w = 480 }: { id: string; w?: number }) {
  return <img src={photoUrl(id, w) ?? ''} alt="" loading="lazy" decoding="async" />;
}

function Understand({ lang }: { lang: Lang }) {
  return (
    <div className="hv hv-ask">
      <div className="hv-ph"><Photo id="c1" /></div>
      <div className="hv-ui">
        <p className="hv-req">{t(TOUR.request, lang)}</p>
        <div className="hv-chips">
          {TOUR.chips.map((c, i) => <span key={i} className="chip"><i>{t(c.l, lang)}</i>{t(c.v, lang)}</span>)}
        </div>
      </div>
    </div>
  );
}

function Filter({ lang }: { lang: Lang }) {
  const p = useShop();
  const row: [string, boolean][] = [['c7', true], ['c6', true], ['c4', false]];
  return (
    <div className="hv hv-filter">
      <p className="hv-budget">{t(H.budget, lang)}</p>
      <ul>
        {row.map(([id, ok]) => (
          <li key={id} className={ok ? undefined : 'out'}>
            <div className="hv-ph"><Photo id={id} w={360} /></div>
            <span className={`hv-tag${ok ? '' : ' warn'}`}>{t(ok ? H.match : H.over, lang)}</span>
            <b className="num">{money(p[id].price, lang)}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Approve({ lang }: { lang: Lang }) {
  const p = useShop()['c7'];
  return (
    <div className="hv hv-approve">
      <div className="hv-ph"><Photo id="c7" /></div>
      <div className="hv-askbar">
        <div>
          <p className="hv-q">{t(H.ask, lang)}</p>
          <p className="hv-n">{t(p.name, lang)}</p>
          <p className="hv-s num">{p.brand} · {money(p.price, lang)}</p>
        </div>
        <span className="hv-add">{t(H.add, lang)}</span>
        <span className="hv-skip">{t(H.skip, lang)}</span>
      </div>
    </div>
  );
}

function Pay({ lang }: { lang: Lang }) {
  const p = useShop()['c1'];
  const limit = 150000;
  return (
    <div className="hv hv-pay">
      <div className="hv-pay-in">
        <p className="hv-q">{t(TOUR.payLabel, lang)}</p>
        <div className="hv-pay-item">
          <div className="hv-ph"><Photo id="c1" w={200} /></div>
          <div>
            <p className="hv-n">{t(p.name, lang)}</p>
            <p className="hv-price num">{money(TOUR.price, lang)}</p>
          </div>
        </div>
        <div className="hv-meter" aria-hidden><i style={{ width: `${Math.min(100, (limit / TOUR.price) * 100)}%` }} /></div>
        <p className="hv-s num">{t(TOUR.limitLabel, lang)} {money(limit, lang)}</p>
        <p className="hv-warn">{t(TOUR.over, lang)}</p>
      </div>
    </div>
  );
}

function Log({ lang }: { lang: Lang }) {
  return (
    <div className="hv hv-log">
      <div className="hv-log-in">
        <p className="hv-q">{t(H.log, lang)}</p>
        <ol>
          {H.logs.map((l, i) => (
            <li key={i}>
              <span className="hv-ok" aria-hidden><Check size={12} weight="bold" /></span>
              <span>{t(l, lang)}</span>
              {i === H.logs.length - 1 && <span className="hv-undo"><ArrowCounterClockwise size={14} />{t(H.undo, lang)}</span>}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

const VIS: ((lang: Lang) => ReactNode)[] = [
  (lang) => <Understand lang={lang} />,
  (lang) => <Filter lang={lang} />,
  (lang) => <Approve lang={lang} />,
  (lang) => <Pay lang={lang} />,
  (lang) => <Log lang={lang} />,
];
