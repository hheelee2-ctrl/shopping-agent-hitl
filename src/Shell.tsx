import { useCallback, useEffect, useState } from 'react';
import type { Lang } from './engine/types';
import App from './App';
import { Landing } from './ui/Landing';
import { Setup } from './ui/Setup';
import type { Config } from './ui/Setup';
import { loadPrefs } from './ui/prefs';
import { loadSizes } from './ui/SizeProfile';
import { EMPTY_STYLE, loadStyle } from './ui/StyleProfile';

const read = () => (location.hash.startsWith('#/app') ? 'app' : 'landing');

/**
 * 한 번 설정을 마쳤으면(설정 화면이 자율도·한도·사이즈를 저장한다) 새로고침해도 설정 화면을 다시 보여주지 않는다.
 * 바꾸고 싶으면 에이전트 패널의 설정에서 바꾼다. 사용성 테스트(?study=)는 매번 설정부터 시작한다.
 */
function savedConfig(): Config | null {
  if (/[?&]study=/.test(location.hash)) return null;
  const p = loadPrefs();
  const sizes = loadSizes();
  if (!p.dial || p.limit === undefined || !sizes) return null;
  return { dial: p.dial, limit: p.limit, sizes, style: loadStyle() ?? EMPTY_STYLE };
}

/** 해시 라우팅: #/ 랜딩, #/app 조건 설정 → 워크스페이스. 언어·테마는 세 화면이 공유한다. */
export default function Shell() {
  const [route, setRoute] = useState<'landing' | 'app'>(read);
  const [cfg, setCfg] = useState<Config | null>(savedConfig);
  const [lang, setLang] = useState<Lang>('ko');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'));

  useEffect(() => {
    const on = () => { setRoute(read()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  // 랜딩을 거쳐 다시 들어올 때도 저장된 설정(패널에서 바꾼 값 포함)으로 바로 연다
  useEffect(() => { if (route === 'landing') setCfg(savedConfig()); }, [route]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('theme', theme); } catch { /* 저장 불가 환경은 무시 */ }
  }, [theme]);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const toggle = useCallback(() => setTheme((x) => (x === 'dark' ? 'light' : 'dark')), []);

  if (route === 'landing') return <Landing lang={lang} onLang={setLang} theme={theme} onTheme={toggle} />;
  if (!cfg) return <Setup lang={lang} onLang={setLang} theme={theme} onTheme={toggle} onConfirm={setCfg} />;
  return <App lang={lang} onLang={setLang} theme={theme} onTheme={toggle} initial={cfg} />;
}
