import type { L } from '../engine/types';
import { mulberry32 } from '../store/market';
import { sellerOf, shippingFee } from '../store/sellers';
import type { Store } from '../store/store';

/**
 * 가격 대기: "이 가격 아래로 내려오면 사 줘."
 * 가격이 내려온 순간 사람은 화면 앞에 없다. 그래서 사람이 미리 정한 조건(사이즈, 배송비 포함 총액, 판매처 종류, 기한)이
 * 전부 맞을 때만 산다(R10). 가격만 내려오고 다른 조건이 어긋나면 사지 않고 이유를 남긴다.
 * 사전 승인이 없으면 조건이 맞아도 사지 않고 묻는다. 사전 승인은 한 번 사면 끝난다.
 */
export interface Watch {
  id: string;
  productId: string;
  size: string;
  /** 배송비를 포함한 총액 상한 */
  maxTotal: number;
  domesticOnly: boolean;
  /** 며칠 동안 기다릴지 */
  days: number;
  /** 조건이 모두 맞으면 사람의 그 자리 승인 없이 결제해도 된다는 사전 승인 */
  preapproved: boolean;
  /** 사전 승인한 사람(로그인 계정 이름)과 그 기록의 id. 로그인 설정이 없는 환경(테스트·사용성 테스트)에서는 없다 */
  by?: string;
  mandateId?: string;
}

/** 가격은 내려왔는데 사지 않은 이유 */
export type Miss = 'size' | 'shipping' | 'overseas';

export type Verdict =
  | { kind: 'expired' }
  /** 아직 목표가 위. best는 조건 안에서 지금 가장 싼 총액 */
  | { kind: 'wait'; best: number | null }
  /** 표시가는 목표 아래로 내려왔지만 다른 조건이 어긋난다 */
  | { kind: 'hold'; sellerId: string; price: number; total: number; misses: Miss[] }
  /** 모든 조건이 맞는다 */
  | { kind: 'match'; sellerId: string; price: number; total: number };

/** 혼자 살 때의 총액: 판매가 + 그 판매처 배송비 */
export const totalOf = (sellerId: string, price: number) => price + shippingFee(sellerOf(sellerId), price);

/** day: 기다리기 시작한 뒤 지난 날 수 (0부터) */
export function checkWatch(w: Watch, store: Store, day: number): Verdict {
  if (day > w.days) return { kind: 'expired' };
  const rows = store.offersOf(w.productId).map((o) => {
    const total = totalOf(o.sellerId, o.price);
    const misses: Miss[] = [];
    if ((o.sizes[w.size] ?? 0) <= 0) misses.push('size');
    if (w.domesticOnly && sellerOf(o.sellerId).overseas) misses.push('overseas');
    if (total > w.maxTotal) misses.push('shipping');
    return { o, total, misses };
  });
  const ok = rows.filter((r) => r.misses.length === 0).sort((a, b) => a.total - b.total)[0];
  if (ok) return { kind: 'match', sellerId: ok.o.sellerId, price: ok.o.price, total: ok.total };
  // 표시가는 목표 아래인데 다른 조건 때문에 못 사는 판매처 중 가장 아까운 곳
  const near = rows.filter((r) => r.o.price <= w.maxTotal).sort((a, b) => a.misses.length - b.misses.length || a.total - b.total)[0];
  if (near) return { kind: 'hold', sellerId: near.o.sellerId, price: near.o.price, total: near.total, misses: near.misses };
  const fine = rows.filter((r) => !r.misses.includes('size') && !r.misses.includes('overseas')).map((r) => r.total);
  return { kind: 'wait', best: fine.length ? Math.min(...fine) : null };
}

/** 조건이 맞았을 때 할 일. 사전 승인이 있을 때만 산다. */
export const decide = (w: Watch, v: Verdict): 'buy' | 'ask' | 'hold' | 'wait' | 'expire' =>
  v.kind === 'match' ? (w.preapproved ? 'buy' : 'ask') : v.kind === 'hold' ? 'hold' : v.kind === 'expired' ? 'expire' : 'wait';

/** 사람이 고르기 좋은 기본 목표: 지금 국내 최저 총액의 85%, 천 원 단위 */
export function defaultTarget(store: Store, productId: string, size: string): number {
  const totals = store.offersOf(productId)
    .filter((o) => !sellerOf(o.sellerId).overseas && (o.sizes[size] ?? 0) > 0)
    .map((o) => totalOf(o.sellerId, o.price));
  const base = totals.length ? Math.min(...totals) : store.getProduct(productId)?.price ?? 0;
  return Math.floor((base * 0.85) / 1000) * 1000;
}

