import { useState } from 'react';
import type { L, Lang } from '../engine/types';
import { defaultTarget, totalOf, type Verdict, type Watch } from '../agent/watch';
import type { Account, Provider, SignInResult } from '../auth/auth';
import { photoUrl } from '../store/photos';
import { sellerOf } from '../store/sellers';
import type { Store } from '../store/store';
import { money, t } from './copy';
import { RuleMark } from './Review';
import { Seg } from './Seg';

/** 화면이 들고 있는 가격 대기 하나 */
export interface WatchState {
  w: Watch;
  /** 시연용 시계: 기다리기 시작한 뒤 지난 날 */
  day: number;
  seed: number;
  status: 'watching' | 'asked' | 'bought' | 'expired' | 'cancelled';
  /** 결과까지 자동으로 하루씩 넘기는 중 */
  auto: boolean;
  /** 날마다 조건 안에서 가장 싼 총액 (그래프) */
  trail: (number | null)[];
  log: { day: number; text: L; tone: 'wait' | 'hold' | 'ok' | 'end' }[];
  /** 사전 승인 없이 조건이 맞았을 때 묻고 있는 내용 */
  pending?: Extract<Verdict, { kind: 'match' }>;
  orderId?: string;
}

const X = {
  setupTitle: { ko: '가격이 내려오면 살게요', en: 'Buy when the price drops' },
  now: { ko: (n: string) => `지금 국내 최저 ${n} (배송비 포함)`, en: (n: string) => `Lowest domestic now ${n} with shipping` },
  size: { ko: '사이즈', en: 'Size' },
  target: { ko: '목표 총액', en: 'Target total' },
  targetNote: { ko: '배송비까지 합친 금액이에요.', en: 'Shipping included.' },
  domestic: { ko: '국내 판매처만 (해외직구 제외)', en: 'Domestic sellers only (no overseas)' },
  days: { ko: '기한', en: 'Deadline' },
  dayN: { ko: (n: number) => `${n}일`, en: (n: number) => `${n} days` },
  pre: { ko: '이 조건이 모두 맞으면 내 승인 없이 결제해도 됩니다', en: 'If all of these hold, pay without asking me' },
  preOn: { ko: '한 번 사면 끝나요. 조건이 하나라도 어긋나면 사지 않고 이유를 남겨요.', en: 'Used once. If any term fails, it will not buy and will log why.' },
  preOff: { ko: '조건이 맞아도 결제하지 않고 먼저 물어볼게요. 늦게 보면 가격을 놓칠 수 있어요.', en: 'It will ask before paying, even when everything fits. You may miss the price if you answer late.' },
  cond: {
    ko: (size: string, max: string, dom: boolean, d: number) => [`사이즈 ${size}`, `배송비 포함 ${max} 이하`, dom ? '국내 판매처' : '해외직구 포함', `${d}일 안`],
    en: (size: string, max: string, dom: boolean, d: number) => [`Size ${size}`, `${max} or less with shipping`, dom ? 'Domestic sellers' : 'Overseas allowed', `Within ${d} days`],
  },
  start: { ko: '기다리기 시작', en: 'Start waiting' },
  cancel: { ko: '취소', en: 'Cancel' },
  listTitle: { ko: '가격 대기', en: 'Price watch' },
  status: {
    watching: { ko: (d: number) => `기다리는 중 · D-${d}`, en: (d: number) => `Waiting · ${d} days left` },
    asked: { ko: () => '결제 승인 대기', en: () => 'Awaiting your OK' },
    bought: { ko: () => '샀어요', en: () => 'Bought' },
    expired: { ko: () => '기한 끝', en: () => 'Expired' },
    cancelled: { ko: () => '그만둠', en: () => 'Stopped' },
  },
  preTag: { ko: '사전 승인', en: 'Pre-approved' },
  askTag: { ko: '맞으면 물어봄', en: 'Asks first' },
  day: { ko: '하루 지나가기', en: 'Next day' },
  run: { ko: '결과까지 빨리 보기', en: 'Fast-forward' },
  stop: { ko: '그만 기다리기', en: 'Stop waiting' },
  pay: { ko: (n: string) => `${n} 결제`, en: (n: string) => `Pay ${n}` },
  skip: { ko: '사지 않기', en: "Don't buy" },
  orders: { ko: '주문 보기', en: 'View order' },
  sim: { ko: '시연용 시계예요. 하루를 1초 안쪽으로 줄여 보여줘요.', en: 'Demo clock: one day passes in under a second.' },
  login: {
    why: { ko: '미리 승인하려면 로그인이 필요해요. 자리를 비운 동안 결제를 맡기려면 누가 맡겼는지 남아야 해요.', en: 'Sign in to pre-approve. Paying while you are away needs a record of who approved it.' },
    kakao: { ko: '카카오로 로그인', en: 'Sign in with Kakao' },
    google: { ko: 'Google로 로그인', en: 'Sign in with Google' },
    as: { ko: (n: string) => `${n} 계정으로 미리 승인해요`, en: (n: string) => `Pre-approving as ${n}` },
    blocked: { ko: '브라우저가 로그인 창(팝업)을 막았어요. 팝업을 허용하고 다시 눌러 주세요.', en: 'The browser blocked the sign-in window. Allow pop-ups and try again.' },
    failed: { ko: '로그인 창을 열지 못했어요. 잠시 뒤 다시 해 주세요.', en: 'Could not open sign-in. Try again shortly.' },
    waiting: { ko: '로그인 창에서 계속해 주세요.', en: 'Continue in the sign-in window.' },
  },
  saveFail: { ko: '미리 승인 기록을 남기지 못해 시작하지 않았어요. 다시 해 주세요.', en: 'Could not record the pre-approval, so nothing started. Try again.' },
  preBy: { ko: (n: string) => `사전 승인 · ${n}`, en: (n: string) => `Pre-approved · ${n}` },
};

