import { useEffect, useRef, useState } from 'react';
import type { Dial, Lang, SizeProfile, StyleProfile } from '../engine/types';
import { DEFAULT_LIMIT } from '../store/catalog';
import { DIAL, ST, SZ, t } from './copy';
import { loadPrefs, savePrefs } from './prefs';
import { ColorPicker, EMPTY_STYLE, loadStyle, MaterialPicker, MoodPicker, saveStyle, styleSummary } from './StyleProfile';
import { SETUP } from './landCopy';
import { LimitSlider } from './LimitSlider';
import { Magnetic } from './Magnetic';
import { Wordmark } from './Wordmark';
import type { MarkPhase } from './Mark';
import { Rise } from './Rise';
import { Seg } from './Seg';
import { DEFAULT_SIZES, loadSizes, saveSizes, SizeProfileEditor, sizeSummary } from './SizeProfile';
import { ThemeButton } from './ThemeButton';

export interface Config { dial: Dial; limit: number; sizes: SizeProfile; style: StyleProfile }

interface Props {
  lang: Lang;
  onLang: (l: Lang) => void;
  theme: 'dark' | 'light';
  onTheme: () => void;
  onConfirm: (c: Config) => void;
}

/**
 * 에이전트 실행 전 첫 단계. 확정하면 로고의 원 안에서 호가 돌다가(준비 중) 체크가 들어간 뒤 워크스페이스로 넘어간다.
 */
