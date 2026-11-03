import { useEffect, useState } from 'react';
import { ArrowRight } from '@phosphor-icons/react';
import type { Lang } from '../engine/types';
import { RULES, RULE_TESTS } from '../rules';
import { t } from './copy';
import { HeroPicks } from './HeroPicks';
import { LAND } from './landCopy';
import { Decides } from './Decides';
import { DialTable } from './DialTable';
import { Highlights } from './Highlights';
import { Wordmark } from './Wordmark';
import { Rise } from './Rise';
import { Scenes } from './Scenes';
import { Stages } from './Stages';
import { Tour } from './Tour';
import { ThemeButton } from './ThemeButton';
import { useReveal } from './useReveal';

interface Props {
  lang: Lang;
  onLang: (l: Lang) => void;
  theme: 'dark' | 'light';
  onTheme: () => void;
}

/** 원칙에 묶인 테스트 수(scripts/rules.mjs가 센 값) */
const TESTS = Object.values(RULE_TESTS).reduce((a, b) => a + b, 0);

function Cta({ lang, sm }: { lang: Lang; sm?: boolean }) {
  return (
    <a className={`go-pill${sm ? ' sm' : ''}`} href="#/app">
      <span>{t(sm ? LAND.startShort : LAND.start, lang)}</span>
      <ArrowRight className="ic ic-r" size={sm ? 14 : 18} weight="bold" aria-hidden />
    </a>
  );
}

/** 섹션 머리: 회색 작은 이름, 그 아래 큰 제목(줄바꿈은 문구의 \n), 짧은 설명 */
function Head({ label, title, sub }: { label?: string; title: string; sub?: string }) {
  return (
    <header className="sec-head">
      {label && <p className="sec-label">{label}</p>}
      <h2 className="sec-title">{title.split('\n').map((l, i) => <span key={i} className="ln"><Rise text={l} delay={i * 120} /></span>)}</h2>
      {sub && <p className="sec-sub">{sub}</p>}
    </header>
  );
}

/**
 * 랜딩. 애플 제품 상세페이지의 흐름을 따른다:
 * 제품 이름과 한 줄 → 제품(실제 화면) → 편해지는 것 → 물어보는 순간 → 눌러 보는 선택기와 비교 → 직접 해 보기 → 약속 → 만든 이야기 → 마지막 행동.
 * 말은 토스처럼: 제목은 사용자가 얻는 것, 작동 방식은 그 아래 작게.
 * 섹션은 바탕과 한 단계 짙은 바탕이 번갈아 나온다.
 */
