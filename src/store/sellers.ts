import type { L } from '../engine/types';

/**
 * 판매처. 전부 가상이다 (실존 쇼핑몰·플랫폼과 무관).
 * Nod는 판매자가 아니다. 주문·배송·반품은 판매처가 처리하고, Nod는 찾고 담고 승인을 받는다.
 */
export type SellerKind = 'official' | 'select' | 'mall' | 'overseas';

export interface Seller {
  id: string;
  kind: SellerKind;
  name: L;
  /** 기본 배송비(원) */
  fee: number;
  /** 이 금액 이상이면 무료배송. 없으면 항상 fee */
  freeOver?: number;
  /** 이 시각(시) 전에 결제하면 오늘 출고 */
  cutoff: number;
  /** 출고 뒤 도착까지 걸리는 영업일 */
  days: number;
  /** 반품 가능 기간(일). null이면 단순 변심 반품 불가 */
  returnDays: number | null;
  /** 반품 배송비(원). 0이면 무료 반품 */
  returnFee: number;
  overseas?: boolean;
}

export const BRANDS = ['NOIR LAB', 'MAISON ARC', 'OAKWARD', 'ATELIER 9', 'TRAIL & CO', 'STRIDE'] as const;
const slug = (b: string) => b.toLowerCase().replace(/[^a-z0-9]/g, '');
export const officialId = (brand: string) => `off-${slug(brand)}`;

const official = (brand: string): Seller => ({
  id: officialId(brand), kind: 'official',
  name: { ko: `${brand} 공식몰`, en: `${brand} Official` },
  fee: 3000, freeOver: 70000, cutoff: 14, days: 2, returnDays: 7, returnFee: 5000,
});

const LIST: Seller[] = [
  ...BRANDS.map(official),
  {
    id: 'shelf', kind: 'select', name: { ko: '선반 셀렉트', en: 'Shelf Select' },
    fee: 2500, freeOver: 150000, cutoff: 15, days: 1, returnDays: 14, returnFee: 0,
  },
  {
    id: 'daero', kind: 'mall', name: { ko: '대로몰', en: 'Daero Mall' },
    fee: 0, cutoff: 23, days: 1, returnDays: 30, returnFee: 0,
  },
  {
    id: 'abroad', kind: 'overseas', name: { ko: '바다건너 직구', en: 'Overseas Direct' },
    fee: 9000, cutoff: 12, days: 9, returnDays: null, returnFee: 0, overseas: true,
  },
];
export const SELLERS: Record<string, Seller> = Object.fromEntries(LIST.map((s) => [s.id, s]));

export const sellerOf = (id: string): Seller => SELLERS[id];

/** 이 판매처에서 subtotal만큼 살 때의 배송비 */
export const shippingFee = (s: Seller, subtotal: number) => (s.freeOver !== undefined && subtotal >= s.freeOver ? 0 : s.fee);

/** 해외직구 관부가세 안내 기준(원). 가상의 기준이다. */
export const DUTY_OVER = 200000;

const DAY = 86400000;
const isSunday = (d: Date) => d.getDay() === 0;
const nextBusinessDay = (d: Date) => {
  const n = new Date(d.getTime() + DAY);
  return isSunday(n) ? new Date(n.getTime() + DAY) : n;
};

/** 지금 결제하면 언제 출고되고 언제 도착하는지. 일요일은 출고·배송하지 않는다. */
export function scheduleOf(s: Seller, now: number): { shipAt: number; arriveAt: number } {
  const d = new Date(now);
  let ship = new Date(d);
  ship.setHours(s.cutoff, 0, 0, 0);
  if (isSunday(d) || d.getHours() >= s.cutoff) {
    ship = nextBusinessDay(ship);
  }
  let arrive = new Date(ship);
  for (let i = 0; i < s.days; i++) arrive = nextBusinessDay(arrive);
  arrive.setHours(18, 0, 0, 0);
  return { shipAt: ship.getTime(), arriveAt: arrive.getTime() };
}

const WD: L[] = [
  { ko: '일', en: 'Sun' }, { ko: '월', en: 'Mon' }, { ko: '화', en: 'Tue' }, { ko: '수', en: 'Wed' },
  { ko: '목', en: 'Thu' }, { ko: '금', en: 'Fri' }, { ko: '토', en: 'Sat' },
];

const dayDiff = (a: number, b: number) => {
  const x = new Date(a); x.setHours(0, 0, 0, 0);
  const y = new Date(b); y.setHours(0, 0, 0, 0);
  return Math.round((y.getTime() - x.getTime()) / DAY);
};

/** "내일 도착", "10/9(금) 도착" */
export function arrivalLabel(arriveAt: number, now: number): L {
  const n = dayDiff(now, arriveAt);
  if (n <= 0) return { ko: '오늘 도착', en: 'Arrives today' };
  if (n === 1) return { ko: '내일 도착', en: 'Arrives tomorrow' };
  const d = new Date(arriveAt);
  const w = WD[d.getDay()];
  return { ko: `${d.getMonth() + 1}/${d.getDate()}(${w.ko}) 도착`, en: `Arrives ${w.en} ${d.getMonth() + 1}/${d.getDate()}` };
}

export function dateLabel(at: number): L {
  const d = new Date(at);
  const w = WD[d.getDay()];
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return { ko: `${d.getMonth() + 1}/${d.getDate()}(${w.ko}) ${hm}`, en: `${w.en} ${d.getMonth() + 1}/${d.getDate()} ${hm}` };
}

export function returnLabel(s: Seller): L {
  if (s.returnDays === null) return { ko: '단순 변심 반품 불가', en: 'No change-of-mind returns' };
  return s.returnFee === 0
    ? { ko: `${s.returnDays}일 무료 반품`, en: `Free returns, ${s.returnDays} days` }
    : { ko: `${s.returnDays}일 반품, 반품비 ${s.returnFee.toLocaleString('ko-KR')}원`, en: `Returns ${s.returnDays} days, KRW ${s.returnFee.toLocaleString('en-US')} fee` };
}

/** "금요일까지" 같은 마감을 실제 시각(그날 끝)으로 */
export function deadlineOf(spec: { weekday?: number; days?: number }, now: number): number {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  if (spec.days !== undefined) return d.getTime() + spec.days * DAY;
  const w = spec.weekday ?? d.getDay();
  let add = (w - d.getDay() + 7) % 7;
  if (add === 0) add = 0;
  return d.getTime() + add * DAY;
}

export const weekdayL = (w: number) => WD[w];
