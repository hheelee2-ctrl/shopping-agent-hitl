import type { PayResult } from './contract';

/** 토스페이먼츠 SDK v2(결제창, 구버전 payment) 중 쓰는 부분 */
export interface TossPayment {
  requestPayment(o: Record<string, unknown>): Promise<unknown>;
}
type TossPayments = ((clientKey: string) => { payment(o: { customerKey: string }): TossPayment }) & { ANONYMOUS: string };

declare global {
  interface Window { TossPayments?: TossPayments }
}

const SDK = 'https://js.tosspayments.com/v2/standard';
let loading: Promise<TossPayments> | null = null;

/** SDK는 결제할 때 처음 한 번만 불러온다 */
export function loadToss(): Promise<TossPayments> {
  if (window.TossPayments) return Promise.resolve(window.TossPayments);
  return (loading ??= new Promise((resolve, reject) => {
    const s = Object.assign(document.createElement('script'), { src: SDK, async: true });
    s.onload = () => (window.TossPayments ? resolve(window.TossPayments) : reject(new Error('sdk')));
    s.onerror = () => { loading = null; reject(new Error('sdk')); };
    document.head.appendChild(s);
  }));
}

/** 토스가 돌려준 결제를 서버에서 금액 대조 후 승인한다. 결제 창(pay.html)과 Nod 화면이 같이 쓴다. */
export async function confirmPayment(
  q: { paymentKey: string; orderId: string; amount: number; token: string },
  fetchImpl: typeof fetch = (...a) => fetch(...a),
): Promise<PayResult> {
  try {
    const res = await fetchImpl('/api/pay/confirm', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(q),
    });
    const b = (await res.json()) as { status?: string; method?: string; approvedAt?: string; receiptUrl?: string; error?: string; message?: string };
    if (res.ok && b.status === 'paid') return { orderId: q.orderId, status: 'paid', method: b.method ?? '', approvedAt: b.approvedAt ?? '', receiptUrl: b.receiptUrl };
    return { orderId: q.orderId, status: 'failed', message: b.message || b.error || String(res.status) };
  } catch {
    return { orderId: q.orderId, status: 'failed', message: 'network' };
  }
}

/** 사람이 결제창을 닫았을 때 토스가 주는 오류 코드 */
export const isCancel = (e: unknown) => ['USER_CANCEL', 'PAY_PROCESS_CANCELED'].includes((e as { code?: string })?.code ?? '');
