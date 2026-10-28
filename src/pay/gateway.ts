import type { L, Lang } from '../engine/types';
import { CHANNEL, TOKEN_TTL_MS, type PayResult } from './contract';
import { confirmPayment, isCancel, loadToss, type TossPayment } from './toss';

/**
 * 사람이 결제를 승인한 뒤 실제로 돈을 받는 자리. 에이전트는 어느 쪽인지 모르고 charge만 부른다.
 * - simulatedGateway: 바로 결제된 것으로 본다 (테스트, 사용성 테스트 모드, 토스 키가 없는 배포)
 * - tossGateway: 토스페이먼츠 테스트 결제창을 띄우고 결과를 기다린다.
 *   데스크톱은 Nod 화면 위에 결제창을 겹쳐 띄우고 같은 화면에서 결과를 받는다(페이지 이동 없음).
 *   모바일은 토스가 페이지 이동만 허용하므로 팝업(pay.html) 안에서 이동시키고, 결과만 Nod 화면으로 돌려받는다.
 */

export interface ChargeRequest {
  amount: number;
  /** 결제창 주문명에 쓸 상품 이름 */
  names: L[];
}

export type ChargeResult =
  | { status: 'paid'; via: 'sim' }
  /** 토스 결제창을 인증 없이 닫은 뒤, 사람이 테스트 결제로 계속하기로 했다 */
  | { status: 'paid'; via: 'skip' }
  | { status: 'paid'; via: 'toss'; method: string; approvedAt: string; receiptUrl?: string }
  | { status: 'canceled' }
  | { status: 'failed'; message: string }
  /** 브라우저가 팝업을 막았다. 사람이 한 번 더 누르면 열 수 있다. */
  | { status: 'blocked' };

export interface PaymentGateway {
  charge(r: ChargeRequest): Promise<ChargeResult>;
}

export const simulatedGateway: PaymentGateway = { charge: async () => ({ status: 'paid', via: 'sim' }) };

interface TossOpts {
  lang: () => Lang;
  /** inline: Nod 화면 위에 결제창(데스크톱). popup: 팝업 창 안에서 결제(모바일) */
  mode?: () => 'inline' | 'popup';
  /** 토스 SDK의 결제 객체. 테스트에서 바꿔 끼운다 */
  toss?: (clientKey: string) => Promise<TossPayment>;
  fetchImpl?: typeof fetch;
  openWindow?: () => Window | null;
  channel?: () => BroadcastChannel;
}

const isMobile = () => /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
const sdkPayment = async (clientKey: string) => {
  const T = await loadToss();
  return T(clientKey).payment({ customerKey: T.ANONYMOUS });
};

type Prepared = { orderId: string; orderName: string; clientKey: string; token: string };

/**
 * 토스 테스트 결제. 서버에 테스트 키가 없으면(/api/pay/prepare가 503·404) 그 세션 동안 시뮬레이션으로 결제한다.
 * 팝업은 승인 클릭의 흐름 안에서 바로 연다. 서버 응답을 기다린 뒤에 열면 브라우저가 팝업을 막는다.
 */
