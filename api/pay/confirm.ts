import { isTestKey, ORDER_ID, signingSecret, verifyApproval } from '../../src/pay/contract.js';

/**
 * POST /api/pay/confirm { paymentKey, orderId, amount, token } → { status: 'paid', method, approvedAt, receiptUrl }
 * 토스 결제창이 돌려준 주문번호·금액이 사람이 승인한 것(token)과 같을 때만 토스 결제 승인 API를 부른다.
 * 다르면 승인하지 않는다. 승인하지 않은 결제는 토스에서 자동으로 만료되어 돈이 나가지 않는다.
 */
const env = process.env;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export async function POST(req: Request): Promise<Response> {
  const secret = env.TOSS_SECRET_KEY;
  if (!isTestKey(secret)) return json({ error: 'no-test-key' }, 503);

  let b: { paymentKey?: unknown; orderId?: unknown; amount?: unknown; token?: unknown };
  try {
    b = (await req.json()) as typeof b;
  } catch {
    return json({ error: 'bad-json' }, 400);
  }
  const { paymentKey, orderId, token } = b;
  const amount = Number(b.amount);
  if (typeof paymentKey !== 'string' || !paymentKey || paymentKey.length > 200) return json({ error: 'bad-request' }, 400);
  if (typeof orderId !== 'string' || !ORDER_ID.test(orderId) || typeof token !== 'string') return json({ error: 'bad-request' }, 400);

  const v = await verifyApproval(signingSecret(secret), token, orderId, amount);
  if (!v.ok) return json({ error: v.reason }, 409);

  try {
    const res = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        authorization: `Basic ${Buffer.from(`${secret}:`).toString('base64')}`,
        'content-type': 'application/json',
        'idempotency-key': orderId,
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
      signal: AbortSignal.timeout(15_000),
    });
    const r = (await res.json()) as { method?: string; approvedAt?: string; receipt?: { url?: string }; code?: string; message?: string };
    if (!res.ok) return json({ error: r.code ?? 'toss-error', message: r.message ?? '' }, 502);
    return json({ status: 'paid', method: r.method ?? '', approvedAt: r.approvedAt ?? '', receiptUrl: r.receipt?.url });
  } catch {
    return json({ error: 'toss-unreachable' }, 502);
  }
}
