import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';

/**
 * 구글 로그인. Supabase Auth를 쓴다.
 * 둘러보기와 에이전트에게 맡기기는 로그인 없이 된다. 결제할 때와 가격 대기를 "미리 승인"할 때만 묻는다:
 * 누가 결제를 승인했는지, 자리를 비운 동안 누가 결제를 맡겼는지 남아야 하기 때문이다(R1, R10).
 *
 * 로그인 창은 팝업(auth.html)에서 연다. 페이지가 이동하면 메모리에 있는 장바구니·가격 대기 설정이 사라지기 때문이다.
 */

/** 지금은 구글만 쓴다. 카카오는 비즈 앱 전환(이메일 권한)이 필요해 뺐다. */
export type Provider = 'google';
export const AUTH_CHANNEL = 'nod-auth';

// 프로젝트 주소와 anon 키는 브라우저에 공개하라고 만든 값이다(데이터는 RLS가 막는다). 환경변수가 있으면 그것을 쓴다.
// service_role 키는 여기에 두지 않는다.
const DEFAULT_URL = 'https://pgaluyeodqiriowhoppw.supabase.co';
const DEFAULT_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnYWx1eWVvZHFpcmlvd2hvcHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxNDczNzcsImV4cCI6MjEwODcyMzM3N30.ouqWjNw58lN7cYFOtD4268PVru39sq96NQ5hf7FzDK0';
// 테스트(vitest)에서는 기본값을 쓰지 않는다: 로그인 없이 도는 것이 기본이다
const inTest = import.meta.env.MODE === 'test';
// 환경변수 값이 주소가 아니면(다른 칸에 넣은 키 등) 무시하고 기본값을 쓴다
const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const envAnon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
const url = envUrl && /^https:\/\//.test(envUrl) ? envUrl : inTest ? undefined : DEFAULT_URL;
const anon = envAnon || (inTest ? undefined : DEFAULT_ANON);

let client: SupabaseClient | null | undefined;
/** 설정이 없거나 잘못됐으면 null. 그때는 로그인을 묻지 않는다(쇼핑 화면은 멈추지 않는다). */
export function supabase(): SupabaseClient | null {
  if (client === undefined) {
    try {
      client = url && anon ? createClient(url, anon, { auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: false } }) : null;
    } catch {
      client = null;
    }
  }
  return client;
}

export interface Account {
  id: string;
  name: string;
  provider: string;
  /** 구글 프로필 사진. 없으면 이름 첫 글자를 쓴다 */
  avatar?: string;
}

export const accountOf = (u: User | null | undefined): Account | null => {
  if (!u) return null;
  const m = u.user_metadata ?? {};
  const name = (m.full_name || m.name || m.nickname || m.preferred_username || u.email || '').toString();
  const avatar = (m.avatar_url || m.picture || '').toString() || undefined;
  return { id: u.id, name: name || 'Nod 사용자', provider: (u.app_metadata?.provider ?? '').toString(), avatar };
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
