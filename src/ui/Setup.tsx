import { useEffect, useRef, useState } from 'react';
import type { Dial, Lang, SizeProfile } from '../engine/types';
import { DEFAULT_LIMIT } from '../store/catalog';
import { DIAL, SZ, t } from './copy';
import { SETUP } from './landCopy';
import { LimitSlider } from './LimitSlider';
import { Magnetic } from './Magnetic';
import { Wordmark } from './Wordmark';
import type { MarkPhase } from './Mark';
import { Rise } from './Rise';
import { Seg } from './Seg';
import { DEFAULT_SIZES, loadSizes, saveSizes, SizeProfileEditor, sizeSummary } from './SizeProfile';
import { ThemeButton } from './ThemeButton';

export interface Config { dial: Dial; limit: number; sizes: SizeProfile }

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
  const [dial, setDial] = useState<Dial>('cart-only');
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  // 내 사이즈는 한 번 정하면 저장해 두고 다음에도 쓴다. 자율도·한도는 매번 새로 고른다.
  const [saved] = useState(loadSizes);
  const [sizes, setSizes] = useState<SizeProfile>(saved ?? DEFAULT_SIZES);
  const [editSizes, setEditSizes] = useState(!saved);
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
    at(() => onConfirm({ dial, limit, sizes }), 1900);
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

        <div className="setup-actions">
          <Magnetic>
            <button className={`btn primary cta ${phase === 'done' ? 'ok' : ''}`} onClick={go} disabled={leaving}>
              <span key={`${leaving}-${phase}-${lang}`} className="swap">{label}</span>
            </button>
          </Magnetic>
          <a className="link" href="#/">{t(SETUP.back, lang)}</a>
        </div>
      </main>
    </div>
  );
}