/** 미리 승인할 때만 쓰는 로그인. 로그인 설정이 없는 환경(사용성 테스트 등)에서는 넘기지 않는다. */
export interface WatchLogin {
  account: Account | null;
  signIn: (p: Provider) => Promise<SignInResult>;
}

export function WatchSetup({ lang, store, productId, size: size0, login, onStart, onClose }: {
  lang: Lang; store: Store; productId: string; size: string;
  login?: WatchLogin;
  /** 미리 승인 기록을 남기지 못하면 throw한다 */
  onStart: (w: Omit<Watch, 'id'>) => void | Promise<void>; onClose: () => void;
}) {
  const p = store.getProduct(productId)!;
  const sizes = Object.keys(p.sizes);
  const [size, setSize] = useState(size0);
  const [max, setMax] = useState(() => defaultTarget(store, productId, size0));
  const [domesticOnly, setDom] = useState(true);
  const [days, setDays] = useState(14);
  const [pre, setPre] = useState(false);
  const [msg, setMsg] = useState<L | null>(null);
  const [busy, setBusy] = useState(false);
  // 미리 승인은 누가 맡겼는지 남아야 한다(R10). 로그인 전에는 시작하지 않는다.
  const needLogin = pre && !!login && !login.account;
  const signIn = async (prov: Provider) => {
    setMsg(null);
    const r = await login!.signIn(prov);
    setMsg(r === 'ok' ? X.login.waiting : r === 'blocked' ? X.login.blocked : X.login.failed);
  };
  const submit = async () => {
    if (max <= 0 || needLogin || busy) return;
    setBusy(true);
    try {
      await onStart({ productId, size, maxTotal: max, domesticOnly, days, preapproved: pre });
    } catch {
      setMsg(X.saveFail);
      setBusy(false);
    }
  };
  const domestic = store.offersOf(productId).filter((o) => !sellerOf(o.sellerId).overseas && (o.sizes[size] ?? 0) > 0).map((o) => totalOf(o.sellerId, o.price));
  const nowBest = domestic.length ? Math.min(...domestic) : null;
  const src = photoUrl(productId);
  return (
    <div className="cmp-wrap watch-setup" role="dialog" aria-modal="true" aria-label={t(X.setupTitle, lang)}>
      <div className="cmp-scrim" onClick={onClose} />
      <form className="cmp" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <header className="ws-head">
          <span className={`ws-ph sw sw-${p.colors[0]}`}>{src && <img src={src} alt="" />}</span>
          <div>
            <h2>{t(X.setupTitle, lang)}</h2>
            <p>{t(p.name, lang)}{nowBest !== null && <> · {X.now[lang](money(nowBest, lang))}</>}</p>
          </div>
        </header>
        <RuleMark ids={['R10', 'R1']} lang={lang} />
        {sizes.length > 1 && (
          <div className="ws-field">
            <span className="label">{t(X.size, lang)}</span>
            <div className="szs">
              {sizes.map((z) => <button type="button" key={z} className={`sz ${size === z ? 'on' : ''}`} aria-pressed={size === z} onClick={() => setSize(z)}>{z}</button>)}
            </div>
          </div>
        )}
        <label className="ws-field">
          <span className="label">{t(X.target, lang)}</span>
          <span className="ws-money"><input type="number" inputMode="numeric" step={1000} min={1000} value={max} onChange={(e) => setMax(Math.max(0, Number(e.target.value) || 0))} /><i>{lang === 'ko' ? '원' : 'KRW'}</i></span>
          <span className="note">{t(X.targetNote, lang)}</span>
        </label>
        <label className="ws-check"><input type="checkbox" checked={domesticOnly} onChange={(e) => setDom(e.target.checked)} /><span>{t(X.domestic, lang)}</span></label>
        <div className="ws-field">
          <span className="label">{t(X.days, lang)}</span>
          <Seg options={[7, 14, 30].map((d) => ({ value: d, label: X.dayN[lang](d) }))} value={days} onChange={setDays} label={t(X.days, lang)} />
        </div>
        <div className={`ws-pre ${pre ? 'on' : ''}`}>
          <ul>{X.cond[lang](size, money(max, lang), domesticOnly, days).map((c) => <li key={c}>{c}</li>)}</ul>
          <label className="ws-check"><input type="checkbox" checked={pre} onChange={(e) => setPre(e.target.checked)} /><b>{t(X.pre, lang)}</b></label>
          <p className="note">{t(pre ? X.preOn : X.preOff, lang)}</p>
          {pre && login && (login.account ? (
            <p className="ws-as">{X.login.as[lang](login.account.name)}</p>
          ) : (
            <div className="ws-login">
              <p>{t(X.login.why, lang)}</p>
              <div className="row">
                <button type="button" className="btn ws-kakao" onClick={() => void signIn('kakao')}>{t(X.login.kakao, lang)}</button>
                <button type="button" className="btn" onClick={() => void signIn('google')}>{t(X.login.google, lang)}</button>
              </div>
            </div>
          ))}
        </div>
        {msg && <p className="ws-msg" role="status">{t(msg, lang)}</p>}
        <div className="row">
          <button className="btn primary" type="submit" disabled={max <= 0 || needLogin || busy}>{t(X.start, lang)}</button>
          <button className="btn" type="button" onClick={onClose}>{t(X.cancel, lang)}</button>
        </div>
      </form>
    </div>
  );
}

