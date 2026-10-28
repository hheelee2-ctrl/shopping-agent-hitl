import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';

/**
 * 소셜 로그인(카카오·구글). Supabase Auth를 쓴다.
 * 로그인은 데모를 보는 데 필요하지 않다. 가격 대기를 "미리 승인"할 때만 묻는다:
 * 자리를 비운 동안 결제를 맡기려면 누가 맡겼는지 남아야 하기 때문이다(R10).
 *
 * 로그인 창은 팝업(auth.html)에서 연다. 페이지가 이동하면 메모리에 있는 장바구니·가격 대기 설정이 사라지기 때문이다.
 */

export type Provider = 'kakao' | 'google';
export const AUTH_CHANNEL = 'nod-auth';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient | null | undefined;
/** 설정이 없으면(키 없는 배포·테스트) null. 그때는 로그인을 묻지 않는다. */
export function supabase(): SupabaseClient | null {
  if (client === undefined) client = url && anon ? createClient(url, anon, { auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: false } }) : null;
  return client;
}

export interface Account {
  id: string;
  name: string;
  provider: string;
}

export const accountOf = (u: User | null | undefined): Account | null => {
  if (!u) return null;
  const m = u.user_metadata ?? {};
  const name = (m.full_name || m.name || m.nickname || m.preferred_username || u.email || '').toString();
  return { id: u.id, name: name || 'Nod 사용자', provider: (u.app_metadata?.provider ?? '').toString() };
};

export type SignInResult = 'ok' | 'blocked' | 'unavailable' | 'failed';

export function useAuth() {
  const sb = supabase();
  const [account, setAccount] = useState<Account | null>(null);
  const [ready, setReady] = useState(!sb);

  useEffect(() => {
    if (!sb) return;
    let live = true;
    const pull = () => sb.auth.getSession().then(({ data }) => { if (live) { setAccount(accountOf(data.session?.user)); setReady(true); } });
    void pull();
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setAccount(accountOf(s?.user)));
    // 팝업이 로그인을 마치면 알려준다. 세션은 같은 저장소(localStorage)에 있으니 다시 읽기만 하면 된다.
    const ch = new BroadcastChannel(AUTH_CHANNEL);
    ch.onmessage = () => void pull();
    return () => { live = false; sub.subscription.unsubscribe(); ch.close(); };
  }, [sb]);

  /** 클릭 흐름 안에서 바로 부른다. 팝업을 먼저 열어야 브라우저가 막지 않는다. */
  const signIn = useCallback(async (provider: Provider): Promise<SignInResult> => {
    if (!sb) return 'unavailable';
    const w = window.open('about:blank', 'nod-auth', 'popup,width=480,height=720');
    if (!w) return 'blocked';
    const { data, error } = await sb.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth.html`, skipBrowserRedirect: true },
    });
    if (error || !data?.url) {
      w.close();
      return 'failed';
    }
    w.location.href = data.url;
    return 'ok';
  }, [sb]);

  const signOut = useCallback(async () => { await sb?.auth.signOut(); setAccount(null); }, [sb]);

  return { enabled: !!sb, ready, account, signIn, signOut };
}