export function tossGateway({ lang, mode = () => (isMobile() ? 'popup' : 'inline'), toss = sdkPayment, fetchImpl = (...a) => fetch(...a), openWindow, channel }: TossOpts): PaymentGateway {
  const open = openWindow ?? (() => window.open('about:blank', 'nod-pay', 'popup,width=480,height=760'));
  const chan = channel ?? (() => new BroadcastChannel(CHANNEL));
  // 키가 있는지 미리 물어 두면, 키 없는 배포에서 팝업이 열렸다 닫히는 일이 없다
  let ready: Promise<boolean> | null = null;
  const probe = () => (ready ??= fetchImpl('/api/pay/prepare', { method: 'GET' }).then((r) => r.ok).catch(() => false));
  let known: boolean | null = null;
  void probe().then((v) => { known = v; });

  const prepare = async (amount: number, names: L[]): Promise<Prepared | null> => {
    try {
      const res = await fetchImpl('/api/pay/prepare', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ amount, names: names.map((n) => n[lang()]) }),
      });
      return res.ok ? ((await res.json()) as Prepared) : null;
    } catch {
      return null;
    }
  };

  /** Nod 화면 위에 결제창을 띄운다. 페이지가 이동하지 않으므로 결과를 이 자리에서 받는다(Promise 방식, 데스크톱 전용). */
  const inline = async ({ amount, names }: ChargeRequest): Promise<ChargeResult> => {
    if (!(await probe())) return simulatedGateway.charge({ amount, names });
    const prep = await prepare(amount, names);
    if (!prep) return { status: 'failed', message: 'prepare' };
    let paid: { paymentKey?: string; orderId?: string; amount?: number | { value?: number } };
    const off = testBanner(lang());
    try {
      const p = await toss(prep.clientKey);
      paid = (await p.requestPayment({ method: 'CARD', amount: { currency: 'KRW', value: amount }, orderId: prep.orderId, orderName: prep.orderName })) as typeof paid;
    } catch (e) {
      return isCancel(e) ? { status: 'canceled' } : { status: 'failed', message: (e as Error)?.message ?? 'toss' };
    } finally {
      off();
    }
    // 서버가 대조할 금액은 토스가 돌려준 값이다. 이 값이 승인한 금액과 다르면 서버가 승인하지 않는다.
    const back = typeof paid?.amount === 'object' ? paid.amount?.value : paid?.amount;
    const r = await confirmPayment({ paymentKey: paid?.paymentKey ?? '', orderId: paid?.orderId ?? prep.orderId, amount: Number(back ?? amount), token: prep.token }, fetchImpl);
    if (r.status === 'paid') return { status: 'paid', via: 'toss', method: r.method, approvedAt: r.approvedAt, receiptUrl: r.receiptUrl };
    return r.status === 'canceled' ? { status: 'canceled' } : { status: 'failed', message: r.message };
  };

  return {
    async charge({ amount, names }) {
      if (known === false) return simulatedGateway.charge({ amount, names });
      if (mode() === 'inline') return inline({ amount, names });
      const w = open();
      if (!w) return (await probe()) ? { status: 'blocked' } : simulatedGateway.charge({ amount, names });
      if (!(await probe())) {
        w.close();
        return simulatedGateway.charge({ amount, names });
      }
      const prep = await prepare(amount, names);
      if (!prep) {
        w.close();
        return { status: 'failed', message: 'prepare' };
      }
      const h = new URLSearchParams({ o: prep.orderId, a: String(amount), n: prep.orderName, k: prep.clientKey, t: prep.token, l: lang() });
      w.location.href = `/pay.html#${h}`;
      return wait(w, chan(), prep.orderId);
    },
  };
}

/**
 * 토스 결제창은 실제 결제창과 똑같이 생겨서, 떠 있는 동안 화면 맨 위에 '테스트 결제' 띠를 고정한다.
 * 결제창보다 위에 그려지도록 z-index를 최대로 둔다. 문서가 없는 환경(테스트)에서는 아무것도 하지 않는다.
 */
function testBanner(lang: Lang): () => void {
  if (typeof document === 'undefined') return () => {};
  const el = document.createElement('div');
  el.className = 'test-banner';
  el.setAttribute('role', 'status');
  el.innerHTML = lang === 'ko'
    ? '<b>TEST</b><span>테스트 결제예요. 실제로 돈이 나가지 않아요. 카드 인증 없이 창을 닫아도 테스트로 마칠 수 있어요.</span>'
    : '<b>TEST</b><span>This is a test payment. No real money moves. You can close the window and finish as a test.</span>';
  document.body.appendChild(el);
  return () => el.remove();
}

/** 결제 창이 결과를 보내거나, 사람이 창을 닫거나, 서명이 만료될 때까지 기다린다 */
function wait(w: Window, ch: BroadcastChannel, orderId: string): Promise<ChargeResult> {
  return new Promise((resolve) => {
    let done = false;
    const end = (r: ChargeResult) => {
      if (done) return;
      done = true;
      clearInterval(poll);
      clearTimeout(expire);
      ch.close();
      resolve(r);
    };
    ch.onmessage = (e: MessageEvent<PayResult>) => {
      const m = e.data;
      if (m?.orderId !== orderId) return;
      if (m.status === 'paid') end({ status: 'paid', via: 'toss', method: m.method, approvedAt: m.approvedAt, receiptUrl: m.receiptUrl });
      else if (m.status === 'canceled') end({ status: 'canceled' });
      else end({ status: 'failed', message: m.message });
    };
    // 결과를 보내기 전에 창이 닫히면 결제하지 않은 것으로 본다. 결과 메시지가 먼저 오도록 조금 기다린다.
    const poll = setInterval(() => { if (w.closed) setTimeout(() => end({ status: 'canceled' }), 400); }, 500);
    const expire = setTimeout(() => { w.close(); end({ status: 'canceled' }); }, TOKEN_TTL_MS);
  });
}
