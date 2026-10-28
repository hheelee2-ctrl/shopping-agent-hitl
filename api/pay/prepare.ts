import { isTestKey, makeOrderId, orderNameOf, signApproval, signingSecret, validAmount } from '../../src/pay/contract.js';

/**
 * POST /api/pay/prepare { amount, names } → { orderId, orderName, clientKey, token }
 * 사람이 Nod에서 결제를 승인한 직후에 부른다. 주문번호를 만들고 승인한 금액에 서명한다.
 * 테스트 키가 없으면(또는 live 키면) 503을 돌려주고, 클라이언트는 시뮬레이션 결제로 진행한다.
 */
const env = process.env;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

/** GET: 테스트 결제를 쓸 수 있는지. 클라이언트가 결제창을 열기 전에 미리 묻는다. */
export function GET(): Response {
  return isTestKey(env.TOSS_CLIENT_KEY) && isTestKey(env.TOSS_SECRET_KEY) ? json({ ready: true }) : json({ error: 'no-test-key' }, 503);
}

export async function POST(req: Request): Promise<Response> {
  const clientKey = env.TOSS_CLIENT_KEY;
  const secret = env.TOSS_SECRET_KEY;
  if (!isTestKey(clientKey) || !isTestKey(secret)) return json({ error: 'no-test-key' }, 503);

  let amount: unknown;
  let names: unknown;
  try {
    ({ amount, names } = (await req.json()) as { amount?: unknown; names?: unknown });
  } catch {
    return json({ error: 'bad-json' }, 400);
  }
  if (!validAmount(amount)) return json({ error: 'bad-amount' }, 400);
  const list = Array.isArray(names) ? names.filter((n): n is string => typeof n === 'string').slice(0, 20) : [];

  const orderId = makeOrderId();
  const token = await signApproval(signingSecret(secret), orderId, amount);
  return json({ orderId, orderName: orderNameOf(list), clientKey, token });
}
