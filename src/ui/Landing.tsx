import { useEffect, useState } from 'react';
import { ArrowRight } from '@phosphor-icons/react';
import type { Lang } from '../engine/types';
import { t } from './copy';
import { HeroPicks } from './HeroPicks';
import { LAND } from './landCopy';
import { Magnetic } from './Magnetic';
import { Decides } from './Decides';
import { KineticTitle } from './KineticTitle';
import { Wordmark } from './Wordmark';
import { reducedMotion } from './motion';
import { Rise } from './Rise';
import { Stages } from './Stages';
import { Strip } from './Strip';
import { photoUrl } from '../store/photos';
import { Tour } from './Tour';
import { ThemeButton } from './ThemeButton';
import { useReveal } from './useReveal';

/** 장면마다 깔리는 실제 상품 사진: 178,000원 코트(투어와 같은 상품), 비슷한 두 운동화, 가격 대기 중인 니트 */
const SCENE_PH = [['c1'], ['s3', 's6'], ['k3']];
/** 사진 아래 한 줄: 무슨 일이 있었고(앞), 에이전트가 어떻게 했는지(끝) */
const SCENE_TAG: (keyof typeof LAND.vis)[][] = [['priceA', 'priceB', 'ask'], ['candA', 'candB', 'pick'], ['target', 'dropped', 'held']];

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
        <ArrowRight className="ic ic-r" size={18} weight="regular" aria-hidden />
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

export function Landing({ lang, onLang, theme, onTheme }: Props) {
  const r1 = useReveal<HTMLDivElement>();
  const r2 = useReveal<HTMLDivElement>();
  const r3 = useReveal<HTMLDivElement>();
  const r5 = useReveal<HTMLDivElement>();
  const nav = (id: string) => t(LAND.nav.find((n) => n.id === id)!.l, lang);
  // 헤더가 어두운 히어로 위에 있는 동안은 헤더도 무대색으로
  const [onDark, setOnDark] = useState(true);
  useEffect(() => {
    const hero = document.querySelector('.hero.hx');
    if (!hero) return;
    const io = new IntersectionObserver(([e]) => setOnDark(e.isIntersecting), { rootMargin: '0px 0px -94% 0px' });
    io.observe(hero);
    return () => io.disconnect();
  }, []);

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

  return (
    <div className="land">
      <header className={`land-top${onDark ? ' on-dark' : ''}`}>
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
          <a className="btn sm primary land-start" href="#/app">{t(LAND.startShort, lang)}<ArrowRight className="ic ic-r" size={14} weight="regular" aria-hidden /></a>
        </div>
      </header>

      {/* 히어로: 어두운 무대. 왼쪽 커서에 반응하는 제목·설명·버튼, 오른쪽 진열대 데모(서비스가 일하는 모습), 아래 띠에 누가 정하나요 */}
      <section className="hero hx">
        <div className="hx-in">
          <div className="hx-top">
            <div className="hx-copy">
          <KineticTitle lines={[t(LAND.heroA, lang), t(LAND.heroB, lang)]} />
            <p className="hero-sub">{t(LAND.heroSub, lang)}</p>
            <div className="hero-actions">
              <Magnetic>
                <a className="btn primary cta" href="#/app"><span>{t(LAND.start, lang)}</span><ArrowRight className="ic ic-r" size={18} weight="regular" aria-hidden /></a>
              </Magnetic>
            </div>
            </div>
            <figure className="hx-demo">
              <div className="window">
                <div className="window-bar" aria-hidden><i /><i /><i /><span>nod.shop</span></div>
                <div className="window-body"><HeroPicks lang={lang} /></div>
              </div>
              <figcaption>{t(LAND.agentSub, lang)}</figcaption>
            </figure>
          </div>
          <Decides lang={lang} />
        </div>
      </section>

      <Strip lang={lang} />

      {/* 01 문제 */}
      <section className="sec" id="problem">
        <div className="sec-in" ref={r1}>
          <Head n="01" label={nav('problem')} title={t(LAND.probTitle, lang)} sub={t(LAND.probSub, lang)} />
          <ol className="facts rv">
            {LAND.facts.map((f, i) => (
              <li key={i}>
                <span className="facts-k">{t(f.k, lang)}</span>
                <h3>{t(f.t, lang)}</h3>
                <p>{t(f.d, lang)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 02 멈추는 장면 */}
      <section className="sec why" id="scenes">
        <div className="sec-in" ref={r2}>
          <Head n="02" label={nav('scenes')} title={t(LAND.sceneTitle, lang)} sub={t(LAND.sceneSub, lang)} />
          <div className="bento rv">
            {LAND.scenes.map((s, i) => (
              <article key={i} className={`scene s${i + 1}`}>
                <div className="scene-v" aria-hidden>
                  <div className="scene-ph">{SCENE_PH[i].map((id) => <img key={id} src={photoUrl(id, 480) ?? ''} alt="" loading="lazy" decoding="async" />)}</div>
                </div>
                <p className="scene-tag">{SCENE_TAG[i].map((k, j) => <span key={j} className={j === SCENE_TAG[i].length - 1 ? 'end' : undefined}>{t(LAND.vis[k], lang)}</span>)}</p>
                <p className="scene-n"><span className="num">{String(i + 1).padStart(2, '0')}</span><i className="scene-r">{s.r}</i></p>
                <h3>{t(s.t, lang)}</h3>
                <p>{t(s.d, lang)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 03 설계 원칙 */}
      <section className="sec" id="playbook">
        <div className="sec-in" ref={r3}>
          <Head n="03" label={nav('playbook')} title={t(LAND.playTitle, lang)} sub={t(LAND.playSub, lang)} />
          <Stages lang={lang} />
          <div className="play-foot rv">
            <a className="btn" href="#/app?review=1">{t(LAND.playOpen, lang)}</a>
            <p className="note">{t(LAND.playNote, lang)}</p>
          </div>
        </div>
      </section>

      {/* 04 직접 맡겨 보기: 투어 */}
      <section className="sec" id="try">
        <div className="sec-in" ref={r5}>
          <Head n="04" label={nav('try')} title={t(LAND.tryTitle, lang)} sub={t(LAND.trySub, lang)} />
          <div className="rv"><Tour lang={lang} /></div>
          <div className="try-end"><Cta lang={lang} /></div>
        </div>
      </section>

      <footer className="land-foot">
        <span className="logo"><Wordmark size={16} /></span>
        <p>{t(LAND.foot, lang)}</p>
        <a className="land-foot-link" href="/privacy.html">{lang === 'ko' ? '개인정보처리방침' : 'Privacy policy'}</a>
      </footer>
    </div>
  );
}
