import { useCallback, useEffect, useState } from 'react';
import type { Lang } from './engine/types';
import App from './App';
import { Landing } from './ui/Landing';
import { Setup } from './ui/Setup';
import type { Config } from './ui/Setup';

const read = () => (location.hash.startsWith('#/app') ? 'app' : 'landing');

/** 해시 라우팅: #/ 랜딩, #/app 조건 설정 → 워크스페이스. 언어·테마는 세 화면이 공유한다. */
export default function Shell() {
  const [route, setRoute] = useState<'landing' | 'app'>(read);
  const [cfg, setCfg] = useState<Config | null>(null);
  const [lang, setLang] = useState<Lang>('ko');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'));

  useEffect(() => {
    const on = () => { setRoute(read()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  useEffect(() => { if (route === 'landing') setCfg(null); }, [route]);
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
