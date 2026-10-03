import { useEffect, useState } from 'react';
import type { Dial, Lang } from '../engine/types';
import { DIAL, t } from './copy';
import { ParticleFrame } from './ParticleFrame';
import { HeroDemo } from './HeroDemo';
import { LAND, APPROVES } from './landCopy';
import { Magnetic } from './Magnetic';
import { Mark } from './Mark';
import { reducedMotion } from './motion';
import { Rise } from './Rise';
import { Seg } from './Seg';
import { Tour } from './Tour';
import { ThemeButton } from './ThemeButton';
import { useReveal } from './useReveal';

interface Props {
  lang: Lang;
  onLang: (l: Lang) => void;
  theme: 'dark' | 'light';
  onTheme: () => void;
}

const goTo = (id: string) => (e: React.MouseEvent) => {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' });
};

function Cta({ lang }: { lang: Lang }) {
  return (
    <Magnetic>
      <a className="btn primary cta" href="#/app">
        <span>{t(LAND.start, lang)}</span>
        <span className="cta-i" aria-hidden>→</span>
      </a>
    </Magnetic>
  );
}

function Approval({ lang }: { lang: Lang }) {
  const [dial, setDial] = useState<Dial>('cart-only');
  const [nod, setNod] = useState(0);
  const [plan, cart] = APPROVES[dial];
  const opts = (Object.keys(DIAL) as Dial[]).map((d) => ({ value: d, label: t(DIAL[d], lang) }));
  const cells = [plan, cart];
  const pick = (d: Dial) => { if (d !== dial) { setDial(d); setNod((n) => n + 1); } };
  return (
    <>
      <Seg options={opts} value={dial} onChange={pick} label={t(LAND.approvalTitle, lang)} />
      <ul className="matrix">
        {LAND.rows.map((r, i) => {
          const isPay = i === 2;
          const you = isPay ? true : cells[i]!;
          return (
            <li key={i} className={you ? 'on' : ''}>
              <span>{t(r, lang)}</span>
              <span className={`state ${isPay ? 'pay' : you ? 'you' : 'auto'}`}>
                {isPay ? t(LAND.pay, lang) : you ? t(LAND.you, lang) : t(LAND.auto, lang)}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="approval-foot">
        <Mark size={28} nod={nod} />
        <p className="note">{t(LAND.payNote, lang)}</p>
      </div>
    </>
  );
}

export function Landing({ lang, onLang, theme, onTheme }: Props) {
  const rW = useReveal<HTMLDivElement>();
  const r1 = useReveal<HTMLDivElement>();
  const r2 = useReveal<HTMLDivElement>();
  const r3 = useReveal<HTMLDivElement>();
  const r4 = useReveal<HTMLDivElement>();
  const [nod, setNod] = useState(0);
  const [pulse, setPulse] = useState(0);
  const [endNod, setEndNod] = useState(0);
  useEffect(() => { const id = window.setInterval(() => setEndNod((n) => n + 1), 3600); return () => window.clearInterval(id); }, []);
  // 첫 진입 때 로고가 한 번 끄덕인다
  useEffect(() => { const id = window.setTimeout(() => setNod(1), 900); return () => window.clearTimeout(id); }, []);

  return (
    <div className="land">
      <header className="land-top">
        <a className="logo" href="#/" onMouseEnter={() => setNod((n) => n + 1)} aria-label="Nod">
          <Mark size={22} nod={nod} follow />
          <span>Nod</span>
        </a>
        <nav className="land-nav" aria-label="sections">
          {LAND.nav.map((n) => <a key={n.id} href={`#${n.id}`} onClick={goTo(n.id)}>{t(n.l, lang)}</a>)}
        </nav>
        <div className="top-r">
          <ThemeButton theme={theme} onToggle={onTheme} lang={lang} />
          <div className="lang" role="group" aria-label="language">
            <button aria-pressed={lang === 'ko'} onClick={() => onLang('ko')}>KO</button>
            <button aria-pressed={lang === 'en'} onClick={() => onLang('en')}>EN</button>
          </div>
          <a className="btn sm primary land-start" href="#/app">{t(LAND.startShort, lang)}</a>
        </div>
      </header>

      <section className="hero">
       <div className="hero-field">
        <div className="hero-copy">
          <p className="mono kicker">{t(LAND.kicker, lang)}</p>
          <h1 className="hero-title">
            <span className="line"><Rise text={t(LAND.heroA, lang)} delay={120} /></span>
            <em className="line"><Rise text={t(LAND.heroB, lang)} delay={420} /></em>
          </h1>
          <p className="hero-sub">{t(LAND.heroSub, lang)}</p>
          <div className="hero-actions">
            <Cta lang={lang} />
            <a className="link" href="#how" onClick={goTo('how')}>{t(LAND.how, lang)}</a>
          </div>
        </div>
        <div className="hero-stage">
          <ParticleFrame pulse={pulse} />
          <HeroDemo lang={lang} onDone={() => setPulse((n) => n + 1)} />
        </div>
       </div>
      </section>

      <section className="sec why" id="why">
        <div className="sec-in" ref={rW}>
          <h2 className="sec-title"><Rise text={t(LAND.whyTitle, lang)} /></h2>
          <div className="bento rv">
            {LAND.scenes.map((s, i) => (
              <article key={i} className={`scene s${i + 1}`}>
                <div className="scene-v" aria-hidden>
                  {i === 0 && (<>{[0, 1, 2, 3, 4].map((n) => <i key={n} className="tab" style={{ '--n': n } as React.CSSProperties} />)}<b className="pickcard"><Mark size={22} tone="brand" /></b></>)}
                  {i === 1 && (<><span className="chip-stock a">{t(LAND.vis.stock1, lang)}</span><span className="chip-stock b">{t(LAND.vis.stock0, lang)}</span><span className="chip-alt">{t(LAND.vis.alt, lang)}</span></>)}
                  {i === 2 && (<><span className="price-old">{t(LAND.vis.priceA, lang)}</span><span className="price-new">{t(LAND.vis.priceB, lang)}</span><span className="chip-ask">{t(LAND.vis.ask, lang)}</span></>)}
                </div>
                <h3>{t(s.t, lang)}</h3>
                <p>{t(s.d, lang)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="sec" id="how">
        <div className="sec-in" ref={r1}>
          <h2 className="sec-title"><Rise text={t(LAND.howTitle, lang)} /></h2>
          <div className="rv"><Tour lang={lang} /></div>
        </div>
      </section>

      <section className="sec" id="approval">
        <div className="sec-in split" ref={r2}>
          <div>
            <h2 className="sec-title"><Rise text={t(LAND.approvalTitle, lang)} /></h2>
            <p className="sec-sub rv">{t(LAND.approvalSub, lang)}</p>
          </div>
          <div className="approval rv"><Approval lang={lang} /></div>
        </div>
      </section>

      <section className="sec" id="trust">
        <div className="sec-in" ref={r3}>
          <h2 className="sec-title"><Rise text={t(LAND.trustTitle, lang)} /></h2>
          <ul className="trust rv">
            {LAND.trust.map((x, i) => (
              <li key={i}>
                <h3>{t(x.t, lang)}</h3>
                <p>{t(x.d, lang)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="sec end">
        <div className="end-field" ref={r4}>
          <Mark size={84} tone="light" nod={endNod} className="end-mark" />
          <h2 className="end-title"><Rise text={t(LAND.endTitle, lang)} /></h2>
          <Cta lang={lang} />
        </div>
      </section>

      <footer className="land-foot">
        <span className="logo"><Mark size={16} /><span>Nod</span></span>
        <p>{t(LAND.foot, lang)}</p>
      </footer>
    </div>
  );
}