/**
 * 시연용 하루. 판매처마다 가격이 조금씩 움직이고(대체로 내려간다), 가끔 그 사이즈 재고가 비거나 다시 들어온다.
 * 같은 seed·day면 같은 결과다.
 */
export function simulateDay(store: Store, w: Watch, seed: number, day: number) {
  const rng = mulberry32(seed * 1000 + day);
  for (const o of store.offersOf(w.productId)) {
    const up = rng() < 0.2;
    const f = up ? 1 + rng() * 0.03 : 1 - (0.015 + rng() * 0.05);
    store.setPrice(w.productId, Math.max(1000, Math.round((o.price * f) / 1000) * 1000), o.sellerId);
    const r = rng();
    if (r < 0.12) store.setSizeStock(w.productId, w.size, 0, o.sellerId);
    else if (r > 0.9) store.setSizeStock(w.productId, w.size, 2 + Math.floor(rng() * 3), o.sellerId);
  }
}

/**
 * 사용성 테스트용 고정 흐름. 참가자가 어떤 목표를 정해도 같은 이야기가 나온다:
 * 1일째 모두 목표 위 → 2일째 한 판매처가 목표 아래로 오지만 그 사이즈가 품절(사지 않음) → 4일째 국내 판매처가 배송비 포함 목표 아래(조건 충족).
 * 해외 판매처는 내내 목표 위에 둔다.
 */
export function scriptedDay(store: Store, w: Watch, day: number) {
  const offers = store.offersOf(w.productId);
  const domestic = offers.filter((o) => !sellerOf(o.sellerId).overseas);
  const above = Math.round((w.maxTotal * 1.1) / 1000) * 1000;
  const a = domestic[0], b = domestic[1] ?? domestic[0];
  if (!a) return;
  if (day === 1) for (const o of offers) store.setPrice(w.productId, above, o.sellerId);
  if (day === 2) {
    store.setPrice(w.productId, Math.max(1000, w.maxTotal - 3000), a.sellerId);
    store.setSizeStock(w.productId, w.size, 0, a.sellerId);
  }
  if (day === 4) {
    let price = Math.floor((w.maxTotal - 2000) / 1000) * 1000;
    while (price > 1000 && totalOf(b.sellerId, price) > w.maxTotal) price -= 1000;
    store.setPrice(w.productId, price, b.sellerId);
    store.setSizeStock(w.productId, w.size, 3, b.sellerId);
  }
}

const won = (n: number): L => ({ ko: `${n.toLocaleString('ko-KR')}원`, en: `KRW ${n.toLocaleString('en-US')}` });
const MISS: Record<Miss, L> = {
  size: { ko: '사이즈 품절', en: 'size sold out' },
  shipping: { ko: `배송비 포함 시 목표 초과`, en: 'over target with shipping' },
  overseas: { ko: '해외직구', en: 'overseas seller' },
};

/** 기록 한 줄 */
export function describe(v: Verdict, w: Watch, day: number): L {
  const d = day === 0 ? { ko: '시작', en: 'Start' } : { ko: `${day}일째`, en: `Day ${day}` };
  if (v.kind === 'expired') return { ko: `${w.days}일이 지나 기다리기를 끝냈어요. 아무것도 사지 않았어요.`, en: `${w.days} days passed. Stopped waiting; nothing bought.` };
  if (v.kind === 'wait') return v.best === null
    ? { ko: `${d.ko}: 조건에 맞는 판매처에 재고가 없어요.`, en: `${d.en}: no stock at a seller that fits.` }
    : { ko: `${d.ko}: 지금 최저 ${won(v.best).ko}. 목표 ${won(w.maxTotal).ko}까지 기다려요.`, en: `${d.en}: lowest ${won(v.best).en}. Waiting for ${won(w.maxTotal).en}.` };
  const s = sellerOf(v.sellerId).name;
  if (v.kind === 'hold') return {
    ko: `${d.ko}: ${s.ko} 가격이 ${won(v.price).ko}까지 내려왔지만 사지 않았어요. 이유: ${v.misses.map((m) => MISS[m].ko).join(', ')}`,
    en: `${d.en}: ${s.en} hit ${won(v.price).en}, but ${v.misses.map((m) => MISS[m].en).join(', ')}, so nothing was bought.`,
  };
  return { ko: `${d.ko}: ${s.ko} ${won(v.total).ko}(배송비 포함). 미리 정한 조건이 모두 맞아요.`, en: `${d.en}: ${s.en} ${won(v.total).en} with shipping. Every preset condition fits.` };
}