export function Setup({ lang, onLang, theme, onTheme, onConfirm }: Props) {
  // 자율도·한도는 매번 고르되, 마지막으로 저장한 값에서 시작한다
  const [prefs] = useState(loadPrefs);
  const [dial, setDial] = useState<Dial>(prefs.dial ?? 'cart-only');
  const [limit, setLimit] = useState(prefs.limit ?? DEFAULT_LIMIT);
  // 내 사이즈는 한 번 정하면 저장해 두고 다음에도 쓴다. 자율도·한도는 매번 새로 고른다.
  const [saved] = useState(loadSizes);
  const [sizes, setSizes] = useState<SizeProfile>(saved ?? DEFAULT_SIZES);
  const [editSizes, setEditSizes] = useState(!saved);
  // 내 스타일: 처음이면 기본 설정 뒤에 3단계(무드 → 색 → 소재)로 묻고, 저장돼 있으면 요약만 보여준다
  const [savedStyle] = useState(loadStyle);
  const [style, setStyle] = useState<StyleProfile>(savedStyle ?? EMPTY_STYLE);
  const [editStyle, setEditStyle] = useState(!savedStyle);
  const [stage, setStage] = useState<'base' | 0 | 1 | 2>('base');
  const [phase, setPhase] = useState<MarkPhase>('idle');
  const [leaving, setLeaving] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  const go = () => {
    if (leaving) return;
    setLeaving(true);
    const at = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
    at(() => setPhase('busy'), 260);
    at(() => setPhase('done'), 1200);
    saveSizes(sizes);
    saveStyle(style);
    savePrefs({ dial, limit });
    at(() => onConfirm({ dial, limit, sizes, style }), 1900);
  };
  const toTop = () => window.scrollTo({ top: 0 });
  const start = () => { if (editStyle) { setStage(0); toTop(); } else go(); };
  const nextStep = () => {
    if (stage === 2) go();
    else { setStage(((stage as number) + 1) as 1 | 2); toTop(); }
  };
  // 건너뛰기: 이번 단계에서 고른 것은 비우고 다음으로
  const skip = () => {
    if (stage === 0) setStyle((v) => ({ ...v, moods: [] }));
    if (stage === 1) setStyle((v) => ({ ...v, likeColors: [], avoidColors: [] }));
    if (stage === 2) setStyle((v) => ({ ...v, avoidMaterials: [] }));
    nextStep();
  };

  const label = !leaving ? t(SETUP.go, lang) : phase === 'done' ? t(SETUP.ready, lang) : t(SETUP.preparing, lang);

  return (
    <div className={`setup ${leaving ? 'leaving' : ''}`}>
      <header className="land-top">
        <a className="logo" href="#/" aria-label="Nod"><Wordmark size={24} /></a>
        <span />
        <div className="top-r">
          <ThemeButton theme={theme} onToggle={onTheme} lang={lang} />
          <div className="lang" role="group" aria-label="language">
            <button aria-pressed={lang === 'ko'} onClick={() => onLang('ko')}>KO</button>
            <button aria-pressed={lang === 'en'} onClick={() => onLang('en')}>EN</button>
          </div>
        </div>
      </header>

      {stage === 'base' ? (
      <main className="setup-in">
        <div className="setup-mark"><Wordmark size={64} phase={phase} /></div>
        <h1 className="setup-title"><Rise text={t(SETUP.title, lang)} /></h1>
        <p className="sec-sub">{t(SETUP.sub, lang)}</p>

        <section className="setup-block">
          <p className="label">{t(SETUP.dial, lang)}</p>
          <Seg
            options={(Object.keys(DIAL) as Dial[]).map((d) => ({ value: d, label: t(DIAL[d], lang) }))}
            value={dial} onChange={setDial} label={t(SETUP.dial, lang)} disabled={leaving}
          />
          <p className="setup-desc" aria-live="polite"><span key={`${dial}-${lang}`} className="swap">{t(SETUP.dialDesc[dial], lang)}</span></p>
        </section>

        <section className="setup-block">
          <p className="label">{t(SETUP.limit, lang)}</p>
          <LimitSlider value={limit} onChange={setLimit} lang={lang} label={t(SETUP.limit, lang)} disabled={leaving} />
          <p className="setup-desc">{t(SETUP.limitNote, lang)}</p>
        </section>

        <section className="setup-block">
          <p className="label">{t(SZ.title, lang)}</p>
          {editSizes ? (
            <>
              <SizeProfileEditor lang={lang} value={sizes} onChange={setSizes} disabled={leaving} />
              <p className="setup-desc">{t(SZ.note, lang)} {t(SZ.saveNote, lang)}</p>
            </>
          ) : (
            <div className="sizes-saved">
              <span>{sizeSummary(sizes, lang)}</span>
              <button className="link-btn" onClick={() => setEditSizes(true)} disabled={leaving}>{t(SZ.change, lang)}</button>
            </div>
          )}
        </section>

        {!editStyle && (
          <section className="setup-block">
            <p className="label">{t(ST.title, lang)}</p>
            <div className="sizes-saved">
              <span>{styleSummary(style, lang)}</span>
              <button className="link-btn" onClick={() => setEditStyle(true)} disabled={leaving}>{t(SZ.change, lang)}</button>
            </div>
          </section>
        )}

        <div className="setup-actions">
          <Magnetic>
            <button className={`btn primary cta ${phase === 'done' ? 'ok' : ''}`} onClick={start} disabled={leaving}>
              <span key={`${leaving}-${phase}-${editStyle}-${lang}`} className="swap">{editStyle ? t(ST.next, lang) : label}</span>
            </button>
          </Magnetic>
          <a className="link" href="#/">{t(SETUP.back, lang)}</a>
        </div>
      </main>
      ) : (
      <main className="setup-in setup-step" key={stage}>
        <p className="eyebrow"><span className="num">{t(ST.title, lang)}</span>{ST.stepOf[lang](stage + 1, 3)}</p>
        <ol className="step-dots" aria-hidden>{[0, 1, 2].map((i) => <li key={i} className={i <= stage ? 'on' : ''} />)}</ol>
        <h1 className="setup-title"><Rise text={t(ST.steps[stage].t, lang)} /></h1>
        <p className="sec-sub">{t(ST.steps[stage].d, lang)}</p>

        <section className="setup-block step-body">
          {stage === 0 && <MoodPicker lang={lang} value={style} onChange={setStyle} />}
          {stage === 1 && <ColorPicker lang={lang} value={style} onChange={setStyle} />}
          {stage === 2 && <MaterialPicker lang={lang} value={style} onChange={setStyle} />}
          <p className="setup-desc">{t(ST.note, lang)}</p>
        </section>

        <div className="setup-actions">
          <Magnetic>
            <button className={`btn primary cta ${phase === 'done' ? 'ok' : ''}`} onClick={nextStep} disabled={leaving}>
              <span key={`${leaving}-${phase}-${stage}-${lang}`} className="swap">{stage === 2 ? label : t(ST.next, lang)}</span>
            </button>
          </Magnetic>
          <button className="btn ghost" onClick={skip} disabled={leaving}>{t(ST.skip, lang)}</button>
          <button className="link-btn" onClick={() => { setStage(stage === 0 ? 'base' : ((stage - 1) as 0 | 1)); toTop(); }} disabled={leaving}>{t(ST.prev, lang)}</button>
        </div>
      </main>
      )}
    </div>
  );
}
