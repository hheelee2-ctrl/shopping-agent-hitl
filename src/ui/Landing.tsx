import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { Dial, Lang } from '../engine/types';
import { buildCatalog } from '../store/catalog';
import { photoUrl } from '../store/photos';
import { RULES, RULE_TESTS } from '../rules';
import { DIAL, money, t } from './copy';
import { HeroPicks } from './HeroPicks';
import { LAND, APPROVES } from './landCopy';
import { Magnetic } from './Magnetic';
import { Mark } from './Mark';
import { Wordmark } from './Wordmark';
import { reducedMotion } from './motion';
import { Rise } from './Rise';
import { ScrollWords } from './ScrollWords';
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

/** 히어로 룩북. 실제 카탈로그의 상품·가격이다. 두 번째 칸에 에이전트가 고른 표시가 붙는다. */
const LOOK = ['c2', 'c1', 's3', 'k1'];
const PICKED = 'c1';

const goTo = (id: string) => (e: React.MouseEvent) => {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' });
};

function Cta({ lang }: { lang: Lang }) {
  return (
    <Magnetic>
      <a className="btn primary cta" href="#/app">
        <span>{t(LAND.start, lang)}</span>
      </a>
    </Magnetic>
  );
}

/** 섹션 머리: 번호 · 라벨 한 줄, 그 아래 큰 제목 */
function Head({ n, label, title, sub }: { n: string; label: string; title: string; sub?: string }) {
  return (
    <header className="sec-head">
      <p className="eyebrow"><span className="num">{n}</span>{label}</p>
      <h2 className="sec-title"><Rise text={title} /></h2>
      {sub && <p className="sec-sub">{sub}</p>}
    </header>
  );
}

function Approval({ lang }: { lang: Lang }) {
  const [dial, setDial] = useState<Dial>('cart-only');
  const [plan, cart] = APPROVES[dial];
  const opts = (Object.keys(DIAL) as Dial[]).map((d) => ({ value: d, label: t(DIAL[d], lang) }));
  const cells = [plan, cart];
  return (
    <>
      <Seg options={opts} value={dial} onChange={setDial} label={t(LAND.approvalTitle, lang)} />
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
        <Mark size={20} />
        <p className="note">{t(LAND.payNote, lang)}</p>
      </div>
    </>
  );
}