export function Landing({ lang, onLang, theme, onTheme }: Props) {
  const r = [useReveal<HTMLDivElement>(), useReveal<HTMLDivElement>(), useReveal<HTMLDivElement>(), useReveal<HTMLDivElement>(), useReveal<HTMLDivElement>(), useReveal<HTMLDivElement>(), useReveal<HTMLDivElement>()];
  // 상단 바가 어두운 히어로 위에 있는 동안은 바도 무대색으로
  const [onDark, setOnDark] = useState(true);
  useEffect(() => {
    const hero = document.querySelector('.hero.hx');
    if (!hero) return;
    const io = new IntersectionObserver(([e]) => setOnDark(e.isIntersecting), { rootMargin: '0px 0px -94% 0px' });
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  // 앱의 규칙 칩에서 #/playbook으로 오면 원칙 섹션으로 바로 내려간다
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
          <Wordmark size={20} />
        </a>
        <div className="top-r">
          <ThemeButton theme={theme} onToggle={onTheme} lang={lang} />
          <div className="lang" role="group" aria-label="language">
            <button aria-pressed={lang === 'ko'} onClick={() => onLang('ko')}>KO</button>
            <button aria-pressed={lang === 'en'} onClick={() => onLang('en')}>EN</button>
          </div>
          <Cta lang={lang} sm />
        </div>
      </header>

      {/* 히어로: 어두운 무대. 이름과 한 줄, 가운데 실제 화면, 아래 한 줄과 시작 버튼 */}
      <section className="hero hx">
        <div className="hx-in">
          <hgroup className="hx-head">
            <p className="hx-name">{t(LAND.heroName, lang)}</p>
            <h1 className="hx-title">{t(LAND.heroTitle, lang)}</h1>
          </hgroup>
          <figure className="hx-demo">
            <div className="window">
              <div className="window-bar" aria-hidden><i /><i /><i /><span>nod.shop</span></div>
              <div className="window-body"><HeroPicks lang={lang} /></div>
            </div>
            <figcaption className="sr-only">{t(LAND.agentSub, lang)}</figcaption>
          </figure>
          <div className="hx-bar">
            <p>{t(LAND.heroBar, lang)}</p>
            <Cta lang={lang} />
          </div>
        </div>
      </section>

      {/* 핵심만 먼저 */}
      <section className="sec alt" id="highlights">
        <div className="sec-in wide" ref={r[0]}>
          <Head title={t(LAND.hl.title, lang)} />
          <Highlights lang={lang} />
        </div>
      </section>

      {/* 멈추는 순간 */}
      <section className="sec" id="scenes">
        <div className="sec-in" ref={r[1]}>
          <Head label={t(LAND.label.scenes, lang)} title={t(LAND.sceneTitle, lang)} sub={t(LAND.sceneSub, lang)} />
          <Scenes lang={lang} />
        </div>
      </section>

      {/* 맡기는 정도: 눌러 보는 선택기, 바로 아래 세 단계 비교 */}
      <section className="sec alt" id="dial">
        <div className="sec-in" ref={r[2]}>
          <Head label={t(LAND.label.dial, lang)} title={t(LAND.dialTitle, lang)} sub={t(LAND.dialSub, lang)} />
          <Decides lang={lang} />
          <div className="dial-cmp" id="compare">
            <h3 className="dial-cmp-title">{t(LAND.cmpTitle, lang)}</h3>
            <DialTable lang={lang} />
          </div>
        </div>
      </section>

      {/* 직접 해 보기: 투어 */}
      <section className="sec" id="try">
        <div className="sec-in" ref={r[3]}>
          <Head label={t(LAND.label.try, lang)} title={t(LAND.tryTitle, lang)} sub={t(LAND.trySub, lang)} />
          <div className="rv"><Tour lang={lang} /></div>
        </div>
      </section>

      {/* 약속: 앞에는 쉬운 말 네 개, 작동 방식(원칙·테스트)은 작은 회색 한 줄로 */}
      <section className="sec alt" id="playbook">
        <div className="sec-in" ref={r[4]}>
          <Head label={t(LAND.label.rules, lang)} title={t(LAND.playTitle, lang)} />
          <Stages lang={lang} />
          <div className="play-foot rv">
            <p className="play-total">{LAND.playTotal[lang](RULES.length, TESTS)}. {t(LAND.playSub, lang)}</p>
            <a className="link-arrow" href="#/app?review=1">{t(LAND.playOpen, lang)}<ArrowRight className="ic ic-r" size={14} weight="bold" aria-hidden /></a>
          </div>
        </div>
      </section>

      {/* 만든 이야기: 포트폴리오를 보는 사람을 위한 배경 */}
      <section className="sec story" id="story">
        <div className="sec-in" ref={r[5]}>
          <Head label={t(LAND.label.story, lang)} title={t(LAND.storyTitle, lang)} sub={t(LAND.storySub, lang)} />
        </div>
      </section>

      {/* 마지막 행동 */}
      <section className="sec alt end">
        <div className="sec-in" ref={r[6]}>
          <h2 className="end-title">{t(LAND.endTitle, lang).split('\n').map((l, i) => <span key={i} className="ln">{l}</span>)}</h2>
          <Cta lang={lang} />
          <p className="end-sub">{t(LAND.endSub, lang)}</p>
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
