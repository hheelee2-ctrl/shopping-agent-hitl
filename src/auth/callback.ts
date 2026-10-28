import { AUTH_CHANNEL, supabase } from './auth';
import '../pay/pay.css';

/**
 * 로그인 팝업이 돌아오는 곳(auth.html). 카카오·구글 → Supabase → 여기(?code=)로 온다.
 * 코드를 세션으로 바꾸고(PKCE), Nod 화면에 알린 뒤 창을 닫는다. 세션은 같은 출처의 localStorage에 남아 Nod 화면도 읽는다.
 */
const say = (title: string, sub: string) => {
  document.getElementById('title')!.textContent = title;
  document.getElementById('sub')!.textContent = sub;
};

async function run() {
  const q = new URLSearchParams(location.search);
  const sb = supabase();
  const err = q.get('error_description') || q.get('error');
  if (!sb || err) return say('로그인하지 못했어요', err ?? '로그인 설정이 없어요.');
  const code = q.get('code');
  if (!code) return say('로그인 정보를 찾지 못했어요', 'Nod 화면에서 다시 로그인해 주세요.');
  const { error } = await sb.auth.exchangeCodeForSession(code);
  if (error) return say('로그인하지 못했어요', error.message);
  new BroadcastChannel(AUTH_CHANNEL).postMessage('signed-in');
  say('로그인했어요', '이 창은 곧 닫혀요. Nod 화면으로 돌아가 주세요.');
  setTimeout(() => window.close(), 700);
}
void run();
