import { useState } from 'react';
import type { L, Lang } from '../engine/types';
import { defaultTarget, totalOf, type Verdict, type Watch } from '../agent/watch';
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
};

export function WatchSetup({ lang, store, productId, size: size0, onStart, onClose }: {
  lang: Lang; store: Store; productId: string; size: string;
  onStart: (w: Omit<Watch, 'id'>) => void; onClose: () => void;
}) {
  const p = store.getProduct(productId)!;
  const sizes = Object.keys(p.sizes);
  const [size, setSize] = useState(size0);
  const [max, setMax] = useState(() => defaultTarget(store, productId, size0));
  const [domesticOnly, setDom] = useState(true);
  const [days, setDays] = useState(14);
  const [pre, setPre] = useState(false);
  const domestic = store.offersOf(productId).filter((o) => !sellerOf(o.sellerId).overseas && (o.sizes[size] ?? 0) > 0).map((o) => totalOf(o.sellerId, o.price));
  const nowBest = domestic.length ? Math.min(...domestic) : null;
  const src = photoUrl(productId);
  return (
    <div className="cmp-wrap watch-setup" role="dialog" aria-modal="true" aria-label={t(X.setupTitle, lang)}>
      <div className="cmp-scrim" onClick={onClose} />
      <form className="cmp" onSubmit={(e) => { e.preventDefault(); if (max > 0) onStart({ productId, size, maxTotal: max, domesticOnly, days, preapproved: pre }); }}>
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
        </div>
        <div className="row">
          <button className="btn primary" type="submit" disabled={max <= 0}>{t(X.start, lang)}</button>
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
                <span className="wl-c">{money(s.w.maxTotal, lang)} · {s.w.domesticOnly ? (lang === 'ko' ? '국내만' : 'domestic') : (lang === 'ko' ? '해외 포함' : 'overseas ok')} · {t(s.w.preapproved ? X.preTag : X.askTag, lang)}</span>
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