export function Landing({ lang, onLang, theme, onTheme }: Props) {
  const { products } = useMemo(() => buildCatalog(), []);
  const rW = useReveal<HTMLDivElement>();
  const r1 = useReveal<HTMLDivElement>();
  const r2 = useReveal<HTMLDivElement>();
  const r3 = useReveal<HTMLDivElement>();
  const r4 = useReveal<HTMLDivElement>();
  // 앱의 규칙 칩에서 #/playbook으로 오면 플레이북으로 바로 내려간다
  useEffect(() => {
    let id = 0;
    const go = () => {
      if (location.hash !== '#/playbook') return;
      id = window.setTimeout(() => document.getElementById('playbook')?.scrollIntoView({ behavior: 'auto' }), 60);
    };
    go();
    window.addEventListener('hashchange', go);
    return () => { window.clearTimeout(id); window.removeEventListener('hashchange', go); };
  }, []);
  const nav = (id: string) => t(LAND.nav.find((n) => n.id === id)!.l, lang);

  return (
    <div className="land">
      <header className="land-top">
        <a className="logo" href="#/" aria-label="Nod">
          <Wordmark size={22} />
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

      {/* 히어로: 큰 제목 + 룩북 */}
      <section className="hero">
        <p className="eyebrow hero-eyebrow">{t(LAND.eyebrow, lang)}</p>
        <h1 className="hero-title">
          <span className="line"><Rise text={t(LAND.heroA, lang)} delay={80} /></span>
          <span className="line dim"><Rise text={t(LAND.heroB, lang)} delay={360} /></span>
        </h1>
        <div className="hero-foot">
          <div className="hero-copy">
            <p className="hero-sub">{t(LAND.heroSub, lang)}</p>
            <div className="hero-actions">
              <Cta lang={lang} />
              <a className="link" href="#agent" onClick={goTo('agent')}>{t(LAND.how, lang)}</a>
              <a className="link" href="#playbook" onClick={goTo('playbook')}>{t(LAND.playLink, lang)}</a>
            </div>
          </div>
          <ol className="look">
            {LOOK.map((id, i) => {
              const p = products[id];
              const src = photoUrl(id, 520);
              return (
                <li key={id} className={`look-i ${id === PICKED ? 'picked' : ''}`} style={{ '--i': i } as CSSProperties}>
                  <figure>
                    <span className={`look-ph sw sw-${p.colors[0]}`}>{src && <img src={src} alt="" />}</span>
                    {id === PICKED && (
                      <span className="look-chip"><Mark size={12} phase="done" /><b>{t(LAND.pickTag, lang)}</b><span>{t(LAND.pickAsk, lang)}</span></span>
                    )}
                    <figcaption>
                      <span className="num">{String(i + 1).padStart(2, '0')}</span>
                      <span className="look-b">{p.brand}</span>
                      <span className="look-n">{t(p.name, lang)}</span>
                      <span className="look-p">{money(p.price, lang)}</span>
                    </figcaption>
                  </figure>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* AI 제품 순간: 앱 창 안의 진열대 */}
      <section className="agent-band" id="agent">
        <div className="band-in">
          <header className="band-head">
            <p className="eyebrow">{t(LAND.agentLabel, lang)}</p>
            <h2 className="band-title"><Rise text={t(LAND.agentTitle, lang)} /></h2>
            <p className="band-sub">{t(LAND.agentSub, lang)}</p>
          </header>
          <div className="window">
            <div className="window-bar" aria-hidden><i /><i /><i /><span>nod.shop</span></div>
            <div className="window-body"><HeroPicks lang={lang} /></div>
          </div>
        </div>
      </section>

      <section className="statement">
        <ScrollWords text={t(LAND.statement, lang)} />
      </section>

      <section className="sec why" id="why">
        <div className="sec-in" ref={rW}>
          <Head n="01" label={nav('why')} title={t(LAND.whyTitle, lang)} />
          <div className="bento rv">
            {LAND.scenes.map((s, i) => (
              <article key={i} className={`scene s${i + 1}`}>
                <div className="scene-v" aria-hidden>
                  {i === 0 && (<>{[0, 1, 2, 3, 4].map((n) => <i key={n} className="tab" style={{ '--n': n } as CSSProperties} />)}<b className="pickcard"><Mark size={40} /></b></>)}
                  {i === 1 && (<><span className="chip-stock a">{t(LAND.vis.stock1, lang)}</span><span className="chip-stock b">{t(LAND.vis.stock0, lang)}</span><span className="chip-alt">{t(LAND.vis.alt, lang)}</span></>)}
                  {i === 2 && (<><span className="price-old">{t(LAND.vis.priceA, lang)}</span><span className="price-new">{t(LAND.vis.priceB, lang)}</span><span className="chip-ask">{t(LAND.vis.ask, lang)}</span></>)}
                </div>
                <p className="scene-n num">{String(i + 1).padStart(2, '0')}</p>
                <h3>{t(s.t, lang)}</h3>
                <p>{t(s.d, lang)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="sec" id="how">
        <div className="sec-in" ref={r1}>
          <Head n="02" label={nav('how')} title={t(LAND.howTitle, lang)} />
          <div className="rv"><Tour lang={lang} /></div>
        </div>
      </section>

      <section className="sec" id="approval">
        <div className="sec-in two" ref={r2}>
          <Head n="03" label={nav('approval')} title={t(LAND.approvalTitle, lang)} sub={t(LAND.approvalSub, lang)} />
          <div className="approval rv"><Approval lang={lang} /></div>
        </div>
      </section>

      <section className="sec" id="playbook">
        <div className="sec-in" ref={r3}>
          <Head n="04" label={nav('playbook')} title={t(LAND.playTitle, lang)} sub={t(LAND.playSub, lang)} />
          <ol className="play rv">
            {RULES.map((r) => (
              <li key={r.id}>
                <p className="play-id"><span className="num">{r.id}</span><span className="play-tests">{LAND.playTests[lang](RULE_TESTS[r.id])}</span></p>
                <h3>{t(r.name, lang)}</h3>
                <p className="play-rule">{t(r.rule, lang)}</p>
                <dl>
                  <div><dt>{t(LAND.playWithout, lang)}</dt><dd>{t(r.problem, lang)}</dd></div>
                  <div><dt>{t(LAND.playWhere, lang)}</dt><dd>{t(r.where, lang)}</dd></div>
                </dl>
              </li>
            ))}
          </ol>
          <div className="play-foot rv">
            <a className="btn" href="#/app?review=1">{t(LAND.playOpen, lang)}</a>
            <p className="note">{t(LAND.playNote, lang)}</p>
          </div>
        </div>
      </section>

      <section className="end">
        <div className="end-field" ref={r4}>
          <h2 className="end-title"><Rise text={t(LAND.endTitle, lang)} /></h2>
          <Cta lang={lang} />
          <Wordmark size={160} tone="on-brand" className="end-mark" />
        </div>
      </section>

      <footer className="land-foot">
        <span className="logo"><Wordmark size={16} /></span>
        <p>{t(LAND.foot, lang)}</p>
      </footer>
    </div>
  );
}
