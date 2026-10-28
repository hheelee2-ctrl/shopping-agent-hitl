import { useState } from 'react';
import type { L, Lang } from '../engine/types';
import type { Account, Provider, SignInResult } from '../auth/auth';
import { t } from './copy';

const X = {
  title: { ko: '결제하려면 로그인해 주세요', en: 'Sign in to pay' },
  why: { ko: '누가 결제를 승인했는지 남겨요. 테스트 결제라 실제 돈은 나가지 않아요.', en: 'We record who approved the payment. It is a test payment; no real money moves.' },
  google: { ko: 'Google로 로그인', en: 'Sign in with Google' },
  waiting: { ko: '로그인 창에서 계속해 주세요.', en: 'Continue in the sign-in window.' },
  blocked: { ko: '브라우저가 로그인 창(팝업)을 막았어요. 팝업을 허용하고 다시 눌러 주세요.', en: 'The browser blocked the sign-in window. Allow pop-ups and try again.' },
  failed: { ko: '로그인 창을 열지 못했어요. 잠시 뒤 다시 해 주세요.', en: 'Could not open sign-in. Try again shortly.' },
  done: { ko: (n: string) => `${n} 계정으로 로그인했어요`, en: (n: string) => `Signed in as ${n}` },
  cancel: { ko: '취소', en: 'Cancel' },
};

/**
 * 결제 직전 로그인. 로그인하면 바로 넘어가지 않고 "결제 계속"을 한 번 더 누르게 한다:
 * 결제창(모바일은 팝업)은 사람의 클릭 안에서 열어야 브라우저가 막지 않는다.
 */
export function LoginGate({ lang, account, signIn, cta, onContinue, onClose }: {
  lang: Lang;
  account: Account | null;
  signIn: (p: Provider) => Promise<SignInResult>;
  /** 로그인 뒤 누를 버튼 문구 (예: "178,000원 결제 계속") */
  cta: string;
  onContinue: () => void;
  onClose: () => void;
}) {
  const [msg, setMsg] = useState<L | null>(null);
  const go = async () => {
    setMsg(null);
    const r = await signIn('google');
    setMsg(r === 'ok' ? X.waiting : r === 'blocked' ? X.blocked : X.failed);
  };
  return (
    <div className="cmp-wrap login-gate" role="dialog" aria-modal="true" aria-label={t(X.title, lang)}>
      <div className="cmp-scrim" onClick={onClose} />
      <div className="cmp">
        <h2>{t(X.title, lang)}</h2>
        <p className="note">{t(X.why, lang)}</p>
        {account ? (
          <>
            <p className="lg-as">{X.done[lang](account.name)}</p>
            <div className="row">
              <button className="btn nod" autoFocus onClick={onContinue}>{cta}</button>
              <button className="btn" onClick={onClose}>{t(X.cancel, lang)}</button>
            </div>
          </>
        ) : (
          <>
            <div className="row">
              <button className="btn primary" autoFocus onClick={() => void go()}>{t(X.google, lang)}</button>
              <button className="btn" onClick={onClose}>{t(X.cancel, lang)}</button>
            </div>
            {msg && <p className="note" role="status">{t(msg, lang)}</p>}
          </>
        )}
      </div>
    </div>
  );
}