/** 날마다의 최저 총액과 목표선 */
function Trail({ trail, target }: { trail: (number | null)[]; target: number }) {
  const pts = trail.map((v, i) => ({ i, v })).filter((p): p is { i: number; v: number } => p.v !== null);
  if (pts.length < 2) return null;
  const vs = [...pts.map((p) => p.v), target];
  const lo = Math.min(...vs) * 0.97, hi = Math.max(...vs) * 1.01;
  const W = 240, H = 48, n = Math.max(trail.length - 1, 1);
  const x = (i: number) => (i / n) * W;
  const y = (v: number) => H - ((v - lo) / (hi - lo)) * H;
  return (
    <svg className="wl-trail" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
      <line className="wl-target" x1={0} x2={W} y1={y(target)} y2={y(target)} />
      <polyline points={pts.map((p) => `${x(p.i)},${y(p.v)}`).join(' ')} />
    </svg>
  );
}

export function WatchList({ lang, store, watches, onDay, onRun, onStop, onPay, onSkip, onOrders }: {
  lang: Lang; store: Store; watches: WatchState[];
  onDay: (id: string) => void; onRun: (id: string) => void; onStop: (id: string) => void;
  onPay: (id: string) => void; onSkip: (id: string) => void; onOrders: () => void;
}) {
  if (watches.length === 0) return null;
  return (
    <section className="wl" aria-label={t(X.listTitle, lang)}>
      <RuleMark ids={['R10']} lang={lang} />
      {watches.map((s) => {
        const p = store.getProduct(s.w.productId);
        if (!p) return null;
        const src = photoUrl(p.id);
        const left = Math.max(0, s.w.days - s.day);
        return (
          <article key={s.w.id} className={`wl-card st-${s.status}`}>
            <header>
              <span className={`wl-ph sw sw-${p.colors[0]}`}>{src && <img src={src} alt="" />}</span>
              <div className="wl-t">
                <span className="wl-k">{t(X.listTitle, lang)}</span>
                <b>{t(p.name, lang)} {s.w.size !== 'FREE' && s.w.size}</b>
                <span className="wl-c">{money(s.w.maxTotal, lang)} · {s.w.domesticOnly ? (lang === 'ko' ? '국내만' : 'domestic') : (lang === 'ko' ? '해외 포함' : 'overseas ok')} · {s.w.preapproved ? (s.w.by ? X.preBy[lang](s.w.by) : t(X.preTag, lang)) : t(X.askTag, lang)}</span>
              </div>
              <span className="wl-st">{X.status[s.status][lang](left)}</span>
            </header>
            <Trail trail={s.trail} target={s.w.maxTotal} />
            <ol className="wl-log">
              {s.log.map((l, n) => ({ l, n })).slice(-4).reverse().map(({ l, n }) => <li key={n} className={`lg-${l.tone}`}>{t(l.text, lang)}</li>)}
            </ol>
            <div className="wl-act">
              {s.status === 'watching' && (<>
                <button className="btn sm" disabled={s.auto} onClick={() => onDay(s.w.id)}>{t(X.day, lang)}</button>
                <button className="btn sm primary" disabled={s.auto} onClick={() => onRun(s.w.id)}>{t(X.run, lang)}</button>
                <button className="btn sm ghost" onClick={() => onStop(s.w.id)}>{t(X.stop, lang)}</button>
              </>)}
              {s.status === 'asked' && s.pending && (<>
                <button className="btn sm primary" onClick={() => onPay(s.w.id)}>{X.pay[lang](money(s.pending.total, lang))}</button>
                <button className="btn sm" onClick={() => onSkip(s.w.id)}>{t(X.skip, lang)}</button>
              </>)}
              {s.status === 'bought' && <button className="btn sm" onClick={onOrders}>{t(X.orders, lang)}</button>}
            </div>
            {s.status === 'watching' && <p className="note">{t(X.sim, lang)}</p>}
          </article>
        );
      })}
    </section>
  );
}
