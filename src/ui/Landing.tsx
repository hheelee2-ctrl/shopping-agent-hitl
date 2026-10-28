import { useEffect, useState } from 'react';
import type { Dial, Lang } from '../engine/types';
import { RULES, RULE_TESTS, type Rule, type RuleId } from '../rules';
import { DIAL, t } from './copy';
import { HeroPicks } from './HeroPicks';
import { LAND, APPROVES } from './landCopy';
import { Magnetic } from './Magnetic';
import { Mark } from './Mark';
import { Wordmark } from './Wordmark';
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

/**
 * 개입 지도: 요청 → 계획 → 담기 → 결제에서 누가 정하는지.
 * 자율도별 승인 여부는 APPROVES(= agent.ts의 실제 동작)를 그대로 쓴다. 요청과 결제는 언제나 사람.
 */
function InterventionMap({ lang }: { lang: Lang }) {
  const [dial, setDial] = useState<Dial>('cart-only');
  const [plan, add] = APPROVES[dial];
  const you = [true, plan, add, true];
  const touches = you.slice(1).filter(Boolean).length;
  const M = LAND.map;
  return (
    <figure className="imap" aria-label={t(M.label, lang)}>
      <div className="imap-top">
        <span className="imap-label">{t(M.label, lang)}</span>
        <Seg options={(Object.keys(DIAL) as Dial[]).map((d) => ({ value: d, label: t(DIAL[d], lang) }))} value={dial} onChange={setDial} label={t(M.dial, lang)} />
      </div>
      <ol className="imap-track">
        {M.steps.map((s, i) => {
          const locked = i === 0 || i === 3;
          return (
            <li key={i} className={`imap-step ${you[i] ? 'by-you' : 'by-agent'} ${locked ? 'locked' : ''}`}>
              <span className="imap-n num">{String(i + 1).padStart(2, '0')}</span>
              <b>{t(s.t, lang)}</b>
              <span className="imap-d">{t(s.d, lang)}</span>
              <span className="imap-who">{locked && i === 3 ? t(M.always, lang) : you[i] ? t(M.you, lang) : t(M.agent, lang)}</span>
              <span className="imap-r">{s.rules.map((r) => <i key={r}>{r}</i>)}</span>
              {i === 2 && (
                <span className="imap-guard"><Mark size={12} /><span>{t(M.guard, lang)}</span><i>R4</i></span>
              )}
            </li>
          );
        })}
      </ol>
      <figcaption className="imap-foot">
        <strong className="num" key={touches}>{M.touches[lang](touches)}</strong>
        <span>{t(M.touchNote, lang)}</span>
      </figcaption>
    </figure>
  );
}

/**
 * 설계 원칙: 이름만 짧게 늘어놓고, 고른 하나만 자세히 보여준다(한 번에 읽는 양을 줄인다).
 * 넓은 화면은 왼쪽 목록 + 오른쪽 상세, 좁은 화면은 고른 줄 아래에 펼친다.
 */
function Playbook({ lang }: { lang: Lang }) {
  const [on, setOn] = useState<RuleId>('R1');
  const detail = (r: Rule) => (
    <>
      <p className="pb-rule">{t(r.rule, lang)}</p>
      <dl className="pb-meta">
        <div><dt>{t(LAND.playWithout, lang)}</dt><dd>{t(r.problem, lang)}</dd></div>
        <div><dt>{t(LAND.playWhere, lang)}</dt><dd>{t(r.where, lang)}</dd></div>
      </dl>
      <p className="pb-tests">{LAND.playTests[lang](RULE_TESTS[r.id])}</p>
    </>
  );
  const cur = RULES.find((r) => r.id === on)!;
  return (
    <div className="pb rv">
      <ol className="pb-list">
        {RULES.map((r) => (
          <li key={r.id} className={r.id === on ? 'on' : ''}>
            <button aria-expanded={r.id === on} onClick={() => setOn(r.id)}>
              <span className="pb-id num">{r.id}</span>
              <span className="pb-name">{t(r.name, lang)}</span>
            </button>
            {r.id === on && <div className="pb-inline">{detail(r)}</div>}
          </li>
        ))}
      </ol>
      <article className="pb-detail" aria-live="polite" key={on}>
        <p className="pb-id num">{cur.id}</p>
        <h3>{t(cur.name, lang)}</h3>
        {detail(cur)}
      </article>
    </div>
  );
}

