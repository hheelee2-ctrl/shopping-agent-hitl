import type { L } from '../engine/types';
import { sellerOf, type SellerKind } from './sellers';
import type { Order } from './types';

export type Stage = 'paid' | 'ready' | 'shipped' | 'transit' | 'arrived';
export const STAGES: Stage[] = ['paid', 'ready', 'shipped', 'transit', 'arrived'];

export interface TrackEvent {
  at: number;
  stage: Stage;
  label: L;
  place: L;
  done: boolean;
}

export interface Tracking {
  carrier: L;
  /** 출고 전에는 없다 */
  invoice: string | null;
  stage: Stage;
  events: TrackEvent[];
}

const H = 3600000;
const M = 60000;

/** 판매처 종류별 배송 경로. 출고지 → 간선 거점 → 배송 대리점 */
const ROUTE: Record<SellerKind, { carrier: L; from: L; hub: L; hubLabel: L }> = {
  official: {
    carrier: { ko: '한결택배', en: 'Hangyeol Express' },
    from: { ko: '이천 물류센터', en: 'Icheon fulfillment center' },
    hub: { ko: '대전 중앙 허브', en: 'Daejeon central hub' },
    hubLabel: { ko: '간선 이동', en: 'Line haul' },
  },
  select: {
    carrier: { ko: '한결택배', en: 'Hangyeol Express' },
    from: { ko: '성수 셀렉트 센터', en: 'Seongsu select center' },
    hub: { ko: '곤지암 허브', en: 'Gonjiam hub' },
    hubLabel: { ko: '간선 이동', en: 'Line haul' },
  },
  mall: {
    carrier: { ko: '대로 직배송', en: 'Daero Direct' },
    from: { ko: '용인 풀필먼트', en: 'Yongin fulfillment' },
    hub: { ko: '서울 동부 캠프', en: 'Seoul east camp' },
    hubLabel: { ko: '배송 캠프 도착', en: 'At delivery camp' },
  },
  overseas: {
    carrier: { ko: '바다건너 특송', en: 'Overseas Express' },
    from: { ko: 'LA 국제물류센터', en: 'LA international center' },
    hub: { ko: '인천공항 세관', en: 'Incheon Airport customs' },
    hubLabel: { ko: '입항·통관', en: 'Arrived, customs' },
  },
};
const LAST: L = { ko: '성동 대리점', en: 'Seongdong branch' };
const DOOR: L = { ko: '문 앞', en: 'At the door' };

/** 주문번호로 정하는 12자리 운송장 번호. 같은 주문이면 늘 같다. */
function invoiceOf(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  const a = String((h >>> 0) % 1e6).padStart(6, '0');
  const b = String(Math.imul(h, 2654435761) >>> 0).slice(-6).padStart(6, '0');
  const n = `${a}${b}`;
  return `${n.slice(0, 4)}-${n.slice(4, 8)}-${n.slice(8)}`;
}

/** 주문 시각·출고·도착 예정으로 배송 이력을 만든다. now까지 지난 일만 done이다. */
export function trackOf(o: Order, now: number): Tracking {
  const s = sellerOf(o.sellerId);
  const r = ROUTE[s.kind];
  const hubAt = o.shipAt + 6 * H;
  const outAt = Math.max(hubAt + H, o.arriveAt - 9 * H);
  const plan: Omit<TrackEvent, 'done'>[] = [
    { at: o.placedAt, stage: 'paid', label: { ko: '주문 접수', en: 'Order received' }, place: s.name },
    { at: o.placedAt + 10 * M, stage: 'ready', label: { ko: '상품 준비 중', en: 'Preparing' }, place: s.name },
    { at: o.shipAt, stage: 'shipped', label: { ko: '집화 처리', en: 'Picked up' }, place: r.from },
    { at: hubAt, stage: 'transit', label: r.hubLabel, place: r.hub },
    { at: outAt, stage: 'transit', label: { ko: '배송 출발', en: 'Out for delivery' }, place: LAST },
    { at: o.arriveAt, stage: 'arrived', label: { ko: '배송 완료', en: 'Delivered' }, place: DOOR },
  ];
  const events = plan.map((e) => ({ ...e, done: now >= e.at }));
  const last = [...events].reverse().find((e) => e.done);
  return {
    carrier: r.carrier,
    invoice: now >= o.shipAt ? invoiceOf(o.id) : null,
    stage: last?.stage ?? 'paid',
    events,
  };
}