export function Landing({ lang, onLang, theme, onTheme }: Props) {
  const r1 = useReveal<HTMLDivElement>();
  const r2 = useReveal<HTMLDivElement>();
  const r3 = useReveal<HTMLDivElement>();
  const r4 = useReveal<HTMLDivElement>();
  const r5 = useReveal<HTMLDivElement>();
  const r6 = useReveal<HTMLDivElement>();
  const nav = (id: string) => t(LAND.nav.find((n) => n.id === id)!.l, lang);

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

      {/* 히어로: 주장 한 줄 + 개입 지도 */}
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
              <Magnetic>
                <a className="btn primary cta" href="#playbook" onClick={goTo('playbook')}><span>{t(LAND.ctaRules, lang)}</span></a>
              </Magnetic>
              <a className="link" href="#/app">{t(LAND.start, lang)}</a>
            </div>
          </div>
          <InterventionMap lang={lang} />
        </div>
      </section>

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
                  {i === 0 && (<><span className="price-old">{t(LAND.vis.priceA, lang)}</span><span className="price-new">{t(LAND.vis.priceB, lang)}</span><span className="chip-ask">{t(LAND.vis.ask, lang)}</span></>)}
                  {i === 1 && (<><span className="chip-stock a">{t(LAND.vis.candA, lang)}</span><span className="chip-stock b tie">{t(LAND.vis.candB, lang)}</span><span className="chip-alt">{t(LAND.vis.pick, lang)}</span></>)}
                  {i === 2 && (<><span className="chip-stock a">{t(LAND.vis.target, lang)}</span><span className="chip-stock b tie">{t(LAND.vis.dropped, lang)}</span><span className="chip-ask held">{t(LAND.vis.held, lang)}</span></>)}
                </div>
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
          <Playbook lang={lang} />
          <div className="play-foot rv">
            <a className="btn" href="#/app?review=1">{t(LAND.playOpen, lang)}</a>
            <p className="note">{t(LAND.playNote, lang)}</p>
          </div>
        </div>
      </section>

      {/* 04 검증 */}
      <section className="sec" id="proof">
        <div className="sec-in two" ref={r4}>
          <Head n="04" label={nav('proof')} title={t(LAND.proofTitle, lang)} sub={t(LAND.proofSub, lang)} />
          <ol className="proof rv">
            {LAND.proof.map((x, i) => (
              <li key={i} className={i === 2 ? 'pending' : ''}>
                <strong className="num">{t(x.n, lang)}</strong>
                <div>
                  <h3>{t(x.t, lang)}</h3>
                  <p>{t(x.d, lang)}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 05 직접 맡겨 보기: 투어 + 진열대 */}
      <section className="sec" id="try">
        <div className="sec-in" ref={r5}>
          <Head n="05" label={nav('try')} title={t(LAND.tryTitle, lang)} sub={t(LAND.trySub, lang)} />
          <div className="rv"><Tour lang={lang} /></div>
        </div>
      </section>

      <section className="agent-band" id="agent">
        <div className="band-in" ref={r6}>
          <header className="band-head">
            <h2 className="band-title"><Rise text={t(LAND.agentTitle, lang)} /></h2>
            <p className="band-sub">{t(LAND.agentSub, lang)}</p>
          </header>
          <div className="window">
            <div className="window-bar" aria-hidden><i /><i /><i /><span>nod.shop</span></div>
            <div className="window-body"><HeroPicks lang={lang} /></div>
          </div>
          <Cta lang={lang} />
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
